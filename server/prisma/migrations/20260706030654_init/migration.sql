-- CreateTable
CREATE TABLE `user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `real_name` VARCHAR(50) NOT NULL,
    `role` ENUM('STU', 'TCH', 'WRK', 'ADM') NOT NULL DEFAULT 'STU',
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(100) NULL,
    `department` VARCHAR(100) NULL,
    `student_id` VARCHAR(50) NULL,
    `employee_id` VARCHAR(50) NULL,
    `avatar` VARCHAR(255) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `work_order` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_no` VARCHAR(30) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(50) NOT NULL,
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
    `status` ENUM('PENDING', 'ASSIGNED', 'PROCESSING', 'COMPLETED', 'CLOSED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `submitter_id` INTEGER NOT NULL,
    `submitter_role` ENUM('STU', 'TCH', 'WRK', 'ADM') NOT NULL,
    `submitter_name` VARCHAR(50) NULL,
    `assignee_id` INTEGER NULL,
    `assigner_id` INTEGER NULL,
    `location` VARCHAR(200) NULL,
    `contact_phone` VARCHAR(20) NULL,
    `scheduled_time` DATETIME(3) NULL,
    `images` JSON NULL,
    `accepted_at` DATETIME(3) NULL,
    `processing_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `closed_at` DATETIME(3) NULL,
    `rating` TINYINT NULL,
    `feedback` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `work_order_order_no_key`(`order_no`),
    INDEX `work_order_submitter_id_idx`(`submitter_id`),
    INDEX `work_order_assignee_id_idx`(`assignee_id`),
    INDEX `work_order_status_idx`(`status`),
    INDEX `work_order_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `repair_record` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `content` TEXT NOT NULL,
    `cost` DECIMAL(10, 2) NULL DEFAULT 0,
    `used_parts` TEXT NULL,
    `handler_id` INTEGER NULL,
    `images` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `content` TEXT NULL,
    `link` VARCHAR(255) NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notification_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `operator_id` INTEGER NULL,
    `action` VARCHAR(50) NOT NULL,
    `remark` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `order_log_order_id_idx`(`order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `work_order` ADD CONSTRAINT `work_order_submitter_id_fkey` FOREIGN KEY (`submitter_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_order` ADD CONSTRAINT `work_order_assignee_id_fkey` FOREIGN KEY (`assignee_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_order` ADD CONSTRAINT `work_order_assigner_id_fkey` FOREIGN KEY (`assigner_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repair_record` ADD CONSTRAINT `repair_record_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `work_order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repair_record` ADD CONSTRAINT `repair_record_handler_id_fkey` FOREIGN KEY (`handler_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification` ADD CONSTRAINT `notification_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_log` ADD CONSTRAINT `order_log_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `work_order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_log` ADD CONSTRAINT `order_log_operator_id_fkey` FOREIGN KEY (`operator_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
