/*
  Warnings:

  - Added the required column `originalText` to the `SourcePost` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `SourcePost` ADD COLUMN `originalText` MEDIUMTEXT NOT NULL,
    MODIFY `text` MEDIUMTEXT NOT NULL;
