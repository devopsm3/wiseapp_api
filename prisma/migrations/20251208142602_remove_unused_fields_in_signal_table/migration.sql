/*
  Warnings:

  - You are about to drop the column `manual_override` on the `Signal` table. All the data in the column will be lost.
  - You are about to drop the column `time_frame` on the `Signal` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Signal` DROP COLUMN `manual_override`,
    DROP COLUMN `time_frame`;
