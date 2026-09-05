/*
  Warnings:

  - Added the required column `create_by` to the `players` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "players" ADD COLUMN     "create_by" TEXT NOT NULL;
