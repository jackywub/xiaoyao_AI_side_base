-- AlterTable
ALTER TABLE `reading_books` ADD COLUMN `category` VARCHAR(300) NULL,
    ADD COLUMN `isAudio` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `lastReadAt` DATETIME(3) NULL,
    ADD COLUMN `progress` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `totalReadSeconds` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `reading_daily_stats` (
    `id` VARCHAR(30) NOT NULL,
    `workspaceId` VARCHAR(30) NOT NULL,
    `readOn` DATE NOT NULL,
    `durationSeconds` INTEGER NOT NULL DEFAULT 0,
    `source` ENUM('MANUAL', 'WEREAD') NOT NULL DEFAULT 'WEREAD',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `reading_daily_stats_workspaceId_readOn_idx`(`workspaceId`, `readOn`),
    UNIQUE INDEX `reading_daily_stats_workspaceId_readOn_source_key`(`workspaceId`, `readOn`, `source`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reading_shelf_states` (
    `workspaceId` VARCHAR(30) NOT NULL,
    `electronicBookCount` INTEGER NOT NULL DEFAULT 0,
    `audioBookCount` INTEGER NOT NULL DEFAULT 0,
    `hasArticleCollection` BOOLEAN NOT NULL DEFAULT false,
    `lastSyncedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`workspaceId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `reading_books_workspaceId_source_externalId_key` ON `reading_books`(`workspaceId`, `source`, `externalId`);

-- AddForeignKey
ALTER TABLE `reading_daily_stats` ADD CONSTRAINT `reading_daily_stats_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reading_shelf_states` ADD CONSTRAINT `reading_shelf_states_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
