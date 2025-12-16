-- AlterTable
ALTER TABLE `Signal` ADD COLUMN `ai_price_trace_analysis` TEXT NULL,
    ADD COLUMN `ai_price_trace_analysis_at` DATETIME(3) NULL;
