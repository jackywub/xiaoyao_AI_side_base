-- CreateTable
CREATE TABLE `user_sessions` (
    `id` VARCHAR(30) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(30) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_sessions_tokenHash_key`(`tokenHash`),
    INDEX `user_sessions_userId_expiresAt_idx`(`userId`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pages` (
    `id` VARCHAR(30) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `navigationName` VARCHAR(100) NULL,
    `seoTitle` VARCHAR(200) NULL,
    `seoDescription` VARCHAR(500) NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,
    `publishedAt` DATETIME(3) NULL,
    `createdById` VARCHAR(30) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pages_slug_key`(`slug`),
    INDEX `pages_createdById_idx`(`createdById`),
    INDEX `pages_status_sortOrder_idx`(`status`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `page_sections` (
    `id` VARCHAR(30) NOT NULL,
    `pageId` VARCHAR(30) NOT NULL,
    `sectionKey` VARCHAR(100) NOT NULL,
    `sectionType` ENUM('HERO', 'TEXT', 'FEATURE_GRID', 'LIST', 'FAQ', 'CTA', 'CUSTOM') NOT NULL DEFAULT 'CUSTOM',
    `heading` VARCHAR(300) NULL,
    `subheading` VARCHAR(500) NULL,
    `content` JSON NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `page_sections_pageId_sortOrder_idx`(`pageId`, `sortOrder`),
    UNIQUE INDEX `page_sections_pageId_sectionKey_key`(`pageId`, `sectionKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `media_assets` (
    `id` VARCHAR(30) NOT NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `storageKey` VARCHAR(500) NOT NULL,
    `publicUrl` VARCHAR(1000) NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `kind` ENUM('IMAGE', 'DOCUMENT', 'VIDEO', 'OTHER') NOT NULL DEFAULT 'IMAGE',
    `sizeBytes` BIGINT NOT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `altText` VARCHAR(300) NULL,
    `uploadedById` VARCHAR(30) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `media_assets_storageKey_key`(`storageKey`),
    INDEX `media_assets_uploadedById_idx`(`uploadedById`),
    INDEX `media_assets_kind_createdAt_idx`(`kind`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workspaces` (
    `id` VARCHAR(30) NOT NULL,
    `ownerId` VARCHAR(30) NOT NULL,
    `name` VARCHAR(100) NOT NULL DEFAULT '我的成长工作台',
    `timezone` VARCHAR(100) NOT NULL DEFAULT 'Asia/Shanghai',
    `weekStartsOn` INTEGER NOT NULL DEFAULT 1,
    `currency` CHAR(3) NOT NULL DEFAULT 'CNY',
    `settings` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `workspaces_ownerId_key`(`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workspace_tasks` (
    `id` VARCHAR(30) NOT NULL,
    `workspaceId` VARCHAR(30) NOT NULL,
    `parentId` VARCHAR(30) NULL,
    `habitId` VARCHAR(30) NULL,
    `title` VARCHAR(300) NOT NULL,
    `description` TEXT NULL,
    `type` ENUM('DAILY', 'PHASED', 'LONG_TERM') NOT NULL,
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM',
    `status` ENUM('TODO', 'IN_PROGRESS', 'DONE', 'ARCHIVED') NOT NULL DEFAULT 'TODO',
    `progress` INTEGER NOT NULL DEFAULT 0,
    `startDate` DATE NULL,
    `dueDate` DATE NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `completedAt` DATETIME(3) NULL,
    `archivedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `workspace_tasks_workspaceId_type_status_idx`(`workspaceId`, `type`, `status`),
    INDEX `workspace_tasks_workspaceId_dueDate_idx`(`workspaceId`, `dueDate`),
    INDEX `workspace_tasks_parentId_idx`(`parentId`),
    INDEX `workspace_tasks_habitId_idx`(`habitId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workspace_task_records` (
    `id` VARCHAR(30) NOT NULL,
    `taskId` VARCHAR(30) NOT NULL,
    `recordDate` DATE NOT NULL,
    `completed` BOOLEAN NOT NULL DEFAULT false,
    `progress` INTEGER NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `workspace_task_records_recordDate_completed_idx`(`recordDate`, `completed`),
    UNIQUE INDEX `workspace_task_records_taskId_recordDate_key`(`taskId`, `recordDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workspace_habits` (
    `id` VARCHAR(30) NOT NULL,
    `workspaceId` VARCHAR(30) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `type` ENUM('READING', 'REVIEW', 'EXERCISE', 'LEARNING', 'CUSTOM') NOT NULL,
    `description` VARCHAR(500) NULL,
    `frequency` ENUM('DAILY', 'WEEKLY') NOT NULL DEFAULT 'DAILY',
    `targetCount` INTEGER NOT NULL DEFAULT 1,
    `targetValue` DECIMAL(10, 2) NULL,
    `unit` VARCHAR(50) NULL,
    `color` VARCHAR(30) NULL,
    `icon` VARCHAR(100) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `workspace_habits_workspaceId_isActive_sortOrder_idx`(`workspaceId`, `isActive`, `sortOrder`),
    UNIQUE INDEX `workspace_habits_workspaceId_name_key`(`workspaceId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workspace_habit_records` (
    `id` VARCHAR(30) NOT NULL,
    `habitId` VARCHAR(30) NOT NULL,
    `recordDate` DATE NOT NULL,
    `completed` BOOLEAN NOT NULL DEFAULT false,
    `value` DECIMAL(10, 2) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `workspace_habit_records_recordDate_completed_idx`(`recordDate`, `completed`),
    UNIQUE INDEX `workspace_habit_records_habitId_recordDate_key`(`habitId`, `recordDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workspace_projects` (
    `id` VARCHAR(30) NOT NULL,
    `workspaceId` VARCHAR(30) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('ACTIVE', 'PAUSED', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `currency` CHAR(3) NOT NULL DEFAULT 'CNY',
    `startedOn` DATE NULL,
    `endedOn` DATE NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `workspace_projects_workspaceId_status_idx`(`workspaceId`, `status`),
    UNIQUE INDEX `workspace_projects_workspaceId_name_key`(`workspaceId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workspace_transactions` (
    `id` VARCHAR(30) NOT NULL,
    `projectId` VARCHAR(30) NOT NULL,
    `type` ENUM('INCOME', 'EXPENSE') NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `category` VARCHAR(100) NULL,
    `note` VARCHAR(500) NULL,
    `transactedOn` DATE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `workspace_transactions_projectId_transactedOn_idx`(`projectId`, `transactedOn`),
    INDEX `workspace_transactions_type_transactedOn_idx`(`type`, `transactedOn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reading_books` (
    `id` VARCHAR(30) NOT NULL,
    `workspaceId` VARCHAR(30) NOT NULL,
    `title` VARCHAR(300) NOT NULL,
    `author` VARCHAR(200) NULL,
    `coverUrl` VARCHAR(1000) NULL,
    `totalPages` INTEGER NULL,
    `currentPage` INTEGER NOT NULL DEFAULT 0,
    `source` ENUM('MANUAL', 'WEREAD') NOT NULL DEFAULT 'MANUAL',
    `externalId` VARCHAR(191) NULL,
    `startedOn` DATE NULL,
    `finishedOn` DATE NULL,
    `isArchived` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `reading_books_workspaceId_isArchived_idx`(`workspaceId`, `isArchived`),
    INDEX `reading_books_workspaceId_source_externalId_idx`(`workspaceId`, `source`, `externalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reading_sessions` (
    `id` VARCHAR(30) NOT NULL,
    `bookId` VARCHAR(30) NOT NULL,
    `readOn` DATE NOT NULL,
    `durationMinutes` INTEGER NOT NULL DEFAULT 0,
    `startPage` INTEGER NULL,
    `endPage` INTEGER NULL,
    `note` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `reading_sessions_bookId_readOn_idx`(`bookId`, `readOn`),
    INDEX `reading_sessions_readOn_idx`(`readOn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exercise_records` (
    `id` VARCHAR(30) NOT NULL,
    `workspaceId` VARCHAR(30) NOT NULL,
    `exerciseType` ENUM('WALKING', 'RUNNING', 'CYCLING', 'SWIMMING', 'STRENGTH', 'YOGA', 'OTHER') NOT NULL,
    `exercisedOn` DATE NOT NULL,
    `durationMinutes` INTEGER NOT NULL DEFAULT 0,
    `distanceKm` DECIMAL(8, 2) NULL,
    `calories` INTEGER NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `exercise_records_workspaceId_exercisedOn_idx`(`workspaceId`, `exercisedOn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `learning_topics` (
    `id` VARCHAR(30) NOT NULL,
    `workspaceId` VARCHAR(30) NOT NULL,
    `title` VARCHAR(300) NOT NULL,
    `description` TEXT NULL,
    `isArchived` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `learning_topics_workspaceId_isArchived_idx`(`workspaceId`, `isArchived`),
    UNIQUE INDEX `learning_topics_workspaceId_title_key`(`workspaceId`, `title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `learning_sessions` (
    `id` VARCHAR(30) NOT NULL,
    `topicId` VARCHAR(30) NOT NULL,
    `learnedOn` DATE NOT NULL,
    `durationMinutes` INTEGER NOT NULL DEFAULT 0,
    `notes` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `learning_sessions_topicId_learnedOn_idx`(`topicId`, `learnedOn`),
    INDEX `learning_sessions_learnedOn_idx`(`learnedOn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inspirations` (
    `id` VARCHAR(30) NOT NULL,
    `workspaceId` VARCHAR(30) NOT NULL,
    `title` VARCHAR(300) NULL,
    `content` LONGTEXT NOT NULL,
    `source` VARCHAR(200) NULL,
    `capturedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isPinned` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `inspirations_workspaceId_capturedAt_idx`(`workspaceId`, `capturedAt`),
    INDEX `inspirations_workspaceId_isPinned_idx`(`workspaceId`, `isPinned`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workspace_tags` (
    `id` VARCHAR(30) NOT NULL,
    `workspaceId` VARCHAR(30) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `color` VARCHAR(30) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `workspace_tags_workspaceId_name_key`(`workspaceId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inspiration_tags` (
    `inspirationId` VARCHAR(30) NOT NULL,
    `tagId` VARCHAR(30) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `inspiration_tags_tagId_idx`(`tagId`),
    PRIMARY KEY (`inspirationId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_reviews` (
    `id` VARCHAR(30) NOT NULL,
    `workspaceId` VARCHAR(30) NOT NULL,
    `reviewDate` DATE NOT NULL,
    `title` VARCHAR(300) NULL,
    `content` LONGTEXT NULL,
    `wins` TEXT NULL,
    `challenges` TEXT NULL,
    `nextActions` TEXT NULL,
    `moodScore` INTEGER NULL,
    `taskSnapshot` JSON NULL,
    `syncedToObsidian` BOOLEAN NOT NULL DEFAULT false,
    `syncedToIma` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `daily_reviews_workspaceId_reviewDate_idx`(`workspaceId`, `reviewDate`),
    UNIQUE INDEX `daily_reviews_workspaceId_reviewDate_key`(`workspaceId`, `reviewDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `external_connections` (
    `id` VARCHAR(30) NOT NULL,
    `workspaceId` VARCHAR(30) NOT NULL,
    `provider` ENUM('WEREAD', 'OBSIDIAN', 'IMA') NOT NULL,
    `status` ENUM('DISCONNECTED', 'CONNECTED', 'ERROR') NOT NULL DEFAULT 'DISCONNECTED',
    `encryptedConfig` LONGTEXT NULL,
    `lastSyncedAt` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `external_connections_status_lastSyncedAt_idx`(`status`, `lastSyncedAt`),
    UNIQUE INDEX `external_connections_workspaceId_provider_key`(`workspaceId`, `provider`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `external_sync_logs` (
    `id` VARCHAR(30) NOT NULL,
    `connectionId` VARCHAR(30) NOT NULL,
    `resourceType` VARCHAR(100) NOT NULL,
    `resourceId` VARCHAR(30) NULL,
    `status` ENUM('PENDING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `message` TEXT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `external_sync_logs_connectionId_startedAt_idx`(`connectionId`, `startedAt`),
    INDEX `external_sync_logs_status_startedAt_idx`(`status`, `startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pages` ADD CONSTRAINT `pages_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `page_sections` ADD CONSTRAINT `page_sections_pageId_fkey` FOREIGN KEY (`pageId`) REFERENCES `pages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `media_assets` ADD CONSTRAINT `media_assets_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workspaces` ADD CONSTRAINT `workspaces_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workspace_tasks` ADD CONSTRAINT `workspace_tasks_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workspace_tasks` ADD CONSTRAINT `workspace_tasks_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `workspace_tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workspace_tasks` ADD CONSTRAINT `workspace_tasks_habitId_fkey` FOREIGN KEY (`habitId`) REFERENCES `workspace_habits`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workspace_task_records` ADD CONSTRAINT `workspace_task_records_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `workspace_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workspace_habits` ADD CONSTRAINT `workspace_habits_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workspace_habit_records` ADD CONSTRAINT `workspace_habit_records_habitId_fkey` FOREIGN KEY (`habitId`) REFERENCES `workspace_habits`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workspace_projects` ADD CONSTRAINT `workspace_projects_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workspace_transactions` ADD CONSTRAINT `workspace_transactions_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `workspace_projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reading_books` ADD CONSTRAINT `reading_books_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reading_sessions` ADD CONSTRAINT `reading_sessions_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `reading_books`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exercise_records` ADD CONSTRAINT `exercise_records_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `learning_topics` ADD CONSTRAINT `learning_topics_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `learning_sessions` ADD CONSTRAINT `learning_sessions_topicId_fkey` FOREIGN KEY (`topicId`) REFERENCES `learning_topics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inspirations` ADD CONSTRAINT `inspirations_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workspace_tags` ADD CONSTRAINT `workspace_tags_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inspiration_tags` ADD CONSTRAINT `inspiration_tags_inspirationId_fkey` FOREIGN KEY (`inspirationId`) REFERENCES `inspirations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inspiration_tags` ADD CONSTRAINT `inspiration_tags_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `workspace_tags`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_reviews` ADD CONSTRAINT `daily_reviews_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `external_connections` ADD CONSTRAINT `external_connections_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `external_sync_logs` ADD CONSTRAINT `external_sync_logs_connectionId_fkey` FOREIGN KEY (`connectionId`) REFERENCES `external_connections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
