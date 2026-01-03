# 修复 Milvus Standalone 重启问题

## 🔍 问题诊断

`milvus-standalone` 容器状态显示为 `Restarting (1)`，说明容器在不断重启，无法正常启动。

**常见原因**：
1. RocksMQ 数据损坏（最常见）
2. 端口被占用
3. 资源不足（内存、CPU）
4. 依赖服务未就绪

## ✅ 解决方案

### 方法1：使用修复脚本（推荐）

**Windows（CMD 或 PowerShell）：**
```cmd
修复Milvus重启问题.bat
```

**Git Bash 或 Linux：**
```bash
bash 修复Milvus重启问题.sh
```

### 方法2：手动修复

#### 步骤1：停止所有容器

```bash
cd milvus
docker-compose down
```

#### 步骤2：清理损坏的 RocksMQ 数据

**Windows（CMD）：**
```cmd
cd milvus
rmdir /S /Q volumes\milvus\rdb_data
```

**Windows（PowerShell）：**
```powershell
cd milvus
Remove-Item -Recurse -Force volumes\milvus\rdb_data
```

**Git Bash 或 Linux：**
```bash
cd milvus
rm -rf volumes/milvus/rdb_data
```

**注意**：清理 `rdb_data` 目录会删除 RocksMQ 的消息队列数据，但不会影响已存储的向量数据（存储在 MinIO 中）。

#### 步骤3：重新启动服务

```bash
cd milvus
docker-compose up -d
```

#### 步骤4：等待服务启动

Milvus 需要 30-60 秒才能完全启动。

**Windows：**
```cmd
timeout /t 60
```

**Git Bash 或 Linux：**
```bash
sleep 60
```

#### 步骤5：检查状态

```bash
cd milvus
docker-compose ps
```

**预期结果**：
- `milvus-etcd`: `Up (healthy)`
- `milvus-minio`: `Up (healthy)`
- `milvus-standalone`: `Up (healthy)` 或 `Up (health: starting)`

如果 `milvus-standalone` 仍然是 `Restarting`，继续下一步。

#### 步骤6：查看日志

```bash
cd milvus
docker-compose logs --tail=50 standalone
```

查看错误信息，根据错误进行修复。

#### 步骤7：测试健康检查

```bash
curl http://localhost:9091/healthz
```

应该返回 `OK`。

## 🔍 进一步诊断

### 查看实时日志

```bash
cd milvus
docker-compose logs -f standalone
```

### 检查资源使用

```bash
docker stats milvus-standalone
```

### 检查端口占用

**Windows：**
```cmd
netstat -ano | findstr 19530
netstat -ano | findstr 9091
```

**Linux：**
```bash
netstat -tuln | grep 19530
netstat -tuln | grep 9091
```

## ⚠️ 常见错误和解决方案

### 错误1：`Corruption: CURRENT file corrupted`

**原因**：RocksMQ 数据文件损坏

**解决方案**：按照上述步骤清理 `rdb_data` 目录

### 错误2：端口被占用

**症状**：`Error: bind: address already in use`

**解决方案**：
1. 查找占用端口的进程并停止
2. 或修改 `docker-compose.yml` 中的端口映射

### 错误3：内存不足

**症状**：容器启动后立即退出

**解决方案**：
1. 增加 Docker 的内存限制
2. 关闭其他占用内存的应用

### 错误4：依赖服务未就绪

**症状**：`Error: 14 UNAVAILABLE: No connection established`

**解决方案**：
1. 确保 `etcd` 和 `minio` 都在运行且健康
2. 等待更长时间让依赖服务完全启动

## 📋 验证清单

- [ ] 容器已停止
- [ ] 损坏的 `rdb_data` 目录已删除
- [ ] 服务已重新启动
- [ ] 等待 60 秒让 Milvus 完全启动
- [ ] 容器状态为 "Up" 或 "healthy"
- [ ] 健康检查返回 `OK`

## 🎯 预期结果

修复后，`milvus-standalone` 应该能够正常启动，状态显示为 `Up (healthy)` 或 `Up (health: starting)`。

如果问题仍然存在，请查看日志并参考错误信息进行进一步修复。

---

**创建时间**：2026-01-03  
**最后更新**：2026-01-03

