# Supabase migrations

Database schema changes live in `supabase/migrations`. Never edit a migration that has already
been deployed. Add a new, ordered `*.sql` migration instead.

## Repeating tasks (0007)

Apply `0007_repeating_tasks.sql` to enable daily, weekly and 1–365 day intervals. Completion
creates one successor in the same transaction, with owner checks and a unique parent constraint.
It inherits task content, scheduled time, duration and reminder, clones unchecked subtasks, and
resets completion, One Thing and lock flags. Overdue instances advance along their original
interval to the first date after today (Asia/Shanghai), rather than creating a backlog.

Changing an instance does not rewrite history or an already created successor. Deleting one
instance does not cascade through the chain. See [stage delivery](../docs/stage-delivery-20260917.md).
The application disables repeat controls when the columns are absent; real database errors still
surface as errors. Production migration deployment succeeded in GitHub Actions run 34. On
2026-09-17, target-account acceptance completed a daily repeating task and confirmed the unique
successor on the following day.

## Workspace Realtime and search (0008-0009)

`0008_workspace_realtime.sql` adds the four workspace tables to `supabase_realtime` and sets their
replica identity to full rows for account-filtered Realtime delivery. `0009_task_search.sql`
creates the account-scoped `search_tasks` RPC and trigram indexes when the Supabase `extensions`
schema is available. Both migrations were deployed by GitHub Actions run 34. Live-project
acceptance has covered authenticated two-page sync, forced Realtime disconnect/reconnect,
concurrent version conflicts, and 33-row search pagination (30 + 3) with matching RPC/UI order.

## Notification lifecycle

Reading only marks a notification as read. Clearing persists `dismissed_at` and hides the current
rows without deleting their dedupe keys. Since migration `0010`, task reminders deduplicate on
`(user_id, dedupe_key)` where a task key includes the task and reminder time; rescheduling can
create the next reminder while catch-up scans cannot resurrect the old one. The workspace prunes
rows older than the account retention preference. Deleting a task cascades to its notifications.
Notification inserts and task reassignments must reference a task owned by the authenticated user.

## Insights, growth, account, and notification policies (0010-0012)

Migration `0010` adds focus-goal and notification preferences, permanent growth events/plants, and
the database-side insight aggregation. Migration `0011` validates account time zones, adds the
12/24-hour preference, scopes statistics and recurrence dates to the account time zone, and keeps
a minimal private account-deletion audit after Auth user deletion. Account export uses RLS-backed
reads and excludes credentials; account deletion itself requires the server-side service-role
configuration and never exposes that key to the browser.

Migrations `0010` and `0011` have been deployed by the production migration jobs. Migration
`0012_fix_real_notifications.sql` allows the account's task-free daily digest while keeping task
reminders tied to an owned task, fixes read updates for aggregate notifications, and was deployed
by the production migration job in GitHub Actions run 40. The in-memory PostgreSQL suite
executes every migration from `0001` through `0012` and verifies the RLS, dedupe, month-boundary,
reward idempotency, preference validation, notification policy, and cascade behavior.

## Automatic production deployment

The `deploy-supabase-migrations` job in `.github/workflows/ci.yml` runs after the application check
job succeeds for a push to `main`. It links the production project, previews pending migrations,
and applies only migrations that are not present in Supabase's migration history.

Configure these encrypted secrets in the GitHub `Production` environment under **Settings →
Environments → Production**. The workflow is explicitly bound to this environment:

- `SUPABASE_ACCESS_TOKEN`: a Supabase personal access token.
- `SUPABASE_PROJECT_ID`: the project reference from
  `https://supabase.com/dashboard/project/<project-ref>`.
- `SUPABASE_DB_PASSWORD`: the database password for that project.

The publishable/anonymous API key is intentionally not used for schema deployment because it does
not have database migration privileges.

For production safety, migration files should be forward-only and preferably additive. Test risky
data migrations against a separate staging Supabase project before merging them into `main`.
