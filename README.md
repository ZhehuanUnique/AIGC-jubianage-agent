# 剧变时代Agent

一个基于React + TypeScript + Vite的AI视频生成Agent应用，支持剧本分析、智能切分、图生视频等功能。

## ✨ 功能特性

### 核心功能
- 📝 **剧本输入和管理**：支持文本输入和.docx文件上传
- 🤖 **智能剧本分析**：使用通义千问大模型自动提取角色、场景、物品
- ✂️ **智能剧本切分**：自动将剧本切分为多个片段，每个片段对应一个分镜
- 🎨 **文生图功能**：支持 Nano Banana Pro 和 Midjourney v7 t2i 两种模型
- 🎬 **图生视频模式**：集成通义万相图生视频功能
- 🎨 **资产详情管理**：管理角色、场景、物品，支持本地上传
- 📸 **分镜管理**：配置每个分镜的详细信息，包含对应片段、融图提示词等
- 🖼️ **融图管理**：选择图片素材并配置视频生成参数
- 🎥 **视频编辑和导出**：编辑和导出生成的视频

### 技术亮点
- 使用qwen-max/qwen-plus模型进行剧本分析和切分
- 支持Nano Banana Pro和Midjourney v7 t2i文生图
- 使用wan2.2-i2v-flash模型进行图生视频（最便宜选项）
- PostgreSQL数据库持久化存储
- 腾讯云COS对象存储
- 支持异步视频生成任务查询
- 完整的错误处理和降级方案

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn
- PostgreSQL 14+（可选，用于数据持久化）
- 腾讯云账号（可选，用于文件存储）

### 1. 克隆项目

```bash
git clone https://github.com/ZhehuanUnique/AIGC-jubianage-agent.git
cd AIGC-jubianage-agent
```

### 2. 安装依赖

#### 前端依赖
```bash
npm install
```

#### 后端依赖
```bash
cd server
npm install
```

### 3. 配置环境变量

#### 后端配置（必需）

创建 `server/.env` 文件：

```env
# 通义千问API密钥（用于剧本分析和切分）
DASHSCOPE_API_KEY=sk-your-api-key-here

# 模型选择（可选）
# 可选值：qwen-max（最强，成本高）、qwen-plus（推荐，平衡）、qwen-turbo（快速）、qwen-flash（最快）
QWEN_MODEL=qwen-max

# 服务器端口
PORT=3002

# PostgreSQL 数据库配置（可选，用于数据持久化）
# 方式1：使用连接字符串（推荐）
DATABASE_URL=postgresql://postgres:你的密码@localhost:5432/aigc_db
# 方式2：使用单独配置
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=aigc_db
# DB_USER=postgres
# DB_PASSWORD=你的密码

# 腾讯云 COS 配置（可选，用于文件存储）
COS_SECRET_ID=你的SecretId
COS_SECRET_KEY=你的SecretKey
COS_REGION=ap-guangzhou
COS_BUCKET=你的存储桶名称

# Nano Banana Pro 文生图配置（可选）
NANO_BANANA_API_KEY=your_nano_banana_api_key_here
NANO_BANANA_API_HOST=https://grsai.dakka.com.cn

# Midjourney v7 t2i 文生图配置（可选）
MIDJOURNEY_API_KEY=your_midjourney_api_key_here
MIDJOURNEY_API_HOST=https://api.302.ai
```

#### 前端配置（可选）

如果需要修改API地址，在项目根目录创建 `.env` 文件：

```env
VITE_API_BASE_URL=http://localhost:3002
```

**注意：**
- ✅ `server/.env` - 必需，后端配置
- ⚠️ 根目录 `.env` - 可选，前端API地址（默认使用 http://localhost:3002）
- ❌ `src/.env` - 不需要，不要在此位置创建

### 4. 初始化数据库（如果使用PostgreSQL）

```bash
cd server
npm run init-db
```

这会创建所有需要的数据库表。

### 5. 启动服务

#### 启动后端服务

**方法一：使用批处理文件（Windows）**
- 双击运行：`启动后端.bat`（项目根目录）

**方法二：使用命令行**
```bash
cd server
npm run dev
```

后端将在 http://localhost:3002 启动

**检查服务状态：**
- 访问：http://localhost:3002/health
- 应该返回：`{"status":"ok","message":"服务运行正常"}`

#### 启动前端服务

```bash
# 在项目根目录
npm run dev
```

前端将在 http://localhost:5173 启动

### 6. 访问应用

打开浏览器访问：http://localhost:5173

## 📋 使用流程

1. **首页** → 点击"剧变时代Agent"按钮
2. **任务列表** → 点击"创建任务"
3. **模式选择** → 选择"图生视频模式"
4. **输入剧本** → 填写剧本信息或上传.docx文件并提交
5. **资产详情** → 系统自动分析并提取角色、场景、物品，可进行管理
6. **分镜管理** → 系统自动切分剧本为多个片段，每个片段对应一个分镜，配置分镜详情
7. **融图管理** → 选择图片素材并配置视频生成参数
8. **视频编辑** → 编辑和导出生成的视频

## 🎯 核心功能说明

### 剧本分析和切分

系统使用通义千问模型进行：
- **剧本分析**：自动提取角色、场景、物品
- **剧本切分**：智能将剧本切分为多个片段，每个片段对应一个分镜
- **分镜提示词生成**：为每个分镜自动生成详细的中文文生图融图提示词

**特点：**
- 所有片段合起来等于完整剧本，不遗漏任何内容
- 根据剧本的自然段落、场景转换、对话切换等逻辑进行切分
- 每个片段适合制作5-10秒的视频分镜
- 提示词格式：`景别：主体: 风格: 构图: 氛围：`

**模型选择建议：**
- **qwen-max** ⭐⭐⭐⭐⭐：效果最好，生成的提示词更专业、更详细（推荐）
- **qwen-plus** ⭐⭐⭐⭐：性价比高，效果和成本的平衡点

### 文生图功能

支持两种文生图模型：

#### Nano Banana Pro
- **特点**：角色一致性、高级文本渲染、4K输出
- **适合**：需要角色一致性的连续剧集
- **分辨率**：1K、2K、4K
- **宽高比**：auto、16:9、1:1、9:16、21:9
- **价格**：¥0.09~¥0.18/次（1800积分/次）
- **获取API Key**：https://grsai.com/zh/dashboard/documents/nano-banana

#### Midjourney v7 t2i
- **特点**：高分辨率、多样化风格、出色的光影表现
- **适合**：高质量艺术创作、风格化图像
- **分辨率**：最高 4096×4096 像素
- **宽高比**：通过提示词参数控制（--ar 16:9等）
- **价格**：$0.025/次
- **获取API Key**：https://302.ai

### 图生视频

集成通义万相wan2.2-i2v-flash模型，支持：
- 图片上传生成视频
- 支持480P、720P、1080P分辨率
- 异步任务处理，支持状态查询

**价格信息：**
- 480P: 0.10元/秒（推荐测试）
- 720P: 0.20元/秒
- 1080P: 0.48元/秒
- 免费额度: 开通后90天内提供50秒免费额度

## 📁 项目结构

```
AIGC-jubianage-agent/
├── src/                    # 前端源码
│   ├── pages/              # 页面组件
│   │   ├── Home.tsx        # 首页
│   │   ├── TaskList.tsx    # 任务列表
│   │   ├── ScriptInput.tsx # 输入剧本
│   │   ├── AssetDetails.tsx # 资产详情
│   │   ├── ShotManagement.tsx # 分镜管理
│   │   ├── ImageFusion.tsx # 融图管理
│   │   └── VideoEditing.tsx # 视频编辑
│   ├── components/         # 公共组件
│   ├── services/           # API服务
│   └── App.tsx             # 主应用组件
├── server/                 # 后端服务
│   ├── services/           # 业务服务
│   │   ├── scriptAnalyzer.js    # 剧本分析
│   │   ├── scriptSegmenter.js   # 剧本切分
│   │   ├── shotPromptGenerator.js # 分镜提示词生成
│   │   ├── qwenService.js       # 通义千问API
│   │   ├── nanoBananaService.js # Nano Banana Pro API
│   │   ├── midjourneyService.js # Midjourney API
│   │   └── imageToVideoService.js # 图生视频API
│   ├── db/                 # 数据库相关
│   │   ├── connection.js   # 数据库连接
│   │   ├── schema.sql      # 数据库表结构
│   │   └── taskRepository.js # 任务数据仓库
│   ├── utils/             # 工具函数
│   ├── index.js           # 服务器入口
│   └── .env               # 环境变量（需创建）
└── README.md              # 项目文档
```

## 🔧 API接口

### 后端API

#### 1. 健康检查
```
GET /health
```

#### 2. 文本剧本分析
```
POST /api/analyze-script
Content-Type: application/json

{
  "scriptContent": "剧本文本内容...",
  "scriptTitle": "剧本标题（可选）"
}
```

#### 3. 文件剧本分析
```
POST /api/analyze-script-file
Content-Type: multipart/form-data

file: <docx文件>
```

#### 4. 剧本切分
```
POST /api/segment-script
Content-Type: application/json

{
  "scriptContent": "剧本文本内容...",
  "scriptTitle": "剧本标题（可选）",
  "model": "qwen-max",  // 可选：qwen-max 或 qwen-plus
  "generatePrompts": true  // 可选：是否生成提示词，默认 true
}
```

响应：
```json
{
  "success": true,
  "data": {
    "segments": [
      {
        "shotNumber": 1,
        "segment": "第一个片段的完整内容",
        "prompt": "景别：中景。主体: 角色。风格: 真人电影风格。构图: 三分法构图。氛围：温馨。",
        "description": "分镜描述"
      }
    ],
    "totalShots": 2
  }
}
```

#### 5. 文生图接口
```
POST /api/generate-image
Content-Type: application/json

{
  "prompt": "提示词",
  "model": "nano-banana-pro",  // 或 "midjourney-v7-t2i"
  "resolution": "2K",  // 2K 或 4K（nano-banana-pro），2K（midjourney-v7-t2i）
  "aspectRatio": "16:9",  // nano-banana-pro 专用
  "botType": "MID_JOURNEY"  // midjourney-v7-t2i 专用
}
```

#### 6. 查询图片生成任务状态
```
GET /api/image-task/:taskId?model=nano-banana-pro&resolution=2K
```

#### 7. 图生视频
```
POST /api/generate-video
Content-Type: multipart/form-data

image: <图片文件>
model: wan2.2-i2v-flash (可选)
resolution: 480p (可选)
duration: 5 (可选)
```

#### 8. 查询视频任务状态
```
GET /api/video-task/:taskId
```

#### 9. 任务管理API
```
GET /api/tasks - 获取所有任务
GET /api/tasks/:id - 获取单个任务
POST /api/tasks - 创建任务
PUT /api/tasks/:id - 更新任务
DELETE /api/tasks/:id - 删除任务
PATCH /api/tasks/:id/progress - 更新任务进度
PATCH /api/tasks/:id/toggle-expand - 切换展开状态
```

## 🔑 获取API密钥

### 通义千问/通义万相（必需）

1. 访问：https://dashscope.console.aliyun.com/
2. 注册/登录阿里云账号
3. 创建API密钥
4. 将密钥填入 `server/.env` 文件的 `DASHSCOPE_API_KEY`

**重要说明：**
- ✅ 同一个API密钥可以调用所有模型（qwen-max, qwen-plus, qwen-turbo, qwen-flash）
- ✅ 同一个API密钥也可以用于通义万相图生视频
- ✅ 不需要为每个模型单独获取API密钥

### Nano Banana Pro（可选）

1. 访问：https://grsai.com/zh/dashboard/documents/nano-banana
2. 登录 Grsai 平台
3. 进入 **API Management** → **API Key**
4. 复制你的 API Key
5. 填入 `server/.env` 文件的 `NANO_BANANA_API_KEY`

**API Host选择：**
- **国内直连**（推荐）：`https://grsai.dakka.com.cn` - 国内用户使用，速度更快
- **海外节点**：`https://api.grsai.com` - 海外用户使用

### Midjourney v7 t2i（可选）

1. 访问：https://302.ai
2. 注册/登录账号
3. 进入 **API 管理** 或 **密钥管理**
4. 创建或查看 API Key
5. 填入 `server/.env` 文件的 `MIDJOURNEY_API_KEY`

**API Host选择：**
- **正式环境**（默认）：`https://api.302.ai`
- **国内中转**：`https://api.302ai.cn` - 国内用户使用，速度更快

### 腾讯云 COS（可选，用于文件存储）

#### 获取 SecretId 和 SecretKey

1. 访问：https://console.cloud.tencent.com/
2. 登录腾讯云账号
3. 点击右上角头像 → **访问管理** → **API密钥管理**
4. 或直接访问：https://console.cloud.tencent.com/cam/capi
5. 点击 **新建密钥** 或查看现有密钥
6. 复制 **SecretId** 和 **SecretKey**（⚠️ SecretKey 只显示一次，请妥善保存）

#### 创建 COS 存储桶

1. 访问：https://console.cloud.tencent.com/cos
2. 点击 **创建存储桶**
3. 填写信息：
   - **名称**：填写一个唯一的名称，如 `aigc-jubianage-你的账号ID`
   - **所属地域**：选择离你最近的地域（如：广州 → `ap-guangzhou`）
   - **访问权限**：选择 **私有读写** 或 **公有读私有写**
4. 记录下：
   - **存储桶名称**（Bucket）
   - **所属地域代码**（Region）

#### 配置到 .env 文件

```env
COS_SECRET_ID=你的SecretId
COS_SECRET_KEY=你的SecretKey
COS_REGION=ap-guangzhou
COS_BUCKET=你的存储桶名称
```

**常用地域代码：**
- `ap-guangzhou` - 广州
- `ap-beijing` - 北京
- `ap-shanghai` - 上海
- `ap-chengdu` - 成都
- `ap-nanjing` - 南京

## 📊 模型选择建议

### 剧本分析模型

| 模型 | 准确度 | 成本/次 | 速度 | 推荐场景 |
|------|--------|---------|------|----------|
| qwen-max | ⭐⭐⭐⭐⭐ | 0.36元 | 3-8秒 | 追求极致效果 |
| **qwen-plus** | **⭐⭐⭐⭐** | **0.06元** | **2-5秒** | **推荐：平衡效果和成本** |
| qwen-turbo | ⭐⭐⭐ | 0.024元 | 1-3秒 | 预算有限 |
| qwen-flash | ⭐⭐⭐ | 0.024元 | 1-3秒 | 简单剧本 |

**推荐配置：**
```env
QWEN_MODEL=qwen-max  # 或 qwen-plus
```

### 文生图模型

| 模型 | 分辨率 | 价格/次 | 特点 | 推荐场景 |
|------|--------|---------|------|----------|
| **nano-banana-pro** | 1K/2K/4K | **¥0.09~¥0.18** | 角色一致性、4K输出 | **推荐：连续剧集** |
| midjourney-v7-t2i | 最高4096×4096 | $0.025 | 高质量艺术创作 | 风格化图像 |

### 图生视频模型

| 模型 | 分辨率 | 价格/秒 | 推荐场景 |
|------|--------|---------|----------|
| **wan2.2-i2v-flash** | 480P | **0.10元** | **推荐：最便宜，适合测试** |
| wan2.2-i2v-flash | 720P | 0.20元 | 平衡质量和成本 |
| wan2.2-i2v-flash | 1080P | 0.48元 | 追求高质量 |
| wan2.5-i2v-preview | 480P | 0.3元 | 预览版 |
| wan2.6-i2v | 720P | 0.6元 | 最新版 |

## 🗄️ 数据库配置（可选）

### PostgreSQL 安装和配置

#### 安装 PostgreSQL

1. 访问 PostgreSQL 官网：https://www.postgresql.org/download/windows/
2. 下载 Windows 安装程序（推荐 PostgreSQL 14+）
3. 运行安装程序，记住设置的 `postgres` 用户密码
4. **注意**：如果提示"安装目录已存在"，可以选择不同目录或删除旧目录

#### 创建数据库

**方法一：使用 pgAdmin 4（推荐）**

1. 打开 pgAdmin 4
2. 连接到 PostgreSQL 服务器（输入 postgres 用户密码）
3. 右键点击 "Databases" → "Create" → "Database..."
4. 输入数据库名：`aigc-agent_db`（注意：包含连字符）
5. Owner 选择 `postgres`，点击 "Save"

**方法二：使用 SQL 命令**

```sql
-- 注意：数据库名包含连字符，需要用双引号
CREATE DATABASE "aigc-agent_db";
```

#### 配置环境变量

在 `server/.env` 文件中配置：

**方式1：使用连接字符串（推荐）**

```env
DATABASE_URL=postgresql://postgres:你的密码@localhost:5432/aigc-agent_db
```

**方式2：使用单独配置**

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=你的密码
DB_NAME=aigc-agent_db
```

#### 初始化数据库表

**自动初始化（推荐）：**

```bash
cd server
npm run setup-db
```

这个命令会自动：
1. 创建数据库（如果不存在）
2. 创建所有表结构
3. 初始化默认管理员账号

**分步执行：**

```bash
# 1. 初始化数据库表结构
npm run init-db

# 2. 初始化默认管理员账号
npm run init-users
```

#### 验证数据库设置

```bash
cd server

# 检查表是否已创建
node db/check-tables.js

# 检查用户是否已创建
node db/check-users.js
```

#### 默认管理员账号

- **超级管理员**：`Chiefavefan` / `246859CFF`
- **高级管理员**：`jubian888` / `8888`

#### 常见问题

**Q: 数据库连接失败？**
- 检查 PostgreSQL 服务是否正在运行
- 检查 `.env` 文件中的数据库配置
- 确认数据库 `aigc-agent_db` 已创建
- 如果数据库名包含连字符，在 SQL 命令中需要用双引号

**Q: 用户表不存在？**
- 运行 `npm run init-db` 创建表结构

**Q: 默认用户未创建？**
- 运行 `npm run init-users` 初始化默认管理员账号

## 🛠️ 技术栈

### 前端
- React 18
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Lucide React (图标)

### 后端
- Node.js + Express
- PostgreSQL (数据持久化)
- 腾讯云 COS (文件存储)
- mammoth (docx解析)
- multer (文件上传)
- dotenv (环境变量)

### AI服务
- 通义千问 (qwen-max/qwen-plus) - 剧本分析和切分
- Nano Banana Pro - 文生图
- Midjourney v7 t2i - 文生图
- 通义万相 (wan2.2-i2v-flash) - 图生视频

## 💡 常见问题

### Q: 需要为不同模型单独获取API密钥吗？
**A: 不需要！** 同一个API密钥可以调用所有通义千问模型。

### Q: 如何切换模型？
**A: 只需修改 `server/.env` 文件中的 `QWEN_MODEL` 值，然后重启服务。**

### Q: 后端服务启动失败？
**A: 检查以下几点：**
1. 确保 `server/.env` 文件存在且配置正确
2. 检查端口3002是否被占用：`netstat -ano | findstr :3002`
3. 查看后端控制台日志

### Q: 前端无法连接后端？
**A: 检查以下几点：**
1. 确保后端服务已启动
2. 检查 `VITE_API_BASE_URL` 配置是否正确（默认 http://localhost:3002）
3. 检查浏览器控制台错误信息

### Q: 剧本分析一直显示"分析中..."？
**A: 检查以下几点：**
1. 后端服务是否正常运行
2. `DASHSCOPE_API_KEY` 是否正确配置
3. 网络连接是否正常
4. 查看后端控制台日志

### Q: 数据库连接失败？
**A: 检查以下几点：**
1. PostgreSQL 服务是否正在运行
2. `DATABASE_URL` 配置是否正确
3. 数据库 `aigc_db` 是否已创建
4. 用户名和密码是否正确

### Q: COS 上传失败？
**A: 检查以下几点：**
1. `COS_SECRET_ID` 和 `COS_SECRET_KEY` 是否正确
2. 存储桶名称和地域是否正确
3. 存储桶权限设置是否正确

**快速检查：**
```bash
cd server
npm run check-cos
```

**如果上传成功但无法访问：**
- 检查存储桶权限：设置为"公有读私有写"或"公有读写"
- 参考 `COS存储桶权限设置指南.md` 进行配置

### Q: 图片生成失败？
**A: 检查以下几点：**
1. 确保对应的API密钥正确配置（NANO_BANANA_API_KEY 或 MIDJOURNEY_API_KEY）
2. 检查图片格式和大小
3. 查看后端日志获取详细错误信息

### Q: 图生视频失败？
**A: 按以下步骤检查：**

1. **检查COS配置：**
   ```bash
   cd server
   npm run check-cos
   ```

2. **检查图片URL格式：**
   ```bash
   cd server
   npm run check-image-url "你的图片URL"
   ```
   - 支持格式：`data:image/png;base64,...` 或 `https://...`
   - base64格式需要COS配置，系统会自动上传
   - HTTP/HTTPS URL需要确保可公开访问

3. **检查API密钥：**
   - 确认 `DASHSCOPE_API_KEY` 已设置且有效
   - 查看后端启动日志确认API密钥状态

4. **查看后端详细日志：**
   - 后端会显示详细的错误信息
   - 包括图片下载、上传、URL验证等步骤

**常见错误：**
- `url error, please check url!` → 检查图片URL是否可访问
- `base64图片需要上传到COS，但COS配置不完整` → 配置COS或使用HTTP URL
- `API密钥无效` → 检查 `DASHSCOPE_API_KEY` 配置

## 🔍 调试

### 查看后端日志

后端服务启动后会在控制台显示：
- 环境变量加载状态
- API调用信息
- 错误信息（如果有）

### 验证服务

访问 http://localhost:3002/health 应该返回：
```json
{"status":"ok","message":"服务运行正常"}
```

### 测试数据库连接

```bash
cd server
npm run init-db
```

如果看到 "✅ 数据库连接成功" 和 "✅ 表创建成功"，说明配置正确。

## 📝 开发说明

### 构建生产版本

```bash
npm run build
```

### 检查环境变量

```bash
cd server
npm run check-env
```

## 🗄️ Milvus 向量数据库配置（可选，用于 Gemini RAG 服务）

### 快速启动

**使用 Docker Compose（推荐）**：
```bash
cd milvus
docker-compose up -d
```

**等待 Milvus 启动**：
Milvus 需要 30-60 秒才能完全启动。使用等待脚本：
```bash
bash 等待并检查Milvus.sh
```

或手动等待：
```bash
# 等待 60 秒
sleep 60

# 检查健康状态
curl http://localhost:9091/healthz
```

应该返回 `OK`。

### 配置环境变量

在 `server/.env` 文件中添加：
```env
# 向量数据库类型
VECTOR_DB_TYPE=milvus

# Milvus 配置
MILVUS_HOST=localhost
MILVUS_PORT=19530
```

### 验证 Milvus 服务

```bash
# 检查容器状态
cd milvus
docker-compose ps

# 测试健康检查
curl http://localhost:9091/healthz
```

**预期结果**：
- 容器状态为 "Up" 和 "healthy"
- 健康检查返回 `OK`

### 常见问题

#### 问题1：连接超时

**症状**：`Error: 14 UNAVAILABLE: No connection established`

**解决方案**：
1. 确保 Milvus 容器正在运行：`docker-compose ps`
2. 等待 30-60 秒让 Milvus 完全启动
3. 检查端口是否正确：`netstat -an | findstr 19530`

#### 问题2：数据损坏

**症状**：`Corruption: CURRENT file corrupted`

**解决方案**：
```bash
# 停止容器
cd milvus
docker-compose down

# 清理损坏的数据
rmdir /S /Q volumes\milvus\rdb_data

# 重新启动
docker-compose up -d

# 等待 60 秒
timeout /t 60

# 检查状态
docker-compose ps
curl http://localhost:9091/healthz
```

**注意**：清理 `rdb_data` 目录会删除 RocksMQ 的消息队列数据，但不会影响已存储的向量数据（存储在 MinIO 中）。

### Milvus 管理

```bash
# 查看日志
docker-compose logs -f standalone

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 删除容器和数据
docker-compose down -v
```

## 🤖 Ollama 模型配置（可选，用于视频运动提示词生成）

### 方式一：Docker 部署（推荐，支持跨设备访问）

#### 快速部署

1. **一键部署服务**
   ```bash
   一键部署Docker服务.bat
   ```

2. **下载模型**
   ```bash
   docker exec -it ollama ollama pull qwen3-vl:8b
   ```
   或如果本地已有模型，可以复制到 Docker 数据目录

3. **验证服务**
   ```bash
   docker ps | findstr ollama
   curl http://localhost:11434/api/tags
   ```

#### 配置环境变量

在 `server/.env` 文件中添加：

```env
# Ollama Docker 部署配置（跨设备访问）
# 使用您的实际 IP 地址（例如：192.168.1.2）
OLLAMA_BASE_URL=http://192.168.1.2:11434
OLLAMA_MODEL=qwen3-vl:8b
OLLAMA_TIMEOUT=60000

# 如果只在本地使用，可以使用：
# OLLAMA_BASE_URL=http://localhost:11434
```

#### 跨设备访问配置

1. **获取本机 IP 地址**
   ```bash
   ipconfig | findstr IPv4
   ```

2. **更新环境变量**
   - 将 `192.168.1.2` 替换为您的实际 IP 地址
   - 确保防火墙允许端口 11434

3. **从其他设备访问**
   - API 地址：`http://您的IP:11434`
   - 其他设备可以通过此地址访问

#### 管理命令

```bash
# 查看容器状态
docker ps | findstr ollama

# 查看已安装的模型
docker exec ollama ollama list

# 查看日志
docker logs ollama

# 重启服务
docker restart ollama
```

### 方式二：本地安装

1. 访问 Ollama 官网：https://ollama.com/download
2. 下载 Windows 版本的安装程序
3. 运行安装程序，Ollama 会作为系统服务自动运行

**下载模型：**
```bash
ollama pull qwen3-vl:8b
```

**推荐模型：**
- **qwen3-vl:8b** ⭐⭐⭐ 最新推荐（约 5-6GB）
- **qwen2.5-vl:7b** ⭐⭐ 稳定版（约 4.5-5GB）

**配置环境变量：**
```env
# Ollama 本地配置
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3-vl:8b
OLLAMA_TIMEOUT=60000
```

### 常见问题

**Q: Docker 部署后如何验证？**
- 运行：`docker exec ollama ollama list`
- 访问：`http://localhost:11434/api/tags`

**Q: 模型下载失败？**
- 检查网络连接
- 检查磁盘空间（需要至少 10 GB）
- 重试下载：`docker exec -it ollama ollama pull qwen3-vl:8b`

**Q: 跨设备无法访问？**
- 检查防火墙设置
- 确认 IP 地址正确
- 确保设备在同一局域网

## 🎵 音乐生成服务配置

### Suno API（在线音乐生成）

项目已集成 Suno API，支持音乐和歌词生成。

**配置环境变量：**
```env
# Suno API 配置
SUNO_API_KEY=你的API密钥
SUNO_API_BASE_URL=https://api.suno.ai
```

**获取 API Key：**
- 访问：https://docs.sunoapi.org
- 注册账号并获取 API Key

### MusicGPT（本地音乐生成，可选）

#### Docker 部署（推荐，支持跨设备访问）

1. **启动 MusicGPT 容器**
   ```bash
   启动MusicGPT-Docker.bat
   ```

2. **配置环境变量**
   在 `server/.env` 文件中添加：
   ```env
   # MusicGPT Docker 部署配置（跨设备访问）
   # 使用您的实际 IP 地址
   MUSICGPT_BASE_URL=ws://192.168.1.2:8642
   MUSICGPT_HTTP_URL=http://192.168.1.2:8642
   
   # 如果只在本地使用：
   # MUSICGPT_BASE_URL=ws://localhost:8642
   # MUSICGPT_HTTP_URL=http://localhost:8642
   ```

3. **验证服务**
   - 访问：`http://localhost:8642`（应该看到 MusicGPT Web 界面）
   - 检查容器状态：`docker ps | findstr musicgpt`
   - 查看日志：`docker logs musicgpt`

**重要提示：**
- ⚠️ 配置冲突：同一个变量如果定义多次，后面的会覆盖前面的
- ✅ 协议大小写：必须使用小写 `ws://`，不能使用 `Ws://` 或 `WS://`
- ✅ 只保留一个配置：注释掉不需要的配置

#### 本地部署

如果使用本地 MusicGPT（非 Docker）：
1. 下载预编译文件或使用 Rust 编译
2. 启动服务：`musicgpt --ui-expose`
3. 配置环境变量使用 `localhost`

### 音乐存储到 COS

**功能特性：**
- ✅ 所有生成的音乐自动保存到腾讯云 COS
- ✅ 数据库记录音乐元数据
- ✅ 在"配乐创作"页面显示已保存的音乐列表
- ✅ 支持删除已保存的音乐

**配置要求：**
确保 `server/.env` 中有 COS 配置：
```env
COS_SECRET_ID=你的SecretId
COS_SECRET_KEY=你的SecretKey
COS_REGION=ap-guangzhou
COS_BUCKET=你的存储桶名称
```

**使用流程：**
1. 在"配乐创作"页面生成音乐
2. 音乐生成完成后自动上传到 COS
3. 在"已保存的音乐"列表中查看和管理

## 🎤 IndexTTS2.5 音色创作（可选）

### 本地部署

**项目位置：** `F:\IndexTTS2.5`（根据实际情况修改）

**前置条件：**
- Python 3.8 或更高版本（建议 Python 3.10）
- IndexTTS2.5 所需的 Python 依赖包

**启动服务：**
1. 检查项目结构：确认 `F:\IndexTTS2.5` 目录存在
2. 安装依赖（如果需要）：`cd F:\IndexTTS2.5 && pip install -r requirements.txt`
3. 启动服务：运行项目提供的启动脚本或直接运行 Python 服务

**配置环境变量：**
在 `server/.env` 文件中添加：
```env
# IndexTTS2.5 配置
INDEXTTS_BASE_URL=http://localhost:8000
INDEXTTS_ENABLED=true
INDEXTTS_PATH=F:\IndexTTS2.5
INDEXTTS_TIMEOUT=60000
```

**API 接口：**
- 健康检查：`GET /api/health`
- 获取音色列表：`GET /api/voices`
- 生成语音：`POST /api/tts/generate`（参数：text, voice, speed, pitch）

**故障排除：**
- 服务无法启动：检查 Python 环境、依赖包、端口占用
- 模型文件缺失：检查 checkpoints 目录和配置文件
- API 调用失败：检查服务是否运行、端口是否正确、环境变量配置

## 🎬 豆包 Seedance 图生视频（可选）

### API 接口说明

项目已集成豆包 Seedance 1.5 Pro 图生视频功能：

- **创建任务**：`POST https://api.302.ai/doubao/doubao-seedance`
- **查询状态**：`GET https://api.302.ai/doubao/task/{id}` 或 `GET https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/{id}`

### 配置环境变量

在 `server/.env` 文件中添加：

```env
# 豆包 Seedance 1.5 Pro 图生视频配置
DOUBAO_SEEDANCE_API_KEY=sk-你的API密钥
DOUBAO_SEEDANCE_API_HOST=https://api.302.ai
```

**获取API Key：**
- 访问：https://302.ai
- 注册/登录账号
- 进入 API 管理创建 API Key

### 成本说明

**Token 计算公式：**
```
Token = 宽 × 高 × 帧率 × 时长 / 1024
```

**价格（Pro 版本）：** 2.2 PTC/1M token

**不同分辨率成本（5秒视频）：**
- **480p**：约 0.11 PTC（推荐测试）
- **720p**：约 0.23 PTC
- **1080p**：约 0.54 PTC

**建议：**
- 测试阶段使用 480p（成本最低）
- 正式使用根据需求选择分辨率

## 🐳 Docker 跨设备使用说明

### 两种使用场景

#### 场景 1：在公司电脑访问家里的 Docker 服务（推荐）

**前提条件：**
- ✅ 家里的电脑和公司电脑在同一网络（局域网）
- ✅ 家里的 Docker 服务正在运行
- ✅ 防火墙允许访问

**优点：**
- ✅ 不需要在公司电脑下载模型（节省空间和时间）
- ✅ 模型数据只存储在家里电脑
- ✅ 公司电脑只需要配置连接地址

**配置步骤：**
1. 在家里电脑部署 Docker 服务并下载模型
2. 获取家里电脑的 IP 地址：`ipconfig | findstr IPv4`
3. 在公司电脑配置 `server/.env`，使用家里电脑的 IP 地址

#### 场景 2：在公司电脑也部署 Docker（独立部署）

**前提条件：**
- ✅ 公司电脑已安装 Docker Desktop
- ✅ 有足够的磁盘空间（约 20 GB）

**优点：**
- ✅ 不依赖家里电脑
- ✅ 可以离线使用
- ✅ 性能更好（本地运行）

**缺点：**
- ❌ 需要在公司电脑也下载镜像和模型（约 10-20 GB）

### 数据存储位置

**Ollama 模型：**
- Windows：`C:\Users\你的用户名\.ollama-docker`
- 大小：约 8-10 GB（qwen3-vl:8b）

**MusicGPT 数据：**
- Windows：`C:\Users\你的用户名\.musicgpt`
- 大小：约 1-2 GB

**注意：** 模型数据存储在数据卷中，删除容器不会丢失数据。

### 常见问题

**Q: 部署镜像后，还需要下载模型吗？**
- A: 是的，需要单独下载模型。镜像只包含运行环境，模型需要单独下载。

**Q: 在公司电脑访问家里的 Docker，需要重新下载吗？**
- A: 不需要！模型数据存储在家里电脑，公司电脑只需要配置连接地址。

**Q: Docker 容器关闭后，数据会丢失吗？**
- A: 不会！模型数据存储在数据卷中，删除容器不会删除数据卷。

## ✂️ 剪映自动化功能

### 功能概述

系统支持自动打开剪映并导入视频，包括：
- ✅ 自动打开剪映应用
- ✅ 自动点击"开始创作"按钮
- ✅ 自动导入视频到素材库或时间轴
- ✅ 自动置顶剪映窗口

### 安装依赖

**必需依赖：**
```bash
pip install pyautogui pywin32
```

**可选依赖（备选方案）：**
```bash
pip install uiautomation
```

**验证安装：**
```bash
python -c "import pyautogui; import win32gui; print('✅ 依赖安装成功')"
```

### 配置环境变量

在 `server/.env` 文件中添加（可选）：
```env
# 剪映应用路径（可选，如果自动检测失败，可以手动指定）
# 例如：C:\Users\YourName\Desktop\剪映.lnk
# 或：C:\Users\YourName\AppData\Local\JianyingPro\JianyingPro.exe
JIANYING_PATH=

# 剪映小助手API配置（用于创建草稿）
JIANYYING_API_BASE_URL=https://docs.jcaigc.cn
JIANYING_API_KEY=你的API密钥
```

### 使用方法

1. **在设置中配置**
   - 打开应用，点击右上角的**设置**（齿轮图标）
   - 在 **剪映设置** 中：
     - ✅ 勾选 **自动新建项目**
     - ✅ 勾选 **自动导入分镜视频**
     - 选择 **导入位置**：**素材库** 或 **时间轴**

2. **使用"一键导入并打开剪映"**
   - 在"审片"页面，点击 **"一键导入并打开剪映"** 按钮
   - 系统会自动：
     - 创建草稿并导入视频（API方案，作为备份）
     - 打开剪映应用并置顶窗口
     - 点击"开始创作"按钮
     - 导入视频到素材库或时间轴（根据设置）

### 工作原理

1. **检测剪映是否已打开**
   - 如果已打开，直接置顶窗口并执行操作
   - 如果未打开，先启动剪映，等待3秒后执行操作

2. **多种方法点击"开始创作"**
   - 方法1：基于窗口位置的坐标点击（最推荐）
   - 方法2：键盘快捷键（Ctrl+N）
   - 方法3：uiautomation查找按钮（备选）
   - 方法4：图像识别（备选）

3. **导入视频**
   - 下载视频到本地临时文件夹
   - 通过文件选择对话框导入视频
   - 视频会出现在素材库或时间轴中

### 常见问题

**Q: 点击"开始创作"按钮失败？**
- 确保剪映已完全启动（等待更长时间）
- 确保"开始创作"按钮可见
- 查看后端日志，确认具体错误
- 尝试手动点击"开始创作"按钮

**Q: 剪映窗口没有置顶？**
- 确保已安装 `pywin32`：`pip install pywin32`
- 查看后端日志，确认窗口查找是否成功

**Q: 视频导入失败？**
- 检查视频URL是否可访问
- 检查临时文件夹是否有写入权限
- 查看后端日志，确认具体错误

## 🎨 Photoshop自动化功能

### 功能概述

系统支持自动打开Photoshop并导入海报图，包括：
- ✅ 自动打开Photoshop应用
- ✅ 自动创建新文档（可选）
- ✅ 自动导入海报图到最上层图层（可选）

### 使用方法

1. **在设置中启用自动化**
   - 打开应用，点击右上角的**设置**（齿轮图标）
   - 在 **Photoshop 设置** 中：
     - ✅ 勾选 **自动新建项目** - 点击"导入PS"时自动创建新文档
     - ✅ 勾选 **自动导入海报图** - 自动将海报图导入到最上层图层

2. **使用"导入PS"功能**
   - 在**推广创作**页面或其他生成海报图的页面：
     - 生成或选择一张海报图
     - 点击 **导入PS** 按钮
     - 系统会自动：
       - 打开Photoshop（如果未打开）
       - 等待3秒让Photoshop启动
       - 自动创建新文档（如果启用了"自动新建项目"）
       - 自动下载并导入海报图到最上层图层（如果启用了"自动导入海报图"）

### 配置环境变量

在 `server/.env` 文件中添加（可选）：
```env
# Photoshop应用路径（可选，如果自动检测失败，可以手动指定）
# 例如：C:\Users\YourName\Desktop\Adobe Photoshop 2025.lnk
# 或：C:\Program Files\Adobe\Adobe Photoshop 2025\Photoshop.exe
PHOTOSHOP_PATH=
```

### 默认参数

- **文档宽度**：1920 px
- **文档高度**：1080 px
- **分辨率**：72 dpi
- **文档填充**：白色背景
- **颜色模式**：RGB

### 技术实现

系统使用 **ExtendScript (.jsx)** 实现Photoshop自动化，这是Adobe官方支持的脚本语言。

**文件位置：**
- ExtendScript脚本：`photoshop-uxp-plugin/automation.jsx`
- 后端服务：`server/services/photoshopAutomationService.js`

### 常见问题

**Q: Photoshop打开但没有创建新文件？**
- 检查是否启用了"自动新建项目"设置
- 查看后端日志，确认ExtendScript是否执行成功
- 确保Photoshop版本支持ExtendScript

**Q: 海报图没有导入？**
- 检查是否启用了"自动导入海报图"设置
- 检查图片URL是否可访问
- 查看后端日志，确认图片下载和导入是否成功

## 📋 环境变量配置详解

### 两个不同的配置文件

#### 1. `server/.env` - 后端配置（必需）

**位置**：`server/.env`  
**用途**：配置后端服务器

**必需配置：**
```env
# 服务器端口
PORT=3002

# 通义千问API密钥（用于剧本分析和切分）
DASHSCOPE_API_KEY=sk-your-api-key-here
```

**可选配置：**
```env
# 模型选择（可选）
QWEN_MODEL=qwen-max

# PostgreSQL 数据库配置（可选）
DATABASE_URL=postgresql://postgres:你的密码@localhost:5432/aigc_db

# 腾讯云 COS 配置（可选）
COS_SECRET_ID=你的SecretId
COS_SECRET_KEY=你的SecretKey
COS_REGION=ap-guangzhou
COS_BUCKET=你的存储桶名称

# 剪映应用路径（可选）
JIANYING_PATH=C:\Users\YourName\Desktop\剪映.lnk

# Photoshop应用路径（可选）
PHOTOSHOP_PATH=C:\Program Files\Adobe\Adobe Photoshop 2025\Photoshop.exe
```

#### 2. 根目录 `.env` - 前端配置（可选）

**位置**：项目根目录 `.env`（与 `server` 文件夹同级）  
**用途**：配置前端应用

```env
VITE_API_BASE_URL=http://localhost:3002
```

**注意：**
- ✅ `server/.env` - 必需，后端配置
- ⚠️ 根目录 `.env` - 可选，前端API地址（默认使用 `http://localhost:3002`）
- ❌ `src/.env` - 不需要，不要在此位置创建

### 修改配置后需要重启

- **后端**：修改 `server/.env` 后，需要重启后端服务
- **前端**：修改根目录 `.env` 后，需要重启前端服务

### Vite 环境变量规则

- 前端环境变量必须以 `VITE_` 开头
- 只有 `VITE_` 开头的变量才会暴露给前端代码
- 修改后必须重启前端服务

## 🔧 故障排查

### 快速检查三个问题

当遇到图生视频失败时，按以下顺序检查：

#### 1. 检查COS配置

```bash
cd server
npm run check-cos
```

**如果失败：**
- 检查 `server/.env` 文件中的COS配置
- 确认存储桶权限设置为"公有读私有写"
- 参考 `COS存储桶权限设置指南.md`

#### 2. 检查图片URL

```bash
cd server
npm run check-image-url "你的图片URL"
```

**支持的格式：**
- `data:image/png;base64,...` - base64格式（需要COS配置）
- `https://example.com/image.jpg` - HTTP/HTTPS URL

#### 3. 检查API密钥

查看后端启动日志，确认：
```
✅ DASHSCOPE_API_KEY: sk-xxxxx...
```

**如果未设置或无效：**
- 检查 `server/.env` 文件
- 重新获取API密钥
- 更新配置文件

### 登录问题修复

如果登录失败，运行：

```bash
cd server
npm run setup-db
```

这个命令会自动：
1. 创建数据库（如果不存在）
2. 创建所有表结构（包括用户表）
3. 初始化默认管理员账号

**默认管理员账号：**
- 超级管理员：`Chiefavefan` / `246859CFF`
- 高级管理员：`jubian888` / `8888`

### PowerShell 执行策略问题

如果遇到 "无法加载文件 npm.ps1，因为在此系统上禁止运行脚本"：

**方法一：使用 CMD（推荐）**
- 按 `Win + R`，输入 `cmd`，回车
- 在 CMD 中运行 `npm install`

**方法二：修改执行策略**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**方法三：使用 npm.cmd**
```powershell
npm.cmd install
```

### 端口被占用

- 后端默认端口：3002
- 前端默认端口：5173
- MusicGPT Docker：8642
- Ollama Docker：11434

**解决方法：**
- 修改 `server/.env` 中的 `PORT`（后端）
- 使用 `npm run dev -- --port 其他端口`（前端）
- 检查端口占用：`netstat -ano | findstr :端口号`

### MusicGPT 连接问题

**问题：** `MusicGPT连接失败: socket hang up`

**解决步骤：**
1. 检查容器是否运行：`docker ps | findstr musicgpt`
2. 查看服务日志：`docker logs musicgpt`
3. 测试 HTTP 连接：访问 `http://localhost:8642`
4. 检查环境变量配置：确保 `MUSICGPT_BASE_URL` 和 `MUSICGPT_HTTP_URL` 正确
5. 重启容器：`docker restart musicgpt`

**常见原因：**
- 服务还在初始化（等待 1-2 分钟）
- WebSocket 端点路径不正确
- 环境变量配置错误（协议大小写、重复定义等）

### Ollama 连接问题

**问题：** 无法连接到 Ollama 服务

**解决步骤：**
1. 检查容器是否运行：`docker ps | findstr ollama`
2. 查看服务日志：`docker logs ollama`
3. 测试 API：`curl http://localhost:11434/api/tags`
4. 检查模型是否已下载：`docker exec ollama ollama list`
5. 检查环境变量：确保 `OLLAMA_BASE_URL` 和 `OLLAMA_MODEL` 正确

**常见原因：**
- 模型未下载完成
- 端口被占用
- 环境变量配置错误

## 🚀 部署和更新

### 提交代码到 GitHub

**Windows 用户：**
```powershell
.\提交代码到GitHub.ps1
```

**Linux/Mac 用户：**
```bash
bash 提交代码到GitHub.sh
```

### 更新线上部署

#### 方法一：通过 SSH 脚本更新（推荐，Windows）

**快速更新（默认）：**
```powershell
.\快速更新服务器.ps1
```

**完整更新（包含依赖检查）：**
```powershell
.\快速更新服务器.ps1 -UpdateType "full"
```

**指定服务器 IP：**
```powershell
.\快速更新服务器.ps1 -ServerIP "你的服务器IP"
```

**注意**：如果已配置 SSH 密钥，脚本会自动使用密钥连接，无需输入密码。

#### 方法二：在服务器上直接执行

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

### 开发环境 vs 生产环境

**开发环境（支持热更新）**：
- URL：`http://localhost:5173`
- 运行：`npm run dev`
- 特点：修改代码后自动热更新，无需手动刷新

**生产环境（需要部署）**：
- URL：`https://www.jubianai.cn`
- 运行：Nginx + PM2
- 特点：需要构建和部署才能看到更改，不支持热更新

### 服务器部署

详细部署步骤请参考 `skill/skill.md` 中的"部署方案"章节。

**快速部署命令：**
```bash
# 1. 安装环境
sudo apt update && sudo apt upgrade -y
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20 && nvm use 20
npm install -g pm2
sudo apt install nginx git -y

# 2. 部署应用
cd /var/www
sudo mkdir -p aigc-agent && sudo chown ubuntu:ubuntu aigc-agent
cd aigc-agent
git clone https://github.com/ZhehuanUnique/AIGC-jubianage-agent.git .
npm install
cd server && npm install && cd ..

# 3. 配置环境变量
cd server
cp .env.example .env
nano .env  # 编辑配置文件

# 4. 构建和启动
cd ..
npm run build
cd server
pm2 start index.js --name aigc-agent
pm2 save
pm2 startup

# 5. 配置 Nginx（参考 skill/skill.md）
```

### 后端服务 24 小时运行

使用 PM2 确保后端服务稳定运行：

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs aigc-agent

# 重启服务
pm2 restart aigc-agent

# 设置开机自启
pm2 startup
pm2 save
```

详细配置请参考 `skill/skill.md` 中的"PM2 管理"章节。

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

如有问题，请提交 Issue 或联系项目维护者。
