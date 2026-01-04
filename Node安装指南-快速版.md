# Node.js 安装指南（如果未找到）

## 如果确实找不到 Node.js，需要安装

### 方法 1: 官网下载安装（最简单，推荐）

1. **访问官网**
   - 打开浏览器，访问：https://nodejs.org/
   - 点击下载 LTS 版本（长期支持版，更稳定）

2. **安装**
   - 运行下载的 `.msi` 安装程序
   - 按默认选项安装（会自动添加到 PATH）
   - 完成安装

3. **验证**
   - 关闭所有 PowerShell/CMD 窗口
   - 重新打开 PowerShell
   - 执行：`node --version`
   - 执行：`npm --version`

### 方法 2: 使用 Chocolatey（如果已安装 Chocolatey）

```powershell
# 以管理员身份运行 PowerShell
choco install nodejs
```

### 方法 3: 使用 NVM for Windows（推荐用于多版本管理）

1. **下载 NVM**
   - 访问：https://github.com/coreybutler/nvm-windows/releases
   - 下载 `nvm-setup.exe`

2. **安装 NVM**
   - 运行 `nvm-setup.exe`
   - 按默认选项安装

3. **安装 Node.js**
   ```powershell
   # 打开新的 PowerShell
   nvm install 20.19.6
   nvm use 20.19.6
   nvm alias default 20.19.6
   ```

4. **验证**
   ```powershell
   node --version
   npm --version
   ```

### 方法 4: 使用 Scoop（如果已安装 Scoop）

```powershell
scoop install nodejs
```

## 安装后配置 PATH（如果自动配置失败）

如果安装后仍然找不到 `node` 命令，手动添加到 PATH：

### 图形界面方式

1. 按 `Win + R`，输入 `sysdm.cpl`，回车
2. 点击"环境变量"
3. 在"用户变量"中找到 `Path`，点击"编辑"
4. 点击"新建"，添加 Node.js 安装路径（通常是 `C:\Program Files\nodejs`）
5. 点击所有"确定"按钮
6. 关闭所有 PowerShell/CMD 窗口，重新打开

### PowerShell 方式

```powershell
# 假设 Node.js 安装在 C:\Program Files\nodejs
$nodePath = "C:\Program Files\nodejs"
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
[Environment]::SetEnvironmentVariable("Path", "$currentPath;$nodePath", "User")

# 刷新当前会话
$env:PATH = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# 验证
node --version
```

## 常见问题

### 问题 1: 安装后仍然找不到 node 命令

**解决方案：**
1. 关闭所有终端窗口，重新打开
2. 检查安装路径是否正确
3. 手动添加到 PATH（见上方）

### 问题 2: 需要多个 Node.js 版本

**解决方案：**
- 使用 NVM for Windows
- 可以轻松切换不同版本

### 问题 3: 安装失败

**解决方案：**
1. 以管理员身份运行安装程序
2. 检查是否有杀毒软件阻止
3. 尝试使用 NVM 安装

## 推荐安装方式

- **普通用户**：官网下载安装（最简单）
- **开发者**：NVM for Windows（可以管理多个版本）
- **已有包管理器**：使用 Chocolatey 或 Scoop




