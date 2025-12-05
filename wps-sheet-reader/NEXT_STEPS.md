# 🔍 当前问题和下一步操作

## ❌ 当前状态

从 `https://openapi.wps.cn/oauth2/token` 获取的 `access_token` **无法**用于 `https://developer.kdocs.cn` 的 API。

**错误信息**: `AccessTokenInvalid` (code: 20007)

## 🎯 解决方案

有两种方式来读取 WPS 表格数据：

### 方案 1: 直接使用 File Token（推荐）⭐

如果你已经有表格的链接，可以直接从链接中提取 `file_token`。

#### 从短链获取 file_token

假设你的表格链接是：
```
https://www.kdocs.cn/l/cs9lywODpUf0
```

`file_token` 就是最后一部分：`cs9lywODpUf0`

#### 配置并运行

1. **在 `.env` 文件中添加**：
   ```bash
   WPS_FILE_TOKEN=cs9lywODpUf0
   ```

2. **运行脚本**：
   ```bash
   node wps-sheet-reader/read-sheet-to-csv.js
   ```

脚本会跳过文件列表查询，直接使用这个 token 读取表格数据。

---

### 方案 2: 使用金山文档的 OAuth （复杂，需要重新配置）

如果必须使用文件列表 API，你需要：

#### 步骤 1: 确认应用类型

在金山文档开放平台（https://developer.kdocs.cn/）创建的应用必须是以下类型之一：
- ✅ 企业自建应用（有文件列表权限）
- ✅ 第三方应用（需要用户授权）

#### 步骤 2: 使用正确的 OAuth 端点

当前使用的 `https://openapi.wps.cn/oauth2/token` 可能不适用于金山文档 API。

应该使用的端点（需要查看最新文档确认）：
```
https://developer.kdocs.cn/oauth2/token
```
或
```
https://open.wps.cn/api/v1/oauth2/access_token
```

#### 步骤 3: 申请必要的权限（Scope）

确保应用已申请以下权限：
- `file_read` - 读取文件
- `personal_files` - 访问个人文件列表
- `spreadsheet_read` - 读取表格数据

---

## 📋 当前脚本功能

即使无法获取文件列表，脚本仍然可以：

1. ✅ **使用 file_token 读取表格**
   - 配置 `WPS_FILE_TOKEN` 环境变量
   - 直接读取指定表格的数据
   - 导出为 CSV 文件

2. ✅ **获取工作表列表**
   - 基于 file_token 获取所有 sheet
   - 自动选择第一个 sheet

3. ✅ **读取单元格数据**
   - 读取指定 sheet 的所有单元格
   - 转换为 CSV 格式

## 🚀 立即可用的方案

### 快速开始（使用 file_token）

**前提**: 你有表格的分享链接

1. **从链接提取 file_token**

   链接格式：`https://www.kdocs.cn/l/{file_token}`

   例如：`https://www.kdocs.cn/l/cs9lywODpUf0`

   file_token = `cs9lywODpUf0`

2. **配置 .env**
   ```bash
   WPS_FILE_TOKEN=cs9lywODpUf0
   WPS_FILE_NAME=testSheet
   ```

3. **运行脚本**
   ```bash
   node wps-sheet-reader/read-sheet-to-csv.js
   ```

4. **查看输出**
   ```
   wps-sheet-reader/testSheet.csv
   ```

## 🔑 关键信息

### 当前配置
- **OAuth Endpoint**: https://openapi.wps.cn/oauth2/token ✅
- **API Base**: https://developer.kdocs.cn ❌
- **Token Type**: Bearer Token
- **Token 有效期**: 7199 秒（约 2 小时）

### 问题根源

**不同的系统**：
- `openapi.wps.cn` - WPS Office 开放平台
- `developer.kdocs.cn` - 金山文档开放平台

这两个可能是不同的认证系统，需要：
1. 不同的应用注册
2. 不同的 APP_ID 和 APP_SECRET
3. 不同的 OAuth endpoint
4. 不同的 access_token

### 推荐做法

**暂时使用 file_token 方式**：
- ✅ 无需复杂的 OAuth 流程
- ✅ 无需文件列表权限
- ✅ 直接读取目标表格
- ✅ 简单、快速、可靠

**长期方案**：
1. 联系 WPS/金山文档技术支持
2. 确认正确的 OAuth endpoint 和 API base
3. 确认应用类型和权限配置
4. 可能需要在金山文档平台单独创建应用

## 📞 技术支持

如果需要更详细的帮助：

**金山文档开放平台**：
- 📧 邮箱: developer@kdocs.cn
- 📚 文档: https://developer.kdocs.cn/
- 💬 社区: https://developer.kdocs.cn/support/

**WPS 开放平台**：
- 📧 邮箱: open@wps.cn
- 📚 文档: https://open.wps.cn/documents/
- 💬 技术支持: https://open.wps.cn/documents/app-integration-dev/guide/collaboration/technical.html

---

## ✨ 总结

**当前最佳方案**：使用 `WPS_FILE_TOKEN` 直接读取表格

**步骤**：
1. 获取表格分享链接
2. 提取 file_token
3. 配置到 .env
4. 运行脚本
5. 获得 CSV 文件 ✅
