# Engagement workspace

Open Engagements for a searchable list of client engagements, status, owner, priority, task completion, progress and target date. Client profiles show the same list restricted to that client and fiscal year. Both the client name and work title open the engagement detail page.

Client add/edit forms (including engagement quick-add) capture name, PAN, address and file location. Name is required; the other fields are optional. PAN must be exactly nine digits when supplied and is stored as text to preserve leading zeros. Address uses the existing API `location` field. Clearing optional details sends null. These details appear in the client list and profile and are carried forward by the existing fiscal-year copy workflow.

Create and edit sub-tasks inside their engagement. Dashboard management links open that workspace. My work and dashboard task summaries still support staff progress updates and discussion.

The engagement workspace provides Board, List and Timeline views with shared search, status and assignee filters. Board columns group tasks by their saved status; status controls update the existing API. Every view shows the parent engagement, and task details retain that context. The timeline shows the engagement's start-to-target range and task deadlines as clickable milestones, with undated tasks explicitly unscheduled. It does not imply task start dates or finish-to-start dependencies that are not stored. The layout stacks on mobile; the timeline scrolls horizontally within its own container.

Sub-tasks have an optional BS due date and Low, Medium, High or Urgent priority (Medium by default). The API accepts calendar dates as AD YYYY-MM-DD and returns the stored date. Clearing a deadline sends null; omitted fields preserve existing values. Deadlines become overdue only after their calendar day in Nepal and completed tasks are excluded. Search, status and assignee filters apply within the engagement; tasks are ordered by due date, with undated tasks last.

Auditors manage planning fields. Staff keep their existing permissions to update their own task status/progress and comments. Tasks remain owned by their engagement, with fiscal-year scoping enforced by the backend.

Backend migration: `20260920090000_subtask_planning` adds nullable dueDate and a TaskPriority enum with a MEDIUM default for existing tasks. Generate Prisma and apply the migration before running the new backend. For a database managed previously with db push, establish its migration baseline before using migrate deploy; do not rerun the initial migration against existing tables.

The configured database was updated with this additive SQL on 2026-09-20, and a Prisma schema comparison confirmed no remaining differences. Its pre-existing migration history remains unbaselined; the SQL application does not create migration-history records.
