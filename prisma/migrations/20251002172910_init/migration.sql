-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `login` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `isAdmin` BOOLEAN NOT NULL DEFAULT false,
    `isBanned` BOOLEAN NOT NULL DEFAULT false,
    `bannedAt` DATETIME(3) NULL,
    `lastLogin` DATETIME(3) NULL,
    `refreshToken` VARCHAR(191) NULL,
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `twoFactorAuthEnabled` BOOLEAN NOT NULL DEFAULT false,
    `twoFactorAuthSecret` VARCHAR(191) NULL,
    `twoFactorAuthMethod` VARCHAR(191) NULL DEFAULT 'AUTH_APP',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Source` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_db_id` INTEGER NOT NULL,
    `source_status` ENUM('PROCESSING', 'VALIDE', 'INVALIDE') NOT NULL DEFAULT 'PROCESSING',
    `platform_logo` VARCHAR(191) NOT NULL,
    `platform_user_picture` VARCHAR(191) NOT NULL,
    `user_name_source` VARCHAR(191) NOT NULL,
    `user_username_source` VARCHAR(191) NOT NULL,
    `user_id_source` VARCHAR(191) NOT NULL,
    `user_verified` BOOLEAN NOT NULL DEFAULT false,
    `user_creation_date` INTEGER NOT NULL,
    `followers_count` INTEGER NOT NULL DEFAULT 0,
    `source_price` ENUM('MONTHLY', 'LIFETIME', 'FREE') NOT NULL DEFAULT 'FREE',
    `source_price_value` VARCHAR(191) NULL,
    `price` INTEGER NULL,
    `source_activated` BOOLEAN NOT NULL DEFAULT false,
    `source_reverse_signal_activated` BOOLEAN NOT NULL DEFAULT false,
    `source_total_quantity_signals` INTEGER NULL,
    `source_global_probility` INTEGER NULL,
    `source_reverse_signal_profit` INTEGER NULL,
    `source_bullish_total_quantity` INTEGER NULL,
    `source_bullish_percentage` DECIMAL(20, 8) NULL,
    `source_bullish_probility` DECIMAL(20, 8) NULL,
    `source_bearish_total_quantity` INTEGER NULL,
    `source_bearish_percentage` DECIMAL(20, 8) NULL,
    `source_bearish_probility` DECIMAL(20, 8) NULL,
    `btc_total_quantity` INTEGER NULL,
    `btc_probility` DECIMAL(20, 8) NULL,
    `eth_total_quantity` INTEGER NULL,
    `eth_probility` DECIMAL(20, 8) NULL,
    `sol_total_quantity` INTEGER NULL,
    `sol_probility` DECIMAL(20, 8) NULL,
    `alts_total_quantity` INTEGER NULL,
    `alts_probility` DECIMAL(20, 8) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SourcePost` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sourceId` INTEGER NOT NULL,
    `sourceType` ENUM('X', 'TELEGRAM') NOT NULL,
    `timestamp` INTEGER NULL,
    `date` DATETIME(3) NULL,
    `originalId` INTEGER NOT NULL,
    `mediaType` ENUM('photo', 'text') NOT NULL,
    `senderId` VARCHAR(191) NULL,
    `text` VARCHAR(191) NOT NULL,
    `analysis` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Signal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_db_id` INTEGER NOT NULL,
    `sourceId` INTEGER NOT NULL,
    `source_post_id` INTEGER NOT NULL,
    `signal_trend_level` ENUM('VTC', 'VC', 'V100', 'RTC', 'RC', 'R100') NOT NULL,
    `signal_trend` ENUM('LONG', 'SHORT') NOT NULL,
    `status` ENUM('NEW', 'OPEN', 'CLOSED', 'PASSED') NOT NULL,
    `manual_override` ENUM('OPEN', 'PASS', 'CLOSE') NULL,
    `currency_logo` VARCHAR(191) NULL,
    `currency_label` VARCHAR(191) NOT NULL,
    `pnlA` DECIMAL(20, 8) NULL,
    `pnlP` DECIMAL(20, 8) NULL,
    `time_frame` VARCHAR(191) NOT NULL,
    `entry_timestamp` DATETIME(3) NULL,
    `entry_price` DECIMAL(20, 8) NULL,
    `exit_price` DECIMAL(20, 8) NULL,
    `sources_nbr` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Source` ADD CONSTRAINT `Source_user_db_id_fkey` FOREIGN KEY (`user_db_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SourcePost` ADD CONSTRAINT `SourcePost_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `Source`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Signal` ADD CONSTRAINT `Signal_user_db_id_fkey` FOREIGN KEY (`user_db_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Signal` ADD CONSTRAINT `Signal_source_post_id_fkey` FOREIGN KEY (`source_post_id`) REFERENCES `SourcePost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Signal` ADD CONSTRAINT `Signal_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `Source`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
