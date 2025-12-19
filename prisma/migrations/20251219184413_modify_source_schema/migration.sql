/*
  Warnings:

  - You are about to drop the column `platform_logo` on the `Source` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Source` table. All the data in the column will be lost.
  - You are about to drop the column `source_price` on the `Source` table. All the data in the column will be lost.
  - You are about to drop the column `source_price_value` on the `Source` table. All the data in the column will be lost.
  - You are about to drop the column `source_truth_score` on the `Source` table. All the data in the column will be lost.
  - You are about to drop the column `source_validation_deleted_count` on the `Source` table. All the data in the column will be lost.
  - You are about to drop the column `source_validation_deletion_rate` on the `Source` table. All the data in the column will be lost.
  - You are about to drop the column `source_validation_last_check` on the `Source` table. All the data in the column will be lost.
  - You are about to drop the column `source_validation_total_checks` on the `Source` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Source` DROP COLUMN `platform_logo`,
    DROP COLUMN `price`,
    DROP COLUMN `source_price`,
    DROP COLUMN `source_price_value`,
    DROP COLUMN `source_truth_score`,
    DROP COLUMN `source_validation_deleted_count`,
    DROP COLUMN `source_validation_deletion_rate`,
    DROP COLUMN `source_validation_last_check`,
    DROP COLUMN `source_validation_total_checks`,
    ADD COLUMN `deleted_count` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `platform` ENUM('X', 'TELEGRAM') NOT NULL DEFAULT 'X',
    ADD COLUMN `source_subscription_plan` ENUM('MONTHLY', 'LIFETIME', 'FREE') NOT NULL DEFAULT 'FREE',
    ADD COLUMN `source_subscription_price` INTEGER NULL;
