# LabScan

A learning platform for lab experiments, accessed by scanning an **ArUco marker**
(with **QR fallback**). Students progress through a **Learning** stage and a
**Visual** stage (timed videos with active-tab enforcement), complete a
**checklist**, and reach a completion screen shown physically to faculty — there
is no in-app submission or grading. Admins author content, manage labs and
student accounts, and assign markers. An unauthenticated **Ghost Mode** lets
anyone browse learning content and videos freely with no timers or tracking.

## Tech stack

| Layer     | Choice                                             |
| --------- | -------------------------------------------------- |
| Backend   | Node.js + Express (REST API), ES modules           |
| Database  | MySQL 8 (`mysql2`)                                 |
| Frontend  | React 18 + React Router 6 (Vite)                   |
| Auth      | JWT access + refresh tokens, bcrypt                 |
| Storage   | S3-compatible (signed URLs) for faculty media      |
| Validation| Zod                                                |

## Repository layout

```
labscan-platform/
├── server/          # Express REST API + MySQL schema/migrations
│   ├── src/
│   │   ├── config/      # env + db pool
│   │   ├── db/          # schema.sql, migrate.js, seed.js
│   │   ├── middleware/  # auth, rbac, rate limit, validation, errors
│   │   ├── controllers/ # auth, users, labs, experiments, content, sessions, ghost, audit
│   │   ├── routes/      # /auth /admin /student /ghost
│   │   ├── schemas/     # content block + video-link schemas
│   │   └── utils/       # jwt, password, audit, storage (signed URLs)
│   └── test/            # vitest unit tests
└── client/          # React + Vite SPA
    └── src/
        ├── api/         # fetch client with transparent token refresh
        ├── context/     # AuthContext
        ├── components/  # Navbar, ProtectedRoute, ContentBlocks, VideoTimer
        └── pages/       # home, login, ghost/, student/, admin/
```

## Quick start (local)

Prerequisites: Node.js ≥ 20, and MySQL 8 (Docker is easiest).

```bash
# 1. Start MySQL
docker compose up -d

# 2. Backend
cd server
cp .env.example .env
npm install
npm run migrate      # creates the database + tables (idempotent)
npm run seed         # creates admin/student + a demo experiment
npm run dev          # http://localhost:4000

# 3. Frontend (new terminal)
cd client
cp .env.example .env
npm install
npm run dev          # http://localhost:5173
```

Seeded credentials (change via `server/.env`):

- Admin: `admin` / `admin12345`
- Student: `student` / `student12345`
- Demo marker: `ARUCO-DEMO-0001`

## Core concepts

### Roles & entry points
- **Student** — logs in, scans a marker, works through stages + checklist.
- **Admin** — manages labs, experiments, content versions, student accounts, markers; views the audit log.
- **Ghost Mode** — no login/account/tracking; learning content + videos only.

### Content versioning
Content lives in immutable `experiment_content_versions`. Publishing a new
version bumps the experiment's `active_content_version_id`. A student session
**snapshots** the active version at start, so later admin edits never affect
in-progress or completed sessions.

### Structured content blocks
Theory/procedure is stored as a JSON array of typed blocks
(`heading`, `text`, `warning`, `equation`, `video_link`) — safe to render and
easy to edit with the built-in block editor. No third-party rich-text library.

### Visual-stage timers & active-tab enforcement
Each video declares a `min_duration` (faculty = 300s, youtube/virtual = 60s by
default). The client accumulates **active-tab** watch time only — the timer
pauses on `visibilitychange` (Page Visibility API) and resumes when visible.
The backend validates accumulated time before allowing the Visual stage to
complete.

### Signed URLs
Faculty-recorded/uploaded media is served via short-lived signed URLs generated
on demand (never persisted). Configure `S3_*` in `server/.env` (AWS S3,
Cloudflare R2, MinIO, etc.). When unconfigured, media endpoints return 503 and
faculty videos are simply unavailable.

### Audit logging
Append-only `audit_logs` records sensitive admin actions (account
creation/deletion, content edits, marker reassignment, lab/experiment changes)
with actor, action, target, details, timestamp.

### Security basics
JWT access (`15m`) + refresh (`7d`) tokens, bcrypt password hashing, login rate
limiting, and role checks on every admin/student route. Refresh tokens carry a
`token_version` for revocation.

## API overview

Base path: `/api`

| Area    | Endpoints (prefix) |
| ------- | ------------------ |
| Auth    | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` |
| Admin   | `/admin/students`, `/admin/labs`, `/admin/labs/:labId/experiments`, `/admin/experiments/:id`, `/admin/experiments/:id/marker`, `/admin/experiments/:id/content-versions`, `/admin/media/upload-url`, `/admin/audit-logs` |
| Student | `GET /student/experiments`, `GET /student/scan/:marker`, `POST /student/sessions`, `GET/POST /student/sessions/:id/...` (learning-complete, video-progress, visual-complete, checklist/:itemId, complete, videos/:videoId/signed-url) |
| Ghost   | `GET /ghost/experiments`, `GET /ghost/experiments/:id`, `GET /ghost/scan/:marker` |

## Scripts

**server/**: `npm run dev` · `start` · `migrate` · `seed` · `lint` · `test`
**client/**: `npm run dev` · `build` · `preview` · `lint`

## Out of scope (by design)
No extra roles (faculty/HOD/sections), no submission uploads/grading, no
anti-cheat scoring beyond the timers + active-tab check, and no tracking or
persistence for Ghost Mode.
