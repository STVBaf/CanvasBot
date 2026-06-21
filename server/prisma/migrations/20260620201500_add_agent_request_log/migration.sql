CREATE TABLE `AgentRequestLog` (
    `id` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `botId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `error` VARCHAR(191) NULL,
    `durationMs` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AgentRequestLog_tokenHash_createdAt_idx`(`tokenHash`, `createdAt`),
    INDEX `AgentRequestLog_action_createdAt_idx`(`action`, `createdAt`),
    INDEX `AgentRequestLog_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
