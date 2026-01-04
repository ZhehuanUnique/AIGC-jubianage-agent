# 手动配置 PATH 环境变量 - 完整指南

## 一、Linux 服务器配置（Ubuntu/Debian）

### 方法 1: 通过 ~/.bashrc（推荐，永久生效）

```bash
# 1. 连接到服务器
ssh ubuntu@119.45.121.152

# 2. 查找 Node.js 安装位置
which nodejs || which node
# 或者
find /usr -name node 2>/dev/null | grep -E 'bin/node$'

# 3. 假设找到的是 /usr/bin/nodejs，获取其目录
NODE_DIR="/usr/bin"  # 替换为实际的目录

# 4. 编辑 ~/.bashrc
nano ~/.bashrc
# 或者
vi ~/.bashrc

# 5. 在文件末尾添加以下行
export PATH="/usr/bin:$PATH"
# 或者更安全的方式（避免重复添加）
export PATH="$PATH:/usr/bin"

# 6. 保存并退出
# nano: Ctrl+X, 然后 Y, 然后 Enter
# vi: 按 Esc, 输入 :wq, 然后 Enter

# 7. 重新加载配置
source ~/.bashrc

# 8. 验证
nodejs --version
# 或者
node --version
```

### 方法 2: 通过 ~/.profile（系统级配置）

```bash
# 1. 编辑 ~/.profile
nano ~/.profile

# 2. 添加以下行
export PATH="$PATH:/usr/bin"

# 3. 保存并退出

# 4. 重新加载（或重新登录）
source ~/.profile
```

### 方法 3: 通过 /etc/environment（所有用户生效）

```bash
# 1. 编辑系统环境变量文件（需要 sudo）
sudo nano /etc/environment

# 2. 找到 PATH 行，修改为：
PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/bin"
# 注意：不要使用 export，直接写 PATH=...

# 3. 保存并退出

# 4. 重新登录或重启系统
```

### 方法 4: 临时配置（仅当前会话）

```bash
# 直接在当前终端执行
export PATH="/usr/bin:$PATH"

# 验证
nodejs --version
```

## 二、Windows 配置

### 方法 1: 通过图形界面（推荐）

1. **打开系统属性**
   - 按 `Win + R`，输入 `sysdm.cpl`，回车
   - 或者：右键"此电脑" → "属性" → "高级系统设置"

2. **打开环境变量**
   - 点击"环境变量"按钮

3. **编辑 PATH**
   - 在"用户变量"或"系统变量"中找到 `Path`
   - 点击"编辑"

4. **添加路径**
   - 点击"新建"
   - 输入 Node.js 的安装路径，例如：`C:\Program Files\nodejs`
   - 点击"确定"

5. **应用更改**
   - 点击所有"确定"按钮关闭对话框

6. **验证**
   - 打开新的命令提示符（CMD）或 PowerShell
   - 输入：`node --version`
   - 输入：`npm --version`

### 方法 2: 通过 PowerShell（管理员权限）

```powershell
# 1. 以管理员身份打开 PowerShell

# 2. 查看当前 PATH
$env:PATH

# 3. 添加 Node.js 路径（用户级）
[Environment]::SetEnvironmentVariable(
    "Path",
    [Environment]::GetEnvironmentVariable("Path", "User") + ";C:\Program Files\nodejs",
    "User"
)

# 4. 或者添加到系统级（需要管理员权限）
[Environment]::SetEnvironmentVariable(
    "Path",
    [Environment]::GetEnvironmentVariable("Path", "Machine") + ";C:\Program Files\nodejs",
    "Machine"
)

# 5. 刷新当前会话
$env:PATH = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# 6. 验证
node --version
```

### 方法 3: 通过 CMD（管理员权限）

```cmd
# 1. 以管理员身份打开 CMD

# 2. 添加到用户 PATH
setx PATH "%PATH%;C:\Program Files\nodejs"

# 3. 或者添加到系统 PATH（需要管理员）
setx PATH "%PATH%;C:\Program Files\nodejs" /M

# 4. 关闭并重新打开 CMD 窗口

# 5. 验证
node --version
```

### 方法 4: 临时配置（仅当前会话）

```cmd
# CMD
set PATH=%PATH%;C:\Program Files\nodejs

# PowerShell
$env:PATH += ";C:\Program Files\nodejs"
```

## 三、查找 Node.js 安装位置

### Linux

```bash
# 方法 1: 使用 which
which nodejs
which node

# 方法 2: 使用 whereis
whereis nodejs
whereis node

# 方法 3: 使用 find
find /usr -name node 2>/dev/null
find /opt -name node 2>/dev/null
find /home -name node 2>/dev/null

# 方法 4: 检查常见位置
ls -la /usr/bin/nodejs
ls -la /usr/local/bin/node
ls -la /opt/nodejs/bin/node

# 方法 5: 从 PM2 获取
pm2 info aigc-agent | grep "exec path"
```

### Windows

```cmd
# CMD
where node
where npm

# PowerShell
Get-Command node | Select-Object -ExpandProperty Source
Get-Command npm | Select-Object -ExpandProperty Source

# 检查常见位置
dir "C:\Program Files\nodejs\node.exe"
dir "C:\Program Files (x86)\nodejs\node.exe"
dir "%APPDATA%\npm\node.exe"
```

## 四、验证配置

### Linux

```bash
# 检查 node 命令
which node
which nodejs

# 检查版本
node --version
nodejs --version

# 检查 npm
which npm
npm --version

# 检查 PATH
echo $PATH | grep -o '[^:]*node[^:]*'
```

### Windows

```cmd
# CMD
where node
where npm
node --version
npm --version

# PowerShell
Get-Command node
Get-Command npm
node --version
npm --version
```

## 五、常见问题

### 问题 1: 配置后仍然找不到命令

**解决方案：**
1. 确保路径正确（使用绝对路径）
2. 重新打开终端窗口
3. 检查是否有拼写错误
4. 验证文件是否真的存在：`ls -la /usr/bin/nodejs`（Linux）或 `dir "C:\Program Files\nodejs\node.exe"`（Windows）

### 问题 2: 多个 Node.js 版本冲突

**解决方案：**
- 只保留一个 Node.js 在 PATH 中
- 使用 NVM（Node Version Manager）管理多个版本

### 问题 3: 权限问题（Linux）

**解决方案：**
```bash
# 如果 /usr/bin 需要 sudo，可以安装到用户目录
# 或者使用 NVM 安装到用户目录
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
```

### 问题 4: PATH 太长（Windows）

**解决方案：**
- Windows 有 PATH 长度限制（约 2048 字符）
- 删除不需要的路径
- 使用符号链接缩短路径

## 六、服务器快速配置脚本

```bash
# 在服务器上执行
ssh ubuntu@119.45.121.152 << 'EOF'
# 查找 Node.js
NODE_PATH=$(which nodejs 2>/dev/null || which node 2>/dev/null || find /usr -name node 2>/dev/null | grep -E 'bin/node$' | head -1)

if [ -z "$NODE_PATH" ]; then
    echo "❌ 未找到 Node.js"
    exit 1
fi

NODE_DIR=$(dirname "$NODE_PATH")
echo "✅ 找到 Node.js: $NODE_PATH"
echo "✅ 目录: $NODE_DIR"

# 添加到 ~/.bashrc
if ! grep -q "$NODE_DIR" ~/.bashrc 2>/dev/null; then
    echo "" >> ~/.bashrc
    echo "# Node.js PATH (添加于 $(date +%Y-%m-%d))" >> ~/.bashrc
    echo "export PATH=\"$NODE_DIR:\$PATH\"" >> ~/.bashrc
    echo "✅ 已添加到 ~/.bashrc"
else
    echo "ℹ️  已在 ~/.bashrc 中"
fi

# 应用到当前会话
export PATH="$NODE_DIR:$PATH"

# 验证
echo ""
echo "验证配置："
nodejs --version 2>/dev/null || node --version
EOF
```

## 七、检查当前 PATH

### Linux

```bash
# 查看完整 PATH
echo $PATH

# 格式化显示（每行一个路径）
echo $PATH | tr ':' '\n'

# 查找包含 node 的路径
echo $PATH | tr ':' '\n' | grep -i node
```

### Windows

```cmd
# CMD
echo %PATH%

# PowerShell
$env:PATH -split ';'
```




