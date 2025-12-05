// list-all-files.js - 列出所有可访问的 WPS 文件
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
 * 尝试列出所有文件
 */
async function listAllFiles(accessToken) {
  console.log('📁 尝试列出所有可访问的文件...\n');

  const endpoints = [
    // v7 API - 文件列表
    {
      url: `${BASE_URL}/v7/files`,
      method: 'GET',
      type: 'v7-files'
    },
    // OAuth API v2 - 文件列表
    {
      url: `${BASE_URL}/oauthapi/v2/files`,
      method: 'GET',
      type: 'oauth-v2-files'
    },
    // 个人文件
    {
      url: `${BASE_URL}/v7/drives/personal/files`,
      method: 'GET',
      type: 'v7-personal'
    },
    // 最近文件
    {
      url: `${BASE_URL}/v7/files/recent`,
      method: 'GET',
      type: 'v7-recent'
    },
    // 根目录文件
    {
      url: `${BASE_URL}/v7/files/root/children`,
      method: 'GET',
      type: 'v7-root-children'
    }
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`🔍 尝试: ${endpoint.type}`);
      console.log(`   URL: ${endpoint.url}`);

      const resp = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      });

      console.log(`   HTTP 状态: ${resp.status}`);

      if (resp.status === 404) {
        console.log(`   ⚠️  端点不存在 (404)\n`);
        continue;
      }

      if (resp.status === 403) {
        const errorText = await resp.text();
        console.log(`   ⚠️  权限不足 (403)`);
        if (errorText.includes('scope')) {
          console.log(`   提示: 缺少权限范围 - 需要在 WPS 平台配置文件读取权限`);
        }
        console.log(`   错误: ${errorText.substring(0, 200)}\n`);
        continue;
      }

      if (!resp.ok) {
        const errorText = await resp.text();
        console.log(`   ❌ 失败: ${errorText.substring(0, 200)}\n`);
        continue;
      }

      const data = await resp.json();

      // 显示完整响应结构
      console.log(`   📦 响应结构:`, Object.keys(data));
      console.log(`   完整响应:`, JSON.stringify(data, null, 2).substring(0, 1000));

      // 尝试提取文件列表
      const files = data.data?.files || data.files || data.data?.items || data.items || data.data || [];

      if (Array.isArray(files) && files.length > 0) {
        console.log(`   ✅ 成功! 找到 ${files.length} 个文件\n`);

        console.log(`📋 文件列表（${endpoint.type}）：`);
        console.log('='.repeat(80));

        files.forEach((file, idx) => {
          const name = file.name || file.title || file.file_name || '(无名称)';
          const id = file.file_id || file.fileId || file.id || '';
          const token = file.file_token || file.token || '';
          const type = file.type || file.file_type || '';
          const path = file.path || '';

          console.log(`[${idx + 1}] ${name}`);
          if (id) console.log(`    file_id: ${id}`);
          if (token) console.log(`    file_token: ${token}`);
          if (type) console.log(`    type: ${type}`);
          if (path) console.log(`    path: ${path}`);
          console.log('---');
        });

        return { files, method: endpoint.type };
      } else {
        console.log(`   ℹ️  返回了数据，但没有找到文件列表\n`);
      }

    } catch (err) {
      console.log(`   💥 错误: ${err.message}\n`);
    }
  }

  return { files: [], method: null };
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 WPS 文件列表查询工具');
  console.log('='.repeat(80));

  try {
    const accessToken = await getValidAccessToken();

    const { files, method } = await listAllFiles(accessToken);

    if (files.length === 0) {
      console.log('\n⚠️  没有找到任何文件');
      console.log('\n💡 可能的原因：');
      console.log('   1. access_token 缺少文件列表权限（需要 file.read 或 kso.files.read）');
      console.log('   2. API 端点需要特定的参数（如 drive_id）');
      console.log('   3. 这些 API 不适用于企业自建应用');
      console.log('\n📌 解决方案：');
      console.log('   方案 1: 在 WPS 开放平台配置文件读取权限');
      console.log('   方案 2: 直接使用 file_token (ckpWUSasCaw7) 访问文件');
      console.log('\n   推荐使用方案 2，因为你已经有 file_token');
    } else {
      console.log(`\n✅ 总共找到 ${files.length} 个文件`);

      // 搜索 testSheet
      const matches = files.filter(f => {
        const name = f.name || f.title || f.file_name || '';
        return name.toLowerCase().includes('testsheet') ||
               name.toLowerCase().includes('test') ||
               name.includes('测试');
      });

      if (matches.length > 0) {
        console.log(`\n🎯 找到 ${matches.length} 个可能匹配 "testSheet" 的文件：`);
        matches.forEach((file, idx) => {
          console.log(`\n[${idx + 1}] ${file.name || file.title}`);
          console.log(`    file_id: ${file.file_id || file.id || ''}`);
          console.log(`    file_token: ${file.file_token || file.token || ''}`);
        });
      } else {
        console.log('\n⚠️  没有找到名称包含 "testSheet" 的文件');
        console.log('   请检查文件名是否正确，或者直接使用 file_token');
      }
    }

  } catch (err) {
    console.error('\n💥 发生错误：', err.message);
    console.error(err.stack);
  }
}

// 运行
main();
