/*
  Warnings:

  - You are about to drop the column `sourceType` on the `SourcePost` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `SourcePost` DROP COLUMN `sourceType`,
    ADD COLUMN `platform` ENUM('X', 'TELEGRAM') NOT NULL DEFAULT 'X';
