// read-sheet-to-csv.js - 从 WPS 在线表格读取数据并保存为 CSV
import { getValidAccessToken } from './get-access-token.js';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const FILE_NAME = process.env.WPS_FILE_NAME || 'testSheet';
const FILE_TOKEN = process.env.WPS_FILE_TOKEN || ''; // 可以直接指定 file_token
const OUTPUT_CSV = path.join(__dirname, `${FILE_NAME}.csv`);
const API_BASE = 'https://developer.kdocs.cn';

/**
 * Step 1: 获取个人文档列表
 */
async function listPersonalFiles() {
  console.log(`\n📁 正在获取个人文档列表...`);

  const token = await getValidAccessToken();

  // 使用正确的金山文档 API 端点
  const endpoints = [
    '/api/v1/openapi/personal/files/flat',  // 获取扁平化文件列表
    '/api/v1/openapi/personal/files',       // 按目录获取文件列表
  ];

  for (const endpoint of endpoints) {
    try {
      // 尝试两种认证方式：Header 和 Query Parameter
      const authMethods = [
        // 方法 1: Query parameter (类似 OAuth endpoint)
        {
          url: `${API_BASE}${endpoint}?access_token=${token}`,
          headers: { 'Content-Type': 'application/json' }
        },
        // 方法 2: Authorization header
        {
          url: `${API_BASE}${endpoint}`,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      ];

      for (const method of authMethods) {
        console.log(`   尝试端点: ${method.url.replace(token, token.substring(0, 20) + '...')}`);

        const response = await fetch(method.url, {
          method: 'GET',
          headers: method.headers
        });

        const data = await response.json();

        if (data.code === 0 || data.result === 'ok') {
          const files = data.data?.files || data.files || [];
          console.log(`\n✅ 获取到 ${files.length} 个文件`);
          return files;
        } else {
          console.log(`   响应: code=${data.code}, message=${data.message || data.msg}`);
        }
      }
    } catch (err) {
      console.log(`   ⚠️  端点失败: ${err.message}`);
    }
  }

  throw new Error('无法获取文件列表');
}

/**
 * 在文件列表中查找匹配的文件
 */
function findFileByName(files, fileName) {
  // 精确匹配
  let match = files.find(f => f.name === fileName || f.title === fileName);
  if (match) return match;

  // 包含匹配
  match = files.find(f =>
    (f.name && f.name.includes(fileName)) ||
    (f.title && f.title.includes(fileName))
  );
  if (match) return match;

  // 如果没找到，返回第一个表格文件
  match = files.find(f =>
    f.type === 'et' || f.type === 'ksheet' || f.type === 'spreadsheet'
  );

  return match || files[0];
}


/**
 * Step 2: 通过 file_token 获取工作表列表
 */
async function listWorksheets(fileToken, fileType = 'et') {
  console.log(`\n📊 正在获取工作表列表...`);
  console.log(`   file_token: ${fileToken}`);
  console.log(`   file_type: ${fileType}`);

  const token = await getValidAccessToken();

  // 根据文档，使用正确的端点
  // et = WPS 表格（Excel 类型）
  // ksheet = 在线表格
  const typePrefix = fileType === 'ksheet' ? 'ksheet' : 'et';
  const endpoint = `/api/v1/openapi/${typePrefix}/${fileToken}/sheets`;

  try {
    // 尝试两种认证方式
    const urls = [
      `${API_BASE}${endpoint}?access_token=${token}`,
      `${API_BASE}${endpoint}`
    ];

    const headers = [
      { 'Content-Type': 'application/json' },
      { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    ];

    for (let i = 0; i < urls.length; i++) {
      console.log(`   尝试端点 (方法 ${i + 1}): ${urls[i].replace(token, token.substring(0, 20) + '...')}`);

      const response = await fetch(urls[i], {
        method: 'GET',
        headers: headers[i]
      });

      const data = await response.json();

      if (data.code === 0 || data.result === 'ok') {
        const sheets = data.data?.sheets || data.sheets || [];

        if (sheets.length > 0) {
          const sheet = sheets[0];
          console.log(`\n✅ 找到工作表: ${sheet.name || sheet.title || 'Sheet1'}`);
          console.log(`   sheet_idx: ${sheet.idx !== undefined ? sheet.idx : 0}`);
          return { ...sheet, idx: sheet.idx !== undefined ? sheet.idx : 0 };
        }
      } else {
        console.log(`   响应: code=${data.code}, message=${data.message || data.msg}`);
      }
    }

    // 如果两种方法都失败，使用默认值
    console.log(`   ⚠️  获取工作表失败，使用默认 sheet_idx = 0`);
    return { idx: 0, name: 'Sheet1' };
  } catch (err) {
    console.log(`   ⚠️  请求失败: ${err.message}`);
    console.log(`   ⚠️  使用默认 sheet_idx = 0`);
    return { idx: 0, name: 'Sheet1' };
  }
}

/**
 * Step 3: 读取指定工作表的单元格数据
 */
async function getCellsData(fileToken, sheetIdx, fileType = 'et') {
  console.log(`\n📥 正在读取单元格数据...`);
  console.log(`   file_token: ${fileToken}`);
  console.log(`   sheet_idx: ${sheetIdx}`);
  console.log(`   file_type: ${fileType}`);

  const token = await getValidAccessToken();

  // 根据文档使用正确的端点
  const typePrefix = fileType === 'ksheet' ? 'ksheet' : 'et';
  const endpoint = `/api/v1/openapi/${typePrefix}/${fileToken}/sheets/${sheetIdx}/cells`;

  try {
    // 尝试两种认证方式
    const urls = [
      `${API_BASE}${endpoint}?access_token=${token}`,
      `${API_BASE}${endpoint}`
    ];

    const headers = [
      { 'Content-Type': 'application/json' },
      { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    ];

    for (let i = 0; i < urls.length; i++) {
      console.log(`   尝试端点 (方法 ${i + 1}): ${urls[i].replace(token, token.substring(0, 20) + '...')}`);

      const response = await fetch(urls[i], {
        method: 'GET',
        headers: headers[i]
      });

      const data = await response.json();

      if (data.code === 0 || data.result === 'ok') {
        console.log(`\n✅ 成功获取单元格数据`);
        return data;
      } else {
        console.log(`   响应: code=${data.code}, message=${data.message || data.msg}`);
      }
    }

    throw new Error(`无法获取单元格数据 - 两种认证方式都失败`);
  } catch (err) {
    throw new Error(`获取单元格数据失败: ${err.message}`);
  }
}

/**
 * 将 API 返回的数据转换为二维数组
 */
function parseDataToArray(apiData, maxRows = 100, maxCols = 20) {
  console.log(`\n🔄 解析数据为二维数组...`);

  // 初始化空数组
  const rows = [];
  for (let i = 0; i < maxRows; i++) {
    rows[i] = new Array(maxCols).fill('');
  }

  // 尝试多种数据格式
  const cells = apiData.cells || apiData.data?.cells;
  const values = apiData.values || apiData.data?.values;
  const range = apiData.range || apiData.data?.range;

  if (cells && Array.isArray(cells)) {
    // 格式 1: cells array with row/col positions
    cells.forEach(cell => {
      const row = cell.row_from || cell.row || 0;
      const col = cell.col_from || cell.col || 0;
      const value = cell.cell_text || cell.value || cell.text || '';

      if (row < maxRows && col < maxCols) {
        rows[row][col] = value;
      }
    });
  } else if (values && Array.isArray(values)) {
    // 格式 2: 二维数组格式（类似 Google Sheets）
    values.forEach((rowData, rowIdx) => {
      if (rowIdx < maxRows && Array.isArray(rowData)) {
        rowData.forEach((cellValue, colIdx) => {
          if (colIdx < maxCols) {
            rows[rowIdx][colIdx] = cellValue || '';
          }
        });
      }
    });
  } else if (range && range.values) {
    // 格式 3: range with values
    range.values.forEach((rowData, rowIdx) => {
      if (rowIdx < maxRows && Array.isArray(rowData)) {
        rowData.forEach((cellValue, colIdx) => {
          if (colIdx < maxCols) {
            rows[rowIdx][colIdx] = cellValue || '';
          }
        });
      }
    });
  }

  // 移除末尾的空行
  let lastNonEmptyRow = -1;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].some(cell => cell !== '')) {
      lastNonEmptyRow = i;
      break;
    }
  }

  const trimmedRows = lastNonEmptyRow >= 0 ? rows.slice(0, lastNonEmptyRow + 1) : [];

  console.log(`   有效行数: ${trimmedRows.length}`);

  return trimmedRows;
}

/**
 * 将二维数组保存为 CSV
 */
function saveAsCSV(data, outputPath) {
  console.log(`\n💾 保存为 CSV...`);

  const csvLines = data.map(row => {
    return row.map(cell => {
      const value = String(cell || '');
      // 如果包含逗号、引号或换行，需要用引号包裹并转义
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });

  const csvContent = csvLines.join('\n');
  fs.writeFileSync(outputPath, csvContent, 'utf8');

  console.log(`✅ CSV 已保存到: ${outputPath}`);
  console.log(`   总行数: ${data.length}`);
  console.log(`   总列数: ${data[0]?.length || 0}`);
}

/**
 * 主函数：完整流程
 */
async function main() {
  console.log('🚀 WPS 表格读取器 - 从在线表格导出为 CSV');
  console.log('=' .repeat(60));
  console.log(`目标文件: ${FILE_NAME}`);
  console.log(`输出文件: ${OUTPUT_CSV}`);
  console.log('=' .repeat(60));

  try {
    let fileToken = FILE_TOKEN;
    let fileType = 'et'; // 默认 WPS 表格类型

    // Step 1: 如果没有提供 file_token，尝试从文件列表获取
    if (!fileToken) {
      const files = await listPersonalFiles();

      if (files.length === 0) {
        throw new Error('未找到任何文件');
      }

      const file = findFileByName(files, FILE_NAME);

      console.log(`\n✅ 选择文件: ${file.name || file.title}`);
      fileToken = file.file_token || file.token || file.id;
      fileType = file.type || 'et';

      if (!fileToken) {
        throw new Error('未能获取 file_token');
      }

      console.log(`   file_token: ${fileToken}`);
      console.log(`   file_type: ${fileType}`);
    }

    // Step 2: 获取工作表
    const sheet = await listWorksheets(fileToken, fileType);
    const sheetIdx = sheet.idx;

    // Step 3: 读取数据
    const apiData = await getCellsData(fileToken, sheetIdx, fileType);

    // Step 4: 解析为二维数组
    const dataArray = parseDataToArray(apiData, 100, 20);

    if (dataArray.length === 0) {
      console.log('\n⚠️  未读取到任何数据');
      return;
    }

    // Step 5: 保存为 CSV
    saveAsCSV(dataArray, OUTPUT_CSV);

    // 显示预览
    console.log(`\n📋 数据预览（前 5 行）:`);
    console.log('─'.repeat(60));
    dataArray.slice(0, 5).forEach((row, idx) => {
      console.log(`行 ${idx + 1}: ${row.slice(0, 5).join(' | ')}`);
    });
    console.log('─'.repeat(60));

    console.log(`\n✨ 完成！数据已成功导出到 ${OUTPUT_CSV}`);

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error('\n💡 请检查：');
    console.error('   1. 文件名是否正确（在 .env 中设置 WPS_FILE_NAME）');
    console.error('   2. 或者直接设置 WPS_FILE_TOKEN');
    console.error('   3. Access Token 是否有效');
    console.error('   4. 是否有权限访问该文件');
    console.error('   5. 应用是否已获得必要的 API 权限');
    console.error('\n📚 参考文档: https://developer.kdocs.cn/server/guide/api-overview.html');
    process.exit(1);
  }
}

// 运行主函数
main().catch(console.error);
