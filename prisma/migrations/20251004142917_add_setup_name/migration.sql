-- CreateTable
CREATE TABLE `Setup` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_db_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `sources` JSON NULL,
    `meta_signals` JSON NULL,
    `trading` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Setup` ADD CONSTRAINT `Setup_user_db_id_fkey` FOREIGN KEY (`user_db_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
