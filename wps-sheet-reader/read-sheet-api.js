// read-sheet-api.js - 直接通过 WPS API 读取在线表格内容
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getValidAccessToken } from './get-access-token.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

/**
 * 从环境变量读取配置
 */
const FILE_TOKEN = process.env.WPS_FILE_TOKEN || '';
const FILE_ID = process.env.WPS_FILE_ID || '';
const FILE_NAME = process.env.WPS_FILE_NAME || 'testSheet';
const OUTPUT_CSV = path.join(__dirname, `${FILE_NAME}.csv`);

if (!FILE_TOKEN && !FILE_ID) {
  console.error('❌ 请在 .env 中配置 WPS_FILE_TOKEN 或 WPS_FILE_ID');
  process.exit(1);
}

const BASE_URL = 'https://openapi.wps.cn';

/**
 * 获取工作表列表
 */
async function getWorksheets(fileIdentifier, accessToken, useToken = true) {
  console.log('\n📋 获取工作表列表...');

  const endpoints = [
    // 使用 file_token
    {
      url: `${BASE_URL}/v7/sheets/files/${fileIdentifier}/worksheets`,
      type: 'v7-token'
    },
    // 使用 file_id
    {
      url: `${BASE_URL}/v7/sheets/${fileIdentifier}/worksheets`,
      type: 'v7-id'
    },
    // OAuth API
    {
      url: `${BASE_URL}/oauthapi/v2/sheets/${fileIdentifier}/worksheets`,
      type: 'oauth'
    }
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`   尝试: ${endpoint.type}`);
      console.log(`   URL: ${endpoint.url.substring(0, 80)}...`);

      const resp = await fetch(endpoint.url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      });

      console.log(`   HTTP 状态: ${resp.status}`);

      if (!resp.ok) {
        const errorText = await resp.text();
        console.log(`   错误: ${errorText.substring(0, 200)}`);
        continue;
      }

      const data = await resp.json();
      console.log(`   响应:`, JSON.stringify(data, null, 2).substring(0, 500));

      // 提取工作表列表
      const sheets = data.data?.worksheets || data.worksheets || data.data || [];

      if (Array.isArray(sheets) && sheets.length > 0) {
        console.log(`   ✅ 成功获取 ${sheets.length} 个工作表`);
        return { sheets, method: endpoint.type };
      }

    } catch (err) {
      console.log(`   ⚠️  错误: ${err.message}`);
    }
  }

  return { sheets: [], method: null };
}

/**
 * 读取工作表的单元格数据
 */
async function getSheetData(fileIdentifier, sheetId, accessToken, method) {
  console.log(`\n📊 读取工作表数据...`);
  console.log(`   工作表 ID: ${sheetId}`);

  const endpoints = [
    // v7 API - range_data
    {
      url: `${BASE_URL}/v7/sheets/${fileIdentifier}/worksheets/${sheetId}/range_data`,
      type: 'v7-range'
    },
    // v7 API - values
    {
      url: `${BASE_URL}/v7/sheets/${fileIdentifier}/worksheets/${sheetId}/values`,
      type: 'v7-values'
    },
    // OAuth API
    {
      url: `${BASE_URL}/oauthapi/v2/sheets/${fileIdentifier}/worksheets/${sheetId}/values`,
      type: 'oauth-values'
    },
    // 尝试带 range 参数
    {
      url: `${BASE_URL}/v7/sheets/${fileIdentifier}/worksheets/${sheetId}/values?range=A1:Z1000`,
      type: 'v7-values-range'
    }
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`   尝试: ${endpoint.type}`);

      const resp = await fetch(endpoint.url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      });

      console.log(`   HTTP 状态: ${resp.status}`);

      if (!resp.ok) {
        const errorText = await resp.text();
        console.log(`   错误: ${errorText.substring(0, 200)}`);
        continue;
      }

      const data = await resp.json();
      console.log(`   响应结构:`, Object.keys(data));

      // 提取单元格数据
      const values = data.data?.values || data.values || data.data?.range_data || data.range_data || [];

      if (Array.isArray(values) && values.length > 0) {
        console.log(`   ✅ 成功获取 ${values.length} 行数据`);
        return values;
      }

      // 也可能是对象形式
      if (data.data && !Array.isArray(data.data)) {
        console.log(`   响应数据:`, JSON.stringify(data, null, 2).substring(0, 500));
      }

    } catch (err) {
      console.log(`   ⚠️  错误: ${err.message}`);
    }
  }

  return null;
}

/**
 * 将数据转换为 CSV
 */
function convertToCSV(rows) {
  console.log('\n📝 转换为 CSV 格式...');

  const csvLines = rows.map(row => {
    // 确保每个值都被正确转义
    return row.map(cell => {
      const value = cell?.value !== undefined ? cell.value : cell;
      const str = String(value || '');

      // 如果包含逗号、引号或换行符，需要用引号包裹
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',');
  });

  return csvLines.join('\n');
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 WPS 在线表格读取器（通过 API）');
  console.log('='.repeat(80));
  console.log(`文件标识: ${FILE_TOKEN || FILE_ID}`);
  console.log(`输出文件: ${OUTPUT_CSV}`);
  console.log('='.repeat(80));

  try {
    // 获取 access_token
    const accessToken = await getValidAccessToken();

    const fileIdentifier = FILE_TOKEN || FILE_ID;
    const useToken = !!FILE_TOKEN;

    // 步骤 1: 获取工作表列表
    const { sheets, method } = await getWorksheets(fileIdentifier, accessToken, useToken);

    if (!sheets || sheets.length === 0) {
      throw new Error('无法获取工作表列表');
    }

    console.log(`\n✅ 找到 ${sheets.length} 个工作表：`);
    sheets.forEach((sheet, idx) => {
      const sheetId = sheet.sheet_id || sheet.sheetId || sheet.id || '';
      const sheetName = sheet.name || sheet.title || `Sheet${idx + 1}`;
      console.log(`   [${idx + 1}] ${sheetName} (ID: ${sheetId})`);
    });

    // 使用第一个工作表
    const firstSheet = sheets[0];
    const sheetId = firstSheet.sheet_id || firstSheet.sheetId || firstSheet.id || '0';
    const sheetName = firstSheet.name || firstSheet.title || 'Sheet1';

    console.log(`\n📌 读取工作表: ${sheetName}`);

    // 步骤 2: 读取单元格数据
    const data = await getSheetData(fileIdentifier, sheetId, accessToken, method);

    if (!data || data.length === 0) {
      throw new Error('无法读取工作表数据');
    }

    console.log(`   获取到 ${data.length} 行数据`);

    // 步骤 3: 转换为 CSV
    const csv = convertToCSV(data);

    // 步骤 4: 保存文件
    fs.writeFileSync(OUTPUT_CSV, csv, 'utf8');

    console.log(`\n✅ 成功保存到: ${OUTPUT_CSV}`);

    // 显示预览
    const lines = csv.split('\n').filter(line => line.trim());
    console.log(`\n📋 数据预览（前 5 行）:`);
    console.log('─'.repeat(80));
    lines.slice(0, 5).forEach((line, idx) => {
      const preview = line.length > 80 ? line.substring(0, 77) + '...' : line;
      console.log(`${idx + 1}. ${preview}`);
    });
    console.log('─'.repeat(80));

  } catch (err) {
    console.error('\n💥 发生错误：', err.message);
    console.error(err.stack);

    console.error('\n💡 可能的原因：');
    console.error('   1. file_token 或 file_id 不正确');
    console.error('   2. access_token 没有读取表格的权限');
    console.error('   3. API 端点不正确（需要查看最新文档）');
    console.error('   4. 文件类型不是表格（.xlsx/.et）');

    process.exit(1);
  }
}

// 运行主函数
main();
