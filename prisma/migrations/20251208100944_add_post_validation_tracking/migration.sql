-- AlterTable
ALTER TABLE `Source` ADD COLUMN `source_truth_score` DECIMAL(5, 2) NULL,
    ADD COLUMN `source_validation_deleted_count` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `source_validation_deletion_rate` DECIMAL(5, 2) NULL,
    ADD COLUMN `source_validation_last_check` DATETIME(3) NULL,
    ADD COLUMN `source_validation_total_checks` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `PostValidation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sourcePostId` INTEGER NOT NULL,
    `checkedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `exists` BOOLEAN NOT NULL,
    `errorMessage` TEXT NULL,
    `metadata` JSON NULL,

    INDEX `PostValidation_sourcePostId_idx`(`sourcePostId`),
    INDEX `PostValidation_checkedAt_idx`(`checkedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PostValidation` ADD CONSTRAINT `PostValidation_sourcePostId_fkey` FOREIGN KEY (`sourcePostId`) REFERENCES `SourcePost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
