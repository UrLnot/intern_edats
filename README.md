# eDTS (Electronic Document Tracking System)

This repository contains the eDTS web app used to create, track, forward, and archive documents, with due-date tracking and per-step history.

- User guide: [USER_GUIDE.md](./USER_GUIDE.md)

## Features

- Dashboard with **Active / Archive** views
- Statistics:
  - Active: Total / Pending / Overdue
  - Archive: Total / Completed Overdue / Completed
  - Document type counts (chips)
- Search and section filtering
- Create document with:
  - Section (fixed list)
  - Document type (fixed list)
  - Due type (Simple/Technical/Highly Technical)
  - Remarks + Action Required
- Forwarding workflow with:
  - Section locked after first set (enforced server-side)
  - Receiver dropdown populated from the employees table and filtered by section
- Details page with:
  - Tracking history
  - Per-step duration and total time to finish
- Attachments upload/download

## Tech Stack

- Next.js (App Router)
- React
- MySQL (mysql2/promise) connection pool
- Tailwind CSS

## Requirements

- Node.js (LTS recommended)
- MySQL 8+ (or compatible)

## Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create environment variables for DB + login credentials.

Required (defaults shown):

```bash
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=edats_db

# Set these for hosted providers like Aiven when SSL/TLS is required
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=true

# Optional: provide the CA certificate directly or point to a local file
DB_SSL_CA=
DB_SSL_CA_PATH=

# Login (defaults to pmd_admin / pmd_admin if not set)
EDATS_USERNAME=pmd_admin
EDATS_PASSWORD=pmd_admin

# Session cookie token (defaults to "edats-internal-session" if not set)
EDATS_SESSION_TOKEN=change-me
```

Notes:

- Copy `.env.example` to `.env.local` and fill in your real values.
- This app uses `mysql2`, so your hosted database must be MySQL-compatible.
- If your provider requires TLS, set `DB_SSL=true`.
- For Aiven, use the service host, port, username, password, and database name from the service overview.
- If Aiven provides a CA certificate, use `DB_SSL_CA` or `DB_SSL_CA_PATH`.

### 3) Create database tables

The app expects these tables to exist:

- `edats_logs`
- `edats_steps`
- `edats_employees` (receiver dropdown source)
- `edats_attachments` (auto-created on first attachment upload)

Minimum expected columns (reference):

- `edats_logs`
  - `tracking_number` (PK)
  - `subject`
  - `document_type`
  - `status`
  - `archived` (0/1)
  - `created_at`
- `edats_steps`
  - `tracking_number` (FK to `edats_logs`)
  - `step_number` (1..n)
  - `sender`
  - `receiver`
  - `section`
  - `action_taken`
  - `action_required` (JSON/text)
  - `remarks`
  - `due_in` (`simple` | `technical` | `highlyTechnical`)
  - `date_forwarded` (DATE)
  - `date_received` (DATE, nullable)
  - `time_received` (TIME/VARCHAR, nullable)
  - `status` (`Pending` | `Completed`)
  - `created_at`
- `edats_employees`
  - `id` (PK)
  - `name`
  - `position`
  - `section`

## Run

### Development

```bash
npm run dev
```

- Local: http://localhost:3000

### Production

```bash
npm run build
npm run start
```

## Authentication

- Login endpoint: `POST /api/auth/login`
- Logout endpoint: `POST /api/auth/logout`
- Session cookie name: `edats_session`
- Default login (if env vars not set): `pmd_admin / pmd_admin`

## API (high-level)

- `GET /api/edats` (Active list)
- `GET /api/edats?archived=1` (Archive list)
- `GET /api/edats?counts=1` (Dashboard stats + doc-type counts)
- `POST /api/edats` (Create)
- `GET /api/edats/:trackingNumber` (Details)
- `PUT /api/edats/:trackingNumber` (Forward / Finalize / Edit some fields)
- `DELETE /api/edats/:trackingNumber` (Delete)
- `GET /api/employees` (Employees list)
- `GET /api/employees?section=...` (Employees filtered by section)

## Notes

- All due and “overdue” computations are normalized to **Asia/Manila**.
- “Overdue” means: now is past the due date’s end-of-day in Manila (11:59:59 PM).
