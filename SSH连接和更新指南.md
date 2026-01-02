# SSH 连接和更新服务器指南

## 📋 概述

本文档说明如何通过 SSH 连接服务器并执行代码更新，无需每次手动输入命令。

## 🔑 方法一：配置 SSH 密钥（推荐）

### 优点
- ✅ 无需每次输入密码
- ✅ 更安全
- ✅ 可以自动化执行

### 配置步骤

1. **生成 SSH 密钥（如果还没有）**
   ```powershell
   .\配置SSH密钥连接.ps1
   ```

2. **将公钥添加到服务器**
   - 脚本会自动提示如何操作
   - 或手动执行：
     ```bash
     # 在服务器上执行
     mkdir -p ~/.ssh
     chmod 700 ~/.ssh
     echo "你的公钥内容" >> ~/.ssh/authorized_keys
     chmod 600 ~/.ssh/authorized_keys
     ```

3. **测试连接**
   ```powershell
   ssh ubuntu@你的服务器IP
   ```

## 🔐 方法二：使用密码连接

### 使用脚本

```powershell
.\通过SSH更新服务器.ps1
```

脚本会提示输入：
- 服务器 IP 地址
- 用户名（默认：ubuntu）
- 密码
- 更新类型（快速/完整）

### 直接使用参数

```powershell
.\通过SSH更新服务器.ps1 -ServerIP "119.45.121.152" -Username "ubuntu" -Password "你的密码" -UpdateType "quick"
```

**注意**：密码会以明文形式出现在命令历史中，建议使用方法一（SSH 密钥）。

## 🚀 更新类型

### 快速更新（quick）
- ✅ 从 GitHub 拉取最新代码
- ✅ 重启后端服务
- ✅ 清理并重新构建前端
- ✅ 设置权限并重新加载 Nginx

### 完整更新（full）
- ✅ 包含快速更新的所有步骤
- ✅ 检查并安装后端依赖（如果需要）
- ✅ 检查并安装前端依赖（如果需要）

## 📝 手动 SSH 连接

如果脚本无法使用，可以手动连接：

```powershell
# 连接到服务器
ssh ubuntu@你的服务器IP

# 在服务器上执行更新
cd /var/www/aigc-agent
bash 更新线上部署.sh
```

## 🔧 安装 sshpass（可选，用于自动化密码输入）

### Windows

1. **使用 Chocolatey**
   ```powershell
   choco install sshpass
   ```

2. **使用 Git Bash**
   - Git Bash 通常包含 sshpass
   - 在 Git Bash 中执行脚本

3. **使用 WSL**
   ```bash
   sudo apt install sshpass
   ```

### Linux/Mac

```bash
# Ubuntu/Debian
sudo apt install sshpass

# macOS
brew install hudochenkov/sshpass/sshpass
```

## ⚠️ 安全建议

1. **优先使用 SSH 密钥**
   - 更安全
   - 无需输入密码
   - 可以自动化

2. **不要将密码硬编码在脚本中**
   - 使用环境变量
   - 使用密钥文件
   - 使用交互式输入

3. **定期更换密码**
   - 建议每 3-6 个月更换一次

4. **限制 SSH 访问**
   - 使用防火墙限制 IP
   - 禁用密码登录（仅使用密钥）
   - 更改默认 SSH 端口

## 🐛 常见问题

### 1. SSH 连接失败

**错误**: `Connection refused` 或 `Connection timed out`

**解决**:
- 检查服务器 IP 地址是否正确
- 检查服务器是否运行
- 检查防火墙是否开放 22 端口
- 检查 SSH 服务是否运行：`sudo systemctl status ssh`

### 2. 密码认证失败

**错误**: `Permission denied`

**解决**:
- 确认用户名和密码正确
- 检查服务器是否允许密码登录
- 尝试使用 SSH 密钥

### 3. 公钥认证失败

**错误**: `Permission denied (publickey)`

**解决**:
- 检查 `~/.ssh/authorized_keys` 文件权限（应该是 600）
- 检查 `~/.ssh` 目录权限（应该是 700）
- 确认公钥已正确添加到服务器

### 4. 脚本执行失败

**错误**: 命令执行失败

**解决**:
- 检查服务器上的脚本文件是否存在
- 检查文件权限：`chmod +x 更新线上部署.sh`
- 查看服务器日志：`pm2 logs aigc-agent`

## 📞 需要帮助？

如果遇到问题：
1. 检查服务器网络连接
2. 检查 SSH 服务状态
3. 查看服务器日志
4. 尝试手动 SSH 连接测试

## 🔄 工作流程

### 日常更新流程

1. **本地提交代码**
   ```powershell
   .\提交代码到GitHub.ps1
   ```

2. **服务器更新**
   ```powershell
   .\通过SSH更新服务器.ps1
   ```

3. **验证更新**
   - 访问网站检查是否正常
   - 查看 PM2 日志：`pm2 logs aigc-agent`

## 💡 提示

- 首次使用建议配置 SSH 密钥，后续更新会更方便
- 如果服务器 IP 经常变化，可以将 IP 保存为环境变量
- 可以创建快捷方式，一键更新服务器

