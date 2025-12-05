# 🔐 认证问题说明

## ❌ 当前问题

你的凭证无法访问金山文档 API，原因是：

### 两个不同的平台

1. **WPS Office 开放平台** (openapi.wps.cn)
   - 你的 APP_ID: `AK20251125ABNKZF` ✅ 已在此注册
   - 你的 APP_SECRET: 已配置 ✅
   - OAuth Endpoint: `https://openapi.wps.cn/oauth2/token` ✅
   - **成功获取**: access_token ✅

2. **金山文档开放平台** (developer.kdocs.cn)
   - 需要: 在此平台单独注册应用 ❌
   - OAuth Endpoint: `https://developer.kdocs.cn/api/v1/oauth2/access_token`
   - API Base: `https://developer.kdocs.cn`
   - **问题**: 你的 WPS token 不能用于此平台 ❌

### 错误信息

```
code: 20007
message: AccessTokenInvalid
hint: access_token is required
```

## 🎯 解决方案

### 方案 1: 在金山文档平台注册新应用（正规流程）

1. **访问**: https://developer.kdocs.cn/
2. **创建应用**: 按照[创建应用指南](https://developer.kdocs.cn/isp/access/create_application.html)
3. **获取新的凭证**: 新的 APP_ID 和 APP_SECRET
4. **实现 OAuth 流程**:
   - 需要用户在浏览器授权（获取 code）
   - 用 code 换取 access_token
   - 示例: `GET https://developer.kdocs.cn/api/v1/oauth2/access_token?code={code}&app_id={APPID}&app_key={APPKEY}`

**缺点**: 需要用户授权流程（浏览器交互）

---

### 方案 2: 使用公开分享链接（如果可能）⭐

如果你的表格是**公开分享**的，可能可以直接读取，无需认证。

**检查你的分享设置**:
- 打开表格链接: `https://www.kdocs.cn/l/ckpWUSasCaw7`
- 检查是否可以直接访问（无需登录）
- 如果可以，尝试以下 API：

```javascript
// 不使用 access_token，直接访问公开文档
GET https://www.kdocs.cn/api/v3/office/file/ckpWUSasCaw7/download
```

---

### 方案 3: 使用 WPS 表格导出功能（临时方案）

如果以上方法都不行，可以：

1. **手动导出**:
   - 在浏览器中打开表格
   - 文件 → 导出 → CSV
   - 保存到本地

2. **使用导出的 CSV**:
   ```bash
   cp ~/Downloads/your-export.csv wps-sheet-reader/testSheet.csv
   ```

---

### 方案 4: 检查 WPS Office API 是否支持表格读取

也许 WPS Office API (openapi.wps.cn) 也有表格读取功能，让我们尝试：

**可能的端点**:
```
https://openapi.wps.cn/v1/files/{file_id}/sheets
https://openapi.wps.cn/v1/spreadsheets/{file_id}/values
```

**问题**: 需要知道 file_id（不是 file_token）

---

## 🔍 诊断步骤

### 步骤 1: 确认你的应用注册平台

**问题**: 你的 APP_ID `AK20251125ABNKZF` 是在哪个平台注册的？

- [ ] WPS Office 开放平台 (openapi.wps.cn)
- [ ] 金山文档开放平台 (developer.kdocs.cn)
- [ ] 两个都有注册

### 步骤 2: 确认文档所在平台

**问题**: 你的表格 `ckpWUSasCaw7` 存储在哪个平台？

访问链接: `https://www.kdocs.cn/l/ckpWUSasCaw7`

- 是否能直接打开（无需登录）？
- 是否显示为"金山文档"？
- 还是 "WPS 云文档"？

### 步骤 3: 检查分享权限

- [ ] 文档是否公开分享
- [ ] 是否需要密码
- [ ] 是否仅限企业内部访问

---

## 💡 推荐操作

**立即可行的方案**:

1. **测试公开访问** (5分钟)
   ```bash
   # 尝试直接访问（无认证）
   curl "https://www.kdocs.cn/api/v3/office/file/ckpWUSasCaw7/download"
   ```

2. **手动导出** (1分钟)
   - 打开表格
   - 导出为 CSV
   - 使用导出的文件

3. **注册新应用** (30分钟)
   - 在 developer.kdocs.cn 注册
   - 获取新凭证
   - 实现 OAuth 流程

---

## 📞 需要确认的信息

请告诉我：

1. ✅ 你的表格链接: https://www.kdocs.cn/l/ckpWUSasCaw7
2. ❓ 这个表格是否公开分享（任何人可访问）？
3. ❓ 你是否在 developer.kdocs.cn 也注册了应用？
4. ❓ 或者你愿意手动导出 CSV 作为临时方案？

根据你的回答，我可以提供最合适的解决方案。
