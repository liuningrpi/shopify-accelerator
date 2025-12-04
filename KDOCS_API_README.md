# 金山文档 API 使用指南

## 📋 目录
- [前置准备](#前置准备)
- [OAuth 授权流程](#oauth-授权流程)
- [API 功能](#api-功能)
- [权限配置](#权限配置)
- [常见问题](#常见问题)

---

## 前置准备

### 1. 环境配置

确保 `.env` 文件中已配置：

```bash
KDOCS_APP_ID=你的APP_ID
KDOCS_APP_SECRET=你的APP_SECRET
```

### 2. 安装依赖

```bash
npm install express open
```

### 3. 金山文档开放平台配置

访问：https://developer.kdocs.cn/

#### **步骤 1：创建应用**
1. 登录金山文档开放平台
2. 进入 **"应用管理"**
3. 点击 **"创建应用"**
4. 填写应用信息：
   - 应用名称
   - 应用类型：选择 **"服务端应用"**
   - 应用简介
   - 应用回调地址：`http://localhost:3000/callback`

#### **步骤 2：获取凭证**
创建成功后，你将获得：
- **APP ID** (应用ID)
- **APP Secret** (应用密钥)

将这两个值填入 `.env` 文件。

#### **步骤 3：配置权限**
在应用详情页面，配置以下权限（根据需要选择）：

**基础权限：**
- ✅ `user_basic` - 获取用户基本信息
- ✅ `user_info` - 获取用户详细信息

**文件权限：**
- ✅ `file_read` - 读取用户文件
- ✅ `file_write` - 编辑用户文件
- ✅ `file_manage` - 管理用户文件

**文档权限：**
- ✅ `document_read` - 读取在线文档内容
- ✅ `document_write` - 编辑在线文档
- ✅ `document_export` - 导出文档

**表格权限：**
- ✅ `table_read` - 读取轻维表数据
- ✅ `table_write` - 编辑轻维表数据

#### **步骤 4：配置回调地址**
在 **"授权配置"** 中添加回调地址：
```
http://localhost:3000/callback
```

如果部署到服务器，改为实际域名：
```
https://your-domain.com/callback
```

---

## OAuth 授权流程

### 第一次使用 - 获取授权

运行授权脚本：

```bash
node kdocs-oauth.js
```

**流程：**
1. 🌐 脚本会自动打开浏览器
2. 📝 登录金山文档账号
3. ✅ 点击"授权"按钮
4. 🔄 自动跳转回本地服务器
5. 💾 `access_token` 和 `refresh_token` 自动保存到 `kdocs-tokens.json`

**输出示例：**
```
🔐 金山文档 OAuth 授权流程
==================================================

🌐 本地服务器启动: http://localhost:3000
📝 回调地址: http://localhost:3000/callback

🔗 正在打开授权页面...

📩 收到授权码: abc123xyz...
⏳ 正在换取 access_token...

✅ 获取 Access Token 成功！
   access_token: XiDvqrCkvBtAAooijpoMyHQiyeXUhPjk
   expires_in: 86400 秒 (24小时)
   refresh_token: oWtTFhASVZhwKpwOaxNtoRTourVnPxCC (90天有效期)

💾 Token 已保存到: ./kdocs-tokens.json

✨ 授权流程完成！
```

### Token 管理

- **Access Token**: 24小时有效期
- **Refresh Token**: 90天有效期
- **自动刷新**: 脚本会自动检测并刷新过期的 token

---

## API 功能

### 1. 获取用户信息

```bash
node kdocs-api.js
```

或在代码中使用：

```javascript
import { getUserInfo } from './kdocs-api.js';

const user = await getUserInfo();
console.log(user);
```

### 2. 获取文件列表

```javascript
import { getFileList } from './kdocs-api.js';

// 获取根目录文件
const files = await getFileList();

// 获取指定文件夹的文件
const folderFiles = await getFileList('folder_id_here');
```

### 3. 获取文件分享链接

```javascript
import { getFileShareLink } from './kdocs-api.js';

const shareLink = await getFileShareLink('file_id_here');
console.log(shareLink.url);
```

### 4. 读取表格数据

```javascript
import { getTableData } from './kdocs-api.js';

const records = await getTableData('file_id_here');
records.forEach(record => {
  console.log(record);
});
```

### 5. 读取文档内容

```javascript
import { getDocumentContent } from './kdocs-api.js';

const content = await getDocumentContent('file_id_here');
console.log(content);
```

### 6. 导出文档为 PDF

```javascript
import { exportDocumentToPdf } from './kdocs-api.js';

await exportDocumentToPdf('file_id_here', './output.pdf');
```

### 7. 搜索文件

```javascript
import { searchFiles } from './kdocs-api.js';

const results = await searchFiles('关键词');
console.log(results);
```

---

## 权限配置位置

### 在金山文档开放平台配置权限

1. **登录开放平台**
   https://developer.kdocs.cn/

2. **进入应用管理**
   - 点击左侧菜单 **"应用管理"**
   - 选择你的应用

3. **配置权限**
   - 点击 **"权限管理"** 或 **"Scope 配置"**
   - 勾选需要的权限（见上面的权限列表）
   - 点击 **"保存"**

4. **审核状态**
   - 部分权限可能需要平台审核
   - 测试环境通常权限较宽松
   - 生产环境需要详细说明使用场景

### 权限申请说明模板

如果需要申请高级权限，可以参考以下模板：

```
应用名称：[你的应用名称]
权限名称：[例如: document_write]
使用场景：[例如: 需要为用户自动创建文档并填充数据]
数据用途：[例如: 仅用于业务数据同步，不会存储敏感信息]
安全措施：[例如: 所有数据传输使用 HTTPS，access_token 加密存储]
```

---

## 常见问题

### Q1: 授权后显示 "回调地址错误"

**解决方案：**
1. 检查开放平台中配置的回调地址是否为 `http://localhost:3000/callback`
2. 确保没有多余的斜杠或空格
3. 重启授权脚本

### Q2: Token 过期了怎么办？

**解决方案：**
- 脚本会自动使用 refresh_token 刷新
- 如果 refresh_token 也过期（90天），重新运行 `node kdocs-oauth.js`

### Q3: API 请求返回 "权限不足"

**解决方案：**
1. 检查是否在开放平台配置了对应的 scope 权限
2. 重新授权：删除 `kdocs-tokens.json`，运行 `node kdocs-oauth.js`

### Q4: 如何获取文件 ID？

**方法 1：** 通过 API 获取
```javascript
const files = await getFileList();
files.forEach(file => {
  console.log(`${file.name}: ${file.id}`);
});
```

**方法 2：** 从分享链接获取
```
https://www.kdocs.cn/l/cp5YRylYRBv6
                        ^^^^^^^^^^^^^
                        这部分是 file_token
```

### Q5: 速率限制

- **测试应用**: 10,000 次/天
- **生产应用**: 1,000,000 次/天

如果超过限制，返回错误码 `429 Too Many Requests`

---

## 完整示例脚本

创建自定义脚本 `my-kdocs-app.js`：

```javascript
import { getUserInfo, getFileList, getTableData } from './kdocs-api.js';

async function main() {
  // 1. 获取用户信息
  const user = await getUserInfo();
  console.log(`欢迎, ${user.nickname}!`);

  // 2. 获取所有文件
  const files = await getFileList();

  // 3. 找到表格文件
  const tableFile = files.find(f => f.type === 'table');

  if (tableFile) {
    // 4. 读取表格数据
    const records = await getTableData(tableFile.id);

    // 5. 处理数据
    records.forEach(record => {
      // 你的业务逻辑
      console.log(record);
    });
  }
}

main().catch(console.error);
```

运行：
```bash
node my-kdocs-app.js
```

---

## 技术支持

- 📧 邮箱: open@wps.cn
- 📚 文档: https://developer.kdocs.cn/
- 💬 社区: https://open.wps.cn/documents/app-integration-dev/guide/collaboration/technical.html

---

## 安全建议

1. ⚠️ **不要提交 `.env` 文件到 Git**
2. ⚠️ **不要提交 `kdocs-tokens.json` 到 Git**
3. ✅ **APP_SECRET 仅在服务器端使用，不要暴露到前端**
4. ✅ **定期轮换 APP_SECRET**
5. ✅ **使用 HTTPS 传输数据**

---

祝使用愉快！🎉
