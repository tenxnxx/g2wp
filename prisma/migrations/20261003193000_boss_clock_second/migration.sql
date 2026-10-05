ALTER TABLE "bosses" ADD COLUMN "clock_second" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "bosses"
  ADD CONSTRAINT "bosses_clock_second_check"
  CHECK ("clock_second" >= 0 AND "clock_second" <= 59);
