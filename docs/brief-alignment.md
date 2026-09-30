# Brief alignment review

Reviewed 2026-09-18 against the supplied Engagement / Job Management brief and the source in `D:/Professional/Audit_SAS/audit_sas_server/backend`. Changes are confined to the frontend.

| Requirement | Frontend alignment |
| --- | --- |
| Login, no public registration, two roles | Login is the default entry, session restore uses `/auth/me`, auditor-created staff accounts only. |
| Auditor client CRUD; minimal client stub | Name-only client forms; edit/delete wired; linked-client deletion errors are shown. |
| Engagement list | Client, nature of work, status, primary staff, target date and progress; shared dashboard/list view. |
| Engagement creation and editing | Staff-only assignee dropdown; quick-add client; optional dates/priority; all five statuses; date inputs normalize ISO timestamps and empty optional fields send null. |
| Auditor subtask CRUD | Create, edit description/title/assignee, delete, and choose any of the three statuses. |
| Staff visibility | Includes primary OR subtask assignment. My work shows own tasks; detail preserves full context. |
| Staff mutation limits | No engagement/subtask creation or editing controls; only own task status or milestone PATCH, sending one of `progress` (0/25/50/75/100) or `status`; the backend derives the other and marks 100% complete. No auditor-only client/user requests. |
| Comments | Engagement or subtask scope, chronological author/timestamp thread; only the author may edit while retaining engagement access; auditors may delete; visible-engagement participants may post. |
| Progress | Backend-calculated percentage shown in lists, My work and detail; refreshed after mutations. |
| Runnable frontend | Build/type errors repaired; loading/error/retry states; browser regression suite; documented setup. |
| Scope limits | No billing, payments, documents, service catalog, compliance calendar, notifications, activity log or speculative client fields. |

## Backend observations

The inspected backend already uses JWT/Passport and role/assignment checks for the required routes. Engagement reads include the full subtask list and comments while staff list queries are assignment-scoped. Prisma schema, migrations and development seed are present. The existing frontend/backend directory names differ from the brief's suggested `/frontend` and `/backend` layout, but the applications remain clearly separated; they were not relocated.

One explicit implementation difference remains: the backend validates DTOs with `nestjs-zod` / Zod, not the brief's requested `class-validator`. The frontend matches the existing API contract. Changing backend validation technology is outside these frontend changes.

The backend README still describes frontend work as pending; this frontend README supplies the integrated local setup instructions.

## Verification record

- Production frontend build (including TypeScript): passed.
- ESLint and standalone TypeScript checks: passed.
- Frontend browser workflows: all five tests passed against API fixtures matching the inspected backend contract; not a live database end-to-end claim. Coverage includes role boundaries, full auditor task/comment workflows, client and staff forms, mobile navigation, session switching/expiry, and error recovery.
- Backend PostgreSQL integration suite: 14 of 21 passed on this run. Seven subtask/comment cases failed after the database connection terminated unexpectedly. This leaves live verification of those workflows incomplete; no backend code was changed to mask the failure.
- In-app browser connection failed before browser startup. Frontend browser checks use standalone headless Chromium.
