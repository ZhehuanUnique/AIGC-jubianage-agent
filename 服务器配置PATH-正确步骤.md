# 服务器配置 PATH - 正确步骤

## 步骤 1: 查找 Node.js（注意空格！）

```bash
# ✅ 正确：which 和 nodejs 之间有空格
which nodejs

# 或者
which node

# 如果找不到，尝试查找
find /usr -name nodejs 2>/dev/null
find /usr -name node 2>/dev/null | grep -E 'bin/node$'
```

## 步骤 2: 编辑 ~/.bashrc

```bash
# 打开编辑器
nano ~/.bashrc
```

## 步骤 3: 在 nano 中添加配置

1. **滚动到文件末尾**（使用方向键或 Page Down）
2. **添加以下内容**（假设 Node.js 在 `/usr/bin`）：

```bash
# Node.js PATH (添加于 2026-01-XX)
export PATH="/usr/bin:$PATH"
```

**或者更安全的方式**（避免重复添加）：

```bash
# Node.js PATH
if [[ ":$PATH:" != *":/usr/bin:"* ]]; then
    export PATH="/usr/bin:$PATH"
fi
```

## 步骤 4: 保存并退出 nano

1. **保存**：按 `Ctrl + O`（字母 O，不是数字 0）
2. **确认文件名**：直接按 `Enter`（文件名已经是 ~/.bashrc）
3. **退出**：按 `Ctrl + X`

## 步骤 5: 重新加载配置

```bash
# 重新加载 ~/.bashrc
source ~/.bashrc

# 或者
. ~/.bashrc
```

## 步骤 6: 验证配置

```bash
# 检查 nodejs 命令
which nodejs
nodejs --version

# 检查 PATH
echo $PATH | grep -o '[^:]*node[^:]*'
```

## 完整命令序列

```bash
# 1. 查找 Node.js
which nodejs || which node

# 2. 假设找到的是 /usr/bin/nodejs，获取目录
# 如果输出是 /usr/bin/nodejs，那么目录是 /usr/bin

# 3. 编辑 ~/.bashrc
nano ~/.bashrc

# 4. 在文件末尾添加（替换 /usr/bin 为实际目录）：
# export PATH="/usr/bin:$PATH"

# 5. 保存并退出 nano：
#   Ctrl+O (保存)
#   Enter (确认)
#   Ctrl+X (退出)

# 6. 重新加载
source ~/.bashrc

# 7. 验证
nodejs --version
```

## nano 编辑器快捷键

- `Ctrl + O`：保存文件（Write Out）
- `Ctrl + X`：退出编辑器
- `Ctrl + K`：删除当前行
- `Ctrl + U`：粘贴
- `Ctrl + W`：搜索
- `Ctrl + \`：搜索并替换

## 如果找不到 nodejs

如果 `which nodejs` 没有输出，尝试：

```bash
# 检查是否安装了 nodejs
dpkg -l | grep nodejs

# 检查常见位置
ls -la /usr/bin/nodejs
ls -la /usr/local/bin/node

# 从 PM2 获取路径
pm2 info aigc-agent | grep "exec path"
```

## 如果编辑出错

如果编辑 `.bashrc` 时出错，可以：

```bash
# 备份当前配置
cp ~/.bashrc ~/.bashrc.backup

# 恢复备份
cp ~/.bashrc.backup ~/.bashrc
```




