-- The Timesheet feature was archived to `_archived_timesheet_feature/` (see its
-- REUSE_GUIDE.md). This drops the app-level coupling between todos and Timesheet
-- workspaces. The `timesheet_*` tables themselves are intentionally left in place —
-- only this FK on `todos` is removed.

drop index if exists public.todos_workspace_id_idx;

alter table public.todos
  drop column if exists workspace_id;
