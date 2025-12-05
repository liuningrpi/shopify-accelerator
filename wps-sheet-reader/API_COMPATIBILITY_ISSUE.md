# API 兼容性问题总结

## 🔴 核心问题

你的文件 `ckpWUSasCaw7` 托管在**金山文档平台** (`kdocs.cn`)，但你的认证凭证注册在 **WPS Office 平台** (`openapi.wps.cn`)。

这两个平台使用**不兼容的认证系统**。

## 📊 测试结果

### 已成功 ✅
- OAuth 认证: `https://openapi.wps.cn/oauth2/token`
- 获取 access_token: 成功
- Token 有效期: 7199 秒

### 全部失败 ❌

所有下载 API 都返回错误:

| API 端点 | 状态码 | 错误信息 |
|---------|-------|---------|
| `openapi.wps.cn/oauthapi/v2/appfile/download/url` | 400 | InvalidAccessToken |
| `openapi.wps.cn/v7/files/{token}/download` | 404 | Not Found |
| `www.kdocs.cn/api/v3/office/file/{token}/download` | 403 | 用户未登录 |
| `www.kdocs.cn/api/v3/ide/file/{token}` | 404 | Not Found |
| `www.kdocs.cn/l/{token}` (直接链接) | 302 | 重定向到登录页 |

## 🎯 可行的解决方案

### 方案 1: 手动导出 CSV ⭐ **最快**

1. 在浏览器中打开: https://www.kdocs.cn/l/ckpWUSasCaw7
2. 点击 **文件** → **导出** → **CSV**
3. 保存文件到项目目录:
   ```bash
   cp ~/Downloads/testSheet.csv /Users/ningliu/Work/shopify-accelerator/wps-sheet-reader/testSheet.csv
   ```

**时间**: 1 分钟
**优点**: 立即可用
**缺点**: 需要手动操作，无法自动化

---

### 方案 2: 在金山文档平台注册新应用

如果需要自动化，你需要在金山文档平台单独注册：

1. **访问**: https://developer.kdocs.cn/
2. **创建应用**: 选择"企业自建应用"
3. **获取凭证**: 新的 APP_ID 和 APP_SECRET (专用于 kdocs.cn)
4. **配置环境变量**:
   ```bash
   KDOCS_APP_ID=<新的APP_ID>
   KDOCS_APP_SECRET=<新的APP_SECRET>
   ```
5. **实现 OAuth 流程**:
   - 用户授权 (浏览器)
   - 获取 authorization_code
   - 换取 access_token
   - 调用表格 API

**时间**: 1-2 小时
**优点**: 完整自动化，可以直接读取单元格
**缺点**: 需要用户浏览器授权，较复杂

---

### 方案 3: 使用 WPS 桌面应用 API

如果你有 WPS Office 桌面版，可能可以通过本地 API 访问文件。

**参考**: https://open.wps.cn/docs/client/wpsLoad

---

### 方案 4: 设置文件为完全公开

如果可以将文件设置为"任何人可访问（无需登录）"，那么可能可以直接下载，无需 access_token。

**步骤**:
1. 在金山文档中打开文件
2. 点击"分享" → "高级设置"
3. 选择"任何人都可以查看"（无需登录）
4. 保存设置

然后测试是否可以直接下载:
```bash
curl "https://www.kdocs.cn/l/ckpWUSasCaw7" -L -o test.xlsx
```

---

## 💡 推荐方案

### 短期 (立即使用)
👉 **方案 1**: 手动导出 CSV

### 长期 (自动化)
如果经常需要读取这个表格:
- 📌 **推荐**: 方案 2 (注册金山文档应用)
- 🔄 **备选**: 方案 4 (如果可以设置为公开)

---

## 🔍 为什么 openapi.wps.cn 的 token 不能用？

### 两个不同的平台

| 特性 | WPS Office 平台 | 金山文档平台 |
|------|---------------|------------|
| 域名 | openapi.wps.cn | developer.kdocs.cn |
| 用途 | 企业文档管理 | 在线协作文档 |
| OAuth | ✅ https://openapi.wps.cn/oauth2/token | ❌ 需要单独注册 |
| 文件下载 API | ❌ 不支持 kdocs.cn 文件 | ✅ 支持 |
| 单元格读取 API | ❌ | ✅ |
| 你的凭证 | ✅ AK20251125ABNKZF | ❌ 未注册 |

### 技术细节

```
你的 access_token 从这里获取:
  https://openapi.wps.cn/oauth2/token

但文件在这里:
  https://www.kdocs.cn/l/ckpWUSasCaw7

这两个系统不共享认证!
```

---

## 📝 下一步行动

请选择:

**A.** 手动导出 CSV (最快，1分钟)
**B.** 在 developer.kdocs.cn 注册新应用 (自动化，1-2小时)
**C.** 尝试将文件设置为完全公开 (如果允许)

告诉我你的选择，我可以帮你实现！
