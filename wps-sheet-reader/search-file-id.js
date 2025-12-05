// search-file-id.js - 搜索 WPS 文件获取 file_id
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getValidAccessToken } from './get-access-token.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

/**
 * 从环境变量读取配置
 */
const FILE_NAME = process.env.WPS_FILE_NAME || 'testSheet';
const DRIVE_ID = process.env.WPS_DRIVE_ID || '';   // 可选：限定某个驱动盘

if (!FILE_NAME) {
  console.error('❌ 请先在 .env 中配置 WPS_FILE_NAME（要搜索的文件名）');
  process.exit(1);
}

/**
 * 根据官方文档「文件搜索」页面，确认请求地址。
 * 典型形式类似：
 *   https://openapi.wps.cn/v7/files/search
 *   或  https://openapi.wps.cn/v7/drives/{drive_id}/files/search
 */
const BASE_URL = 'https://openapi.wps.cn';

/**
 * 根据文件名搜索文件，返回匹配的列表
 */
async function searchFilesByName(fileName, accessToken, driveId = '') {
  // 尝试多个可能的搜索端点
  const endpoints = [
    {
      url: `${BASE_URL}/v7/files/search`,
      method: 'POST',
      type: 'v7-search'
    },
    {
      url: `${BASE_URL}/oauthapi/v2/files?name=${encodeURIComponent(fileName)}`,
      method: 'GET',
      type: 'oauth-list'
    },
    {
      url: `${BASE_URL}/v7/files?name=${encodeURIComponent(fileName)}`,
      method: 'GET',
      type: 'v7-list'
    }
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔍 尝试搜索端点: ${endpoint.type}`);
      console.log(`   URL: ${endpoint.url.substring(0, 80)}...`);
      console.log(`   搜索文件名: ${fileName}`);

      const options = {
        method: endpoint.method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      };

      // 如果是 POST 请求，添加 body
      if (endpoint.method === 'POST') {
        options.body = JSON.stringify({
          name: fileName,
          // 也可以尝试其他字段
          // keyword: fileName,
          // name_keyword: fileName,
        });
      }

      const resp = await fetch(endpoint.url, options);
      const data = await resp.json().catch(() => ({}));

      console.log(`   HTTP 状态: ${resp.status}`);
      console.log(`   响应:`, JSON.stringify(data, null, 2).substring(0, 500));

      if (!resp.ok) {
        console.log(`   ⚠️  失败: ${resp.status}`);
        continue;
      }

      // 尝试从不同的响应结构中提取文件列表
      let files = [];

      if (data.code === 0 || data.result === 0) {
        files = data.data?.files || data.files || [];
      } else if (Array.isArray(data.data)) {
        files = data.data;
      } else if (Array.isArray(data.files)) {
        files = data.files;
      } else if (Array.isArray(data)) {
        files = data;
      }

      if (files.length > 0) {
        console.log(`   ✅ 成功找到 ${files.length} 个文件`);
        return { files, method: endpoint.type };
      }

    } catch (err) {
      console.log(`   ⚠️  错误: ${err.message}`);
    }
  }

  return { files: [], method: null };
}

/**
 * 主函数：找到第一个匹配的文件，并打印 drive_id + file_id
 */
async function main() {
  console.log('🚀 WPS 文件 ID 搜索工具');
  console.log('='.repeat(80));
  console.log(`搜索文件名: ${FILE_NAME}`);
  if (DRIVE_ID) console.log(`指定驱动盘: ${DRIVE_ID}`);
  console.log('='.repeat(80));

  try {
    // 获取有效的 access_token
    const accessToken = await getValidAccessToken();

    // 搜索文件
    const { files, method } = await searchFilesByName(FILE_NAME, accessToken, DRIVE_ID);

    if (!files.length) {
      console.log(`\n⚠️ 未找到名称包含「${FILE_NAME}」的文件，请检查：`);
      console.log('   1. 文件名是否完全一致（注意空格 / 标点 / 大小写）');
      console.log('   2. 应用是否有权限访问该文件所在空间');
      console.log('   3. 是否需要指定 drive_id（团队盘 / 个人盘）');
      console.log('\n💡 提示: 你也可以尝试使用 file_token 直接读取表格');
      console.log('   WPS_FILE_TOKEN=ckpWUSasCaw7');
      return;
    }

    console.log(`\n✅ 找到 ${files.length} 个匹配文件（展示所有）：\n`);

    files.forEach((f, idx) => {
      console.log(`[#${idx + 1}] ${f.name || f.title || '(无名称)'}`);

      const driveId = f.drive_id || f.driveId || f.space_id || '';
      const fileId = f.file_id || f.fileId || f.id || '';
      const fileToken = f.file_token || f.token || '';

      if (driveId) console.log(`     drive_id   : ${driveId}`);
      if (fileId) console.log(`     file_id    : ${fileId}`);
      if (fileToken) console.log(`     file_token : ${fileToken}`);
      if (f.path) console.log(`     path       : ${f.path}`);
      if (f.url) console.log(`     url        : ${f.url}`);
      if (f.type) console.log(`     type       : ${f.type}`);

      console.log('---');
    });

    const first = files[0];
    const driveId = first.drive_id || first.driveId || first.space_id || '';
    const fileId = first.file_id || first.fileId || first.id || '';
    const fileToken = first.file_token || first.token || '';

    console.log('\n🎯 推荐使用的文件：');
    console.log(`   文件名    : ${first.name || first.title}`);
    if (driveId) console.log(`   drive_id  : ${driveId}`);
    if (fileId) console.log(`   file_id   : ${fileId}`);
    if (fileToken) console.log(`   file_token: ${fileToken}`);

    console.log('\n📝 将以下内容添加到 .env 文件：');
    if (driveId) console.log(`WPS_DRIVE_ID=${driveId}`);
    if (fileId) console.log(`WPS_FILE_ID=${fileId}`);
    if (fileToken) console.log(`WPS_FILE_TOKEN=${fileToken}`);

    console.log('\n✨ 下一步：使用这些 ID 读取表格内容');
    console.log('   - GET /v7/sheets/{file_id}/worksheets              # 列出工作表');
    console.log('   - GET /v7/sheets/{file_id}/worksheets/{sheet_id}/range_data  # 读单元格');

  } catch (err) {
    console.error('\n💥 发生错误：', err.message);
    console.error(err.stack);
  }
}

// 运行主函数
main();
