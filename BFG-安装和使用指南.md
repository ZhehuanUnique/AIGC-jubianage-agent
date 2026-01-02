# BFG Repo-Cleaner 安装和使用指南

## 📦 什么是 BFG Repo-Cleaner？

BFG Repo-Cleaner 是一个快速、简单的 Git 仓库清理工具，比 `git filter-branch` 快 10-50 倍，专门用于从 Git 历史中删除大文件。

## 🔧 安装方法

### 方法一：使用 Chocolatey（推荐，最简单）

如果你已经安装了 Chocolatey：

```powershell
choco install bfg
```

### 方法二：使用 Scoop

如果你已经安装了 Scoop：

```powershell
scoop install bfg
```

### 方法三：手动下载 JAR 文件（推荐，无需安装包管理器）

1. **下载 BFG JAR 文件**
   - 访问：https://rtyley.github.io/bfg-repo-cleaner/
   - 或者直接下载：https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar
   - 将下载的 `bfg-1.14.0.jar` 保存到方便的位置，例如：`C:\Tools\bfg.jar`

2. **创建批处理脚本（可选，方便使用）**
   
   创建文件 `bfg.bat`，内容如下：
   ```batch
   @echo off
   java -jar C:\Tools\bfg.jar %*
   ```
   
   将 `bfg.bat` 放到系统 PATH 路径中（例如 `C:\Windows\System32`），或者放到项目目录中。

3. **验证安装**
   ```powershell
   java -jar C:\Tools\bfg.jar --version
   ```

### 方法四：使用 Java 包管理器（如果已安装）

```powershell
# 使用 jbang（如果已安装）
jbang install bfg@rtyley/bfg-repo-cleaner
```

## ✅ 检查 Java 是否已安装

BFG 需要 Java 运行环境。检查是否已安装：

```powershell
java -version
```

如果没有安装 Java，可以：
- 下载安装：https://www.oracle.com/java/technologies/downloads/
- 或使用 OpenJDK：https://adoptium.net/

## 🚀 使用方法

### 基本使用步骤

1. **克隆一个裸仓库（bare repository）**
   ```powershell
   cd C:\Users\Administrator\Desktop
   git clone --mirror https://github.com/ZhehuanUnique/AIGC-jubianage-agent.git AIGC-jubianage-agent-clean.git
   ```

2. **使用 BFG 删除大文件**
   
   **删除特定目录：**
   ```powershell
   java -jar C:\Tools\bfg.jar --delete-folders "USB Files" AIGC-jubianage-agent-clean.git
   java -jar C:\Tools\bfg.jar --delete-folders "Chiefavefan" AIGC-jubianage-agent-clean.git
   java -jar C:\Tools\bfg.jar --delete-folders "milvus/volumes" AIGC-jubianage-agent-clean.git
   ```
   
   **删除特定文件类型：**
   ```powershell
   java -jar C:\Tools\bfg.jar --delete-files "*.safetensors" AIGC-jubianage-agent-clean.git
   java -jar C:\Tools\bfg.jar --delete-files "*.mp4" AIGC-jubianage-agent-clean.git
   java -jar C:\Tools\bfg.jar --delete-files "*.zip" AIGC-jubianage-agent-clean.git
   ```
   
   **删除 Models 目录下的 .safetensors 文件：**
   ```powershell
   java -jar C:\Tools\bfg.jar --delete-folders "Models" AIGC-jubianage-agent-clean.git
   # 或者只删除 .safetensors 文件
   java -jar C:\Tools\bfg.jar --delete-files "*.safetensors" AIGC-jubianage-agent-clean.git
   ```

3. **清理和垃圾回收**
   ```powershell
   cd AIGC-jubianage-agent-clean.git
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```

4. **推送到远程仓库**
   ```powershell
   git push --force
   ```

### 针对你的项目的完整命令

```powershell
# 1. 克隆裸仓库
cd C:\Users\Administrator\Desktop
git clone --mirror https://github.com/ZhehuanUnique/AIGC-jubianage-agent.git AIGC-jubianage-agent-clean.git

# 2. 使用 BFG 删除大文件和目录
java -jar C:\Tools\bfg.jar --delete-folders "USB Files" AIGC-jubianage-agent-clean.git
java -jar C:\Tools\bfg.jar --delete-folders "Chiefavefan" AIGC-jubianage-agent-clean.git
java -jar C:\Tools\bfg.jar --delete-folders "milvus/volumes" AIGC-jubianage-agent-clean.git
java -jar C:\Tools\bfg.jar --delete-files "*.safetensors" AIGC-jubianage-agent-clean.git

# 3. 清理
cd AIGC-jubianage-agent-clean.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 4. 推送
git push --force
```

## 📝 常用命令选项

- `--delete-folders <文件夹名>` - 删除整个文件夹
- `--delete-files <文件名模式>` - 删除匹配的文件（支持通配符）
- `--strip-blobs-bigger-than <大小>` - 删除大于指定大小的文件（例如：`--strip-blobs-bigger-than 100M`）
- `--protect-blobs-from <分支名>` - 保护指定分支不被清理

## ⚠️ 注意事项

1. **备份！备份！备份！** 重要的事情说三遍。清理前一定要创建备份。
2. BFG 只能处理裸仓库（bare repository），所以需要先 `git clone --mirror`。
3. 清理后需要强制推送：`git push --force`。
4. 如果仓库很大，清理过程可能需要一些时间，但比 `git filter-branch` 快得多。

## 🔗 相关链接

- BFG 官网：https://rtyley.github.io/bfg-repo-cleaner/
- GitHub：https://github.com/rtyley/bfg-repo-cleaner
- 下载页面：https://repo1.maven.org/maven2/com/madgag/bfg/


