# nano 编辑器使用说明

## 基本操作

### 打开文件
```bash
nano ~/.bashrc
```

### 编辑文件
- 直接输入文字即可
- 使用方向键移动光标
- 使用 `Page Up` / `Page Down` 翻页

### 保存文件
1. 按 `Ctrl + O`（字母 O）
2. 确认文件名（通常是当前文件名）
3. 按 `Enter` 确认

### 退出编辑器
- 按 `Ctrl + X`
- 如果有未保存的更改，会提示是否保存

## 常用快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + O` | 保存文件（Write Out） |
| `Ctrl + X` | 退出编辑器 |
| `Ctrl + K` | 删除当前行 |
| `Ctrl + U` | 粘贴（撤销删除） |
| `Ctrl + W` | 搜索文本 |
| `Ctrl + \` | 搜索并替换 |
| `Ctrl + G` | 显示帮助 |
| `Ctrl + C` | 显示光标位置 |

## 在 nano 中添加 PATH 配置

### 步骤 1: 打开文件
```bash
nano ~/.bashrc
```

### 步骤 2: 移动到文件末尾
- 按 `Ctrl + End` 或多次按 `Page Down`
- 或者使用方向键向下滚动

### 步骤 3: 添加配置
在文件末尾添加：

```bash
# Node.js PATH
export PATH="/usr/bin:$PATH"
```

**注意**：
- 替换 `/usr/bin` 为实际的 Node.js 目录
- 确保在文件末尾的新行添加

### 步骤 4: 保存
1. 按 `Ctrl + O`
2. 底部会显示：`File Name to Write: ~/.bashrc`
3. 直接按 `Enter` 确认

### 步骤 5: 退出
- 按 `Ctrl + X`

## 示例：完整编辑过程

```bash
# 1. 打开文件
nano ~/.bashrc

# 2. 在 nano 中：
#    - 滚动到文件末尾
#    - 添加以下内容：
#      export PATH="/usr/bin:$PATH"
#    - 按 Ctrl+O 保存
#    - 按 Enter 确认
#    - 按 Ctrl+X 退出

# 3. 重新加载配置
source ~/.bashrc

# 4. 验证
nodejs --version
```

## 底部状态栏说明

nano 底部会显示快捷键提示：
- `^O` = `Ctrl + O`（保存）
- `^X` = `Ctrl + X`（退出）
- `^W` = `Ctrl + W`（搜索）

## 常见问题

### 问题 1: 不知道如何保存

**解决方案：**
- 按 `Ctrl + O`（字母 O，不是数字 0）
- 然后按 `Enter` 确认

### 问题 2: 误删了内容

**解决方案：**
- 按 `Ctrl + X` 退出（不保存）
- 重新打开文件编辑

### 问题 3: 找不到文件末尾

**解决方案：**
- 使用 `Page Down` 多次翻页
- 或者使用 `Ctrl + End`（如果支持）

### 问题 4: 想撤销操作

**解决方案：**
- nano 没有撤销功能
- 如果不小心删除了内容，退出不保存，重新编辑

## 替代编辑器

如果 nano 不习惯，可以使用其他编辑器：

```bash
# vi/vim（需要学习基本操作）
vi ~/.bashrc
# 按 i 进入插入模式
# 编辑完成后，按 Esc，输入 :wq 保存退出

# 或者使用 echo 直接追加
echo 'export PATH="/usr/bin:$PATH"' >> ~/.bashrc
```




