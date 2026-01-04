# 手动配置 Node.js 到 PATH 环境变量

如果自动脚本无法找到 Node.js，可以手动配置。

## 方法 1: 查找 Node.js 安装位置

```bash
# 连接到服务器
ssh ubuntu@119.45.121.152

# 查找 node 可执行文件
which node
which nodejs

# 或者搜索整个系统
find /usr -name node 2>/dev/null | grep -E 'bin/node$'
find /opt -name node 2>/dev/null | grep -E 'bin/node$'
find /home -name node 2>/dev/null | grep -E 'bin/node$'

# 检查常见位置
ls -la /usr/bin/nodejs
ls -la /usr/local/bin/node
ls -la /opt/nodejs/bin/node
```

## 方法 2: 从 PM2 获取 Node.js 路径

```bash
# 查看 PM2 进程信息
pm2 info aigc-agent

# 从输出中找到 "exec path"，通常是 node 的路径
# 例如：/usr/bin/node /var/www/aigc-agent/server/index.js
# 那么 Node.js 就在 /usr/bin/node
```

## 方法 3: 配置 PATH

找到 Node.js 路径后（假设是 `/usr/bin/node`），执行：

```bash
# 1. 获取 Node.js 目录（去掉文件名）
NODE_DIR=$(dirname /usr/bin/node)
# 结果：/usr/bin

# 2. 添加到当前会话的 PATH
export PATH="$NODE_DIR:$PATH"

# 3. 验证
node --version
npm --version

# 4. 永久添加到 ~/.bashrc
echo "" >> ~/.bashrc
echo "# Node.js PATH" >> ~/.bashrc
echo "export PATH=\"$NODE_DIR:\$PATH\"" >> ~/.bashrc

# 5. 重新加载配置
source ~/.bashrc
```

## 方法 4: 如果使用 NVM

如果 Node.js 是通过 NVM 安装的：

```bash
# 加载 NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 使用默认版本
nvm use default

# 或者指定版本
nvm use 20

# 永久配置（添加到 ~/.bashrc）
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc
echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.bashrc
echo '[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"' >> ~/.bashrc
```

## 方法 5: 创建符号链接

如果 Node.js 在 `/usr/bin/nodejs`，但系统期望 `node`：

```bash
# 创建符号链接
sudo ln -s /usr/bin/nodejs /usr/local/bin/node

# 或者
sudo ln -s /usr/bin/nodejs /usr/bin/node
```

## 验证配置

```bash
# 检查 node 命令
which node
node --version

# 检查 npm 命令
which npm
npm --version

# 检查 pm2 命令
which pm2
pm2 --version
```

## 常见问题

### 问题 1: `node: command not found`

**解决方案：**
1. 找到 Node.js 安装位置
2. 将其目录添加到 PATH
3. 重新加载 shell 配置

### 问题 2: `npm: command not found`

**解决方案：**
- 如果 Node.js 已配置，npm 通常也在同一目录
- 检查 `$NODE_DIR/npm` 是否存在
- 如果不存在，可能需要重新安装 Node.js（npm 通常随 Node.js 一起安装）

### 问题 3: PM2 找不到 node

**解决方案：**
- PM2 在启动时会查找 node，如果找不到会失败
- 确保 PATH 配置正确后，重启 PM2：
  ```bash
  pm2 delete aigc-agent
  pm2 start server/index.js --name aigc-agent
  ```

## 快速检查脚本

```bash
# 检查所有相关命令
echo "Node.js: $(which node 2>/dev/null || echo '未找到')"
echo "NPM: $(which npm 2>/dev/null || echo '未找到')"
echo "PM2: $(which pm2 2>/dev/null || echo '未找到')"
echo ""
echo "Node.js 版本: $(node --version 2>/dev/null || echo '未安装')"
echo "NPM 版本: $(npm --version 2>/dev/null || echo '未安装')"
echo "PM2 版本: $(pm2 --version 2>/dev/null || echo '未安装')"
```




