-- AlterTable
ALTER TABLE `Signal` ADD COLUMN `ai_token_analysis` JSON NULL,
    ADD COLUMN `ai_token_analysis_at` DATETIME(3) NULL;
