// search-files-query-param.js - 使用查询参数方式传递 access_token 搜索文件
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getValidAccessToken } from './get-access-token.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const FILE_NAME = process.env.WPS_FILE_NAME || 'testKR';
const BASE_URL = 'https://openapi.wps.cn';

/**
 * 尝试多种方式搜索/列出文件
 */
async function searchFiles(fileName, accessToken) {
  console.log(`🔍 搜索文件: "${fileName}"\n`);

  const endpoints = [
    // 方法 1: OAuth API - access_token 在 query
    {
      url: `${BASE_URL}/oauthapi/v2/files?access_token=${accessToken}`,
      method: 'GET',
      type: 'oauth-v2-query',
      useHeader: false
    },
    // 方法 2: OAuth API - 带文件名搜索
    {
      url: `${BASE_URL}/oauthapi/v2/files?access_token=${accessToken}&name=${encodeURIComponent(fileName)}`,
      method: 'GET',
      type: 'oauth-v2-query-name',
      useHeader: false
    },
    // 方法 3: v7 API - access_token 在 query
    {
      url: `${BASE_URL}/v7/files?access_token=${accessToken}`,
      method: 'GET',
      type: 'v7-query',
      useHeader: false
    },
    // 方法 4: v7 搜索 - access_token 在 query
    {
      url: `${BASE_URL}/v7/files/search?access_token=${accessToken}&keyword=${encodeURIComponent(fileName)}`,
      method: 'GET',
      type: 'v7-search-query',
      useHeader: false
    },
    // 方法 5: 驱动器列表
    {
      url: `${BASE_URL}/v7/drives?access_token=${accessToken}`,
      method: 'GET',
      type: 'v7-drives',
      useHeader: false
    },
    // 方法 6: 个人空间文件
    {
      url: `${BASE_URL}/v7/spaces/personal/files?access_token=${accessToken}`,
      method: 'GET',
      type: 'v7-personal-space',
      useHeader: false
    },
    // 方法 7: KSO 文件列表
    {
      url: `${BASE_URL}/kso/v1/files?access_token=${accessToken}`,
      method: 'GET',
      type: 'kso-v1-files',
      useHeader: false
    }
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`📡 尝试: ${endpoint.type}`);
      console.log(`   URL: ${endpoint.url.substring(0, 100)}...`);

      const options = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
        }
      };

      // 如果需要同时使用 Header
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

        // 尝试提取文件列表
        const files = data.data?.files || data.files || data.data?.items || data.items ||
                     data.data?.list || data.list || [];

        if (Array.isArray(files) && files.length > 0) {
          console.log(`   ✅ 成功! 找到 ${files.length} 个文件\n`);
          return { files, method: endpoint.type };
        }

        // 如果返回的是驱动器列表
        const drives = data.data?.drives || data.drives || [];
        if (Array.isArray(drives) && drives.length > 0) {
          console.log(`   ✅ 找到 ${drives.length} 个驱动器\n`);
          return { drives, method: endpoint.type };
        }

        console.log(`   ℹ️  返回成功但没有文件列表\n`);
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
  console.log('🚀 WPS 文件搜索工具（查询参数方式）');
  console.log('='.repeat(80));
  console.log(`搜索文件名: ${FILE_NAME}`);
  console.log('='.repeat(80));

  try {
    const accessToken = await getValidAccessToken();

    const result = await searchFiles(FILE_NAME, accessToken);

    if (!result) {
      console.log('❌ 所有搜索方法都失败了\n');
      console.log('💡 可能的原因：');
      console.log('   1. 应用权限配置不完整');
      console.log('   2. API 端点已更改或不适用于当前应用类型');
      console.log('   3. 需要特定的参数（如 drive_id）');
      console.log('\n📌 建议：');
      console.log('   - 联系 WPS 技术支持获取正确的 API 文档');
      console.log('   - 或使用 file_token 直接访问已知文件');
      return;
    }

    if (result.files) {
      console.log('📋 找到的文件：');
      console.log('='.repeat(80));

      result.files.forEach((file, idx) => {
        const name = file.name || file.title || file.file_name || '(无名称)';
        const id = file.file_id || file.fileId || file.id || '';
        const token = file.file_token || file.token || '';

        console.log(`[${idx + 1}] ${name}`);
        if (id) console.log(`    file_id: ${id}`);
        if (token) console.log(`    file_token: ${token}`);
        if (file.type) console.log(`    type: ${file.type}`);
        console.log('---');
      });

      // 搜索匹配的文件
      const matches = result.files.filter(f => {
        const name = f.name || f.title || f.file_name || '';
        return name.toLowerCase().includes(FILE_NAME.toLowerCase());
      });

      if (matches.length > 0) {
        console.log(`\n🎯 找到 ${matches.length} 个匹配 "${FILE_NAME}" 的文件！`);
      }
    } else if (result.drives) {
      console.log('📂 找到的驱动器：');
      console.log('='.repeat(80));

      result.drives.forEach((drive, idx) => {
        console.log(`[${idx + 1}] ${drive.name || drive.title || '(无名称)'}`);
        console.log(`    drive_id: ${drive.drive_id || drive.id || ''}`);
        console.log('---');
      });

      console.log('\n💡 提示：可以使用 drive_id 来列出该驱动器下的文件');
    }

  } catch (err) {
    console.error('\n💥 发生错误：', err.message);
  }
}

// 运行
main();
