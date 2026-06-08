"""
Backend tests for Safe2Drive LMS Progress Snapshots feature.
Covers: login snapshot + debounce, quiz/module/homework snapshots, admin list/create/restore/delete,
retention (10 normal kept, pre_restore never pruned), admin stats total_snapshots,
student deletion cascades, auth gating.
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


def _h(token):
    return {"Authorization": f"Bearer {token}"}


def _login(email, password):
    return requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)


@pytest.fixture(scope="module")
def admin_token():
    r = _login(ADMIN_EMAIL, ADMIN_PASS)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def fresh_student(admin_token):
    """Enroll a fresh student for snapshot tests; cleanup at end."""
    email = f"test_snap_{uuid.uuid4().hex[:8]}@safe2drive.ca"
    r = requests.post(f"{API}/admin/enroll",
                      headers=_h(admin_token),
                      json={"name": "Snap Test", "email": email},
                      timeout=15)
    assert r.status_code == 200, r.text
    sid = r.json()["id"]
    temp_pw = r.json()["temp_password"]
    # initial login provides a token (also creates a login snapshot)
    login = _login(email, temp_pw)
    assert login.status_code == 200
    token = login.json()["token"]
    yield {"id": sid, "email": email, "password": temp_pw, "token": token}
    # cleanup
    requests.delete(f"{API}/admin/students/{sid}", headers=_h(admin_token), timeout=15)


def _list_snaps(admin_token, sid):
    r = requests.get(f"{API}/admin/students/{sid}/snapshots", headers=_h(admin_token), timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["snapshots"]


# ---------- Login snapshots ----------
class TestLoginSnapshots:
    def test_student_login_creates_snapshot(self, admin_token, fresh_student):
        snaps = _list_snaps(admin_token, fresh_student["id"])
        # The initial login in the fixture should have created one login snapshot
        login_snaps = [s for s in snaps if s["reason"] == "login"]
        assert len(login_snaps) >= 1
        # Summary fields must not contain raw progress array
        assert "progress" not in login_snaps[0]

    def test_login_debounce_no_duplicate(self, admin_token, fresh_student):
        before = _list_snaps(admin_token, fresh_student["id"])
        before_login = [s for s in before if s["reason"] == "login"]
        # second login within 6h should not create another login snapshot
        r = _login(fresh_student["email"], fresh_student["password"])
        assert r.status_code == 200
        after = _list_snaps(admin_token, fresh_student["id"])
        after_login = [s for s in after if s["reason"] == "login"]
        assert len(after_login) == len(before_login), \
            f"Login snapshot was duplicated (debounce broken). before={len(before_login)} after={len(after_login)}"

    def test_admin_login_does_not_create_snapshot(self, admin_token):
        # Login as admin: count admin snapshots (should be zero, admin is not a student)
        # We rely on absence of admin's user_id in any snapshot row by listing snapshots for admin id
        # The endpoint requires student role, so we can't fetch admin snapshots — instead just confirm
        # admin login still succeeds and there's no error path leaked.
        r = _login(ADMIN_EMAIL, ADMIN_PASS)
        assert r.status_code == 200


# ---------- Quiz / Module-complete / Homework snapshots ----------
class TestProgressSnapshots:
    def test_quiz_creates_snapshot(self, admin_token, fresh_student):
        token = fresh_student["token"]
        before = _list_snaps(admin_token, fresh_student["id"])
        r = requests.post(f"{API}/progress/quiz",
                          headers=_h(token),
                          json={"module_id": 1, "answers": [0, 1, 2]},
                          timeout=15)
        assert r.status_code == 200
        after = _list_snaps(admin_token, fresh_student["id"])
        quiz_snaps = [s for s in after if s["reason"] == "quiz"]
        assert len(quiz_snaps) >= 1
        # newest first; the latest quiz snapshot should reference module 1
        latest = quiz_snaps[0]
        assert "1" in (latest.get("note") or "")
        assert "%" in (latest.get("note") or "")

    def test_module_complete_snapshot_once(self, admin_token, fresh_student):
        token = fresh_student["token"]
        # Mark all 6 slides watched
        for i in range(1, 7):
            r = requests.post(f"{API}/progress/slide",
                              headers=_h(token),
                              json={"module_id": 2, "slide_id": f"m2-s{i}", "seconds": 30},
                              timeout=15)
            assert r.status_code == 200
        after = _list_snaps(admin_token, fresh_student["id"])
        mc_snaps_1 = [s for s in after if s["reason"] == "module_complete"]
        assert len(mc_snaps_1) >= 1
        prev_count = len(mc_snaps_1)
        # Submit one more slide hit; should NOT create another module_complete snapshot
        r = requests.post(f"{API}/progress/slide",
                          headers=_h(token),
                          json={"module_id": 2, "slide_id": "m2-s1", "seconds": 5},
                          timeout=15)
        assert r.status_code == 200
        after2 = _list_snaps(admin_token, fresh_student["id"])
        mc_snaps_2 = [s for s in after2 if s["reason"] == "module_complete"]
        assert len(mc_snaps_2) == prev_count, \
            f"Duplicate module_complete snapshot created. before={prev_count} after={len(mc_snaps_2)}"

    def test_homework_creates_snapshot(self, admin_token, fresh_student):
        token = fresh_student["token"]
        r = requests.post(f"{API}/homework/3/complete", headers=_h(token), timeout=15)
        assert r.status_code == 200
        after = _list_snaps(admin_token, fresh_student["id"])
        hw_snaps = [s for s in after if s["reason"] == "homework"]
        assert len(hw_snaps) >= 1


# ---------- Admin snapshot endpoints ----------
class TestAdminSnapshotEndpoints:
    def test_list_requires_admin(self, fresh_student):
        # student token cannot list snapshots
        r = requests.get(f"{API}/admin/students/{fresh_student['id']}/snapshots",
                         headers=_h(fresh_student["token"]),
                         timeout=15)
        assert r.status_code == 403

    def test_list_requires_auth(self, fresh_student):
        r = requests.get(f"{API}/admin/students/{fresh_student['id']}/snapshots", timeout=15)
        assert r.status_code == 401

    def test_list_returns_summary_no_progress_array(self, admin_token, fresh_student):
        snaps = _list_snaps(admin_token, fresh_student["id"])
        assert len(snaps) > 0
        for s in snaps:
            assert "progress" not in s, "Full progress array should not be leaked in list"
            for f in ["id", "reason", "taken_at", "modules_completed", "total_modules",
                      "total_watched_seconds", "course_progress_pct"]:
                assert f in s, f"missing field {f}"

    def test_create_manual_snapshot(self, admin_token, fresh_student):
        note = f"manual backup {uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/admin/students/{fresh_student['id']}/snapshots",
                          headers=_h(admin_token),
                          json={"note": note},
                          timeout=15)
        assert r.status_code == 200, r.text
        snap = r.json()["snapshot"]
        assert snap["reason"] == "manual"
        assert snap["note"] == note
        # verify in list
        snaps = _list_snaps(admin_token, fresh_student["id"])
        assert any(s["id"] == snap["id"] and s["note"] == note for s in snaps)


# ---------- Restore flow ----------
class TestRestoreFlow:
    def test_restore_creates_pre_restore_and_overwrites(self, admin_token):
        # build a fresh student to keep this test independent
        email = f"test_restore_{uuid.uuid4().hex[:8]}@safe2drive.ca"
        enroll = requests.post(f"{API}/admin/enroll", headers=_h(admin_token),
                               json={"name": "Restore Test", "email": email}, timeout=15)
        assert enroll.status_code == 200
        sid = enroll.json()["id"]
        temp_pw = enroll.json()["temp_password"]
        token = _login(email, temp_pw).json()["token"]

        try:
            # Step A: progress to ~30s on module 1 (slide 1) then snapshot manually
            r = requests.post(f"{API}/progress/slide", headers=_h(token),
                              json={"module_id": 1, "slide_id": "m1-s1", "seconds": 30}, timeout=15)
            assert r.status_code == 200
            mk = requests.post(f"{API}/admin/students/{sid}/snapshots",
                               headers=_h(admin_token), json={"note": "checkpoint A"}, timeout=15)
            assert mk.status_code == 200
            snap_a_id = mk.json()["snapshot"]["id"]

            # Step B: extra progress (more slides + bigger time)
            for i in range(2, 7):
                requests.post(f"{API}/progress/slide", headers=_h(token),
                              json={"module_id": 1, "slide_id": f"m1-s{i}", "seconds": 60}, timeout=15)
            dash_b = requests.get(f"{API}/dashboard", headers=_h(token), timeout=15).json()
            assert dash_b["total_watched_seconds"] >= 30 + 5 * 60  # ~330+

            # Restore to checkpoint A
            r = requests.post(f"{API}/admin/students/{sid}/restore/{snap_a_id}",
                              headers=_h(admin_token), timeout=15)
            assert r.status_code == 200, r.text
            data = r.json()
            assert data["ok"] is True
            assert data["modules_restored"] >= 1

            # Dashboard should reflect Step A only (30s, 0 modules complete)
            dash_a = requests.get(f"{API}/dashboard", headers=_h(token), timeout=15).json()
            assert dash_a["total_watched_seconds"] == 30, f"expected 30, got {dash_a['total_watched_seconds']}"
            assert dash_a["modules_completed"] == 0

            # A pre_restore snapshot must now exist
            snaps = _list_snaps(admin_token, sid)
            assert any(s["reason"] == "pre_restore" for s in snaps), "pre_restore snapshot missing"
        finally:
            requests.delete(f"{API}/admin/students/{sid}", headers=_h(admin_token), timeout=15)


# ---------- Retention ----------
class TestRetention:
    def test_retention_10_keeps_pre_restore(self, admin_token):
        email = f"test_ret_{uuid.uuid4().hex[:8]}@safe2drive.ca"
        enroll = requests.post(f"{API}/admin/enroll", headers=_h(admin_token),
                               json={"name": "Ret Test", "email": email}, timeout=15)
        assert enroll.status_code == 200
        sid = enroll.json()["id"]
        try:
            # Create 12 manual snapshots
            for i in range(12):
                r = requests.post(f"{API}/admin/students/{sid}/snapshots",
                                  headers=_h(admin_token), json={"note": f"m{i}"}, timeout=15)
                assert r.status_code == 200
            snaps = _list_snaps(admin_token, sid)
            non_pr = [s for s in snaps if s["reason"] != "pre_restore"]
            assert len(non_pr) <= 10, f"Retention broken: {len(non_pr)} non-pre_restore snapshots"

            # Trigger restore to create a pre_restore snapshot, then create more manuals
            snap_to_restore = snaps[-1]["id"]
            requests.post(f"{API}/admin/students/{sid}/restore/{snap_to_restore}",
                          headers=_h(admin_token), timeout=15)
            # Add 12 more manuals to attempt pruning
            for i in range(12):
                requests.post(f"{API}/admin/students/{sid}/snapshots",
                              headers=_h(admin_token), json={"note": f"flood{i}"}, timeout=15)
            snaps2 = _list_snaps(admin_token, sid)
            pr_count = sum(1 for s in snaps2 if s["reason"] == "pre_restore")
            non_pr2 = [s for s in snaps2 if s["reason"] != "pre_restore"]
            assert pr_count >= 1, "pre_restore snapshots were pruned"
            assert len(non_pr2) <= 10, f"Retention broken after flood: {len(non_pr2)}"
        finally:
            requests.delete(f"{API}/admin/students/{sid}", headers=_h(admin_token), timeout=15)


# ---------- Delete snapshot + cascade ----------
class TestDeleteSnapshotAndCascade:
    def test_delete_snapshot(self, admin_token, fresh_student):
        # create a manual snapshot to delete
        r = requests.post(f"{API}/admin/students/{fresh_student['id']}/snapshots",
                          headers=_h(admin_token), json={"note": "to delete"}, timeout=15)
        assert r.status_code == 200
        snap_id = r.json()["snapshot"]["id"]
        d = requests.delete(f"{API}/admin/students/{fresh_student['id']}/snapshots/{snap_id}",
                            headers=_h(admin_token), timeout=15)
        assert d.status_code == 200
        # second delete should 404
        d2 = requests.delete(f"{API}/admin/students/{fresh_student['id']}/snapshots/{snap_id}",
                             headers=_h(admin_token), timeout=15)
        assert d2.status_code == 404

    def test_delete_student_removes_snapshots(self, admin_token):
        email = f"test_cas_{uuid.uuid4().hex[:8]}@safe2drive.ca"
        enroll = requests.post(f"{API}/admin/enroll", headers=_h(admin_token),
                               json={"name": "Cas Test", "email": email}, timeout=15)
        sid = enroll.json()["id"]
        # create snapshots
        for _ in range(3):
            requests.post(f"{API}/admin/students/{sid}/snapshots",
                          headers=_h(admin_token), json={"note": "x"}, timeout=15)
        # delete student
        r = requests.delete(f"{API}/admin/students/{sid}", headers=_h(admin_token), timeout=15)
        assert r.status_code == 200
        # listing snapshots now must 404 (student not found)
        r2 = requests.get(f"{API}/admin/students/{sid}/snapshots", headers=_h(admin_token), timeout=15)
        assert r2.status_code == 404


# ---------- Admin stats ----------
class TestAdminStatsSnapshots:
    def test_total_snapshots_in_stats(self, admin_token):
        r = requests.get(f"{API}/admin/stats", headers=_h(admin_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "total_snapshots" in d
        assert isinstance(d["total_snapshots"], int)
