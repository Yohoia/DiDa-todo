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
surface as errors. Local migration tests do not mean the production migration has been deployed.

## Notification lifecycle

Notifications do not expire automatically. Reading only marks a notification as read. Clearing
the notification center persists `dismissed_at`, hides both read and unread notifications, and
keeps the original task reminder record for deduplication after refresh or catch-up scanning.
Deleting a task cascades to its notification. Notification inserts and task reassignments must
reference a task owned by the authenticated user (migration `0006`). Deploy this migration before
releasing the updated notification UI.

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
