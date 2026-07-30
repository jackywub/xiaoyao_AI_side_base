-- AlterTable
ALTER TABLE `reading_sessions` ADD COLUMN `metric` VARCHAR(100) NULL;

-- AlterTable
ALTER TABLE `exercise_records` ADD COLUMN `metric` VARCHAR(100) NULL,
    ADD COLUMN `title` VARCHAR(300) NULL;

-- AlterTable
ALTER TABLE `learning_sessions` ADD COLUMN `metric` VARCHAR(100) NULL;

-- AlterTable
ALTER TABLE `inspirations` ADD COLUMN `metric` VARCHAR(100) NULL;

-- AlterTable
ALTER TABLE `daily_reviews` ADD COLUMN `metric` VARCHAR(100) NULL;
