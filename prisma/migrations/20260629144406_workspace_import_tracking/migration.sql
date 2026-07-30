-- CreateTable
CREATE TABLE `workspace_import_items` (
    `id` VARCHAR(30) NOT NULL,
    `workspaceId` VARCHAR(30) NOT NULL,
    `entityType` VARCHAR(100) NOT NULL,
    `fingerprint` CHAR(64) NOT NULL,
    `recordId` VARCHAR(30) NULL,
    `sourceRefs` JSON NULL,
    `importedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `workspace_import_items_workspaceId_entityType_idx`(`workspaceId`, `entityType`),
    UNIQUE INDEX `workspace_import_items_workspaceId_entityType_fingerprint_key`(`workspaceId`, `entityType`, `fingerprint`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `workspace_import_items` ADD CONSTRAINT `workspace_import_items_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
