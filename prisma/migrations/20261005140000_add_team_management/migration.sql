-- CreateEnum
CREATE TYPE "TeamSlotType" AS ENUM ('waiting', 'main', 'reserve', 'inactive');

-- CreateEnum
CREATE TYPE "TeamSessionStatus" AS ENUM ('draft', 'active', 'completed');

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_use" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_sessions" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "status" "TeamSessionStatus" NOT NULL DEFAULT 'draft',
    "create_by" TEXT NOT NULL,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_assignments" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "team_id" TEXT,
    "slot_type" "TeamSlotType" NOT NULL DEFAULT 'waiting',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "create_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teams_is_use_idx" ON "teams"("is_use");

-- CreateIndex
CREATE INDEX "teams_sort_order_idx" ON "teams"("sort_order");

-- CreateIndex
CREATE INDEX "team_sessions_status_idx" ON "team_sessions"("status");

-- CreateIndex
CREATE INDEX "team_sessions_created_at_idx" ON "team_sessions"("created_at");

-- CreateIndex
CREATE INDEX "team_assignments_session_id_idx" ON "team_assignments"("session_id");

-- CreateIndex
CREATE INDEX "team_assignments_player_id_idx" ON "team_assignments"("player_id");

-- CreateIndex
CREATE INDEX "team_assignments_team_id_idx" ON "team_assignments"("team_id");

-- CreateIndex
CREATE INDEX "team_assignments_slot_type_idx" ON "team_assignments"("slot_type");

-- CreateIndex
CREATE INDEX "team_assignments_session_id_team_id_slot_type_sort_order_idx" ON "team_assignments"("session_id", "team_id", "slot_type", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "team_assignments_session_id_player_id_key" ON "team_assignments"("session_id", "player_id");

-- AddForeignKey
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "team_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
