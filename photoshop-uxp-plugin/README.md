# AIGC Photoshop 自动化插件

## 📋 功能说明

这个插件用于实现 Photoshop 自动化功能，包括：

1. **创建新文档** - 根据指定参数创建新的 Photoshop 文档
2. **导入图片到最上层图层** - 从本地路径导入图片到当前文档的最上层图层
3. **一键创建并导入** - 同时执行创建文档和导入图片操作

## 🎯 实现方案

本插件使用 **ExtendScript (.jsx)** 方案实现自动化，这是 Adobe 官方支持的脚本语言，稳定可靠。

**优点：**
- ✅ 稳定可靠，Adobe 官方支持
- ✅ 可以直接通过命令行执行
- ✅ 支持所有 Photoshop 版本
- ✅ 无需额外插件安装

## 🚀 使用方法

### 方式1：通过后端 API 调用（推荐）

后端会自动调用 ExtendScript 脚本，无需手动操作。

### 方式2：手动执行脚本

如果需要手动测试脚本，可以在 Photoshop 中：

1. **方法1：通过菜单**
   - 文件 → 脚本 → 浏览
   - 选择 `photoshop-uxp-plugin/automation.jsx`

2. **方法2：通过命令行**
   ```bash
   "C:\Program Files\Adobe\Adobe Photoshop 2025\Photoshop.exe" -script "path\to\automation.jsx"
   ```

### 配置文件

脚本会从系统临时文件夹读取配置文件：
- Windows: `%TEMP%\ps_automation_config.json`
- 配置文件由后端服务自动生成

## 📡 配置文件格式

脚本读取的配置文件格式（JSON）：

```json
{
  "action": "createAndImport",
  "params": {
    "projectName": "新项目",
    "width": 1920,
    "height": 1080,
    "resolution": 72,
    "imageUrl": "C:\\path\\to\\image.jpg"
  }
}
```

### 支持的操作

#### 1. 创建文档

```json
{
  "action": "createDocument",
  "params": {
    "projectName": "新项目",
    "width": 1920,
    "height": 1080,
    "resolution": 72
  }
}
```

#### 2. 导入图片

```json
{
  "action": "importImage",
  "params": {
    "imageUrl": "C:\\path\\to\\image.jpg"
  }
}
```

#### 3. 创建并导入（一键操作）

```json
{
  "action": "createAndImport",
  "params": {
    "projectName": "新项目",
    "width": 1920,
    "height": 1080,
    "resolution": 72,
    "imageUrl": "C:\\path\\to\\image.jpg"
  }
}
```

**注意：** `imageUrl` 必须是本地文件路径，不能是 HTTP URL。后端服务会自动下载 HTTP URL 的图片到本地。

## ⚠️ 注意事项

1. **图片路径**：ExtendScript 不支持直接打开 HTTP URL，必须使用本地文件路径
2. **文档要求**：导入图片前必须有一个打开的文档（或使用 `createAndImport` 操作）
3. **文件格式**：支持常见的图片格式（JPG、PNG、GIF 等）
4. **路径格式**：Windows 路径使用反斜杠 `\`，需要转义或使用双反斜杠 `\\`

## 🐛 故障排查

### 脚本无法执行

- 检查 Photoshop 是否已安装
- 检查 `automation.jsx` 文件路径是否正确
- 查看 Photoshop 的错误提示

### 图片导入失败

- 检查图片文件是否存在
- 确保图片路径格式正确（Windows 使用 `\` 或 `\\`）
- 确保有打开的文档（或使用 `createAndImport` 操作）
- 检查图片文件是否损坏

### 配置文件读取失败

- 检查临时文件夹权限
- 检查配置文件格式是否正确（JSON）
- 查看 Photoshop 的错误提示

## 📚 相关文档

- [Adobe UXP 官方文档](https://developer.adobe.com/photoshop/uxp/)
- [Photoshop UXP API 参考](https://developer.adobe.com/photoshop/uxp/2022/ps_reference/)
- [UXP 示例代码](https://github.com/AdobeDocs/uxp-photoshop-plugin-samples)

