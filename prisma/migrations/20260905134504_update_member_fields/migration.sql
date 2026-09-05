/*
  Warnings:

  - You are about to drop the column `email` on the `members` table. All the data in the column will be lost.
  - Added the required column `age` to the `members` table without a default value. This is not possible if the table is not empty.
  - Made the column `name` on table `members` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "members_email_key";

-- AlterTable
ALTER TABLE "members" DROP COLUMN "email",
ADD COLUMN     "age" INTEGER NOT NULL,
ADD COLUMN     "facebook_url" TEXT,
ALTER COLUMN "name" SET NOT NULL;
