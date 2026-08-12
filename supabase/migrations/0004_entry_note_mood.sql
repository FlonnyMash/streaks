-- Adds an optional note and a 3-level mood rating to each streak entry.
-- Both are only meaningful on completed days; the UI only ever sets them
-- alongside (or after) marking a day complete, and clears them when a day
-- is unmarked (the row is deleted, per the existing toggle behavior).

alter table public.streak_entries
  add column if not exists note text check (char_length(note) <= 500),
  add column if not exists mood smallint check (mood between 1 and 3);
