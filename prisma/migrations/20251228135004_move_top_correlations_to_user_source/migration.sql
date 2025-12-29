/*
  Warnings:

  - You are about to drop the column `topCorrelations` on the `SourceStats` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `SourceStats` DROP COLUMN `topCorrelations`;

-- AlterTable
ALTER TABLE `UserSource` ADD COLUMN `topCorrelations` JSON NOT NULL;
