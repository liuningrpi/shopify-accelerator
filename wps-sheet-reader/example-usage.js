// example-usage.js - Example of how to use the WPS API with access_token
import { getValidAccessToken } from './get-access-token.js';
import fetch from 'node-fetch';

/**
 * Example: Get user info using WPS API
 */
async function getUserInfo() {
  const token = await getValidAccessToken();

  if (!token) {
    console.error('❌ Failed to get access token');
    return;
  }

  console.log('\n📋 正在获取用户信息...');

  try {
    const response = await fetch('https://open.wps.cn/api/v1/user/info', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    console.log('\n✅ 用户信息:');
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('❌ 请求失败:', err.message);
  }
}

/**
 * Example: Read sheet data from WPS Sheets
 * @param {string} fileId - WPS file ID
 * @param {string} sheetId - Sheet ID (optional)
 * @param {string} range - Cell range (e.g., "A1:D10")
 */
async function readSheetData(fileId, sheetId, range) {
  const token = await getValidAccessToken();

  if (!token) {
    console.error('❌ Failed to get access token');
    return;
  }

  console.log(`\n📊 正在读取表格数据...`);
  console.log(`   File ID: ${fileId}`);
  console.log(`   Range: ${range}`);

  try {
    // Build API URL - adjust according to WPS API documentation
    const url = sheetId
      ? `https://open.wps.cn/api/v1/files/${fileId}/sheets/${sheetId}/values/${range}`
      : `https://open.wps.cn/api/v1/files/${fileId}/values/${range}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    console.log('\n✅ 表格数据:');
    console.log(JSON.stringify(data, null, 2));

    return data;
  } catch (err) {
    console.error('❌ 请求失败:', err.message);
    return null;
  }
}

/**
 * Example: List files
 */
async function listFiles() {
  const token = await getValidAccessToken();

  if (!token) {
    console.error('❌ Failed to get access token');
    return;
  }

  console.log('\n📁 正在获取文件列表...');

  try {
    const response = await fetch('https://open.wps.cn/api/v1/files', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    console.log('\n✅ 文件列表:');
    console.log(JSON.stringify(data, null, 2));

    return data;
  } catch (err) {
    console.error('❌ 请求失败:', err.message);
    return null;
  }
}

// Example usage
async function main() {
  console.log('🚀 WPS API 使用示例');
  console.log('=' .repeat(60));

  // Example 1: Get user info
  // await getUserInfo();

  // Example 2: List files
  // await listFiles();

  // Example 3: Read sheet data
  // Replace with your actual file ID and range
  // const fileId = 'your_file_id_here';
  // const range = 'Sheet1!A1:D10';
  // await readSheetData(fileId, null, range);

  console.log('\n💡 提示：取消注释上面的示例代码来测试不同的 API 调用');
  console.log('💡 请根据 WPS 开放平台文档调整 API endpoint');
}

main().catch(console.error);
