-- Search / filter indexes
CREATE INDEX IF NOT EXISTS "members_name_idx" ON "members"("name");
CREATE INDEX IF NOT EXISTS "members_is_live_idx" ON "members"("is_live");
CREATE INDEX IF NOT EXISTS "players_name_idx" ON "players"("name");
CREATE INDEX IF NOT EXISTS "behaviors_description_idx" ON "behaviors"("description");
CREATE INDEX IF NOT EXISTS "set_dates_date_idx" ON "set_dates"("date");

-- At most one open check event at a time
CREATE UNIQUE INDEX IF NOT EXISTS "check_events_single_open_idx"
  ON "check_events" ("status")
  WHERE "status" = 'open';
