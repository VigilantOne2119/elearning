# Safe2Drive Ontario — MTO BDE Online LMS

## Original Problem Statement
Replace Safe2Drive Ontario's legacy LMS with a modern, MTO-approved-grade platform. Built strictly for Admin-provisioned students (no self-registration, no landing page). Must respect Safe2Drive Markham branding (red/black palette, Swiss-high-contrast aesthetic) and Ontario MTO BDE Curriculum guidelines. Robust cloud progress backups with admin-controlled restore are a hard requirement to prevent the student-progress-loss problem of the old tool.

## Personas
- **Admin (Safe2Drive Ontario staff)**: enrolls students, monitors progress, restores progress when needed.
- **Student (Ontario learner driver)**: completes the 20-hour MTO BDE program online — modules, quizzes, homework.

## Core Requirements (locked)
1. Custom JWT auth, no public registration.
2. Admin enrolls students → temporary password → forced password change on first login.
3. 8 MTO modules (placeholder content; instructor adds real content later).
4. Cloud-saved progress with snapshots and admin restore-to-previous-point feature.
5. UI based on Safe2Drive Markham branding (red #E60000 on white, Cabinet Grotesk + Satoshi).

## Architecture
```
/app/
├── backend/
│   ├── server.py            # FastAPI: auth, modules, progress, snapshots, admin
│   ├── tests/               # pytest regression + snapshot suites (39 tests)
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/           # Login, Dashboard, Courses, ModuleViewer, Quizzes,
│   │   │                    # Homework, AdminDashboard, ChangePassword
│   │   ├── components/      # AppLayout, ProtectedRoute, ProgressRing
│   │   ├── lib/             # api.js, auth.jsx
│   │   └── index.css        # CSS vars + Swiss/red theme
│   └── package.json
└── memory/                  # PRD.md, test_credentials.md
```

### Data Model
- `users` { id, email, name, password_hash, role, must_change_password, created_at }
- `modules` { id, title, subtitle, image_url, duration_minutes, slides[], quiz[] }
- `progress` { user_id, module_id, watched_seconds, watched_slide_ids[], quiz_*, homework_complete, module_complete, last_slide_id, updated_at }
- `progress_snapshots` { id, user_id, reason, note, taken_at, progress[], modules_completed, total_watched_seconds, course_progress_pct }

### Snapshot Policy
- **Reasons**: `login` (debounced 6 h) | `quiz` | `module_complete` (only on transition) | `homework` | `manual` | `pre_restore`
- **Retention**: last 10 non-`pre_restore` snapshots auto-pruned; `pre_restore` snapshots **never pruned**
- **Restore**: creates a `pre_restore` safety snapshot, then overwrites the user's progress with the chosen snapshot

### Key API Endpoints
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password`
- `GET /api/modules`, `GET /api/modules/{id}`, `GET /api/dashboard`
- `POST /api/progress/slide`, `POST /api/progress/quiz`, `POST /api/homework/{module_id}/complete`
- `GET /api/admin/students`, `POST /api/admin/enroll`, `DELETE /api/admin/students/{id}`, `POST /api/admin/students/{id}/reset-password`
- `GET /api/admin/stats` (now includes `total_snapshots`)
- **NEW** `GET /api/admin/students/{user_id}/snapshots`
- **NEW** `POST /api/admin/students/{user_id}/snapshots` body `{note}`
- **NEW** `POST /api/admin/students/{user_id}/restore/{snapshot_id}`
- **NEW** `DELETE /api/admin/students/{user_id}/snapshots/{snapshot_id}`

## Changelog
- **2026-06-08 — Iteration 2** ✅ tested (39/39)
  - Backend: progress snapshots collection, auto-snapshot on login/quiz/module-complete/homework, debounce + retention + pre_restore safety.
  - Backend: 4 new admin snapshot endpoints (list, create manual, restore, delete) + cascade snapshot cleanup on student delete; `admin/stats` adds `total_snapshots`.
  - Frontend: `SnapshotsModal` in admin dashboard with history list, reason badges, manual save, restore-with-confirm, delete. New 5th stat card "Cloud snapshots". Login hero shows "MTO BDE · Markham, Ontario" badge.
- **2026-06-08 — Iteration 1** ✅ tested (100%)
  - Custom JWT auth (cookies + bearer), admin/student roles.
  - Admin-only enrollment with temporary-password flow + forced first-login password change.
  - 8-module course framework, slide viewer, dashboard, quizzes, homework, admin console.
  - Public registration & landing page removed per user requirement.

## Roadmap
### P0 — Done
- Cloud progress snapshots + admin restore ✅
- Safe2Drive branding (red/black/Cabinet Grotesk) ✅
- Markham/Ontario brand badge ✅

### P1 — Next
- Integrate MTO BDE Curriculum constraints into module logic: enforce minimum-time-per-slide, daily 5-hour cap, sequential progression rules (no module N+1 until module N quiz passed).
- Wire real instructor content into modules (replace placeholder slides/quizzes).
- Email delivery of enrollment credentials (Resend/SendGrid integration) — currently admin copies temp password manually.

### P2 — Backlog
- Final-test module (20-hour completion exam) with score gating.
- Audit log of admin actions (restores, deletes, password resets).
- Student "review snapshot history" read-only view.
- Refactor `server.py` into `routers/` + `services/` (currently 806 lines).
- Bulk CSV enrollment.
- Certificate / completion PDF generation.

## Test Credentials
See `/app/memory/test_credentials.md`.
