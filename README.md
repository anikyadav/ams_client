# Audit Practice — Engagement Management

Next.js App Router frontend for the existing NestJS / Prisma backend. This MVP implements Engagement / Job Management for AUDITOR and STAFF roles. Billing, documents, compliance calendars and other practice-management modules are out of scope.

## Run locally

Requirements: Node.js 22.12 or later, npm, and a running PostgreSQL database.

The existing apps remain separate:
- Frontend: `D:/Professional/Audit_SAS/audit_sas_client/audit_sas_client`
- Backend: `D:/Professional/Audit_SAS/audit_sas_server/backend`

### Backend

From `D:/Professional/Audit_SAS/audit_sas_server`:

```sh
docker compose up -d postgres
cd backend
npm ci
npm run setup:env
```

The setup script preserves an existing `.env`. Set `DATABASE_URL` to your intended PostgreSQL database before running migrations. Set `JWT_SECRET` to a random secret of at least 32 characters, `PORT=5000`, `CORS_ORIGIN=http://localhost:3000`, and a development `SEED_PASSWORD` (12 or more characters, at most 72 UTF-8 bytes). `NODE_ENV` defaults to development. Do not put database credentials or the JWT secret in the frontend.

```sh
npm run db:deploy
npm run prisma:generate
npm run db:seed
npm run start:dev
```

The development seed creates `auditor@example.com`, `staff1@example.com`, and `staff2@example.com`, with the configured initial `SEED_PASSWORD`. Re-seeding preserves existing passwords. API documentation: http://localhost:5000/docs. Database readiness: http://localhost:5000/health/ready.

### Frontend

From this directory:

```sh
npm ci
```

Copy `.env.example` to `.env.local` if the file does not exist, then set:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:5000
```

```sh
npm run dev
```

Open http://localhost:3000. `/` opens login; auditors land on `/dashboard`, staff on `/tasks`. There is no public registration. An auditor creates staff accounts from **Staff**.

## Workflows

- **Auditor:** create/edit/delete client names; create staff accounts; view all engagements; create engagements with an existing or quick-added client; edit all engagement fields and status; create/edit/reassign/delete subtasks; change task status; post, edit and delete comments.
- **Staff:** My work includes primary-staff assignments and engagements with at least one assigned subtask. It shows only the user's tasks; engagement detail shows the full task list and discussion. Staff can change only their own task statuses and post comments on any visible engagement or its subtasks.
- **Progress:** use the backend's rounded `DONE / total * 100`, zero for no tasks. Mutations refresh both the list and detail.
- **Comments:** oldest first, with author, timestamp and engagement/subtask scope.
- **Authentication:** JWT bearer access tokens, restored through `/auth/me`; expiry returns to login. Query caches clear on login/logout. Client and staff queries run only for auditors. The backend remains the authority for role and assignment enforcement.
- Client deletion with linked engagements is rejected by the API. Engagement deletion cascades to subtasks/comments; subtask deletion removes scoped comments.

## Verification

```sh
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser tests launch the production frontend on port 3100 and mock the API using the inspected backend contract. They cover role-specific workflows, quick-add client creation, task/comment mutations, progress, nullable date clearing, staff account creation, mobile navigation, session expiry and error recovery. They do not prove live database persistence. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can point to an existing Chromium executable.

The backend has separate real PostgreSQL tests:

```sh
cd D:/Professional/Audit_SAS/audit_sas_server/backend
npm run test:integration
```

These tests create and remove their own randomly named database schema. See [brief alignment](docs/brief-alignment.md) for implementation coverage and verification limits.
