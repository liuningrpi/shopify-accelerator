# ✅ 找到问题根源：缺少 API 权限范围（Scope）

## 🎯 问题确认

通过测试 WPS API，我们发现了真正的问题：

```
HTTP 403 Forbidden
{
  "code": 400000003,
  "message": "kso: PermissionDenied access_token verify err: invalid_scope",
  "desc": "The requested scope is invalid, unknown, or malformed.
           The request scopes 'kso.sheets.readwrite' or ..."
}
```

**结论**: 你的 access_token 缺少 `kso.sheets.readwrite` 权限范围。

## 🔧 解决方案：配置应用权限

### 步骤 1: 登录 WPS 开放平台

访问: https://open.wps.cn/

使用创建应用时的账号登录。

### 步骤 2: 找到你的应用

在控制台中找到应用:
- **APP_ID**: `AK20251125ABNKZF`
- **名称**: (你创建时的应用名称)

### 步骤 3: 配置 API 权限 ⭐ 关键步骤

在应用设置中，找到 **"API 权限"** 或 **"权限配置"** 部分。

需要申请/开启以下权限：

#### 必需权限：
- ✅ `kso.sheets.readwrite` - 读写在线表格
- ✅ `kso.sheets.read` - 只读在线表格（如果不需要写入，这个就够了）

#### 可选权限（如果需要文件管理）：
- `file.read` - 读取文件列表
- `file.readwrite` - 读写文件

### 步骤 4: 提交审核（如果需要）

某些权限可能需要提交审核：
1. 填写权限使用说明
2. 提交审核申请
3. 等待审核通过（通常 1-3 个工作日）

### 步骤 5: 重新获取 access_token

权限配置生效后，你需要重新获取 access_token：

```bash
# 删除旧的 token 缓存
rm wps-sheet-reader/wps-token.json

# 重新获取 token（会自动包含新的权限范围）
node wps-sheet-reader/get-access-token.js
```

### 步骤 6: 再次测试读取表格

```bash
node wps-sheet-reader/read-sheet-api.js
```

## 📋 完整流程图

```
1. 登录 WPS 开放平台
   https://open.wps.cn/

2. 进入应用管理
   找到 APP: AK20251125ABNKZF

3. 配置 API 权限
   勾选: kso.sheets.read
   勾选: kso.sheets.readwrite

4. 保存 / 提交审核
   等待审核通过

5. 删除旧 token
   rm wps-sheet-reader/wps-token.json

6. 获取新 token
   node wps-sheet-reader/get-access-token.js

7. 测试读取表格
   node wps-sheet-reader/read-sheet-api.js

8. ✅ 成功获取 CSV！
```

## 🔍 如何验证权限已配置

重新获取 token 后，可以解码 JWT token 查看其中包含的 scope：

### 方法 1: 在线解码（不推荐生产环境）
访问: https://jwt.io/
粘贴你的 access_token，查看 payload 中的 `scope` 字段

### 方法 2: 通过代码查看

```javascript
// 创建文件: check-token-scope.js
import { getValidAccessToken } from './get-access-token.js';

const token = await getValidAccessToken();

// JWT token 格式: header.payload.signature
const parts = token.split('.');
if (parts.length === 3) {
  const payload = JSON.parse(
    Buffer.from(parts[1], 'base64url').toString('utf8')
  );

  console.log('Token Payload:');
  console.log('  Scopes:', payload.scope || payload.scp);
  console.log('  Expires:', new Date(payload.exp * 1000));
}
```

应该看到类似：
```
Scopes: kso.sheets.read kso.sheets.readwrite file.read
```

## ❓ 常见问题

### Q1: 找不到"API 权限"配置在哪里？

**A**: 不同版本的控制台位置可能不同，常见位置：
- 应用详情 → 权限管理
- 应用详情 → API 权限
- 应用详情 → 高级设置 → 权限配置

如果找不到，联系 WPS 技术支持: open@wps.cn

### Q2: 权限申请需要多久审核？

**A**:
- 基础权限（如 sheets.read）: 通常自动通过或 1 个工作日
- 敏感权限（如 file.delete）: 可能需要 2-3 个工作日

### Q3: 我是"企业自建应用"，还需要审核吗？

**A**:
- 企业自建应用通常权限较宽松
- 但首次申请 API 权限仍可能需要审核
- 具体以平台提示为准

### Q4: 配置权限后，旧的 token 会自动获得新权限吗？

**A**:
❌ **不会**。必须删除旧 token 缓存，重新获取新 token。

```bash
rm wps-sheet-reader/wps-token.json
node wps-sheet-reader/get-access-token.js
```

## 📞 技术支持

如果配置权限遇到问题：

**WPS 开放平台技术支持**:
- 📧 邮箱: open@wps.cn
- 📚 文档: https://open.wps.cn/docs/
- 💬 开发者社区: https://developers.weixin.qq.com/community/business/home?listType=2&communityType=18

**提问时提供**:
- APP_ID: AK20251125ABNKZF
- 问题描述: "申请 kso.sheets.read 权限用于读取在线表格"
- 使用场景: "企业内部自动化处理表格数据"

## 🎉 配置完成后

一旦权限配置完成并获取新 token，你就可以：

1. ✅ 通过 API 读取在线表格内容
2. ✅ 获取工作表列表
3. ✅ 读取单元格数据
4. ✅ 自动导出为 CSV
5. ✅ 完全自动化流程

不再需要手动下载！🎊
