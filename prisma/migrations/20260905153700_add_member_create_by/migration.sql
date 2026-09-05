-- AlterTable
ALTER TABLE "members" ADD COLUMN "create_by" TEXT NOT NULL DEFAULT 'system';

ALTER TABLE "members" ALTER COLUMN "create_by" DROP DEFAULT;
