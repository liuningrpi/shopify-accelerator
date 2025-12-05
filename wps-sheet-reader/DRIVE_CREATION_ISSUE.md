# 🔴 驱动盘创建问题分析

## 📊 当前状态

### ✅ 已完成
- 权限已开通: `kso.drive.readwrite` (app + user) - **已开通**
- 脚本已创建: `create-drive.js`
- 新 token 已获取: 过期时间 ~2 小时

### ❌ 仍然失败
```
HTTP 403 Forbidden
{
  "code": 403000001,
  "message": "kso: PermissionDenied err: ErrPrivileges: interface_company_doc"
}
```

## 🔍 问题分析

### 错误信息解读

**`ErrPrivileges: interface_company_doc`**

这个错误提示关键词是 **"company_doc"**（企业文档），说明：

1. **创建驱动盘可能需要"企业文档"相关的权限**
   - 不仅仅是 `kso.drive.readwrite`
   - 可能需要额外的企业文档接口权限

2. **应用类型可能不符合要求**
   - 可能需要"企业版"应用
   - 或者需要特定的企业认证

3. **Token 中没有包含必要的权限范围**
   - JWT payload 中没有 `scope` 字段
   - 权限可能在服务器端验证，但未正确配置

## 🎯 可能的原因

### 原因 1: 缺少额外的企业文档权限

虽然开通了 `kso.drive.readwrite`，但可能还需要：
- `kso.company_doc.readwrite` - 企业文档读写
- `kso.enterprise.manage` - 企业管理
- 或其他企业级权限

### 原因 2: 应用类型限制

创建驱动盘可能要求：
- 应用必须是"企业版"或"商业版"
- 需要企业认证
- 免费版/测试版应用无法创建驱动盘

### 原因 3: 需要特殊申请

驱动盘创建功能可能：
- 需要单独向 WPS 申请开通
- 不是所有应用都能使用
- 需要商务合作或付费

### 原因 4: API 参数不正确

可能：
- `allotee_id` 应该使用用户 ID 而不是应用 ID
- `allotee_type` 应该是 "user" 而不是 "app"
- 需要额外的参数或不同的请求格式

## 💡 建议的解决方案

### 方案 1: 联系 WPS 技术支持 ⭐⭐⭐ 强烈推荐

**发送邮件给 open@wps.cn**:

```
主题：企业自建应用创建驱动盘权限问题

您好，

应用信息：
- APP_ID: AK20251125ABNKZF
- 应用类型: 企业自建应用

问题描述：
我已在应用后台开通了以下权限：
- kso.drive.readwrite (app) - 已开通
- kso.drive.readwrite (user) - 已开通
- kso.file.readwrite - 已开通
- kso.doclib.readwrite - 已开通

但调用驱动盘创建 API 时返回错误：

API 端点: POST https://openapi.wps.cn/v7/drives/create

错误响应:
{
  "code": 403000001,
  "message": "kso: PermissionDenied err: ErrPrivileges: interface_company_doc"
}

请求体:
{
  "allotee_id": "AK20251125ABNKZF",
  "allotee_type": "app",
  "name": "TestDrive",
  "description": "测试驱动盘",
  "total_quota": 10737418240,
  "source": "api_create",
  "ext_attrs": []
}

问题：
1. 错误提示 "interface_company_doc"，这是什么权限？如何开通？
2. 是否需要申请额外的企业文档权限？
3. 我的应用类型是否支持创建驱动盘？
4. 如果不支持，如何升级应用或申请权限？

使用场景：
需要通过 API 创建驱动盘来组织和管理文件

期望：
能够成功调用驱动盘创建 API

谢谢！
```

---

### 方案 2: 检查权限列表中是否有"企业文档"相关权限

在 WPS 开放平台的权限列表中，查找：

**可能需要的额外权限**：
- ☑️ `kso.company_doc.readwrite` - 企业文档读写
- ☑️ `kso.company_doc.manage` - 企业文档管理
- ☑️ `kso.enterprise.*` - 任何企业相关权限
- ☑️ `interface.company_doc` - 企业文档接口

**如果找到**：
1. 勾选并开通
2. 重新获取 token
3. 再次测试

**如果找不到**：
说明这些权限不对普通应用开放，需要联系技术支持。

---

### 方案 3: 尝试使用用户 ID 而不是应用 ID

修改 `create-drive.js` 中的参数：

```javascript
const requestBody = {
  allotee_id: "USER_ID_HERE",    // 改为实际的用户 ID
  allotee_type: 'user',           // 改为 user
  // ... 其他参数
};
```

**问题**: 我们不知道用户 ID 是什么。

**可能的用户 ID**：
- 从 token payload 中：`aid: 1774586034`
- 或 `spi: 1774586034`
- 或 `cid: 606849857`

---

### 方案 4: 尝试列出现有驱动盘

也许你已经有驱动盘了，可以先列出来看看：

```bash
# 创建列出驱动盘的脚本
node list-drives.js
```

---

## 🔧 我可以帮你做的

### 1. 创建列出驱动盘的脚本

看看是否已经有驱动盘存在，或者这个 API 是否可用。

### 2. 创建使用用户 ID 的版本

尝试使用 token payload 中的 ID 作为 allotee_id。

### 3. 提供完整的错误报告模板

帮你准备发送给 WPS 技术支持的详细错误报告。

---

## 🎯 推荐行动

**立即执行**：

1. **发邮件给 WPS 技术支持** (open@wps.cn)
   - 使用上面的邮件模板
   - 这是最直接有效的方法

2. **检查权限列表**
   - 看是否有"企业文档"或"company_doc"相关权限
   - 如果有，开通它

3. **尝试列出驱动盘**
   - 我可以创建脚本测试读取 API 是否可用
   - 如果读取都不行，说明应用配置有问题

**等待回复**：
- WPS 技术支持通常 1-3 个工作日回复
- 他们会告诉你具体需要什么配置或权限

---

## 📝 总结

**核心问题**: 即使开通了 `kso.drive.readwrite` 权限，仍然无法创建驱动盘，因为缺少 `interface_company_doc` 相关权限。

**最可能的原因**: 创建驱动盘是企业级功能，需要额外的企业文档权限或应用升级。

**最佳解决方案**: 联系 WPS 技术支持，说明需求，让他们协助开通必要的权限或指导正确的配置方式。

**脚本状态**: ✅ 脚本本身没问题，是权限/配置问题，一旦权限正确配置，脚本应该可以正常工作。
