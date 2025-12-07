/*
  Warnings:

  - You are about to alter the column `exit_price` on the `Signal` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,8)` to `Double`.
  - Made the column `currency_logo` on table `Signal` required. This step will fail if there are existing NULL values in that column.
  - Made the column `pnlA` on table `Signal` required. This step will fail if there are existing NULL values in that column.
  - Made the column `pnlP` on table `Signal` required. This step will fail if there are existing NULL values in that column.
  - Made the column `entry_timestamp` on table `Signal` required. This step will fail if there are existing NULL values in that column.
  - Made the column `entry_price` on table `Signal` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `Signal` ADD COLUMN `coin_id` INTEGER NULL,
    MODIFY `currency_logo` VARCHAR(191) NOT NULL,
    MODIFY `pnlA` DOUBLE NOT NULL DEFAULT 0,
    MODIFY `pnlP` DOUBLE NOT NULL DEFAULT 0,
    MODIFY `time_frame` VARCHAR(191) NULL,
    MODIFY `entry_timestamp` DATETIME(3) NOT NULL,
    MODIFY `entry_price` DOUBLE NOT NULL DEFAULT 0,
    MODIFY `exit_price` DOUBLE NULL;
