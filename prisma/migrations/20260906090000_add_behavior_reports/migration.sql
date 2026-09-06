-- CreateEnum
CREATE TYPE "BehaviorReportStatus" AS ENUM ('pending', 'approved', 'cancelled');

-- CreateTable
CREATE TABLE "behavior_reports" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "BehaviorReportStatus" NOT NULL DEFAULT 'pending',
    "member_name_snap" TEXT NOT NULL,
    "player_name_snap" TEXT NOT NULL,
    "decided_by" TEXT,
    "decided_at" TIMESTAMP(3),
    "decision_note" TEXT,
    "behavior_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "behavior_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "behavior_reports_behavior_id_key" ON "behavior_reports"("behavior_id");

-- CreateIndex
CREATE INDEX "behavior_reports_status_idx" ON "behavior_reports"("status");

-- CreateIndex
CREATE INDEX "behavior_reports_member_id_idx" ON "behavior_reports"("member_id");

-- CreateIndex
CREATE INDEX "behavior_reports_player_id_idx" ON "behavior_reports"("player_id");

-- CreateIndex
CREATE INDEX "behavior_reports_created_at_idx" ON "behavior_reports"("created_at");

-- AddForeignKey
ALTER TABLE "behavior_reports" ADD CONSTRAINT "behavior_reports_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavior_reports" ADD CONSTRAINT "behavior_reports_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavior_reports" ADD CONSTRAINT "behavior_reports_behavior_id_fkey" FOREIGN KEY ("behavior_id") REFERENCES "behaviors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
