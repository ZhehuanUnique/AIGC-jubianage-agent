# 🚀 IQuest-Coder-V1-40B 快速部署指南

## 📋 前置要求

✅ 你已经有：
- 腾讯云服务器（RTX 5090 * 1卡，24GB VRAM）
- Ubuntu 22.04 系统
- Docker 已安装
- NVIDIA 驱动已安装

## 🎯 部署步骤（3 分钟完成）

### 方法 1: Docker 部署（最简单，推荐）

```bash
# 1. 上传部署文件到服务器
# 将 iquest-coder-deploy 文件夹上传到服务器

# 2. SSH 连接到服务器
ssh ubuntu@你的服务器IP

# 3. 进入部署目录
cd iquest-coder-deploy

# 4. 启动服务（一键部署）
docker-compose up -d

# 5. 查看日志（等待模型下载，首次启动约需 10-20 分钟）
docker-compose logs -f

# 6. 测试 API
python3 test_api.py
```

### 方法 2: 直接部署

```bash
# 1. 上传部署文件到服务器
# 将 iquest-coder-deploy 文件夹上传到服务器

# 2. SSH 连接到服务器
ssh ubuntu@你的服务器IP

# 3. 进入部署目录
cd iquest-coder-deploy

# 4. 安装环境（需要 sudo 权限）
sudo bash install.sh

# 5. 启动服务
bash start_service.sh

# 6. 查看日志
pm2 logs iquest-coder

# 7. 测试 API
python3 test_api.py
```

## 🧪 测试 API

### 1. 健康检查
```bash
curl http://localhost:8000/health
```

### 2. 获取模型列表
```bash
curl http://localhost:8000/v1/models
```

### 3. 测试聊天
```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "IQuestLab/IQuest-Coder-V1-40B-Loop-Instruct",
    "messages": [
      {"role": "user", "content": "写一个 Python 函数计算斐波那契数列"}
    ],
    "temperature": 0.6,
    "top_p": 0.85,
    "max_tokens": 2048
  }'
```

### 4. 运行完整测试
```bash
python3 test_api.py
```

## 🌐 配置外网访问

### 1. 配置防火墙
```bash
# 开放 8000 端口
sudo ufw allow 8000/tcp
sudo ufw reload
```

### 2. 配置腾讯云安全组
- 登录腾讯云控制台
- 进入云服务器 -> 安全组
- 添加入站规则：TCP 8000 端口

### 3. 测试外网访问
```bash
# 从本地电脑测试
curl http://你的服务器公网IP:8000/health
```

## 🔒 配置 Nginx 反向代理（可选，推荐）

```bash
# 1. 安装 Nginx
sudo apt-get install nginx

# 2. 创建配置文件
sudo nano /etc/nginx/sites-available/iquest-coder

# 3. 添加以下配置
server {
    listen 80;
    server_name 你的域名或IP;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # 超时设置（大模型推理可能需要较长时间）
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}

# 4. 启用配置
sudo ln -s /etc/nginx/sites-available/iquest-coder /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 5. 测试
curl http://你的域名或IP/health
```

## 📊 监控和维护

### 查看服务状态
```bash
# Docker 方式
docker ps
docker stats iquest-coder-api

# 直接部署方式
pm2 status
pm2 monit
```

### 查看日志
```bash
# Docker 方式
docker logs -f iquest-coder-api

# 直接部署方式
pm2 logs iquest-coder
tail -f /var/log/iquest-coder-out.log
```

### 重启服务
```bash
# Docker 方式
docker-compose restart

# 直接部署方式
pm2 restart iquest-coder
```

### 停止服务
```bash
# Docker 方式
docker-compose down

# 直接部署方式
bash stop_service.sh
```

## 🐛 常见问题

### 1. 显存不足 (OOM)
**解决方案**：编辑 `start_vllm.sh`，调整以下参数：
```bash
MAX_MODEL_LEN=16384          # 减小上下文长度
GPU_MEMORY_UTILIZATION=0.85  # 减小显存利用率
MAX_NUM_BATCHED_TOKENS=4096  # 减小批处理大小
```

### 2. 模型下载慢
**解决方案**：使用 HuggingFace 镜像
```bash
export HF_ENDPOINT=https://hf-mirror.com
```

### 3. 推理速度慢
**检查项**：
- GPU 利用率：`nvidia-smi`
- 是否启用了量化
- 批处理大小是否合适

### 4. 端口被占用
```bash
# 查看端口占用
sudo lsof -i :8000

# 修改端口（编辑 start_vllm.sh 或 docker-compose.yml）
PORT=8001
```

## 💡 性能优化建议

1. **使用量化**：4-bit 量化可以显著减少显存占用
2. **调整批处理大小**：根据实际负载调整 `MAX_NUM_SEQS`
3. **启用 Flash Attention**：已默认启用，提升推理速度
4. **合理设置上下文长度**：不要设置过大，避免 OOM

## 📞 获取帮助

- [IQuest-Coder 官网](https://iquestcoder.ai/)
- [GitHub 仓库](https://github.com/IQuestLab/IQuest-Coder-V1)
- [HuggingFace 模型页](https://huggingface.co/IQuestLab/IQuest-Coder-V1-40B-Loop-Instruct)
- [vLLM 文档](https://docs.vllm.ai/)

## ✅ 部署完成检查清单

- [ ] 服务成功启动
- [ ] 健康检查通过
- [ ] 能够获取模型列表
- [ ] 聊天补全功能正常
- [ ] 外网可以访问（如果需要）
- [ ] 日志正常输出
- [ ] GPU 利用率正常

恭喜！你已经成功部署了 IQuest-Coder-V1-40B API 服务！🎉
