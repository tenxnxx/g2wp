-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "group_name" TEXT NOT NULL,
    "is_use" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "groups_group_name_idx" ON "groups"("group_name");

-- CreateIndex
CREATE INDEX "groups_is_use_idx" ON "groups"("is_use");

-- AlterTable
ALTER TABLE "members" ADD COLUMN "group_id" TEXT;

-- CreateIndex
CREATE INDEX "members_group_id_idx" ON "members"("group_id");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
