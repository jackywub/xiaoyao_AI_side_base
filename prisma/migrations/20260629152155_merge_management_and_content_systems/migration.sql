-- AlterTable
ALTER TABLE `workspace_projects` ADD COLUMN `nextAction` VARCHAR(500) NULL,
    ADD COLUMN `progress` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `riskLevel` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'LOW',
    ADD COLUMN `riskReason` TEXT NULL,
    ADD COLUMN `stage` VARCHAR(200) NULL;

-- AlterTable
ALTER TABLE `workspace_tasks` ADD COLUMN `dueTime` VARCHAR(50) NULL,
    ADD COLUMN `isGoal` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `projectId` VARCHAR(30) NULL,
    ADD COLUMN `quadrant` ENUM('IMPORTANT_URGENT', 'IMPORTANT_NOT_URGENT', 'URGENT_NOT_IMPORTANT', 'LOW') NOT NULL DEFAULT 'LOW',
    ADD COLUMN `urgency` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM';

-- CreateTable
CREATE TABLE `ai_tools` (
    `id` VARCHAR(30) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `toolUrl` VARCHAR(1000) NULL,
    `embedUrl` VARCHAR(1000) NULL,
    `iconImage` VARCHAR(500) NULL,
    `screenshot` VARCHAR(500) NULL,
    `tags` JSON NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ai_tools_slug_key`(`slug`),
    INDEX `ai_tools_category_status_idx`(`category`, `status`),
    INDEX `ai_tools_isFeatured_sortOrder_idx`(`isFeatured`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workspace_schedule_blocks` (
    `id` VARCHAR(30) NOT NULL,
    `workspaceId` VARCHAR(30) NOT NULL,
    `projectId` VARCHAR(30) NULL,
    `blockDate` DATE NULL,
    `timeText` VARCHAR(100) NOT NULL,
    `title` VARCHAR(300) NOT NULL,
    `tone` VARCHAR(30) NOT NULL DEFAULT 'neutral',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `workspace_schedule_blocks_workspaceId_blockDate_sortOrder_idx`(`workspaceId`, `blockDate`, `sortOrder`),
    INDEX `workspace_schedule_blocks_projectId_idx`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_conversations` (
    `id` VARCHAR(30) NOT NULL,
    `workspaceId` VARCHAR(30) NOT NULL,
    `title` VARCHAR(200) NOT NULL DEFAULT '成长助手',
    `provider` VARCHAR(100) NULL,
    `model` VARCHAR(200) NULL,
    `externalSessionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ai_conversations_workspaceId_updatedAt_idx`(`workspaceId`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_messages` (
    `id` VARCHAR(30) NOT NULL,
    `conversationId` VARCHAR(30) NOT NULL,
    `role` ENUM('SYSTEM', 'USER', 'ASSISTANT') NOT NULL,
    `content` LONGTEXT NOT NULL,
    `model` VARCHAR(200) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ai_messages_conversationId_createdAt_idx`(`conversationId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `workspace_tasks_projectId_idx` ON `workspace_tasks`(`projectId`);

-- CreateIndex
CREATE INDEX `workspace_tasks_workspaceId_isGoal_idx` ON `workspace_tasks`(`workspaceId`, `isGoal`);

-- AddForeignKey
ALTER TABLE `workspace_tasks` ADD CONSTRAINT `workspace_tasks_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `workspace_projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workspace_schedule_blocks` ADD CONSTRAINT `workspace_schedule_blocks_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workspace_schedule_blocks` ADD CONSTRAINT `workspace_schedule_blocks_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `workspace_projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_conversations` ADD CONSTRAINT `ai_conversations_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_messages` ADD CONSTRAINT `ai_messages_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `ai_conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
