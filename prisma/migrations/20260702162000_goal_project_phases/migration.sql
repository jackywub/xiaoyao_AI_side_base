CREATE TABLE `workspace_goal_stages` (
  `id` VARCHAR(30) NOT NULL,
  `goalId` VARCHAR(30) NOT NULL,
  `phase` ENUM('LEARNING', 'PRACTICE', 'COMPLETION') NOT NULL,
  `progress` INTEGER NOT NULL DEFAULT 0,
  `analysis` TEXT NULL,
  `nextAction` TEXT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `workspace_goal_stages_goalId_phase_key`(`goalId`, `phase`),
  INDEX `workspace_goal_stages_goalId_sortOrder_idx`(`goalId`, `sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `workspace_goal_progress_logs` (
  `id` VARCHAR(30) NOT NULL,
  `stageId` VARCHAR(30) NOT NULL,
  `content` TEXT NOT NULL,
  `progress` INTEGER NOT NULL,
  `nextAction` TEXT NULL,
  `recordedOn` DATE NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `workspace_goal_progress_logs_stageId_recordedOn_idx`(`stageId`, `recordedOn`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `workspace_goal_stages`
  ADD CONSTRAINT `workspace_goal_stages_goalId_fkey`
  FOREIGN KEY (`goalId`) REFERENCES `workspace_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `workspace_goal_progress_logs`
  ADD CONSTRAINT `workspace_goal_progress_logs_stageId_fkey`
  FOREIGN KEY (`stageId`) REFERENCES `workspace_goal_stages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
