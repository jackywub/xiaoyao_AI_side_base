ALTER TABLE `workspace_goal_stages`
  MODIFY `phase` ENUM('LEARNING', 'PRACTICE', 'COMPLETION') NULL,
  ADD COLUMN `name` VARCHAR(200) NULL AFTER `phase`,
  ADD COLUMN `startDate` DATE NULL AFTER `name`,
  ADD COLUMN `endDate` DATE NULL AFTER `startDate`;

UPDATE `workspace_goal_stages`
SET `name` = CASE `phase`
  WHEN 'LEARNING' THEN '学习阶段'
  WHEN 'PRACTICE' THEN '实操阶段'
  WHEN 'COMPLETION' THEN '完成及收尾阶段'
  ELSE '目标阶段'
END
WHERE `name` IS NULL;

CREATE TABLE `workspace_goal_daily_actions` (
  `id` VARCHAR(30) NOT NULL,
  `stageId` VARCHAR(30) NOT NULL,
  `title` VARCHAR(300) NOT NULL,
  `actionDate` DATE NOT NULL,
  `completed` BOOLEAN NOT NULL DEFAULT false,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `completedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `workspace_goal_daily_actions_stageId_actionDate_sortOrder_idx`(`stageId`, `actionDate`, `sortOrder`),
  INDEX `workspace_goal_daily_actions_actionDate_completed_idx`(`actionDate`, `completed`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `workspace_project_stages` (
  `id` VARCHAR(30) NOT NULL,
  `projectId` VARCHAR(30) NOT NULL,
  `phase` ENUM('LEARNING', 'PRACTICE', 'COMPLETION') NOT NULL,
  `progress` INTEGER NOT NULL DEFAULT 0,
  `analysis` TEXT NULL,
  `nextAction` TEXT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `workspace_project_stages_projectId_phase_key`(`projectId`, `phase`),
  INDEX `workspace_project_stages_projectId_sortOrder_idx`(`projectId`, `sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `workspace_project_progress_logs` (
  `id` VARCHAR(30) NOT NULL,
  `stageId` VARCHAR(30) NOT NULL,
  `content` TEXT NOT NULL,
  `progress` INTEGER NOT NULL,
  `nextAction` TEXT NULL,
  `recordedOn` DATE NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `workspace_project_progress_logs_stageId_recordedOn_idx`(`stageId`, `recordedOn`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `workspace_goal_daily_actions`
  ADD CONSTRAINT `workspace_goal_daily_actions_stageId_fkey`
  FOREIGN KEY (`stageId`) REFERENCES `workspace_goal_stages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `workspace_project_stages`
  ADD CONSTRAINT `workspace_project_stages_projectId_fkey`
  FOREIGN KEY (`projectId`) REFERENCES `workspace_projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `workspace_project_progress_logs`
  ADD CONSTRAINT `workspace_project_progress_logs_stageId_fkey`
  FOREIGN KEY (`stageId`) REFERENCES `workspace_project_stages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO `workspace_project_stages`
  (`id`, `projectId`, `phase`, `progress`, `sortOrder`, `createdAt`, `updatedAt`)
SELECT CONCAT('ps_', LEFT(MD5(CONCAT(`id`, ':LEARNING')), 27)), `id`, 'LEARNING', 0, 0, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `workspace_projects`;

INSERT INTO `workspace_project_stages`
  (`id`, `projectId`, `phase`, `progress`, `sortOrder`, `createdAt`, `updatedAt`)
SELECT CONCAT('ps_', LEFT(MD5(CONCAT(`id`, ':PRACTICE')), 27)), `id`, 'PRACTICE', 0, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `workspace_projects`;

INSERT INTO `workspace_project_stages`
  (`id`, `projectId`, `phase`, `progress`, `sortOrder`, `createdAt`, `updatedAt`)
SELECT CONCAT('ps_', LEFT(MD5(CONCAT(`id`, ':COMPLETION')), 27)), `id`, 'COMPLETION', 0, 2, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `workspace_projects`;
