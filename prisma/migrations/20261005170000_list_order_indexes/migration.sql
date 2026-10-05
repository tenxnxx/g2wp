-- List pages order by created_at. Check-in open filters live members by name.
CREATE INDEX "members_created_at_idx" ON "members"("created_at");
CREATE INDEX "members_is_live_name_idx" ON "members"("is_live", "name");
CREATE INDEX "players_created_at_idx" ON "players"("created_at");
CREATE INDEX "behaviors_created_at_idx" ON "behaviors"("created_at");
CREATE INDEX "check_events_created_at_idx" ON "check_events"("created_at");
