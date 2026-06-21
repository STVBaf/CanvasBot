-- Normalize duplicate Canvas identities before adding the unique constraint.
UPDATE `User` u
JOIN (
    SELECT `canvasId`, MIN(`id`) AS `keepId`
    FROM `User`
    WHERE `canvasId` IS NOT NULL
    GROUP BY `canvasId`
    HAVING COUNT(*) > 1
) d ON u.`canvasId` = d.`canvasId` AND u.`id` <> d.`keepId`
SET u.`canvasId` = NULL;

-- Canvas user IDs are the stable identity for manual token users.
CREATE UNIQUE INDEX `User_canvasId_key` ON `User`(`canvasId`);

-- A Canvas file can be visible to multiple users; scope metadata ownership per user.
ALTER TABLE `FileMeta` DROP INDEX `FileMeta_canvasFileId_key`;
CREATE UNIQUE INDEX `FileMeta_userId_canvasFileId_key` ON `FileMeta`(`userId`, `canvasFileId`);
CREATE INDEX `FileMeta_userId_courseId_idx` ON `FileMeta`(`userId`, `courseId`);
