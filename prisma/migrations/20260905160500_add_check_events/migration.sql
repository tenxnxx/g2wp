-- CreateEnum
CREATE TYPE "CheckEventStatus" AS ENUM ('draft', 'open', 'closed');

-- CreateEnum
CREATE TYPE "CheckMemberStatus" AS ENUM ('pending', 'approved', 'cancelled');

-- CreateTable
CREATE TABLE "check_events" (
    "id" TEXT NOT NULL,
    "set_date_id" TEXT NOT NULL,
    "title" TEXT,
    "status" "CheckEventStatus" NOT NULL DEFAULT 'draft',
    "create_by" TEXT NOT NULL,
    "opened_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "check_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_event_members" (
    "id" TEXT NOT NULL,
    "check_event_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "member_name_snapshot" TEXT NOT NULL,
    "status" "CheckMemberStatus" NOT NULL DEFAULT 'pending',
    "decided_by" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "check_event_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "check_events_set_date_id_idx" ON "check_events"("set_date_id");

-- CreateIndex
CREATE INDEX "check_events_status_idx" ON "check_events"("status");

-- CreateIndex
CREATE INDEX "check_event_members_check_event_id_idx" ON "check_event_members"("check_event_id");

-- CreateIndex
CREATE INDEX "check_event_members_member_id_idx" ON "check_event_members"("member_id");

-- CreateIndex
CREATE INDEX "check_event_members_status_idx" ON "check_event_members"("status");

-- CreateIndex
CREATE UNIQUE INDEX "check_event_members_check_event_id_member_id_key" ON "check_event_members"("check_event_id", "member_id");

-- AddForeignKey
ALTER TABLE "check_events" ADD CONSTRAINT "check_events_set_date_id_fkey" FOREIGN KEY ("set_date_id") REFERENCES "set_dates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_event_members" ADD CONSTRAINT "check_event_members_check_event_id_fkey" FOREIGN KEY ("check_event_id") REFERENCES "check_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_event_members" ADD CONSTRAINT "check_event_members_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
