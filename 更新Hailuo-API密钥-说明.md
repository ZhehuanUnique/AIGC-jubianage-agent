# 更新 Hailuo API Key 说明

## API Key 信息

- **Hailuo-2.3 API Key**: `sk-cjiLn17tIdXqi3QBN6E2so6CtHOSJlc9yFlQkU9Yryw72XG5`
- **Hailuo-02 API Key**: `sk-OjYZLpE7qAUyy6XL8EQSZuq5SFciSK3zzn6yfdjwuhzxDwMn`

## 更新服务器端配置

### 方法 1: 使用脚本（推荐）

#### Windows PowerShell:
```powershell
.\更新Hailuo-API密钥.ps1
```

#### Linux/Mac/Git Bash:
```bash
bash 更新Hailuo-API密钥.sh
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
   # 更新 Hailuo-02 API Key
   sed -i 's|^HAILUO_02_API_KEY=.*|HAILUO_02_API_KEY=sk-OjYZLpE7qAUyy6XL8EQSZuq5SFciSK3zzn6yfdjwuhzxDwMn|' .env
   
   # 更新 Hailuo-2.3 API Key
   sed -i 's|^HAILUO_23_API_KEY=.*|HAILUO_23_API_KEY=sk-cjiLn17tIdXqi3QBN6E2so6CtHOSJlc9yFlQkU9Yryw72XG5|' .env
   ```

   如果配置不存在，添加新配置:
   ```bash
   # 添加 Hailuo-02 API Key
   echo "HAILUO_02_API_KEY=sk-OjYZLpE7qAUyy6XL8EQSZuq5SFciSK3zzn6yfdjwuhzxDwMn" >> .env
   
   # 添加 Hailuo-2.3 API Key
   echo "HAILUO_23_API_KEY=sk-cjiLn17tIdXqi3QBN6E2so6CtHOSJlc9yFlQkU9Yryw72XG5" >> .env
   ```

5. **验证更新**:
   ```bash
   grep "^HAILUO.*API_KEY=" .env
   ```

6. **重启后端服务**:
   ```bash
   pm2 restart aigc-agent
   ```

7. **检查服务状态**:
   ```bash
   pm2 logs aigc-agent --lines 20
   ```

## 更新本地配置（开发环境）

如果需要更新本地开发环境的配置，编辑 `server/.env` 文件，添加或更新以下配置：

```env
# MiniMax Hailuo 图生视频配置
HAILUO_02_API_KEY=sk-OjYZLpE7qAUyy6XL8EQSZuq5SFciSK3zzn6yfdjwuhzxDwMn
HAILUO_23_API_KEY=sk-cjiLn17tIdXqi3QBN6E2so6CtHOSJlc9yFlQkU9Yryw72XG5
HAILUO_API_HOST=https://api.302.ai
```

## 验证配置

更新后，可以通过以下方式验证配置是否正确：

1. **检查环境变量**:
   ```bash
   # 在服务器上执行
   cd /var/www/aigc-agent/server
   node -e "require('dotenv').config(); console.log('HAILUO_02_API_KEY:', process.env.HAILUO_02_API_KEY ? '已设置' : '未设置'); console.log('HAILUO_23_API_KEY:', process.env.HAILUO_23_API_KEY ? '已设置' : '未设置');"
   ```

2. **测试 API 调用**:
   - 在前端使用 Hailuo 模型生成视频
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

## 支持的模型

- **MiniMax-Hailuo-02**: 使用 `HAILUO_02_API_KEY`
- **MiniMax-Hailuo-2.3**: 使用 `HAILUO_23_API_KEY`
- **MiniMax-Hailuo-2.3-fast**: 使用 `HAILUO_23_API_KEY`

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
   node -e "require('dotenv').config(); console.log(process.env.HAILUO_02_API_KEY);"
   ```

