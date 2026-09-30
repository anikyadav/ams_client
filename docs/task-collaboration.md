# Task collaboration

Comment editing belongs to the author, for both staff and auditors. Auditors cannot rewrite staff comments. The API enforces authorship, engagement visibility and fiscal-year scope; existing auditor deletion permissions remain in place.

Staff can update their assigned tasks from Dashboard, My work, or the engagement page. The dashboard offers Open, Complete, and All task views; auditors see team tasks.

Enter an optional progress comment, then choose 25%, 50%, 75%, or 100%. Selecting 100% sets the task status to DONE. Selecting a lower milestone reopens it. Discussion & updates opens the task conversation, where staff and auditors can post follow-up comments without changing progress.

The backend accepts an optional `comment` (1–2000 characters after trimming) alongside `progress` or `status` on `PATCH /subtasks/:id`. It saves the task and an attributed, timestamped progress comment in one database transaction. Existing status-only and progress-only requests remain supported. Inconsistent status/progress combinations are rejected. Staff updates remain restricted to their own tasks and the selected fiscal year.

Primary staff can also update an assigned engagement directly, including engagements without sub-tasks. My work, Dashboard, and the engagement page show an Update engagement progress form. Choose a milestone, add an optional comment, and select Save progress update. 100% sets the engagement to COMPLETE; a lower milestone reopens it as IN_PROGRESS. Auditors can also update engagement milestones. Delivered engagements must first be reopened by an auditor.

`PATCH /engagements/:id/progress` accepts `progress` (25, 50, 75, 100) and an optional `comment`. Only the primary assignee or an auditor can use it, within the selected fiscal year. It saves progress, status, and a discussion entry atomically. Explicit engagement progress takes precedence over the sub-task average; sub-task completion remains separately tracked.

Engagement queries refresh every 10 seconds while the page is active, as well as after local mutations. Both dashboards use the same persisted completion records.

Deploy the frontend and backend changes together and run `npm run db:deploy` in the backend to apply `20260920070000_engagement_progress`. This adds nullable engagement progress without modifying existing records. The migration has been applied to the configured development database.
