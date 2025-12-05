# WPS Sheet Reader

这个文件夹包含用于读取 WPS 在线表格数据的脚本。

## 📋 前置准备

### 1. WPS 开放平台配置

访问 WPS 开放平台: https://open.wps.cn/

1. **创建企业自建应用**（不是用户授权应用）
   - 登录 WPS 开放平台
   - 进入"应用管理"
   - 创建"企业自建应用"类型
   - 获取 APP_ID 和 APP_SECRET

2. **配置应用权限**
   - 表格读取权限
   - 文件访问权限

### 2. 环境变量配置

在项目根目录的 `.env` 文件中配置：

```bash
WPS_APP_ID=你的应用ID
WPS_APP_SECRET=你的应用密钥
WPS_TENANT_TOKEN_URL=https://open.wps.cn/api/v1/oauth2/tenant_access_token
```

## 🚀 使用方法

### 获取 Access Token

```bash
node wps-sheet-reader/get-access-token.js
```

**输出示例：**
```
🔐 WPS 企业自建应用 - 获取 tenant_access_token
============================================================
App ID: AK20251125XXXXX
Token URL: https://open.wps.cn/api/v1/oauth2/tenant_access_token
============================================================

🚀 正在请求 tenant_access_token ...
→ POST https://open.wps.cn/api/v1/oauth2/tenant_access_token

📥 原始返回： {
  "code": 0,
  "tenant_access_token": "t-xxxxxxxxxxxxxxxx",
  "expire_in": 7200
}

✅ 成功获取 tenant_access_token！
   token: t-xxxxxxxxxxxxxxxx
   过期时间（秒）: 7200

💾 Token 已保存到: ./wps-sheet-reader/wps-token.json

✨ 完成！现在可以使用此 token 调用 WPS API
```

### 在其他脚本中使用

```javascript
import { getValidTenantAccessToken } from './wps-sheet-reader/get-access-token.js';

// 获取有效的 token（会自动检查是否过期并刷新）
const token = await getValidTenantAccessToken();

// 使用 token 调用 WPS API
const response = await fetch('https://open.wps.cn/api/v1/...', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## 📝 文件说明

- `get-access-token.js` - 获取和管理 tenant_access_token
- `wps-token.json` - 存储 token 和过期时间（自动生成，已在 .gitignore 中）
- `README.md` - 使用文档

## 🔄 Token 管理

- **Token 有效期**: 通常为 2 小时（7200 秒）
- **自动刷新**: `getValidTenantAccessToken()` 会自动检测过期并获取新 token
- **本地缓存**: Token 保存在 `wps-token.json`，避免频繁请求

## ⚠️ 企业自建应用 vs 用户授权应用

**企业自建应用（当前使用）：**
- ✅ 使用 tenant_access_token
- ✅ 无需用户授权
- ✅ 适合后端服务器调用
- ✅ 访问企业内部文档

**用户授权应用（OAuth 方式）：**
- 使用 user_access_token
- 需要用户在浏览器中授权
- 适合代表用户操作
- 访问用户个人文档

根据你的场景选择合适的应用类型。

## 🔗 参考文档

- [WPS 开放平台文档](https://open.wps.cn/documents/)
- [企业自建应用认证授权](https://open.wps.cn/documents/app-integration-dev/wps365/server/certification-authorization/summary.html)
- [API 参考](https://open.wps.cn/documents/app-integration-dev/wps365/server/)

## 🐛 常见问题

### Q1: 返回错误 "app_id 或 app_secret 错误"

**解决方案：**
- 检查 .env 文件中的 WPS_APP_ID 和 WPS_APP_SECRET 是否正确
- 确认复制时没有多余空格

### Q2: 返回错误 "应用未审核通过"

**解决方案：**
- 检查应用在 WPS 开放平台的审核状态
- 企业自建应用通常无需审核，确认应用类型是否正确

### Q3: Token 过期怎么办？

**解决方案：**
- 使用 `getValidTenantAccessToken()` 会自动处理过期
- 手动删除 `wps-token.json` 并重新运行脚本

### Q4: 如何访问表格数据？

**下一步：**
- 获取 token 后，使用 WPS Sheets API
- 参考文档: https://open.wps.cn/documents/app-integration-dev/wps365/server/
