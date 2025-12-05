# WPS API 端点参考

由于 WPS 开放平台的 API 文档可能不完整或更新，此文件记录我们尝试过的各种 API 端点。

## 🔐 认证端点（已验证 ✅）

```
POST https://openapi.wps.cn/oauth2/token
Content-Type: application/x-www-form-urlencoded

client_id={APP_ID}&client_secret={APP_SECRET}&grant_type=client_credentials
```

**返回：**
```json
{
  "access_token": "eyJhbGci...",
  "expires_in": 7199,
  "token_type": "bearer"
}
```

## 📁 文件搜索/列表端点（待验证 🔜）

### 尝试 1: 文件搜索
```
POST https://openapi.wps.cn/v7/files/search
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "query": "文件名",
  "file_type": "spreadsheet"
}
```

### 尝试 2: 文件列表
```
GET https://openapi.wps.cn/v7/files
Authorization: Bearer {access_token}
```

### 备选端点
- `/api/v7/files/search`
- `/v1/files/search`
- `/api/v7/files`
- `/v1/files`

## 📊 工作表列表端点（待验证 🔜）

### 尝试 1: 传统格式
```
GET https://openapi.wps.cn/v7/sheets/{file_id}/worksheets
Authorization: Bearer {access_token}
```

### 备选端点
- `/api/v7/sheets/{file_id}/worksheets`
- `/v1/sheets/{file_id}/worksheets`
- `/v7/files/{file_id}/sheets`
- `/api/v7/files/{file_id}/sheets`

## 📥 读取单元格数据端点（待验证 🔜）

### 尝试 1: Range Data
```
GET https://openapi.wps.cn/v7/sheets/{file_id}/worksheets/{sheet_id}/range_data?row_from=0&row_to=100&col_from=0&col_to=20
Authorization: Bearer {access_token}
```

### 尝试 2: Values (Google Sheets 风格)
```
GET https://openapi.wps.cn/v7/sheets/{file_id}/worksheets/{sheet_id}/values
Authorization: Bearer {access_token}
```

### 尝试 3: Range with A1 Notation
```
POST https://openapi.wps.cn/v7/sheets/{file_id}/worksheets/{sheet_id}/range
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "range": "A1:Z100",
  "value_render_option": "FORMATTED_VALUE"
}
```

### 尝试 4: Cells
```
GET https://openapi.wps.cn/v7/sheets/{file_id}/worksheets/{sheet_id}/cells
Authorization: Bearer {access_token}
```

## 📝 响应格式示例

### 文件搜索响应
```json
{
  "code": 0,
  "data": {
    "files": [
      {
        "file_id": "wxyz5678",
        "drive_id": "abcd1234",
        "name": "供货商填报模板.xlsx",
        "type": "spreadsheet"
      }
    ]
  }
}
```

### 工作表列表响应
```json
{
  "code": 0,
  "data": {
    "sheets": [
      {
        "sheet_id": 1,
        "name": "Sheet1",
        "index": 0
      }
    ]
  }
}
```

### 单元格数据响应（格式 1）
```json
{
  "code": 0,
  "data": {
    "cells": [
      {
        "row_from": 0,
        "col_from": 0,
        "cell_text": "供应商名称"
      },
      {
        "row_from": 0,
        "col_from": 1,
        "cell_text": "产品名称"
      }
    ]
  }
}
```

### 单元格数据响应（格式 2 - Google Sheets 风格）
```json
{
  "code": 0,
  "data": {
    "values": [
      ["供应商名称", "产品名称", "单价"],
      ["供应商A", "产品1", "100"],
      ["供应商B", "产品2", "200"]
    ]
  }
}
```

## 🔍 如何找到正确的 API 端点

1. **查看 WPS 官方文档**
   - https://open.wps.cn/documents/
   - https://openapi.wps.cn/

2. **使用浏览器开发者工具**
   - 在 WPS 网页版打开表格
   - F12 打开开发者工具
   - 查看 Network 标签中的 API 请求

3. **联系 WPS 技术支持**
   - 邮箱: open@wps.cn
   - 提供你的 APP_ID 和使用场景

## ⚠️ 注意事项

- API 版本可能从 `v1` 到 `v7` 都存在
- 基础 URL 可能是：
  - `https://openapi.wps.cn`
  - `https://open.wps.cn/api`
  - `https://api.wps.cn`
- 某些端点可能需要特定的权限（Scope）
- 响应格式可能有差异，需要兼容处理

## 📚 参考文档

- [WPS 开放平台](https://open.wps.cn/)
- [WPS API 文档](https://openapi.wps.cn/)
- [金山文档开放平台](https://developer.kdocs.cn/)
