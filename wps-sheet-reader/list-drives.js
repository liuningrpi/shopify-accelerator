// list-drives.js - 列出 WPS 驱动盘
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

/**
 * 列出驱动盘
 */
async function listDrives(accessToken) {
  console.log('📂 正在查询驱动盘列表...\n');

  const endpoints = [
    // v7 API - 列出驱动盘
    {
      url: `${BASE_URL}/v7/drives`,
      type: 'v7-drives',
      useHeader: true,
      useQuery: false
    },
    // v7 API - 查询参数
    {
      url: `${BASE_URL}/v7/drives?access_token=${accessToken}`,
      type: 'v7-drives-query',
      useHeader: false,
      useQuery: true
    },
    // v7 API - 同时使用两种方式
    {
      url: `${BASE_URL}/v7/drives?access_token=${accessToken}`,
      type: 'v7-drives-both',
      useHeader: true,
      useQuery: true
    },
    // OAuth API
    {
      url: `${BASE_URL}/oauthapi/v2/drives`,
      type: 'oauth-v2',
      useHeader: true,
      useQuery: false
    }
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`📡 尝试: ${endpoint.type}`);
      console.log(`   URL: ${endpoint.url.substring(0, 100)}...`);

      const options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      };

      if (endpoint.useHeader) {
        options.headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const resp = await fetch(endpoint.url, options);

      console.log(`   HTTP 状态: ${resp.status}`);

      if (resp.status === 404) {
        console.log(`   ⚠️  端点不存在 (404)\n`);
        continue;
      }

      const contentType = resp.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const data = await resp.json();
        console.log(`   响应:`, JSON.stringify(data, null, 2).substring(0, 500));

        if (!resp.ok) {
          console.log(`   ❌ 失败\n`);
          continue;
        }

        // 提取驱动盘列表
        const drives = data.data?.drives || data.drives || data.data?.items || data.items || [];

        if (Array.isArray(drives) && drives.length > 0) {
          console.log(`   ✅ 成功! 找到 ${drives.length} 个驱动盘\n`);
          return { drives, method: endpoint.type };
        }

        // 检查是否是空列表但成功的响应
        if (data.code === 0 || resp.ok) {
          console.log(`   ✅ 请求成功但没有驱动盘\n`);
          return { drives: [], method: endpoint.type };
        }

        console.log(`   ℹ️  返回成功但数据格式不符\n`);
      } else {
        const text = await resp.text();
        console.log(`   响应类型: ${contentType}`);
        console.log(`   响应内容: ${text.substring(0, 200)}\n`);
      }

    } catch (err) {
      console.log(`   💥 错误: ${err.message}\n`);
    }
  }

  return null;
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 WPS 驱动盘列表查询工具');
  console.log('='.repeat(80));

  try {
    const accessToken = await getValidAccessToken();

    const result = await listDrives(accessToken);

    if (!result) {
      console.log('❌ 所有 API 端点都失败了\n');
      console.log('💡 可能的原因：');
      console.log('   1. 缺少驱动盘读取权限');
      console.log('   2. API 端点已更改');
      console.log('   3. 应用类型不支持驱动盘 API');
      console.log('\n📌 建议：');
      console.log('   - 确认已开通 kso.drive.read 或 kso.drive.readwrite 权限');
      console.log('   - 联系 WPS 技术支持获取正确的 API 文档');
      return;
    }

    if (result.drives.length === 0) {
      console.log('📋 当前没有驱动盘');
      console.log('='.repeat(80));
      console.log('\n💡 提示：');
      console.log('   - 可以使用 create-drive.js 创建驱动盘');
      console.log('   - 或者在 WPS 网页版手动创建');
    } else {
      console.log('📋 驱动盘列表：');
      console.log('='.repeat(80));

      result.drives.forEach((drive, idx) => {
        const name = drive.name || drive.title || '(无名称)';
        const id = drive.id || drive.drive_id || '';
        const status = drive.status || '';
        const quota = drive.quota || {};

        console.log(`\n[${idx + 1}] ${name}`);
        if (id) console.log(`    ID: ${id}`);
        if (status) console.log(`    状态: ${status}`);
        if (drive.allotee_type) console.log(`    分配类型: ${drive.allotee_type}`);
        if (drive.allotee_id) console.log(`    分配对象: ${drive.allotee_id}`);

        if (quota.total) {
          console.log(`    配额:`);
          console.log(`       总容量: ${(quota.total / 1024 / 1024 / 1024).toFixed(2)} GB`);
          console.log(`       已使用: ${(quota.used / 1024 / 1024).toFixed(2)} MB`);
          console.log(`       剩余: ${(quota.remaining / 1024 / 1024 / 1024).toFixed(2)} GB`);
        }
        console.log('---');
      });

      console.log(`\n✨ 共找到 ${result.drives.length} 个驱动盘`);

      // 保存第一个驱动盘 ID 到环境变量建议
      if (result.drives.length > 0 && result.drives[0].id) {
        console.log(`\n💡 提示: 可以将第一个驱动盘 ID 添加到 .env:`);
        console.log(`   WPS_DRIVE_ID=${result.drives[0].id}`);
      }
    }

  } catch (err) {
    console.error('\n💥 发生错误:', err.message);
    console.error(err.stack);
  }
}

// 运行
main();
