/*
  Warnings:

  - You are about to drop the column `user_db_id` on the `Signal` table. All the data in the column will be lost.
  - You are about to drop the column `source_activated` on the `Source` table. All the data in the column will be lost.
  - You are about to drop the column `source_reverse_signal_activated` on the `Source` table. All the data in the column will be lost.
  - You are about to drop the column `user_db_id` on the `Source` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[sourceId,source_post_id]` on the table `Signal` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[platform,user_id_source]` on the table `Source` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `Signal` DROP FOREIGN KEY `Signal_user_db_id_fkey`;

-- DropForeignKey
ALTER TABLE `Source` DROP FOREIGN KEY `Source_user_db_id_fkey`;

-- DropIndex
DROP INDEX `Signal_user_db_id_fkey` ON `Signal`;

-- DropIndex
DROP INDEX `Source_user_db_id_fkey` ON `Source`;

-- AlterTable
ALTER TABLE `Signal` DROP COLUMN `user_db_id`;

-- AlterTable
ALTER TABLE `Source` DROP COLUMN `source_activated`,
    DROP COLUMN `source_reverse_signal_activated`,
    DROP COLUMN `user_db_id`;

-- CreateTable
CREATE TABLE `UserSource` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `source_id` INTEGER NOT NULL,
    `added_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `source_activated` BOOLEAN NOT NULL DEFAULT true,
    `source_reverse_signal_activated` BOOLEAN NOT NULL DEFAULT false,

    INDEX `UserSource_user_id_idx`(`user_id`),
    INDEX `UserSource_source_id_idx`(`source_id`),
    UNIQUE INDEX `UserSource_user_id_source_id_key`(`user_id`, `source_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Signal_sourceId_source_post_id_key` ON `Signal`(`sourceId`, `source_post_id`);

-- CreateIndex
CREATE UNIQUE INDEX `Source_platform_user_id_source_key` ON `Source`(`platform`, `user_id_source`);

-- AddForeignKey
ALTER TABLE `UserSource` ADD CONSTRAINT `UserSource_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserSource` ADD CONSTRAINT `UserSource_source_id_fkey` FOREIGN KEY (`source_id`) REFERENCES `Source`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
