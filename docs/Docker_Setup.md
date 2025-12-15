# Docker 部署指南

> 状态（2025-12-15）：默认使用 **MySQL 8 + Redis 7**（见 docker-compose.yml）。如引用旧版 SQLite，请以本文件与 README 为准。

本项目使用 Docker 部署 MySQL 和 Redis 服务。

## 前置要求

- 已安装 Docker Desktop（Windows/Mac）或 Docker Engine（Linux）
- Docker Compose（通常随 Docker Desktop 一起安装）

## 快速启动

### 1. 启动所有服务

在项目根目录执行：

```bash
docker-compose up -d
```

这会启动：
- MySQL 8.0 (端口 3307)
- Redis 7 (端口 6379)

### 2. 查看服务状态

```bash
docker-compose ps
```

输出示例：
```
NAME            IMAGE           PORTS                    STATUS
canvas-mysql    mysql:8.0       0.0.0.0:3307->3306/tcp   Up (healthy)
canvas-redis    redis:7-alpine  0.0.0.0:6379->6379/tcp   Up (healthy)
```

### 3. 查看服务日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看 MySQL 日志
docker-compose logs -f canvas-mysql

# 查看 Redis 日志
docker-compose logs -f canvas-redis
```

## 常用命令

### 停止服务

```bash
docker-compose stop
```

### 重启服务

```bash
docker-compose restart
```

### 停止并删除容器（数据会保留）

```bash
docker-compose down
```

### 完全清理（包括数据）⚠️

```bash
docker-compose down -v
```

**警告**：这会删除所有数据库数据！

## 服务配置

### MySQL 配置

- **端口**：3307（映射到容器的 3306）
- **用户名**：root
- **密码**：password
- **数据库**：canvas_helper
- **连接字符串**：`mysql://root:password@localhost:3307/canvas_helper`

### Redis 配置

- **端口**：6379
- **连接字符串**：`redis://localhost:6379`

## 数据持久化

数据通过 Docker Volume 持久化：

```bash
# 查看 volumes
docker volume ls | findstr canvas

# 查看 volume 详情
docker volume inspect canvas-helper_mysql-data
docker volume inspect canvas-helper_redis-data
```

## 连接测试

### 测试 MySQL 连接

```bash
# 使用 Docker 客户端
docker exec -it canvas-mysql mysql -uroot -ppassword -e "SHOW DATABASES;"

# 或使用本地 MySQL 客户端
mysql -h 127.0.0.1 -P 3307 -uroot -ppassword
```

### 测试 Redis 连接

```bash
# 使用 Docker 客户端
docker exec -it canvas-redis redis-cli ping

# 或使用本地 redis-cli
redis-cli -p 6379 ping
```

## 故障排查

### 端口被占用

如果端口 3307 或 6379 已被占用，修改 `docker-compose.yml`：

```yaml
ports:
  - "3308:3306"  # 将 MySQL 改为 3308
  - "6380:6379"  # 将 Redis 改为 6380
```

然后同步修改 `server/.env` 中的连接字符串。

### 容器无法启动

```bash
# 查看详细日志
docker-compose logs canvas-mysql
docker-compose logs canvas-redis

# 重新创建容器
docker-compose up -d --force-recreate
```

### MySQL 初始化失败

删除 volume 重新初始化：

```bash
docker-compose down -v
docker-compose up -d
```

## 备份与恢复

### 备份 MySQL 数据

```bash
docker exec canvas-mysql mysqldump -uroot -ppassword canvas_helper > backup.sql
```

### 恢复 MySQL 数据

```bash
docker exec -i canvas-mysql mysql -uroot -ppassword canvas_helper < backup.sql
```

### 备份 Redis 数据

```bash
docker exec canvas-redis redis-cli SAVE
docker cp canvas-redis:/data/dump.rdb ./redis-backup.rdb
```

## 生产环境建议

1. **修改默认密码**：在 `docker-compose.yml` 中修改 `MYSQL_ROOT_PASSWORD`
2. **启用 Redis 持久化**：添加 `appendonly yes` 配置
3. **设置资源限制**：添加 `mem_limit` 和 `cpus` 配置
4. **使用环境变量**：敏感信息使用 `.env` 文件管理

示例：

```yaml
services:
  canvas-mysql:
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_PASSWORD}
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
```

## 常见问题

**Q: 如何查看 MySQL 数据库大小？**

```bash
docker exec canvas-mysql mysql -uroot -ppassword -e "SELECT table_schema AS 'Database', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)' FROM information_schema.TABLES WHERE table_schema = 'canvas_helper' GROUP BY table_schema;"
```

**Q: 如何清空 Redis 所有数据？**

```bash
docker exec canvas-redis redis-cli FLUSHALL
```

**Q: 容器重启后数据会丢失吗？**

不会。数据存储在 Docker Volume 中，即使容器删除，数据也会保留。只有执行 `docker-compose down -v` 才会删除数据。
