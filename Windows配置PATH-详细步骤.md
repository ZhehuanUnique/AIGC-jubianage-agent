# Windows 手动配置 PATH 环境变量

## 方法 1: 图形界面配置（最简单）

### 步骤 1: 打开系统属性

**方式 A: 通过运行对话框**
1. 按 `Win + R` 键
2. 输入 `sysdm.cpl`
3. 按回车

**方式 B: 通过此电脑**
1. 右键点击"此电脑"（或"我的电脑"）
2. 选择"属性"
3. 点击"高级系统设置"

### 步骤 2: 打开环境变量

1. 在"系统属性"窗口中，点击"环境变量"按钮
2. 会弹出"环境变量"对话框

### 步骤 3: 编辑 PATH

**选择作用域：**
- **用户变量**：只对当前用户生效（推荐）
- **系统变量**：对所有用户生效（需要管理员权限）

**编辑步骤：**
1. 在"用户变量"或"系统变量"区域找到 `Path`
2. 选中 `Path`，点击"编辑"按钮
3. 在"编辑环境变量"窗口中：
   - 点击"新建"
   - 输入 Node.js 的安装路径，例如：`C:\Program Files\nodejs`
   - 点击"确定"

### 步骤 4: 应用更改

1. 点击所有"确定"按钮关闭所有对话框
2. **重要**：关闭所有已打开的 CMD 或 PowerShell 窗口
3. 打开新的命令提示符或 PowerShell 窗口

### 步骤 5: 验证

```cmd
# 在 CMD 中
where node
node --version
npm --version
```

```powershell
# 在 PowerShell 中
Get-Command node
node --version
npm --version
```

## 方法 2: PowerShell 配置（快速）

### 用户级 PATH（推荐）

```powershell
# 1. 以普通用户身份打开 PowerShell

# 2. 查看当前用户 PATH
[Environment]::GetEnvironmentVariable("Path", "User")

# 3. 添加 Node.js 路径（替换为实际路径）
$nodePath = "C:\Program Files\nodejs"
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
[Environment]::SetEnvironmentVariable(
    "Path",
    "$currentPath;$nodePath",
    "User"
)

# 4. 刷新当前会话
$env:PATH = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# 5. 验证
node --version
```

### 系统级 PATH（需要管理员权限）

```powershell
# 1. 以管理员身份打开 PowerShell
# 右键 PowerShell，选择"以管理员身份运行"

# 2. 添加 Node.js 路径
$nodePath = "C:\Program Files\nodejs"
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
[Environment]::SetEnvironmentVariable(
    "Path",
    "$currentPath;$nodePath",
    "Machine"
)

# 3. 刷新当前会话
$env:PATH = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# 4. 验证
node --version
```

## 方法 3: CMD 配置

### 用户级 PATH

```cmd
# 1. 打开 CMD

# 2. 添加 Node.js 路径（替换为实际路径）
setx PATH "%PATH%;C:\Program Files\nodejs"

# 3. 关闭并重新打开 CMD

# 4. 验证
where node
node --version
```

### 系统级 PATH（需要管理员权限）

```cmd
# 1. 以管理员身份打开 CMD
# 右键 CMD，选择"以管理员身份运行"

# 2. 添加 Node.js 路径
setx PATH "%PATH%;C:\Program Files\nodejs" /M

# 3. 关闭并重新打开 CMD

# 4. 验证
where node
node --version
```

## 方法 4: 注册表配置（高级）

⚠️ **警告**：修改注册表有风险，请谨慎操作！

```powershell
# 用户级 PATH
$regPath = "HKCU:\Environment"
$currentPath = (Get-ItemProperty -Path $regPath -Name Path).Path
$newPath = "$currentPath;C:\Program Files\nodejs"
Set-ItemProperty -Path $regPath -Name Path -Value $newPath

# 系统级 PATH（需要管理员权限）
$regPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment"
$currentPath = (Get-ItemProperty -Path $regPath -Name Path).Path
$newPath = "$currentPath;C:\Program Files\nodejs"
Set-ItemProperty -Path $regPath -Name Path -Value $newPath
```

## 查找 Node.js 安装位置

### 方法 1: 检查常见位置

```powershell
# PowerShell
Test-Path "C:\Program Files\nodejs\node.exe"
Test-Path "C:\Program Files (x86)\nodejs\node.exe"
Test-Path "$env:APPDATA\npm\node.exe"
```

### 方法 2: 搜索整个系统

```powershell
# PowerShell（需要管理员权限）
Get-ChildItem -Path "C:\Program Files" -Filter "node.exe" -Recurse -ErrorAction SilentlyContinue
Get-ChildItem -Path "C:\Program Files (x86)" -Filter "node.exe" -Recurse -ErrorAction SilentlyContinue
```

### 方法 3: 如果已安装但不在 PATH 中

```powershell
# 检查 npm 全局安装位置
npm config get prefix

# 通常 Node.js 在这个目录的父目录
# 例如：如果 prefix 是 C:\Users\YourName\AppData\Roaming\npm
# 那么 Node.js 可能在 C:\Program Files\nodejs
```

## 验证配置

### 检查 PATH 是否包含 Node.js

```powershell
# PowerShell
$env:PATH -split ';' | Select-String -Pattern "node"
```

```cmd
# CMD
echo %PATH% | findstr /i node
```

### 检查命令是否可用

```powershell
# PowerShell
Get-Command node -ErrorAction SilentlyContinue
Get-Command npm -ErrorAction SilentlyContinue
```

```cmd
# CMD
where node
where npm
```

## 常见问题

### 问题 1: 配置后仍然找不到命令

**解决方案：**
1. **关闭所有终端窗口**，重新打开
2. 检查路径是否正确（使用绝对路径）
3. 验证文件是否存在：`Test-Path "C:\Program Files\nodejs\node.exe"`
4. 检查是否有拼写错误

### 问题 2: PATH 太长

Windows PATH 有长度限制（约 2048 字符）

**解决方案：**
```powershell
# 查看 PATH 长度
([Environment]::GetEnvironmentVariable("Path", "User")).Length

# 清理不需要的路径
# 手动编辑环境变量，删除不需要的路径
```

### 问题 3: 权限不足

**解决方案：**
- 使用用户级 PATH（不需要管理员权限）
- 或者以管理员身份运行 PowerShell/CMD

### 问题 4: 多个 Node.js 版本

**解决方案：**
- 只保留一个 Node.js 在 PATH 中
- 使用 NVM for Windows 管理多个版本：
  ```powershell
  # 安装 NVM
  choco install nvm
  # 或下载：https://github.com/coreybutler/nvm-windows/releases
  ```

## 快速检查脚本

```powershell
# PowerShell 一键检查
Write-Host "检查 Node.js..." -ForegroundColor Cyan
$nodePaths = @(
    "C:\Program Files\nodejs\node.exe",
    "C:\Program Files (x86)\nodejs\node.exe",
    "$env:APPDATA\npm\node.exe"
)

$found = $false
foreach ($path in $nodePaths) {
    if (Test-Path $path) {
        Write-Host "✅ 找到: $path" -ForegroundColor Green
        $found = $true
    }
}

if (-not $found) {
    Write-Host "❌ 未找到 Node.js" -ForegroundColor Red
}

Write-Host "`n检查 PATH..." -ForegroundColor Cyan
$pathContainsNode = $env:PATH -split ';' | Where-Object { $_ -like "*node*" }
if ($pathContainsNode) {
    Write-Host "✅ PATH 中包含:" -ForegroundColor Green
    $pathContainsNode | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "❌ PATH 中不包含 Node.js" -ForegroundColor Red
}

Write-Host "`n检查命令..." -ForegroundColor Cyan
try {
    $nodeVersion = node --version 2>&1
    Write-Host "✅ node 可用: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ node 不可用" -ForegroundColor Red
}

try {
    $npmVersion = npm --version 2>&1
    Write-Host "✅ npm 可用: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm 不可用" -ForegroundColor Red
}
```




