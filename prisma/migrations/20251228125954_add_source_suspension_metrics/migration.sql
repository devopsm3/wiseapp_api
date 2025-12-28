-- AlterTable
ALTER TABLE `Source` ADD COLUMN `bad_signals_count` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `signals_count_last_30d` INTEGER NOT NULL DEFAULT 0;
