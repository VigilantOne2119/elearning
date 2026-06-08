"""
Backend tests for Safe2Drive LMS.
Tests: health, auth (login, register disabled, change-password, me),
admin (enroll, reset, delete, stats), modules, progress, dashboard, homework.
"""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@safe2drive.ca"
ADMIN_PASS = "Admin@2026"
STUDENT_EMAIL = "student@safe2drive.ca"
STUDENT_PASS = "Student@2026"


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    return r


@pytest.fixture(scope="session")
def admin_token():
    r = _login(ADMIN_EMAIL, ADMIN_PASS)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def student_token():
    r = _login(STUDENT_EMAIL, STUDENT_PASS)
    assert r.status_code == 200, f"Student login failed: {r.status_code} {r.text}"
    return r.json()["token"]


def _h(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Health ----------
class TestHealth:
    def test_root(self):
        r = requests.get(f"{API}/", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"


# ---------- Auth ----------
class TestAuth:
    def test_register_disabled(self):
        r = requests.post(f"{API}/auth/register", json={
            "name": "Nope", "email": f"nope_{uuid.uuid4().hex[:6]}@x.com", "password": "abc123"
        }, timeout=10)
        assert r.status_code == 403
        assert "disabled" in r.text.lower() or "self" in r.text.lower()

    def test_login_admin(self):
        r = _login(ADMIN_EMAIL, ADMIN_PASS)
        assert r.status_code == 200
        d = r.json()
        assert d["role"] == "admin"
        assert d.get("token")

    def test_login_student(self):
        r = _login(STUDENT_EMAIL, STUDENT_PASS)
        assert r.status_code == 200
        d = r.json()
        assert d["role"] == "student"
        assert d.get("token")

    def test_login_invalid(self):
        r = _login(STUDENT_EMAIL, "wrongpass")
        assert r.status_code == 401

    def test_me(self, student_token):
        r = requests.get(f"{API}/auth/me", headers=_h(student_token), timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == STUDENT_EMAIL
        assert data["role"] == "student"


# ---------- Admin enroll + change-password + reset + delete ----------
class TestAdminEnrollFlow:
    enrolled_id = None
    enrolled_email = None
    enrolled_temp_pw = None

    def test_enroll_requires_admin(self, student_token):
        r = requests.post(f"{API}/admin/enroll",
                          headers=_h(student_token),
                          json={"name": "X", "email": f"x_{uuid.uuid4().hex[:6]}@x.com"},
                          timeout=10)
        assert r.status_code == 403

    def test_enroll_success(self, admin_token):
        email = f"test_enroll_{uuid.uuid4().hex[:8]}@safe2drive.ca"
        r = requests.post(f"{API}/admin/enroll",
                          headers=_h(admin_token),
                          json={"name": "Test Enroll", "email": email},
                          timeout=10)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True
        assert len(d["temp_password"]) == 10
        assert d["email_sent"] is False
        assert d["email"] == email
        TestAdminEnrollFlow.enrolled_id = d["id"]
        TestAdminEnrollFlow.enrolled_email = email
        TestAdminEnrollFlow.enrolled_temp_pw = d["temp_password"]

    def test_enroll_duplicate(self, admin_token):
        assert TestAdminEnrollFlow.enrolled_email
        r = requests.post(f"{API}/admin/enroll",
                          headers=_h(admin_token),
                          json={"name": "Dup", "email": TestAdminEnrollFlow.enrolled_email},
                          timeout=10)
        assert r.status_code == 400

    def test_enrolled_must_change_password_flag(self, admin_token):
        # login as the enrolled user
        r = _login(TestAdminEnrollFlow.enrolled_email, TestAdminEnrollFlow.enrolled_temp_pw)
        assert r.status_code == 200
        token = r.json()["token"]
        me = requests.get(f"{API}/auth/me", headers=_h(token), timeout=10).json()
        assert me.get("must_change_password") is True

    def test_change_password_wrong_current(self):
        r = _login(TestAdminEnrollFlow.enrolled_email, TestAdminEnrollFlow.enrolled_temp_pw)
        token = r.json()["token"]
        r2 = requests.post(f"{API}/auth/change-password",
                           headers=_h(token),
                           json={"current_password": "wrong", "new_password": "NewPass@2026"},
                           timeout=10)
        assert r2.status_code == 400

    def test_change_password_success(self):
        r = _login(TestAdminEnrollFlow.enrolled_email, TestAdminEnrollFlow.enrolled_temp_pw)
        token = r.json()["token"]
        new_pw = "NewPass@2026"
        r2 = requests.post(f"{API}/auth/change-password",
                           headers=_h(token),
                           json={"current_password": TestAdminEnrollFlow.enrolled_temp_pw, "new_password": new_pw},
                           timeout=10)
        assert r2.status_code == 200

        # login with new password and check must_change_password cleared
        r3 = _login(TestAdminEnrollFlow.enrolled_email, new_pw)
        assert r3.status_code == 200
        token2 = r3.json()["token"]
        me = requests.get(f"{API}/auth/me", headers=_h(token2), timeout=10).json()
        assert me.get("must_change_password") is False
        TestAdminEnrollFlow.enrolled_temp_pw = new_pw

    def test_reset_password(self, admin_token):
        r = requests.post(f"{API}/admin/students/{TestAdminEnrollFlow.enrolled_id}/reset-password",
                          headers=_h(admin_token), timeout=10)
        assert r.status_code == 200
        d = r.json()
        new_temp = d["temp_password"]
        assert len(new_temp) == 10

        # login with new temp pw and verify must_change_password is true again
        r2 = _login(TestAdminEnrollFlow.enrolled_email, new_temp)
        assert r2.status_code == 200
        me = requests.get(f"{API}/auth/me", headers=_h(r2.json()["token"]), timeout=10).json()
        assert me.get("must_change_password") is True

    def test_delete_student(self, admin_token):
        r = requests.delete(f"{API}/admin/students/{TestAdminEnrollFlow.enrolled_id}",
                            headers=_h(admin_token), timeout=10)
        assert r.status_code == 200
        # delete non-existent
        r2 = requests.delete(f"{API}/admin/students/{TestAdminEnrollFlow.enrolled_id}",
                             headers=_h(admin_token), timeout=10)
        assert r2.status_code == 404

    def test_admin_stats(self, admin_token):
        r = requests.get(f"{API}/admin/stats", headers=_h(admin_token), timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert "total_students" in d
        assert "total_progress_records" in d
        assert "total_modules_completed" in d


# ---------- Modules ----------
class TestModules:
    def test_list_modules(self, student_token):
        r = requests.get(f"{API}/modules", headers=_h(student_token), timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 8
        assert all("progress_pct" in m for m in data)

    def test_module_detail(self, student_token):
        r = requests.get(f"{API}/modules/1", headers=_h(student_token), timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert len(d["slides"]) == 6
        assert len(d["quiz"]) == 3
        # correct_index must not leak
        assert all("correct_index" not in q for q in d["quiz"])
        assert "progress" in d


# ---------- Progress ----------
class TestProgress:
    @pytest.fixture(scope="class")
    def fresh_student_token(self, admin_token):
        # Create fresh student for clean progress state
        email = f"test_prog_{uuid.uuid4().hex[:8]}@safe2drive.ca"
        r = requests.post(f"{API}/admin/enroll",
                          headers=_h(admin_token),
                          json={"name": "Prog Test", "email": email},
                          timeout=10)
        assert r.status_code == 200
        temp = r.json()["temp_password"]
        sid = r.json()["id"]
        login = _login(email, temp)
        token = login.json()["token"]
        yield token, sid
        # cleanup
        requests.delete(f"{API}/admin/students/{sid}", headers=_h(admin_token), timeout=10)

    def test_slide_invalid(self, fresh_student_token):
        token, _ = fresh_student_token
        r = requests.post(f"{API}/progress/slide",
                          headers=_h(token),
                          json={"module_id": 1, "slide_id": "bad-id", "seconds": 10},
                          timeout=10)
        assert r.status_code == 400

    def test_slide_progress_all_six(self, fresh_student_token):
        token, _ = fresh_student_token
        for i in range(1, 7):
            r = requests.post(f"{API}/progress/slide",
                              headers=_h(token),
                              json={"module_id": 1, "slide_id": f"m1-s{i}", "seconds": 30},
                              timeout=10)
            assert r.status_code == 200, r.text
        d = r.json()
        assert d["watched_slides"] == 6
        assert d["module_complete"] is True

        # dashboard reflects completion
        dash = requests.get(f"{API}/dashboard", headers=_h(token), timeout=10).json()
        assert dash["modules_completed"] >= 1
        assert dash["total_watched_seconds"] >= 180

    def test_quiz_pass(self, fresh_student_token):
        token, _ = fresh_student_token
        r = requests.post(f"{API}/progress/quiz",
                          headers=_h(token),
                          json={"module_id": 1, "answers": [0, 1, 2]},
                          timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["score_pct"] == 100
        assert d["passed"] is True

    def test_quiz_fail(self, fresh_student_token):
        token, _ = fresh_student_token
        r = requests.post(f"{API}/progress/quiz",
                          headers=_h(token),
                          json={"module_id": 2, "answers": [3, 3, 3]},
                          timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["score_pct"] < 80
        assert d["passed"] is False

    def test_quiz_wrong_length(self, fresh_student_token):
        token, _ = fresh_student_token
        r = requests.post(f"{API}/progress/quiz",
                          headers=_h(token),
                          json={"module_id": 1, "answers": [0, 1]},
                          timeout=10)
        assert r.status_code == 400

    def test_homework(self, fresh_student_token):
        token, _ = fresh_student_token
        r = requests.post(f"{API}/homework/1/complete", headers=_h(token), timeout=10)
        assert r.status_code == 200
        # verify via modules
        modules = requests.get(f"{API}/modules", headers=_h(token), timeout=10).json()
        m1 = next(m for m in modules if m["id"] == 1)
        assert m1["homework_complete"] is True


# ---------- Dashboard ----------
class TestDashboard:
    def test_dashboard_structure(self, student_token):
        r = requests.get(f"{API}/dashboard", headers=_h(student_token), timeout=10)
        assert r.status_code == 200
        d = r.json()
        for key in ["user", "course_progress_pct", "modules_completed", "total_modules",
                    "total_watched_seconds", "mto_required_seconds", "remaining_today_seconds",
                    "daily_max_seconds", "total_score_pct", "final_test_pct", "last_activity"]:
            assert key in d, f"missing {key}"
        assert d["total_modules"] == 8
        assert d["mto_required_seconds"] == 72000
        assert d["daily_max_seconds"] == 18000
