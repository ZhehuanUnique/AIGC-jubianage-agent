# 更新 Kling API Key 说明

## 重要说明：.env 文件位置

根据代码检查，项目中有两个可能的 `.env` 文件位置：

1. **`server/.env`** - 主入口文件 `server/index.js` 使用（**推荐使用这个**）
2. **项目根目录 `.env`** - 部分服务文件会尝试加载（如果存在）

**建议：统一使用 `server/.env` 文件**，因为：
- 主入口文件 `server/index.js` 明确加载 `server/.env`
- 服务文件会先尝试加载根目录的 `.env`，如果不存在，会使用已加载的环境变量
- 之前的所有配置都在 `server/.env` 中

## API Key 信息

- **Kling-2.6 API Key**: `sk-Ye3MC07uIMCp6y3jHE1SJfjCeLn7zCdkEmJGFvfBiJRLVrtf`
- **Kling-O1 API Key**: `sk-KaKChOwvjCCidlz4xTLVgW5yYUQjL6MpRMuZFLMD3I96f4El`

## 更新服务器端配置

### 方法 1: 使用脚本（推荐）

脚本会自动在 `server/.env` 文件中更新配置。

#### Windows PowerShell:
```powershell
.\更新Kling-API密钥.ps1
```

#### Linux/Mac/Git Bash:
```bash
bash 更新Kling-API密钥.sh
```

### 方法 2: 手动更新

1. **SSH 连接到服务器**:
   ```bash
   ssh ubuntu@119.45.121.152
   ```

2. **进入服务器目录**:
   ```bash
   cd /var/www/aigc-agent/server
   ```

3. **备份现有 .env 文件**:
   ```bash
   cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
   ```

4. **更新 API Key**:
   ```bash
   # 更新 Kling-2.6 API Key
   sed -i 's|^KLING_26_API_KEY=.*|KLING_26_API_KEY=sk-Ye3MC07uIMCp6y3jHE1SJfjCeLn7zCdkEmJGFvfBiJRLVrtf|' .env
   
   # 更新 Kling-O1 API Key
   sed -i 's|^KLING_O1_API_KEY=.*|KLING_O1_API_KEY=sk-KaKChOwvjCCidlz4xTLVgW5yYUQjL6MpRMuZFLMD3I96f4El|' .env
   ```

   如果配置不存在，添加新配置:
   ```bash
   # 添加 Kling-2.6 API Key
   echo "KLING_26_API_KEY=sk-Ye3MC07uIMCp6y3jHE1SJfjCeLn7zCdkEmJGFvfBiJRLVrtf" >> .env
   
   # 添加 Kling-O1 API Key
   echo "KLING_O1_API_KEY=sk-KaKChOwvjCCidlz4xTLVgW5yYUQjL6MpRMuZFLMD3I96f4El" >> .env
   
   # 添加 API Host（如果不存在）
   echo "KLING_API_HOST=https://api.302.ai" >> .env
   ```

5. **验证更新**:
   ```bash
   grep "^KLING.*API_KEY=" .env
   grep "^KLING_API_HOST=" .env
   ```

6. **安装依赖（如果需要）**:
   ```bash
   npm install form-data
   ```

7. **重启后端服务**:
   ```bash
   pm2 restart aigc-agent
   ```

8. **检查服务状态**:
   ```bash
   pm2 logs aigc-agent --lines 20
   ```

## 更新本地配置（开发环境）

如果需要更新本地开发环境的配置，编辑 `server/.env` 文件，添加或更新以下配置：

```env
# Kling 可灵图生视频配置
KLING_26_API_KEY=sk-Ye3MC07uIMCp6y3jHE1SJfjCeLn7zCdkEmJGFvfBiJRLVrtf
KLING_O1_API_KEY=sk-KaKChOwvjCCidlz4xTLVgW5yYUQjL6MpRMuZFLMD3I96f4El
KLING_API_HOST=https://api.302.ai
```

## 验证配置

更新后，可以通过以下方式验证配置是否正确：

1. **检查环境变量**:
   ```bash
   # 在服务器上执行
   cd /var/www/aigc-agent/server
   node -e "require('dotenv').config(); console.log('KLING_26_API_KEY:', process.env.KLING_26_API_KEY ? '已设置' : '未设置'); console.log('KLING_O1_API_KEY:', process.env.KLING_O1_API_KEY ? '已设置' : '未设置');"
   ```

2. **测试 API 调用**:
   - 在前端使用 Kling 模型生成视频
   - 检查后端日志是否有 API Key 相关的错误

## 注意事项

1. **API Key 安全**: 
   - `.env` 文件已添加到 `.gitignore`，不会被提交到 Git
   - 不要在代码中硬编码 API Key
   - 定期轮换 API Key

2. **服务重启**:
   - 更新 `.env` 文件后必须重启后端服务才能生效
   - 使用 `pm2 restart aigc-agent` 重启服务

3. **备份**:
   - 更新前建议备份 `.env` 文件
   - 脚本会自动创建备份文件

4. **依赖安装**:
   - Kling 服务需要 `form-data` 包
   - 如果未安装，运行 `npm install form-data`

## 支持的模型

- **kling-2.6-5s**: Kling-2.6 5秒版本（使用 `KLING_26_API_KEY`）
- **kling-2.6-10s**: Kling-2.6 10秒版本（使用 `KLING_26_API_KEY`，待实现）
- **kling-o1**: Kling-O1 模型（使用 `KLING_O1_API_KEY`）

## 故障排除

如果遇到问题：

1. **检查 .env 文件格式**:
   - 确保没有多余的空格
   - 确保没有引号包裹 API Key
   - 确保每行以换行符结尾

2. **检查服务日志**:
   ```bash
   pm2 logs aigc-agent --lines 50
   ```

3. **验证环境变量**:
   ```bash
   cd /var/www/aigc-agent/server
   node -e "require('dotenv').config(); console.log(process.env.KLING_26_API_KEY);"
   ```

4. **检查依赖**:
   ```bash
   cd /var/www/aigc-agent/server
   npm list form-data
   ```

