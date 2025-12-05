# ✅ WPS API 设置成功！

## 🎉 问题已解决

### 原始问题
1. ❌ Content-Type 不支持 `application/json`
2. ❌ 参数名称错误（使用了 `app_id` / `app_secret`）

### 解决方案
1. ✅ 改用 `application/x-www-form-urlencoded` 格式
2. ✅ 使用标准 OAuth2 参数名：`client_id` / `client_secret`
3. ✅ 添加 `grant_type=client_credentials`

## 📋 当前配置

### .env 文件
```bash
WPS_APP_ID=AK20251125ABNKZF
WPS_APP_SECRET=2cceced0e6fa5532f763c49ad080664a
WPS_TENANT_TOKEN_URL=https://openapi.wps.cn/oauth2/token
```

### API 请求格式
```
POST https://openapi.wps.cn/oauth2/token
Content-Type: application/x-www-form-urlencoded

client_id=AK20251125ABNKZF&client_secret=2cceced0e6fa5532f763c49ad080664a&grant_type=client_credentials
```

### API 响应格式（标准 OAuth2）
```json
{
  "access_token": "eyJhbGciOiJFUzI1NiIs...",
  "expires_in": 7199,
  "token_type": "bearer"
}
```

## 🚀 使用方法

### 1. 获取 Access Token

```bash
node wps-sheet-reader/get-access-token.js
```

**输出：**
```
✅ 成功获取 access_token！
   access_token: eyJhbGciOiJFUzI1NiIsImtpZCI6IjNiNTkyYWYw...
   token_type: bearer
   过期时间（秒）: 7199

💾 Token 已保存到: /Users/ningliu/Work/shopify-accelerator/wps-sheet-reader/wps-token.json
```

### 2. Token 自动管理

Token 信息保存在 `wps-token.json`：
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "expires_in": 7199,
  "expires_at": 1764901685490,
  "app_id": "AK20251125ABNKZF",
  "created_at": "2025-12-05T00:28:06.490Z"
}
```

- **有效期**: 7199 秒（约 2 小时）
- **自动刷新**: `getValidAccessToken()` 会自动检测过期并获取新 token
- **本地缓存**: 避免频繁请求

### 3. 在代码中使用

```javascript
import { getValidAccessToken } from './wps-sheet-reader/get-access-token.js';

// 获取有效 token（自动处理过期）
const token = await getValidAccessToken();

// 调用 WPS API
const response = await fetch('https://openapi.wps.cn/api/...', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## 🔑 关键技术点

### 1. OAuth2 Client Credentials Flow

WPS 使用标准的 OAuth2 客户端凭证流程：

```
POST /oauth2/token HTTP/1.1
Host: openapi.wps.cn
Content-Type: application/x-www-form-urlencoded

client_id={APP_ID}&client_secret={APP_SECRET}&grant_type=client_credentials
```

### 2. URLSearchParams（Node.js 内置）

```javascript
const params = new URLSearchParams();
params.append('client_id', APP_ID);
params.append('client_secret', APP_SECRET);
params.append('grant_type', 'client_credentials');

body: params.toString()
// 结果：client_id=xxx&client_secret=yyy&grant_type=client_credentials
```

### 3. JWT Token

返回的 `access_token` 是 JWT（JSON Web Token）格式：

```
eyJhbGciOiJFUzI1NiIs...
```

- Header: 算法和类型
- Payload: 用户信息和过期时间
- Signature: 签名验证

## 📊 Token 生命周期

```
1. 首次请求
   ↓
2. 获取 access_token（7199秒有效期）
   ↓
3. 保存到 wps-token.json
   ↓
4. 后续请求使用缓存的 token
   ↓
5. 距离过期 < 5分钟时自动刷新
   ↓
6. 重新获取新 token
```

## 🎯 下一步

现在 token 获取成功，可以：

1. **调用 WPS 表格 API** 读取在线表格数据
2. **调用 WPS 文档 API** 读取文档内容
3. **调用 WPS 文件 API** 管理文件

参考 `example-usage.js` 中的示例代码。

## 📚 参考文档

- [WPS 开放平台](https://open.wps.cn/)
- [OAuth2 RFC](https://datatracker.ietf.org/doc/html/rfc6749)
- [WPS API 文档](https://openapi.wps.cn/)

---

**状态**: ✅ 完全正常工作
**最后更新**: 2025-12-05
**Token 有效期**: ~2 小时（自动刷新）
