// create-drive.js - 创建 WPS 驱动盘
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getValidAccessToken } from './get-access-token.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const BASE_URL = 'https://openapi.wps.cn';
const APP_ID = process.env.WPS_APP_ID;

/**
 * 创建驱动盘
 */
async function createDrive(accessToken, driveName, description = '') {
  console.log('🚀 创建 WPS 驱动盘...\n');

  const url = `${BASE_URL}/v7/drives/create`;

  console.log(`📡 API 端点: ${url}`);
  console.log(`📝 驱动盘名称: ${driveName}`);
  if (description) console.log(`📝 描述: ${description}`);

  // 请求体
  const requestBody = {
    allotee_id: APP_ID,           // 分配对象ID（使用应用ID）
    allotee_type: 'app',           // 分配对象类型
    name: driveName,               // 驱动盘名称
    description: description || `通过 API 创建的驱动盘 - ${driveName}`,
    total_quota: 10737418240,      // 总配额 10GB (可选)
    source: 'api_create',          // 来源标识
    ext_attrs: []                  // 扩展属性
  };

  console.log('\n📦 请求体:');
  console.log(JSON.stringify(requestBody, null, 2));

  try {
    // 方法 1: 使用 Bearer Token
    console.log('\n📡 尝试方法 1: Bearer Token...');
    let resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log(`   HTTP 状态: ${resp.status}`);

    let data = await resp.json().catch(() => ({}));
    console.log('   响应:', JSON.stringify(data, null, 2).substring(0, 500));

    if (resp.ok && data.code === 0) {
      console.log('\n✅ 驱动盘创建成功！');
      console.log('\n📋 驱动盘信息:');
      if (data.data) {
        console.log(`   ID: ${data.data.id}`);
        console.log(`   名称: ${data.data.name}`);
        console.log(`   分配对象: ${data.data.allotee_type} (${data.data.allotee_id})`);
        console.log(`   状态: ${data.data.status}`);
        if (data.data.quota) {
          console.log(`   配额:`);
          console.log(`      总容量: ${(data.data.quota.total / 1024 / 1024 / 1024).toFixed(2)} GB`);
          console.log(`      已使用: ${(data.data.quota.used / 1024 / 1024).toFixed(2)} MB`);
          console.log(`      剩余: ${(data.data.quota.remaining / 1024 / 1024 / 1024).toFixed(2)} GB`);
        }
      }
      return data.data;
    }

    // 如果方法 1 失败，尝试方法 2: access_token 在查询参数
    if (data.code !== 0 || !resp.ok) {
      console.log('\n📡 尝试方法 2: access_token 查询参数...');

      const urlWithToken = `${url}?access_token=${accessToken}`;

      resp = await fetch(urlWithToken, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log(`   HTTP 状态: ${resp.status}`);

      data = await resp.json().catch(() => ({}));
      console.log('   响应:', JSON.stringify(data, null, 2).substring(0, 500));

      if (resp.ok && data.code === 0) {
        console.log('\n✅ 驱动盘创建成功！');
        console.log('\n📋 驱动盘信息:');
        if (data.data) {
          console.log(`   ID: ${data.data.id}`);
          console.log(`   名称: ${data.data.name}`);
        }
        return data.data;
      }
    }

    // 如果都失败了
    console.log('\n❌ 创建驱动盘失败');

    if (data.code) {
      console.log(`   错误码: ${data.code}`);
      console.log(`   错误信息: ${data.msg || data.message}`);
    }

    // 检查常见错误
    if (data.code === 400000003 || data.message?.includes('PermissionDenied')) {
      console.log('\n💡 这是权限错误，可能原因：');
      console.log('   1. 缺少 kso.drive.readwrite 权限');
      console.log('   2. 需要在 WPS 开放平台开通"驱动盘管理"权限');
    }

    if (data.code === 100013 || data.msg?.includes('InvalidAccessToken')) {
      console.log('\n💡 Token 无效，请检查：');
      console.log('   1. Token 是否过期');
      console.log('   2. 是否有正确的权限');
    }

    return null;

  } catch (err) {
    console.error('\n💥 发生错误:', err.message);
    return null;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 WPS 驱动盘创建工具');
  console.log('='.repeat(80));

  // 从命令行参数获取驱动盘名称
  const driveName = process.argv[2] || 'MyTestDrive';
  const description = process.argv[3] || '';

  console.log(`将创建驱动盘: ${driveName}`);
  if (description) console.log(`描述: ${description}`);
  console.log('='.repeat(80));

  try {
    // 获取 access_token
    const accessToken = await getValidAccessToken();

    // 创建驱动盘
    const drive = await createDrive(accessToken, driveName, description);

    if (drive) {
      console.log('\n✨ 完成！驱动盘已成功创建');
      console.log(`\n💡 提示: 驱动盘 ID 是: ${drive.id}`);
      console.log('   可以使用此 ID 来管理驱动盘中的文件');

      // 保存驱动盘 ID 到 .env
      console.log('\n📝 将驱动盘 ID 添加到 .env 文件中：');
      console.log(`   WPS_DRIVE_ID=${drive.id}`);
    } else {
      console.log('\n❌ 创建驱动盘失败');

      console.log('\n📋 需要的权限：');
      console.log('   - kso.drive.readwrite（驱动盘读写权限）');

      console.log('\n💡 解决方案：');
      console.log('   1. 登录 WPS 开放平台: https://open.wps.cn/');
      console.log('   2. 进入应用管理 → API 权限');
      console.log('   3. 开通"kso.drive.readwrite"权限');
      console.log('   4. 重新获取 token: rm wps-token.json && node get-access-token.js');
      console.log('   5. 再次运行此脚本');
    }

  } catch (err) {
    console.error('\n💥 发生错误:', err.message);
    console.error(err.stack);
  }
}

// 运行
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { createDrive };
