# 火山引擎API配置说明

## 错误信息

如果看到以下错误：
```
AuthenticationError: the API key or AK/SK in the request is missing or invalid
```

说明火山引擎的 Access Key (AK) 或 Secret Key (SK) 未正确配置。

## 配置步骤

### 1. 获取火山引擎 Access Key 和 Secret Key

1. 登录火山引擎控制台：https://console.volcengine.com/
2. 进入 **访问控制** → **密钥管理**
3. 创建新的 Access Key 或查看现有的 Access Key
4. 复制 **Access Key ID** 和 **Secret Access Key**

### 2. 配置到服务器

在服务器的 `server/.env` 文件中添加以下配置：

```env
# 火山引擎即梦AI-视频生成3.0 Pro配置
VOLCENGINE_AK=your_volcengine_access_key_id_here
VOLCENGINE_SK=your_volcengine_secret_access_key_here
VOLCENGINE_API_HOST=https://visual.volcengineapi.com
```

**重要提示：**
- 将 `your_volcengine_access_key_id_here` 替换为实际的 Access Key ID
- 将 `your_volcengine_secret_access_key_here` 替换为实际的 Secret Access Key
- 确保没有多余的空格或引号
- 确保 `.env` 文件在 `server/` 目录下

### 3. 检查配置

在服务器上运行检查脚本：

```bash
cd /home/ubuntu/AIGC-jubianage-agent/server
node check-volcengine-config.js
```

### 4. 重启后端服务

配置完成后，重启后端服务使配置生效：

```bash
pm2 restart AIGC-jubianage-agent
```

## 兼容的环境变量名称

代码支持以下环境变量名称（按优先级）：

**Access Key:**
- `VOLCENGINE_AK` (推荐)
- `VOLCENGINE_ACCESS_KEY`
- `VOLC_ACCESSKEY`

**Secret Key:**
- `VOLCENGINE_SK` (推荐)
- `VOLCENGINE_SECRET_KEY`
- `VOLC_SECRETKEY`

## 常见问题

### Q: 配置后仍然报错？

A: 检查以下几点：
1. `.env` 文件是否在 `server/` 目录下
2. 环境变量名称是否正确（区分大小写）
3. 值是否正确（没有多余空格）
4. 是否重启了后端服务
5. AK/SK 是否已激活
6. 账户是否有使用即梦AI-视频生成3.0 Pro的权限

### Q: 如何验证配置是否正确？

A: 运行检查脚本：
```bash
cd server
node check-volcengine-config.js
```

### Q: 在哪里查看服务器上的 .env 文件？

A: 通常在项目根目录或 server 目录下：
```bash
# 查看项目根目录
cat /home/ubuntu/AIGC-jubianage-agent/.env

# 或查看 server 目录
cat /home/ubuntu/AIGC-jubianage-agent/server/.env
```

## 相关文档

- 火山引擎控制台：https://console.volcengine.com/
- 即梦AI-视频生成文档：https://www.volcengine.com/docs/85621/1777001?lang=zh

