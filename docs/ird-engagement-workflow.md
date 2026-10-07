# Engagement tasks and client IRD details

Every engagement has six compulsory tasks: Document, Vat Reco, Sales Reco, Purchase Reco, Sales Confirmation, and Purchase Confirmation. New engagements assign these initially to the primary staff member and record creation activity for every task. Required tasks cannot be deleted through the API, and a unique engagement/template key prevents duplicate required identities. Extra work uses **Create new sub-task** in the separate Additional sub-tasks section; Any other is no longer a default task. Auditors can reassign tasks, set deadlines and priority, and use existing progress and discussions. Steps inside tasks 2–6 are awaiting the firm's definitions.

The engagement workspace defaults to the numbered Checklist view. Each task has **Open details & activity**, showing its fields and its own activity history with actor and timestamp. Board, List and Timeline remain available. Staff retain their existing visibility restrictions.

Sub-tasks contain **Activities**, replacing the old Steps label. Auditors define activities; auditors and assigned staff complete or reopen them. Progress is the percentage of completed activities. Every activity must be complete before the sub-task reaches 100%, and manual status/milestone controls cannot bypass an activity list. Completing all sub-tasks automatically completes the engagement; reopening work or adding an incomplete activity/sub-task reopens the engagement. Removing the last activity resets its sub-task to Not started instead of treating an empty list as complete. Sub-tasks without defined activities retain manual progress for existing workflows. Existing activities and endpoints are preserved; no database migration is required.

Auditor sign-off is tracked separately from work completion. Staff completion still submits a sub-task for review, but engagement completion follows sub-task completion automatically. Delivery still requires all sub-tasks complete and compulsory tasks approved. Requesting changes reopens the last completed activity so the activity list and task status agree.

Migration `20261007010000_six_required_tasks` adds missing required tasks to existing engagements, adopts the earliest exact matching task where possible, and preserves duplicate records as additional work. Unused Any other placeholders are removed only when they have no progress, description, deadline, comments or activity. Entries with recorded work are retained as additional sub-tasks. Existing completed engagements keep their status; this upgrade enforces task presence, not a new completion/CA approval policy.

Document holds the client's registration number, IRD website user ID and password, and next renewal date through the existing BS calendar picker. The same fields are available on the client profile, including clients without engagements. These credentials are for the IRD tax portal and do not affect application accounts.

Details are stored once per client fiscal-year profile and reused across that client's engagements. When opening a fiscal year with the existing copy-clients option, IRD details are copied and passwords re-encrypted for the new profile. Each year remains independent. A copied renewal date should be reviewed for the new year.

Auditors can manage every client's IRD details. Staff can manage and reveal details through Document tasks assigned to them. Staff cannot access the client credential administration endpoints or export. A primary staff member without an assigned Document task cannot access credentials just because they can see the engagement.

Passwords are encrypted using AES-256-GCM with a separate `IRD_CREDENTIAL_ENCRYPTION_KEY` and a fresh nonce for each write. Ordinary client, engagement and task responses exclude passwords and ciphertext. Password editing uses a masked input; leaving it blank preserves the saved value, and an explicit checkbox clears it. Readable passwords appear only after a server-validated addition challenge. Challenges expire after two minutes and are bound to actor, client/action and fiscal year. The calculation is an accidental-reveal guard; authenticated role and assignment checks enforce access. The challenge can be reused by the same authorized actor within its two-minute lifetime.

Revealed passwords remain only in component state, hide after 30 seconds or window blur/tab visibility change, and disappear when the component closes. Passwords and export contents are never placed in React Query caches or browser storage. Detail changes, reveals and exports write credential access logs without secret values. Document changes identify the changed numbered fields in each related Document task's activity, including edits from the client profile, without logging field values. Reveals made from a Document task appear in that task's activity.

On Clients, **Export IRD credentials** downloads an Excel workbook containing all clients in the selected fiscal year, sorted by name, with Client name, IRD user ID and IRD password columns. Blank credentials remain blank. Search filters do not restrict the export. It requires AUDITOR access and a separate calculation. Cells are strings so leading zeroes and formula-like passwords retain their exact values. The workbook contains readable passwords and is not file-encrypted; keep it private.

## Backend setup

Backend: `D:/Professional/Audit_SAS/audit_sas_server/backend`.

1. Install dependencies (`npm install`; ExcelJS is used on the server).
2. Run `node scripts/setup-ird-key.cjs`. It creates a random key in `.env` only if none exists and never prints the key. Back up the key securely alongside the encrypted database; do not replace it without re-encrypting stored passwords. A missing key disables password saving/revealing/export, while other application features still work.
3. Generate Prisma and apply migrations `20261007000000_engagement_document` and `20261007010000_six_required_tasks`. For a database with a complete migration baseline, use the normal migration deployment process. Do not replay historical migrations against an unbaselined database.
4. Restart the backend so it reads the encryption key and updated routes.

On 2026-10-07 the configured database received both migrations in transactions with the verified `public` schema explicitly selected. Its previous default search path did not resolve the existing tables. These direct SQL applications do not add Prisma migration-history records. A schema comparison should be used to confirm the database matches the Prisma schema.

## Suggested next workflow additions

- Define checklist steps for tasks 2–6, including required evidence and a clear completion rule.
- Add a staff submission → CA review → approval workflow before an engagement can be delivered.
- Add renewal reminders and an auditor queue for upcoming and overdue client renewals.
- Add an auditor view of credential access logs and a controlled process for key rotation.

These are proposed follow-up changes, not implemented checklist or approval features.
