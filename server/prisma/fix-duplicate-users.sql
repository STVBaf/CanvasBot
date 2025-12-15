-- 数据库修复脚本：合并重复用户并添加索引
-- 执行前请先备份数据库！

-- ============================================
-- 第一步：查看重复用户情况
-- ============================================
SELECT 
  canvasId,
  COUNT(*) as user_count,
  GROUP_CONCAT(id) as user_ids,
  GROUP_CONCAT(email) as emails
FROM User
WHERE canvasId IS NOT NULL
GROUP BY canvasId
HAVING COUNT(*) > 1
ORDER BY user_count DESC;

-- ============================================
-- 第二步：合并重复用户（保留最早创建的）
-- ============================================

-- 创建临时表存储需要保留的用户
CREATE TEMPORARY TABLE users_to_keep AS
SELECT 
  canvasId,
  MIN(id) as keep_user_id
FROM User
WHERE canvasId IS NOT NULL
GROUP BY canvasId;

-- 查看将要保留的用户
SELECT u.* 
FROM User u
JOIN users_to_keep utk ON u.id = utk.keep_user_id
ORDER BY u.canvasId;

-- 将重复用户的数据迁移到保留的用户
-- 注意：这会将所有小组、文件等关联关系转移到保留的用户下

-- 更新 Group 表的 creatorId
UPDATE `Group` g
JOIN User u ON g.creatorId = u.id
JOIN users_to_keep utk ON u.canvasId = utk.canvasId
SET g.creatorId = utk.keep_user_id
WHERE g.creatorId != utk.keep_user_id;

-- 更新 GroupMember 表的 userId
UPDATE GroupMember gm
JOIN User u ON gm.userId = u.id
JOIN users_to_keep utk ON u.canvasId = utk.canvasId
SET gm.userId = utk.keep_user_id
WHERE gm.userId != utk.keep_user_id;

-- 注意：可能需要处理重复的小组成员关系
-- 删除重复的小组成员（保留最早加入的）
DELETE gm1 FROM GroupMember gm1
JOIN GroupMember gm2 ON gm1.groupId = gm2.groupId AND gm1.userId = gm2.userId
WHERE gm1.id > gm2.id;

-- 更新 FileMeta 表的 userId
UPDATE FileMeta fm
JOIN User u ON fm.userId = u.id
JOIN users_to_keep utk ON u.canvasId = utk.canvasId
SET fm.userId = utk.keep_user_id
WHERE fm.userId != utk.keep_user_id;

-- 更新 Token 表的 userId
UPDATE Token t
JOIN User u ON t.userId = u.id
JOIN users_to_keep utk ON u.canvasId = utk.canvasId
SET t.userId = utk.keep_user_id
WHERE t.userId != utk.keep_user_id;

-- 删除重复的 tokens（如果有）
DELETE t1 FROM Token t1
JOIN Token t2 ON t1.userId = t2.userId AND t1.provider = t2.provider
WHERE t1.id > t2.id;

-- 删除重复的用户（保留最早的）
DELETE u FROM User u
LEFT JOIN users_to_keep utk ON u.id = utk.keep_user_id
WHERE u.canvasId IS NOT NULL 
  AND utk.keep_user_id IS NULL;

-- 清理临时表
DROP TEMPORARY TABLE users_to_keep;

-- ============================================
-- 第三步：验证数据一致性
-- ============================================

-- 检查是否还有重复用户
SELECT 
  canvasId,
  COUNT(*) as count
FROM User
WHERE canvasId IS NOT NULL
GROUP BY canvasId
HAVING COUNT(*) > 1;
-- 应该返回空结果

-- 检查所有小组是否都有有效的创建者
SELECT 
  g.id,
  g.name,
  g.creatorId,
  u.email
FROM `Group` g
LEFT JOIN User u ON g.creatorId = u.id
WHERE u.id IS NULL;
-- 应该返回空结果

-- 检查所有小组成员是否都有有效的用户
SELECT 
  gm.id,
  gm.groupId,
  gm.userId
FROM GroupMember gm
LEFT JOIN User u ON gm.userId = u.id
WHERE u.id IS NULL;
-- 应该返回空结果

-- ============================================
-- 第四步：优化数据库性能（添加索引）
-- ============================================

-- 为 canvasId 添加索引（提高查询性能）
-- 注意：如果已经存在索引，这个命令会失败，可以忽略错误
ALTER TABLE User ADD INDEX idx_canvasId (canvasId);

-- 验证索引是否创建成功
SHOW INDEX FROM User WHERE Key_name = 'idx_canvasId';

-- ============================================
-- 完成！
-- ============================================

SELECT '数据库修复完成！' as status;
SELECT COUNT(*) as total_users FROM User;
SELECT COUNT(*) as total_groups FROM `Group`;
SELECT COUNT(*) as total_members FROM GroupMember;
