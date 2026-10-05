ALTER TABLE "bosses" ADD COLUMN "board_lane" TEXT;

ALTER TABLE "bosses"
  ADD CONSTRAINT "bosses_board_lane_check"
  CHECK ("board_lane" IS NULL OR "board_lane" IN ('not', 'wait', 'ready'));
