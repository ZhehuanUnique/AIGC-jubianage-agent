# 剧变时代Agent

一个基于React + TypeScript + Vite的AI视频生成Agent应用，支持剧本分析、智能切分、图生视频等功能。

## ✨ 功能特性

### 核心功能
- 📝 **剧本输入和管理**：支持文本输入和.docx文件上传
- 🤖 **智能剧本分析**：使用通义千问大模型自动提取角色、场景、物品
- ✂️ **智能剧本切分**：自动将剧本切分为多个片段，每个片段对应一个分镜
- 🎬 **图生视频模式**：集成通义万相图生视频功能
- 🎨 **资产详情管理**：管理角色、场景、物品，支持本地上传
- 📸 **分镜管理**：配置每个分镜的详细信息，包含对应片段、融图提示词等
- 🖼️ **融图管理**：选择图片素材并配置视频生成参数
- 🎥 **视频编辑和导出**：编辑和导出生成的视频

### 技术亮点
- 使用qwen-plus模型进行剧本分析和切分
- 使用wan2.2-i2v-flash模型进行图生视频（最便宜选项）
- 支持异步视频生成任务查询
- 完整的错误处理和降级方案

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn

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
# 设置为 'auto' 会根据剧本长度智能选择
QWEN_MODEL=qwen-plus

# 服务器端口
PORT=3002

# 图生视频模型配置（可选）
# 默认使用 wan2.2-i2v-flash（最便宜，0.10元/秒@480P）
VIDEO_MODEL=wan2.2-i2v-flash
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

### 4. 启动服务

#### 启动后端服务

```bash
cd server
npm run dev
```

后端将在 http://localhost:3002 启动

#### 启动前端服务

```bash
# 在项目根目录
npm run dev
```

前端将在 http://localhost:5173 启动

### 5. 访问应用

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

系统使用通义千问qwen-plus模型进行：
- **剧本分析**：自动提取角色、场景、物品
- **剧本切分**：智能将剧本切分为多个片段，每个片段对应一个分镜

**特点：**
- 所有片段合起来等于完整剧本，不遗漏任何内容
- 根据剧本的自然段落、场景转换、对话切换等逻辑进行切分
- 每个片段适合制作5-10秒的视频分镜

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
│   │   ├── qwenService.js       # 通义千问API
│   │   └── imageToVideoService.js # 图生视频API
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
  "scriptTitle": "剧本标题（可选）"
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
        "segment": "第一个片段的完整内容"
      },
      {
        "shotNumber": 2,
        "segment": "第二个片段的完整内容"
      }
    ],
    "totalShots": 2
  }
}
```

#### 5. 图生视频
```
POST /api/generate-video
Content-Type: multipart/form-data

image: <图片文件>
model: wan2.2-i2v-flash (可选)
resolution: 480p (可选)
duration: 5 (可选)
```

#### 6. 查询视频任务状态
```
GET /api/video-task/:taskId
```

## 🔑 获取API密钥

### 通义千问/通义万相（推荐）

1. 访问：https://dashscope.console.aliyun.com/
2. 注册/登录阿里云账号
3. 创建API密钥
4. 将密钥填入 `server/.env` 文件的 `DASHSCOPE_API_KEY`

**重要说明：**
- ✅ 同一个API密钥可以调用所有模型（qwen-max, qwen-plus, qwen-turbo, qwen-flash）
- ✅ 同一个API密钥也可以用于通义万相图生视频
- ✅ 不需要为每个模型单独获取API密钥

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
QWEN_MODEL=qwen-plus
```

### 图生视频模型

| 模型 | 分辨率 | 价格/秒 | 推荐场景 |
|------|--------|---------|----------|
| **wan2.2-i2v-flash** | 480P | **0.10元** | **推荐：最便宜，适合测试** |
| wan2.2-i2v-flash | 720P | 0.20元 | 平衡质量和成本 |
| wan2.2-i2v-flash | 1080P | 0.48元 | 追求高质量 |
| wan2.5-i2v-preview | 480P | 0.3元 | 预览版 |
| wan2.6-i2v | 720P | 0.6元 | 最新版 |

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
- mammoth (docx解析)
- multer (文件上传)
- dotenv (环境变量)

### AI服务
- 通义千问 (qwen-plus) - 剧本分析和切分
- 通义万相 (wan2.2-i2v-flash) - 图生视频

## 💡 常见问题

### Q: 需要为不同模型单独获取API密钥吗？
**A: 不需要！** 同一个API密钥可以调用所有模型。

### Q: 如何切换模型？
**A: 只需修改 `server/.env` 文件中的 `QWEN_MODEL` 值，然后重启服务。**

### Q: 后端服务启动失败？
**A: 检查以下几点：**
1. 确保 `server/.env` 文件存在且配置正确
2. 检查端口3002是否被占用
3. 查看后端控制台日志

### Q: 前端无法连接后端？
**A: 检查以下几点：**
1. 确保后端服务已启动
2. 检查 `VITE_API_BASE_URL` 配置是否正确（默认 http://localhost:3002）
3. 检查浏览器控制台错误信息

### Q: 剧本切分不准确？
**A: 可以尝试：**
1. 使用 qwen-max 模型（效果更好但成本更高）
2. 优化剧本格式，使用清晰的段落分隔
3. 手动调整切分结果

### Q: 图生视频失败？
**A: 检查以下几点：**
1. 确保API密钥正确
2. 检查图片格式和大小（支持jpg、png等，限制10MB）
3. 查看后端日志获取详细错误信息

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

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

如有问题，请提交 Issue 或联系项目维护者。
