# AIGC 剧变时代 Agent - 完整技能文档

本文档整合了项目中所有通用功能、配置指南和部署说明。

## 📋 目录

1. [项目概述](#项目概述)
2. [MCP 配置指南](#mcp-配置指南)
3. [图片生成模型说明](#图片生成模型说明)
4. [数据库管理](#数据库管理)
5. [Milvus 向量数据库](#milvus-向量数据库)
6. [RAG 库使用](#rag-库使用)
7. [腾讯云 COS 配置](#腾讯云-cos-配置)
8. [部署方案](#部署方案)
9. [常用命令](#常用命令)
10. [故障排查](#故障排查)

---

## 项目概述

### 核心功能
- 📝 剧本输入和管理：支持文本输入和.docx文件上传
- 🤖 智能剧本分析：使用通义千问大模型自动提取角色、场景、物品
- ✂️ 智能剧本切分：自动将剧本切分为多个片段，每个片段对应一个分镜
- 🎨 文生图功能：支持多种图片生成模型
- 🎬 图生视频模式：集成多种图生视频服务
- 🎨 资产详情管理：管理角色、场景、物品，支持本地上传
- 📸 分镜管理：配置每个分镜的详细信息
- 🖼️ 融图管理：选择图片素材并配置视频生成参数
- 🎥 视频编辑和导出：编辑和导出生成的视频

### 技术栈
- **前端**：React 18 + TypeScript + Vite + Tailwind CSS
- **后端**：Node.js + Express
- **数据库**：Supabase (PostgreSQL)
- **存储**：腾讯云 COS
- **AI服务**：通义千问、Nano Banana、Midjourney、通义万相等

---

## MCP 配置指南

### MCP 服务器配置位置

配置文件：`.cursor/mcp.json`

### 当前已配置的 MCP 服务器

1. **Supabase** - 数据库管理
2. **腾讯云 COS** - 对象存储
3. **GitHub** - 代码仓库管理
4. **Vercel** - 部署管理
5. **火山引擎 Vevod** - 视频处理
6. **302.ai Custom MCP** - AI 服务

### MCP 工具数量优化

**问题**：当工具数量超过 80 个时，Cursor 会显示警告。

**解决方案**：
1. 在 Cursor 设置中禁用不需要的工具
2. 只保留实际使用的工具
3. 推荐工具数量：50-80 个

### Vercel MCP 工具选择

**需要保留的工具**：
- `get_deployment` - 获取部署信息
- `get_deployment_events` - 获取部署事件
- `get_deployment_logs` - 获取部署日志
- `get_project` - 获取项目信息
- 域名管理相关工具
- 环境变量管理相关工具

**需要禁用的工具类别**：
- 团队管理工具
- 监控和分析工具
- 安全设置工具

### MCP 令牌获取

#### GitHub Personal Access Token
1. 访问 [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. 生成新令牌，选择所需权限
3. 复制令牌（只显示一次）

#### Vercel Access Token
1. 访问 [Vercel Account → Tokens](https://vercel.com/account/tokens)
2. 创建新令牌
3. 复制令牌（只显示一次）

#### 腾讯云 COS 密钥
1. 访问 [腾讯云控制台 → 访问管理 → API密钥管理](https://console.cloud.tencent.com/cam/capi)
2. 创建或查看密钥
3. 获取 SecretId 和 SecretKey

#### Supabase Access Token
1. 访问 [Supabase Dashboard](https://app.supabase.com)
2. 进入项目设置 → API
3. 复制 Access Token

---

## 图片生成模型说明

### 支持参考图的模型

1. **nano-banana-pro** ✅
   - 支持单张参考图
   - 角色一致性、高级文本渲染、4K输出

2. **seedream-4-0** ✅
   - 支持单张或多张参考图（最多10张）

3. **seedream-4-5** ✅
   - 支持单张或多张参考图（最多10张）

4. **flux-2-max** ✅
   - 支持单张或多张参考图（最多8张）

5. **flux-2-flex** ✅
   - 支持单张或多张参考图（最多8张）

6. **flux-2-pro** ✅
   - 支持单张或多张参考图（最多8张）

### 不支持参考图的模型

1. **midjourney-v7-t2i** ❌
   - 不支持参考图（图生图模式）
   - 只能使用文生图模式
   - 会生成4张图片的网格（2x2布局）
   - 自动 Upscale 功能：网格图生成后自动放大

### 使用说明

- **自动启用参考图模式**：当关联了角色、场景、物品或姿势时，系统会自动启用参考图模式
- **参考图优先级**：
  - nano-banana-pro：只支持单张，使用第一张图片
  - Seedream、Flux：支持多张参考图，传递所有关联的图片
- **图片比例**：所有分镜使用全局设置的图片比例（16:9、9:16 或 1:1）

---

## 数据库管理

### Supabase 配置

**配置文件位置**：`.cursor/mcp.json`

**只读模式配置**：
```json
{
  "mcpServers": {
    "supabase-jubianage-agent": {
      "command": "cmd",
      "args": [
        "/c",
        "npx",
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--read-only",
        "--project-ref=ogndfzxtzsifaqwzfojs"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "您的访问令牌"
      }
    }
  }
}
```

### 用户数据隔离

- 所有项目、任务、角色、场景、物品等数据都按 `user_id` 隔离
- 每个用户只能看到和操作自己的数据
- 创建数据时自动关联当前登录用户

### 数据库表结构

主要表：
- `users` - 用户表
- `projects` - 项目表（包含 `user_id`）
- `tasks` - 任务表（包含 `user_id`）
- `characters` - 角色表
- `scenes` - 场景表
- `items` - 物品表
- `shots` - 分镜表
- `files` - 文件表
- `generated_assets` - 生成资产表（用于跨设备同步）

---

## Milvus 向量数据库

### 快速启动

#### 方式 1：Docker 单容器启动

```powershell
docker pull milvusdb/milvus:latest
docker run -d --name milvus-standalone -p 19530:19530 -p 9091:9091 milvusdb/milvus:latest
```

#### 方式 2：Docker Compose 启动（推荐）

```powershell
cd milvus
docker-compose up -d
```

### 验证 Milvus 运行

```powershell
# 检查容器状态
docker ps | findstr milvus

# 检查端口
netstat -an | findstr 19530
```

### 常用命令

```powershell
# 启动
docker start milvus-standalone

# 停止
docker stop milvus-standalone

# 查看日志
docker logs milvus-standalone

# 进入容器
docker exec -it milvus-standalone /bin/bash
```

### 推荐配置

**开发环境（推荐使用 Chroma）**：
```env
VECTOR_DB_TYPE=chroma
GEMINI_RAG_VECTOR_DB_PATH=./data/gemini_rag_vectors
```

**生产环境（推荐使用 Milvus）**：
```env
VECTOR_DB_TYPE=milvus
MILVUS_HOST=localhost
MILVUS_PORT=19530
```

---

## RAG 库使用

### 概述

当前项目实现了两种 RAG（检索增强生成）方案：

1. **简单版本** (`ragService.js`)：基于 JSON 文件存储，使用关键词匹配进行相似度计算
2. **高级版本** (`geminiRagService.js`)：支持向量数据库（Chroma/Milvus），使用真正的向量相似度计算

### 导入剧本文档到 RAG 库

#### 方式 1：使用简单脚本导入（推荐）

1. **修改脚本配置**

编辑 `server/services/videoMotionPrompt/simple-import-script.js` 文件：

```javascript
// 剧本文件路径（修改为你的文档路径）
const scriptFilePath = 'C:\\Users\\Administrator\\Desktop\\agent测试\\安萌.docx'

// RAG 库中的剧本ID（修改为唯一的ID，建议使用英文和数字）
const scriptId = 'anmeng' // 例如：'anmeng', 'script_001', 'my_script' 等
```

**路径格式说明**：
- Windows 路径需要使用双反斜杠 `\\` 或正斜杠 `/`
- 示例：`'C:\\Users\\Administrator\\Desktop\\agent测试\\安萌.docx'`
- 或者：`'C:/Users/Administrator/Desktop/agent测试/安萌.docx'`

**scriptId 命名建议**：
- 使用英文、数字、下划线
- 避免使用中文和特殊字符
- 建议使用有意义的名称，如：`anmeng`, `script_001`, `my_project_v1`

2. **运行导入脚本**

```powershell
cd server
node services/videoMotionPrompt/simple-import-script.js
```

3. **查看导入结果**

脚本运行后会显示：
- ✅ 文件检查结果
- ✅ 解析成功信息（剧本长度、预览）
- ✅ 切分结果（片段数量）
- ✅ 存储成功信息
- ✅ 验证结果（检索测试）

**成功标志**：
```
✅ 成功存储 X 个片段到 RAG 库
   RAG 库 ID: anmeng
   存储路径: ./data/rag_vectors/anmeng.json
✅ 验证成功，检索到 X 个相关片段
🎉 导入完成！
```

#### 方式 2：使用 API 接口

```powershell
curl -X POST http://localhost:3002/api/rag/store-script `
  -H "Content-Type: application/json" `
  -d '{
    "scriptId": "script_001",
    "segments": [
      {
        "shotNumber": 1,
        "content": "第一段剧本内容...",
        "prompt": "可选的分镜提示词"
      }
    ]
  }'
```

#### 方式 3：直接编辑 JSON 文件

1. 运行简单脚本生成初始 JSON 文件
2. 编辑文件：`server/data/rag_vectors/{scriptId}.json`
3. 格式示例：

```json
{
  "scriptId": "anmeng",
  "segments": [
    {
      "shotNumber": 1,
      "content": "第一段剧本内容",
      "prompt": "分镜提示词（可选）",
      "description": "描述（可选）",
      "keywords": ["关键词1", "关键词2"],
      "storedAt": "2025-12-27T10:00:00.000Z"
    }
  ],
  "updatedAt": "2025-12-27T10:00:00.000Z"
}
```

### 确认是否导入成功

#### 方法 1：检查文件是否存在

```powershell
Test-Path "server\data\rag_vectors\anmeng.json"
```

#### 方法 2：查看文件内容

```powershell
Get-Content "server\data\rag_vectors\anmeng.json" -Head 50
```

#### 方法 3：查看所有已导入的剧本

```powershell
Get-ChildItem "server\data\rag_vectors\*.json" | Select-Object Name
```

### RAG 库实现说明

#### 简单版本（默认）

**存储方式**：
- 使用 JSON 文件存储剧本片段
- 文件路径：`server/data/rag_vectors/{scriptId}.json`
- 每个剧本一个 JSON 文件

**检索方式**：
- 基于关键词匹配的相似度计算
- 提取关键词 → 计算交集/并集 → 得到相似度分数
- 相似度阈值：默认 0.6（可配置）

**优点**：
- ✅ 无需额外依赖
- ✅ 实现简单，易于理解
- ✅ 适合小规模数据

**缺点**：
- ❌ 检索精度有限
- ❌ 无法理解语义相似性

#### 高级版本（Gemini RAG）

**存储方式**：
- 支持两种向量数据库：
  - **ChromaDB**：轻量级，适合本地部署
  - **Milvus**：高性能，适合大规模数据
- 使用向量嵌入（Embedding）存储剧本片段

**检索方式**：
- 使用 Gemini Embedding API 生成向量
- 支持混合检索：
  - **CLIP 向量**：用于敏感剧本数据（本地生成，私有存储）
  - **Gemini Embedding**：用于公开/参考素材（云端生成）
- 向量相似度计算（余弦相似度）

**优点**：
- ✅ 语义理解能力强
- ✅ 检索精度高
- ✅ 支持大规模数据
- ✅ 支持混合检索策略

**缺点**：
- ❌ 需要额外的向量数据库依赖
- ❌ 需要 Gemini API Key
- ❌ 配置相对复杂

### 高级版本配置（Chroma/Milvus）

#### 安装依赖

**ChromaDB（推荐新手）**：
```powershell
cd server
npm install chromadb
```

**Milvus（适合大规模使用）**：
```powershell
cd server
npm install @zilliz/milvus2-sdk-node
```

#### 配置环境变量

在 `server/.env` 文件中添加：

```env
# ==================== Gemini RAG 配置 ====================
# Gemini API Key（必需）
GEMINI_3_PRO_API_KEY=your_gemini_api_key_here

# 向量数据库类型：chroma 或 milvus
VECTOR_DB_TYPE=chroma

# Gemini RAG 向量数据库路径（Chroma 使用本地路径，Milvus 使用连接地址）
GEMINI_RAG_VECTOR_DB_PATH=./data/gemini_rag_vectors

# Milvus 配置（仅在 VECTOR_DB_TYPE=milvus 时使用）
MILVUS_HOST=localhost
MILVUS_PORT=19530

# Gemini RAG 检索返回的 top K 结果数量
GEMINI_RAG_TOP_K=5

# Gemini RAG 相似度阈值（0-1）
GEMINI_RAG_SIMILARITY_THRESHOLD=0.6

# 是否合并 CLIP 和 Gemini 的检索结果（混合检索）
GEMINI_RAG_MERGE_RESULTS=true
```

### RAG 库功能

- **剧本导入**：支持 .docx 文件导入
- **智能切分**：自动将剧本切分为多个片段
- **向量存储**：使用 Milvus 或 Chroma 存储向量
- **智能检索**：支持语义检索相关片段
- **视频运动提示词生成**：基于 RAG 检索生成视频运动提示词

### 使用存储的剧本

生成视频运动提示词时，使用 `scriptId`：

```powershell
curl -X POST http://localhost:3002/api/generate-video-motion-prompt `
  -H "Content-Type: application/json" `
  -d '{
    "imageUrl": "https://example.com/image.jpg",
    "scriptContext": "当前分镜的内容...",
    "shotNumber": 1,
    "scriptId": "anmeng"
  }'
```

系统会自动：
- ✅ 从 RAG 库检索相关片段（相似度 >= 0.6）
- ✅ 获取当前分镜前后的上下文（窗口大小：2）
- ✅ 结合图片分析和 RAG 上下文生成提示词

### 删除不需要的剧本

**方法 1：直接删除 JSON 文件（推荐）**

```powershell
Remove-Item "server\data\rag_vectors\anmeng.json" -Force
```

**方法 2：如果使用向量数据库（Chroma/Milvus）**

需要编写脚本删除集合，或删除整个数据目录。

---

## 腾讯云 COS 配置

### MCP 配置

```json
{
  "mcpServers": {
    "tencent-cos-AIGC-jubianage-agent": {
      "command": "npx",
      "args": [
        "-y",
        "cos-mcp@latest",
        "--Region=ap-guangzhou",
        "--Bucket=jubianage-agent-1392491103",
        "--connectType=stdio"
      ],
      "env": {
        "COS_SECRET_ID": "YOUR_SECRET_ID_HERE",
        "COS_SECRET_KEY": "YOUR_SECRET_KEY_HERE"
      }
    }
  }
}
```

### 获取配置信息

#### 1. 获取 SecretId 和 SecretKey

1. 访问 [腾讯云控制台 → 访问管理 → API密钥管理](https://console.cloud.tencent.com/cam/capi)
2. 创建或查看密钥
3. 复制 SecretId 和 SecretKey（⚠️ SecretKey 只显示一次，请妥善保存）

#### 2. 获取存储桶信息

1. 访问 [腾讯云 COS 控制台](https://console.cloud.tencent.com/cos)
2. 查看存储桶列表
3. 记录：
   - **存储桶名称**（Bucket）
   - **所属地域代码**（Region）

#### 3. 创建数据集（可选，用于智能检索）

1. 在 COS 控制台进入存储桶
2. 进入 **数据万象** → **智能检索**
3. 创建数据集（DatasetName）

### 功能特性

- **对象存储**：上传/下载/删除对象
- **图片处理**：水印、超分、抠图、质量评估
- **文档处理**：文档转 PDF
- **智能检索**：文搜图、图搜图

### 多存储桶配置

如果需要配置多个存储桶，可以在 `.cursor/mcp.json` 中添加多个配置：

```json
{
  "mcpServers": {
    "tencent-cos-bucket1": {
      "command": "npx",
      "args": [
        "-y",
        "cos-mcp@latest",
        "--Region=ap-guangzhou",
        "--Bucket=bucket1-1392491103",
        "--connectType=stdio"
      ],
      "env": {
        "COS_SECRET_ID": "YOUR_SECRET_ID_HERE",
        "COS_SECRET_KEY": "YOUR_SECRET_KEY_HERE"
      }
    },
    "tencent-cos-bucket2": {
      "command": "npx",
      "args": [
        "-y",
        "cos-mcp@latest",
        "--Region=ap-beijing",
        "--Bucket=bucket2-1392491103",
        "--connectType=stdio"
      ],
      "env": {
        "COS_SECRET_ID": "YOUR_SECRET_ID_HERE",
        "COS_SECRET_KEY": "YOUR_SECRET_KEY_HERE"
      }
    }
  }
}
```

---

## 部署方案

### 部署方案对比

#### 1. 腾讯云 CVM（推荐用于国内用户）⭐

**优点**：
- 国内访问速度快
- 数据合规要求（数据存储在境内）
- 长期成本更低（约便宜 30-50%）
- 技术生态完整，方便扩展
- 稳定性更好，技术支持完善

**适用场景**：主要面向国内用户的商业产品

**配置推荐**：
- **初期（<1000用户）**：2核4G（约 ¥100-150/月）
- **成长期（1000-10000用户）**：4核8G（约 ¥200-300/月）
- **操作系统**：Ubuntu 22.04 LTS（推荐）
- **带宽**：5Mbps（按量计费或包年包月）

#### 2. Railway（推荐用于开发/测试）

**优点**：
- 免费额度：$5/月（500小时运行时间）
- 无文件大小限制
- 支持 Node.js、PostgreSQL
- 自动 HTTPS
- 简单易用，GitHub 集成

**适用场景**：中小型项目，需要简单部署

#### 3. Fly.io

**优点**：
- 免费额度：3个共享CPU、256MB RAM的VM（2340小时/月）
- 无明确的部署文件大小限制
- 全球边缘节点，速度快
- 支持 Docker
- 持久存储：3GB（免费额度）

**适用场景**：需要全球部署、对性能要求高的项目

#### 4. Render

**优点**：
- 免费额度：750小时/月
- 无文件大小限制
- 支持 Node.js、PostgreSQL
- 自动 HTTPS
- 支持 WebSocket

**缺点**：
- 免费服务在15分钟无活动后会休眠
- 国内访问可能较慢

### 部署步骤（以腾讯云为例）

#### 1. 购买和配置服务器

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 进入 **云服务器 CVM** → **新建实例**
3. 选择配置（参考上述推荐配置）
4. 设置登录方式（密码或SSH密钥）
5. 完成支付

#### 2. 安装必要软件

```bash
# 更新系统
apt update && apt upgrade -y

# 安装 Node.js（使用 NVM）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20

# 安装 PM2
npm install -g pm2
pm2 startup

# 安装 Nginx
apt install nginx -y
systemctl start nginx
systemctl enable nginx

# 安装 Git
apt install git -y
```

#### 3. 部署应用

```bash
# 克隆代码
cd /var/www
git clone https://github.com/你的用户名/AIGC-jubianage-agent.git aigc-agent
cd aigc-agent

# 安装依赖
npm install
cd server
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入所有必要的配置

# 构建前端
cd ..
npm run build

# 启动服务
cd server
pm2 start index.js --name aigc-agent
pm2 save
```

#### 4. 配置 Nginx

```bash
# 创建 Nginx 配置
sudo nano /etc/nginx/sites-available/aigc-agent
```

配置内容：
```nginx
server {
    listen 80;
    server_name jubianai.cn;

    # 前端静态文件
    location / {
        root /var/www/aigc-agent/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API
    location /api {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/aigc-agent /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 5. 配置 SSL（使用 Certbot）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取 SSL 证书
sudo certbot --nginx -d jubianai.cn

# 自动续期（已自动配置）
sudo certbot renew --dry-run
```

---

## 常用命令

### Docker 相关

```powershell
# Milvus 启动
cd milvus
docker-compose up -d

# Milvus 停止
docker-compose down

# 查看 Milvus 容器
docker ps | findstr milvus
```

### 项目相关

```powershell
# 启动后端服务
cd server
npm start

# 启动前端服务（开发模式）
npm run dev

# 构建前端
npm run build
```

### 数据库相关

```powershell
# 查看 Supabase 表
# 使用 MCP 工具：mcp_supabase-jubianage-agent_list_tables

# 执行 SQL 迁移
# 使用 MCP 工具：mcp_supabase-jubianage-agent_apply_migration
```

### PM2 相关（服务器上）

#### 基本命令

```bash
# 启动应用
pm2 start index.js --name aigc-agent
# 或使用配置文件
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs aigc-agent
pm2 logs aigc-agent --lines 50  # 查看最近50行
pm2 logs aigc-agent --err       # 只看错误日志

# 重启应用
pm2 restart aigc-agent

# 停止应用
pm2 stop aigc-agent

# 删除应用
pm2 delete aigc-agent

# 保存配置（开机自启）
pm2 save
pm2 startup  # 设置开机自启
```

#### PM2 配置文件（ecosystem.config.js）

```javascript
module.exports = {
  apps : [{
    name: "aigc-agent",
    script: "index.js",
    cwd: "/var/www/aigc-agent/server",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "production",
    },
    log_file: "/home/ubuntu/.pm2/logs/aigc-agent-combined.log",
    error_file: "/home/ubuntu/.pm2/logs/aigc-agent-error.log",
    out_file: "/home/ubuntu/.pm2/logs/aigc-agent-out.log",
    merge_logs: true,
    log_date_format: "YYYY-MM-DD HH:mm:ss",
  }]
};
```

#### PM2 监控脚本（pm2-monitor.sh）

创建监控脚本确保服务 24 小时运行：

```bash
#!/bin/bash
# 位置：server/pm2-monitor.sh

# 检查 PM2 服务状态
if ! pm2 list | grep -q "aigc-agent.*online"; then
    echo "$(date): 服务未运行，正在重启..."
    cd /var/www/aigc-agent/server
    pm2 restart aigc-agent || pm2 start ecosystem.config.js
    pm2 save
fi

# 检查端口 3002
if ! netstat -tuln | grep -q ":3002"; then
    echo "$(date): 端口 3002 未监听，正在重启服务..."
    cd /var/www/aigc-agent/server
    pm2 restart aigc-agent
fi
```

设置定时任务（每 5 分钟检查一次）：
```bash
# 添加 cron 任务
crontab -e
# 添加以下行：
*/5 * * * * /var/www/aigc-agent/server/pm2-monitor.sh >> /home/ubuntu/.pm2/logs/monitor.log 2>&1
```

### Nginx 配置

#### 基本配置

```nginx
server {
    listen 80;
    server_name jubianai.cn www.jubianai.cn;

    # 前端静态文件
    location / {
        root /var/www/aigc-agent/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # 后端 API
    location /api {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 健康检查（特殊处理）
    location = /api/health {
        rewrite ^/api/health$ /health break;
        proxy_pass http://localhost:3002;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /var/www/aigc-agent/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Nginx 管理命令

```bash
# 测试配置
sudo nginx -t

# 重新加载配置（不中断服务）
sudo systemctl reload nginx

# 重启 Nginx
sudo systemctl restart nginx

# 查看状态
sudo systemctl status nginx

# 查看日志
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### 代码更新流程

#### 1. 提交代码到 GitHub

**Windows：**
```powershell
.\提交代码到GitHub.ps1
```

**Linux/Mac：**
```bash
bash 提交代码到GitHub.sh
```

#### 2. 服务器更新部署

**完整更新（推荐）：**
```bash
cd /var/www/aigc-agent
bash 更新线上部署.sh
```

**快速更新：**
```bash
cd /var/www/aigc-agent
bash 快速更新线上部署.sh
```

**手动更新：**
```bash
cd /var/www/aigc-agent
git pull origin main
cd server && pm2 restart aigc-agent && cd ..
rm -rf dist node_modules/.vite
npm run build
sudo chown -R ubuntu:ubuntu dist/
sudo systemctl reload nginx
```

### 小组功能部署

#### 数据库迁移

```bash
cd /var/www/aigc-agent/server
node db/addGroupSupport.js
```

#### 功能说明

- 在"数据分析" -> "用户管理" -> "小组管理"中创建小组
- 将用户添加到小组
- 小组内成员共享"项目管理"中的文件夹
- 不同小组之间的文件夹不共享（组间过滤）

#### API 端点

- `GET /api/groups` - 获取所有小组
- `POST /api/groups` - 创建小组
- `GET /api/groups/:groupId` - 获取小组详情
- `POST /api/groups/:groupId/members` - 添加用户到小组
- `DELETE /api/groups/:groupId/members/:userId` - 从小组移除用户
- `DELETE /api/groups/:groupId` - 删除小组

---

## 故障排查

### 常见问题

#### 1. MCP 配置问题

**问题**：MCP 工具无法使用

**解决**：
1. 检查 `.cursor/mcp.json` 配置是否正确
2. 确认 API 密钥和令牌有效
3. 重启 Cursor

#### 2. 数据库连接问题

**问题**：无法连接到 Supabase

**解决**：
1. 检查 Supabase 项目是否正常运行
2. 确认连接字符串正确
3. 检查网络连接

#### 3. COS 上传失败

**问题**：文件上传到 COS 失败

**解决**：
1. 检查 COS 配置（SecretId、SecretKey、Bucket、Region）
2. 确认存储桶权限设置正确
3. 检查网络连接

#### 4. Milvus 连接超时

**问题**：`Error: 4 DEADLINE_EXCEEDED: Deadline exceeded`

**解决**：
1. 检查 Milvus 容器是否运行：`docker ps | findstr milvus`
2. 检查端口是否被占用：`netstat -an | findstr 19530`
3. 增加超时时间配置

#### 5. 图片生成失败

**问题**：图片生成任务失败

**解决**：
1. 检查对应的 API 密钥是否正确配置
2. 查看后端日志获取详细错误信息
3. 确认 API 配额是否充足

#### 6. 部署后无法访问

**问题**：部署后网站无法访问

**解决**：
1. 检查服务器防火墙设置（开放 80、443 端口）
2. 检查 Nginx 配置是否正确
3. 检查 PM2 进程是否运行：`pm2 status`
4. 查看 Nginx 日志：`sudo tail -f /var/log/nginx/error.log`

#### 7. Git pull 失败

**问题**：`Permission denied` 或 `Authentication failed`

**解决**：
```bash
# 检查 SSH 密钥配置
ssh -T git@github.com

# 或使用 HTTPS（需要输入用户名和密码）
git remote set-url origin https://github.com/your-username/your-repo.git
```

#### 8. 构建失败

**问题**：`npm run build` 失败

**解决**：
```bash
# 清理并重新安装依赖
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### 9. 后端服务未启动

**问题**：`pm2 status` 显示服务未运行

**解决**：
```bash
# 查看错误日志
pm2 logs aigc-agent --err

# 手动启动
cd /var/www/aigc-agent/server
pm2 start ecosystem.config.js
pm2 save
```

#### 10. Nginx 重新加载失败

**问题**：`systemctl reload nginx` 失败

**解决**：
```bash
# 检查 Nginx 配置
sudo nginx -t

# 如果配置有误，修复后重新加载
sudo systemctl reload nginx
```

---

## 注意事项

1. **MCP 配置修改后需要重启 Cursor**
2. **API 密钥和令牌不要提交到代码仓库**
3. **用户数据完全隔离，不同用户之间数据不互通**
4. **工具数量建议控制在 80 个以下**
5. **所有新的 .md 文档应保存在 `skill` 文件夹中**
6. **生产环境必须使用 HTTPS**
7. **定期备份数据库**
8. **监控服务器资源使用情况**

---

## 相关资源

- [Supabase Dashboard](https://app.supabase.com)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [腾讯云控制台](https://console.cloud.tencent.com)
- [302.ai Dashboard](https://302.ai/dashboard)
- [GitHub 仓库](https://github.com/ZhehuanUnique/AIGC-jubianage-agent)

---

## 用户和权限管理

### 用户数据隔离

- 所有项目、任务、角色、场景、物品等数据都按 `user_id` 隔离
- 每个用户只能看到和操作自己的数据
- 创建数据时自动关联当前登录用户

### 小组功能

- 在"数据分析" -> "用户管理" -> "小组管理"中创建小组
- 将用户添加到小组后，小组成员可以共享"项目管理"中的文件夹
- 不同小组之间的项目不共享（组间过滤）
- 项目可以关联到小组（`group_id`），小组内所有成员可见

### 管理员权限

- **超级管理员**：`Chiefavefan` - 拥有所有权限
- **高级管理员**：`jubian888` - 拥有管理权限
- 管理员积分余额显示为无穷符号（∞）

### 积分余额

- 普通用户：显示实际积分余额
- 小组内成员：共享积分余额
- 管理员：显示无穷符号（∞）

## SSH 连接和服务器更新

### 通过 SSH 更新服务器

项目提供了 PowerShell 脚本，可以通过 SSH 连接服务器并执行代码更新。

#### 方法一：配置 SSH 密钥（推荐）

**优点**：
- ✅ 无需每次输入密码
- ✅ 更安全
- ✅ 可以自动化执行

**配置步骤**：
```powershell
.\配置SSH密钥连接.ps1
```

#### 方法二：使用密码连接

**快速更新**：
```powershell
.\快速更新服务器.ps1
```

**完整更新**：
```powershell
.\通过SSH更新服务器.ps1
```

**使用参数**：
```powershell
.\通过SSH更新服务器.ps1 -ServerIP "119.45.121.152" -Username "ubuntu" -UpdateType "full"
```

### 腾讯云 CVM MCP

**当前状态**：暂无专门的腾讯云 CVM MCP 服务器。

**替代方案**：
1. **使用 SSH 脚本**（已提供）
   - `通过SSH更新服务器.ps1` - 完整更新脚本
   - `快速更新服务器.ps1` - 快速更新脚本
   - `配置SSH密钥连接.ps1` - SSH 密钥配置

2. **使用现有 MCP**
   - 腾讯云 COS MCP（对象存储）
   - Supabase MCP（数据库管理）

3. **手动 SSH 连接**
   ```powershell
   ssh ubuntu@119.45.121.152
   cd /var/www/aigc-agent
   bash 更新线上部署.sh
   ```

### 服务器信息

**默认配置**：
- IP: `119.45.121.152`
- 用户名: `ubuntu`
- 项目路径: `/var/www/aigc-agent`

**更新脚本位置**：
- 服务器: `/var/www/aigc-agent/更新线上部署.sh`
- 服务器: `/var/www/aigc-agent/快速更新线上部署.sh`

### 详细文档

更多信息请参考：`SSH连接和更新指南.md`

## 更新日志

- **2026-01-02**：添加 SSH 连接和服务器更新功能
- **2026-01-02**：整合部署、更新、服务器管理相关内容到技能文档
- **2026-01-01**：整合所有通用功能文档，形成统一技能文档
