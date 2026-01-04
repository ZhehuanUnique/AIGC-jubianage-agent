# 配置 NVM Node.js 到 PATH - 手动步骤

## Linux 服务器配置

### Node.js 路径信息
- **完整路径**: `/home/ubuntu/.nvm/versions/node/v20.19.6/bin/node`
- **目录**: `/home/ubuntu/.nvm/versions/node/v20.19.6/bin`
- **安装方式**: NVM (Node Version Manager)

### 方法 1: 直接添加到 PATH（简单快速）

```bash
# 1. 编辑 ~/.bashrc
nano ~/.bashrc

# 2. 在文件末尾添加以下内容：
export PATH="/home/ubuntu/.nvm/versions/node/v20.19.6/bin:$PATH"

# 3. 保存并退出 nano：
#    Ctrl+O (保存)
#    Enter (确认)
#    Ctrl+X (退出)

# 4. 重新加载配置
source ~/.bashrc

# 5. 验证
node --version
npm --version
```

### 方法 2: 使用 NVM 方式（推荐，更灵活）

```bash
# 1. 编辑 ~/.bashrc
nano ~/.bashrc

# 2. 在文件末尾添加以下内容：
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# 设置默认 Node.js 版本
nvm use v20.19.6
nvm alias default v20.19.6

# 3. 保存并退出 nano：
#    Ctrl+O (保存)
#    Enter (确认)
#    Ctrl+X (退出)

# 4. 重新加载配置
source ~/.bashrc

# 5. 验证
node --version
npm --version
nvm current  # 查看当前使用的版本
```

### 方法 3: 一行命令快速添加

```bash
# 直接添加到 PATH
echo 'export PATH="/home/ubuntu/.nvm/versions/node/v20.19.6/bin:$PATH"' >> ~/.bashrc

# 重新加载
source ~/.bashrc

# 验证
node --version
```

## Windows 系统配置

### 步骤 1: 查找 Node.js 安装位置

```powershell
# 方法 1: 检查常见位置
Test-Path "C:\Program Files\nodejs\node.exe"
Test-Path "C:\Program Files (x86)\nodejs\node.exe"

# 方法 2: 使用 where 命令
where node

# 方法 3: 如果使用 NVM for Windows
# 通常在：C:\Users\YourName\AppData\Roaming\nvm
$env:APPDATA\nvm
```

### 步骤 2: 配置 PATH（图形界面）

1. **打开系统属性**
   - 按 `Win + R`
   - 输入 `sysdm.cpl`
   - 回车

2. **打开环境变量**
   - 点击"环境变量"按钮

3. **编辑 PATH**
   - 在"用户变量"中找到 `Path`
   - 点击"编辑"

4. **添加 Node.js 路径**
   - 点击"新建"
   - 输入 Node.js 的安装路径，例如：
     - `C:\Program Files\nodejs`（标准安装）
     - `C:\Users\YourName\AppData\Roaming\nvm\v20.19.6`（NVM 安装）
   - 点击"确定"

5. **应用更改**
   - 点击所有"确定"按钮
   - **关闭所有 CMD/PowerShell 窗口**
   - 重新打开新的窗口

6. **验证**
   ```cmd
   node --version
   npm --version
   ```

### 步骤 3: 配置 PATH（PowerShell）

```powershell
# 1. 查找 Node.js 路径（替换为实际路径）
$nodePath = "C:\Program Files\nodejs"
# 或者如果使用 NVM：
# $nodePath = "$env:APPDATA\nvm\v20.19.6"

# 2. 添加到用户 PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
[Environment]::SetEnvironmentVariable(
    "Path",
    "$currentPath;$nodePath",
    "User"
)

# 3. 刷新当前会话
$env:PATH = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# 4. 验证
node --version
npm --version
```

### 步骤 4: 如果使用 NVM for Windows

```powershell
# 1. 安装 NVM for Windows（如果还没有）
# 下载：https://github.com/coreybutler/nvm-windows/releases

# 2. 使用 NVM 安装 Node.js
nvm install 20.19.6
nvm use 20.19.6

# 3. 设置默认版本
nvm alias default 20.19.6

# 4. 验证
node --version
npm --version
```

## 完整配置示例

### Linux 服务器（使用 NVM 方式）

```bash
# 1. 编辑 ~/.bashrc
nano ~/.bashrc

# 2. 添加以下内容到文件末尾：
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# 设置默认版本
nvm use v20.19.6 > /dev/null 2>&1
nvm alias default v20.19.6

# 3. 保存并退出（Ctrl+O, Enter, Ctrl+X）

# 4. 重新加载
source ~/.bashrc

# 5. 验证
node --version
npm --version
which node
```

### Windows（标准安装）

```powershell
# 1. 查找 Node.js
where node

# 2. 假设找到 C:\Program Files\nodejs，添加到 PATH
$nodePath = "C:\Program Files\nodejs"
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
[Environment]::SetEnvironmentVariable("Path", "$currentPath;$nodePath", "User")

# 3. 刷新
$env:PATH = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# 4. 验证
node --version
```

## 验证配置

### Linux

```bash
# 检查 node 命令
which node
node --version

# 检查 npm
which npm
npm --version

# 检查 PATH 是否包含 Node.js 目录
echo $PATH | grep -o '[^:]*node[^:]*'

# 如果使用 NVM
nvm current
nvm list
```

### Windows

```powershell
# 检查 node 命令
where node
node --version

# 检查 npm
where npm
npm --version

# 检查 PATH
$env:PATH -split ';' | Select-String -Pattern "node"
```

## 常见问题

### Linux: NVM 命令不可用

**解决方案：**
```bash
# 确保加载了 NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 然后使用
nvm use v20.19.6
```

### Windows: 找不到 node 命令

**解决方案：**
1. 确认路径正确
2. 关闭所有终端窗口，重新打开
3. 检查文件是否存在：`Test-Path "C:\Program Files\nodejs\node.exe"`

### 切换 Node.js 版本（NVM）

**Linux:**
```bash
nvm list              # 查看已安装版本
nvm use v20.19.6      # 切换到指定版本
nvm alias default v20.19.6  # 设置默认版本
```

**Windows (NVM for Windows):**
```cmd
nvm list
nvm use 20.19.6
nvm alias default 20.19.6
```




