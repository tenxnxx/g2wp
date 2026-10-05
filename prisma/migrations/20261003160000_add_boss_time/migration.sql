ALTER TABLE "bosses" ADD COLUMN "hour" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bosses" ADD COLUMN "minute" INTEGER NOT NULL DEFAULT 0;

UPDATE "bosses"
SET
  "hour" = EXTRACT(HOUR FROM (("created_at" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'))::int,
  "minute" = EXTRACT(MINUTE FROM (("created_at" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'))::int;

ALTER TABLE "bosses" ADD CONSTRAINT "bosses_hour_check" CHECK ("hour" >= 0 AND "hour" <= 23);
ALTER TABLE "bosses" ADD CONSTRAINT "bosses_minute_check" CHECK ("minute" >= 0 AND "minute" <= 59);
