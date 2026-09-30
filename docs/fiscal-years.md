# Nepali fiscal-year ownership

Each fiscal year covers 1 Shrawan through the end of Ashadh. The database stores an AD start date and exclusive AD end date (the next 1 Shrawan). The frontend converts BS entry and labels; timestamps display in Asia/Kathmandu. Date-only work dates retain their AD calendar day.

## Using the application

1. An auditor selects **Open fiscal year**, enters its starting BS year, and optionally chooses a source year for client profiles.
2. Opening the year creates separate client IDs with the same lineage ID and copied names. Creation timestamps are fresh. Engagements, tasks, comments, assignments, statuses and dates are never rolled forward.
3. Select a year to view its dashboard, clients, engagements and tasks. The selection persists across page refreshes in that user's browser session. Shared staff accounts remain global.
4. Create work in the audited year even if its actual start or filing date is later. Work dates do not determine fiscal ownership.
5. Use **Print engagement** for the engagement report, including the selected fiscal-year label and BS dates. BS input uses YYYY-MM-DD, including valid days 30?32 where supported by the calendar.

## Existing records

The additive migration preserves every existing record in `legacy`, shown as **Unassigned historical data**. Creation dates cannot identify an audited fiscal year. New clients and engagements cannot be created in this area.

Open the correct fiscal year first. In each historical engagement's detail screen, an auditor can confirm its reviewed fiscal year. This one-time assignment retains the engagement ID, original dates, tasks, comments, authors and timestamps. It creates or reuses that client's yearly profile. Once assigned, the engagement cannot move to another fiscal year through the API. Historical client records are retained; profiles without engagements can be carried forward when opening a year.

Historical years remain editable for ongoing filings. Fiscal ownership is fixed; this feature does not close accounting periods or introduce an immutable change log. Existing role-based editing and deletion permissions still apply within the selected year.

## API and integrity

All client, engagement, subtask and comment operations require `X-Fiscal-Year-Id`. Request-scoped services include that year in reads and writes. Nested records inherit their engagement's year. A composite database foreign key prevents cross-year client/engagement links. Fiscal-year ranges cannot overlap. Creation with copied clients and historical assignment both use transactions.

- `GET /fiscal-years`: list years (authenticated users).
- `POST /fiscal-years`: auditor opens a year with `{ startDate, endDate, copyFromId? }`, using AD date strings.
- `POST /fiscal-years/:id/assign-legacy`: auditor assigns `{ engagementId }` once from the unassigned area.

Query-cache keys contain the fiscal-year ID. API writes capture their originating year's header, and changing years unmounts open work forms.

## Calendar maintenance and rollout

Converter: [nepali-date-converter 3.4.0](https://github.com/subeshb1/Nepali-Date). Its supported dates are BS 2000?2090; complete fiscal-year creation supports start years 2000?2089. No approximate fixed year offset is used. The backend validates against an AD-only boundary allowlist generated from the same converter; it does not perform BS conversion at runtime. Regenerate that list with `node scripts/export-fiscal-boundaries.mjs <backend>/src/fiscal-years/fiscal-year-boundaries.ts` when updating the converter, then format and run boundary tests.

The backend migration is `20260919000000_fiscal_years`. Run `npm run db:deploy` and `npm run build` in the backend before serving the updated frontend. Restart the backend process to load the new endpoints. The migration has been applied to the configured database during this implementation.

Tax deadline rules, extensions, interest calculations and TCC workflows are not hardcoded by this change. They can be tracked as engagements and subtasks in the relevant audited fiscal year; dated obligations should be verified against current official notices before automating them.

Validation includes frontend build/lint, BS boundary and timezone tests, browser workflows for year switching/refresh/AD payloads, and real PostgreSQL tests in an isolated schema for rollover, cross-year reads/writes, unchanged history and legacy assignment.

## Dashboard at a glance

The dashboard uses the selected fiscal year's existing client and engagement APIs. It shows total clients (including profiles without work), engagement totals, open/completed counts, all five engagement stages, review and overdue totals, and task completion. Clicking a stage or attention filter displays matching engagements ordered by target date, with links to their detail pages.

Overdue means an open engagement whose target calendar day precedes today in Nepal. Upcoming includes today through seven days ahead. Complete and delivered engagements are excluded from alerts. Historical-year alerts compare with today, not the historical year-end. Task progress counts completed subtasks divided by all subtasks, rather than averaging engagement percentages. Staff see only their visible engagements and their own assigned task counts. Refresh reloads the selected year's data; creating or editing work updates the shared query cache.

## Client profile pages

For auditors, client names in the clients list, dashboard, and engagement views open `/clients/[id]`. Each dynamic profile shows the client's saved name, fiscal year, BS creation date, work totals, and that client's engagements with staff, dates, status and task progress. The profile provides Edit client and New engagement actions; new work defaults to the current client. Engagement titles open the individual audit job.

Profiles use the existing fiscal-year-scoped `GET /clients/:id` endpoint. Direct links and refreshes are supported. Selecting a different year does not silently substitute another client ID; an unavailable profile shows a clear message and a link back to the yearly clients list. Client access remains restricted to auditors, matching existing backend permissions.
