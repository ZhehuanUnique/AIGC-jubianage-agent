# SSH 密钥配置步骤

## 方法一：使用脚本自动配置（推荐）

在 Cursor 终端中运行：

```powershell
.\配置SSH密钥-完整版.ps1
```

脚本会自动：
1. 生成 SSH 密钥（如果还没有）
2. 将公钥复制到服务器
3. 测试连接

## 方法二：手动配置

### 步骤 1: 生成 SSH 密钥

在 Cursor 终端中运行：

```powershell
ssh-keygen -t rsa -b 4096 -f $env:USERPROFILE\.ssh\id_rsa -N '""'
```

按回车使用默认设置（直接回车，不需要输入密码）。

### 步骤 2: 查看公钥

```powershell
Get-Content $env:USERPROFILE\.ssh\id_rsa.pub
```

复制输出的公钥内容。

### 步骤 3: 将公钥添加到服务器

在 Cursor 终端中运行：

```powershell
ssh ubuntu@119.45.121.152
```

输入密码：`246859CFF`

然后在服务器上执行：

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo '你的公钥内容' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
exit
```

### 步骤 4: 测试连接

```powershell
ssh ubuntu@119.45.121.152
```

如果不需要输入密码就能连接，说明配置成功！

## 方法三：使用 ssh-copy-id（如果可用）

```powershell
ssh-copy-id ubuntu@119.45.121.152
```

输入密码：`246859CFF`

## 验证配置

配置成功后，测试无密码连接：

```powershell
ssh -o BatchMode=yes ubuntu@119.45.121.152 "echo 'SSH密钥配置成功！'"
```

如果成功，以后就可以直接使用：

```powershell
.\快速更新服务器.ps1
```

无需输入密码！

