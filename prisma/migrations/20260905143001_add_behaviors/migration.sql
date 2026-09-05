-- CreateTable
CREATE TABLE "behaviors" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "create_by" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "behaviors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "behaviors_member_id_idx" ON "behaviors"("member_id");

-- CreateIndex
CREATE INDEX "behaviors_player_id_idx" ON "behaviors"("player_id");

-- AddForeignKey
ALTER TABLE "behaviors" ADD CONSTRAINT "behaviors_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behaviors" ADD CONSTRAINT "behaviors_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
