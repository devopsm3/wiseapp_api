/*
  Warnings:

  - You are about to drop the column `display_name` on the `Source` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Source` DROP COLUMN `display_name`,
    ADD COLUMN `source_url` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `SourcePost` ADD COLUMN `post_url` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `UserSource` ADD COLUMN `display_name` VARCHAR(191) NOT NULL DEFAULT '';
