/*
  Warnings:

  - You are about to drop the column `meta_signals` on the `Setup` table. All the data in the column will be lost.
  - You are about to drop the column `sources` on the `Setup` table. All the data in the column will be lost.
  - You are about to drop the column `trading` on the `Setup` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Setup` DROP COLUMN `meta_signals`,
    DROP COLUMN `sources`,
    DROP COLUMN `trading`,
    ADD COLUMN `settings` JSON NULL;
