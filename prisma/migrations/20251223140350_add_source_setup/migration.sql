-- CreateTable
CREATE TABLE `SourceSetup` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userSourceId` INTEGER NOT NULL,
    `source_setup_filter_btc` BOOLEAN NOT NULL DEFAULT true,
    `source_setup_filter_eth` BOOLEAN NOT NULL DEFAULT true,
    `source_setup_filter_sol` BOOLEAN NOT NULL DEFAULT true,
    `source_setup_filter_alts` BOOLEAN NOT NULL DEFAULT true,
    `source_setup_filter_bullish` BOOLEAN NOT NULL DEFAULT true,
    `source_setup_filter_bearish` BOOLEAN NOT NULL DEFAULT true,
    `source_setup_filter_binance_only` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SourceSetup_userSourceId_key`(`userSourceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SourceSetup` ADD CONSTRAINT `SourceSetup_userSourceId_fkey` FOREIGN KEY (`userSourceId`) REFERENCES `UserSource`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
