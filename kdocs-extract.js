// kdocs-extract.js - 从金山文档在线表格提取数据并导出CSV
import axios from 'axios';
import fs from 'fs';

// ======= 配置（从 .env 读取）=======
const APP_ID = process.env.KDOCS_APP_ID;
const APP_KEY = process.env.KDOCS_APP_SECRET;
let AUTH_CODE = process.env.KDOCS_AUTH_CODE; // 首次需要手动获取
const FILE_TOKEN = process.env.KDOCS_FILE_TOKEN; // 可选：指定文档ID
const RANGE = process.env.KDOCS_RANGE || 'Sheet1!B10:I23'; // 例如：B10:I23
// ============================

const BASE = "https://developer.kdocs.cn";

/**
 * 用 code + app_id + app_key 换取 access_token
 */
async function getAccessToken(code) {
  console.log('🔑 获取 access_token...');

  const url = `${BASE}/api/v1/oauth2/access_token`;
  const params = {
    code: code,
    app_id: APP_ID,
    app_key: APP_KEY,
  };

  try {
    const resp = await axios.get(url, { params, timeout: 10000 });
    const data = resp.data;

    if (data.code !== 0) {
      throw new Error("获取 token 失败: " + JSON.stringify(data));
    }

    const token = data.data.access_token;
    const refreshToken = data.data.refresh_token;

    console.log('✅ access_token 获取成功');
    console.log(`💾 建议保存到 .env:`);
    console.log(`   KDOCS_ACCESS_TOKEN=${token}`);
    console.log(`   KDOCS_REFRESH_TOKEN=${refreshToken}`);

    return { access_token: token, refresh_token: refreshToken };
  } catch (error) {
    console.error('❌ 获取 token 出错:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * 刷新 access_token（如果已有 refresh_token）
 */
async function refreshAccessToken(refreshToken) {
  console.log('🔄 刷新 access_token...');

  const url = `${BASE}/api/v1/oauth2/refresh_token`;
  const params = { app_id: APP_ID };
  const body = {
    app_key: APP_KEY,
    refresh_token: refreshToken
  };

  try {
    const resp = await axios.post(url, body, { params, timeout: 10000 });
    const data = resp.data;

    if (data.code !== 0) {
      throw new Error("刷新 token 失败: " + JSON.stringify(data));
    }

    const newToken = data.data.access_token;
    console.log('✅ token 刷新成功');
    console.log(`💾 更新 .env: KDOCS_ACCESS_TOKEN=${newToken}`);

    return newToken;
  } catch (error) {
    console.error('❌ 刷新 token 出错:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * 获取文档列表，找到目标文档的 file_token
 */
async function getFileToken(accessToken, docUrl) {
  console.log('📋 获取文档列表...');

  // 从 URL 提取分享 ID
  const match = docUrl.match(/\/l\/([^?]+)/);
  const shareId = match ? match[1] : null;

  const url = `${BASE}/api/v1/openapi/personal/files/flat`;
  const params = {
    access_token: accessToken,
    count: 50,
    offset: 0,
    order: "desc",
    order_by: "mtime"
  };

  try {
    const resp = await axios.get(url, { params, timeout: 10000 });
    const data = resp.data;

    if (data.code !== 0) {
      throw new Error("获取文档列表失败: " + JSON.stringify(data));
    }

    const files = data.data.files || [];
    console.log(`📊 找到 ${files.length} 个文档`);

    // 打印所有文档
    files.forEach((f, idx) => {
      const fileToken = f.id.open_id;
      console.log(`   ${idx + 1}. ${f.fname} (${fileToken})`);
    });

    // 如果有分享ID，尝试匹配
    if (shareId && files.length > 0) {
      // 暂时返回第一个文档
      console.log(`\n💡 使用第一个文档: ${files[0].fname}`);
      return files[0].id.open_id;
    }

    if (files.length > 0) {
      return files[0].id.open_id;
    }

    throw new Error('未找到任何文档');
  } catch (error) {
    console.error('❌ 获取文档列表出错:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * 解析范围字符串 (例如: "B10:I23" 或 "Sheet1!B10:I23")
 */
function parseRange(rangeStr) {
  const match = rangeStr.match(/(?:([^!]+)!)?([A-Z]+)(\d+):([A-Z]+)(\d+)/);
  if (!match) {
    throw new Error(`无效的范围格式: ${rangeStr}`);
  }

  const [, sheet, startCol, startRow, endCol, endRow] = match;

  return {
    sheet: sheet || '0',
    startCol,
    endCol,
    startRow: parseInt(startRow),
    endRow: parseInt(endRow)
  };
}

/**
 * 从在线表格读取单元格数据
 * GET /api/v1/openapi/ksheet/:file_token/sheets/:sheet_idx/cells
 */
async function readSheetCells(accessToken, fileToken, range) {
  console.log(`\n📥 读取表格数据: ${range}`);

  const { sheet, startCol, endCol, startRow, endRow } = parseRange(range);
  const sheetIdx = sheet === '0' ? 0 : parseInt(sheet) || 0;

  const url = `${BASE}/api/v1/openapi/ksheet/${fileToken}/sheets/${sheetIdx}/cells`;
  const params = {
    access_token: accessToken,
    range: `${startCol}${startRow}:${endCol}${endRow}`
  };

  try {
    console.log(`🔗 API: GET ${url}`);
    console.log(`📍 范围: ${params.range}`);

    const resp = await axios.get(url, { params, timeout: 15000 });
    const data = resp.data;

    console.log(`📥 响应状态: ${resp.status}`);

    if (data.code !== 0) {
      console.error('❌ API 返回错误:', JSON.stringify(data, null, 2));
      throw new Error(`读取表格失败 (code=${data.code}): ${data.message || '未知错误'}`);
    }

    const cells = data.data?.cells || [];
    console.log(`✅ 读取到 ${cells.length} 个单元格`);

    // 保存原始数据用于调试
    fs.writeFileSync('./kdocs-raw-cells.json', JSON.stringify(data.data, null, 2));
    console.log('💾 原始数据已保存: kdocs-raw-cells.json');

    return cells;
  } catch (error) {
    console.error('❌ 读取表格出错:');
    console.error('   状态:', error.response?.status);
    console.error('   数据:', JSON.stringify(error.response?.data, null, 2));
    throw error;
  }
}

/**
 * 将单元格数组转换为二维数组
 */
function cellsToArray(cells, startRow, endRow, startCol, endCol) {
  // 列字母转索引
  const colToIndex = (col) => {
    let index = 0;
    for (let i = 0; i < col.length; i++) {
      index = index * 26 + (col.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
    }
    return index - 1;
  };

  const startColIdx = colToIndex(startCol);
  const endColIdx = colToIndex(endCol);
  const rowCount = endRow - startRow + 1;
  const colCount = endColIdx - startColIdx + 1;

  // 初始化二维数组
  const arr = Array(rowCount).fill(null).map(() => Array(colCount).fill(''));

  // 填充数据
  cells.forEach(cell => {
    const row = cell.row - startRow;
    const col = cell.column - startColIdx;

    if (row >= 0 && row < rowCount && col >= 0 && col < colCount) {
      arr[row][col] = cell.value || '';
    }
  });

  return arr;
}

/**
 * 转换为 CSV
 */
function arrayToCSV(arr) {
  return arr.map(row => {
    return row.map(cell => {
      const value = String(cell || '');
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  }).join('\n');
}

/**
 * 主流程
 */
async function main() {
  console.log('📄 金山文档数据提取工具');
  console.log('='.repeat(60));

  try {
    let accessToken = process.env.KDOCS_ACCESS_TOKEN;
    const refreshToken = process.env.KDOCS_REFRESH_TOKEN;

    // 如果没有 access_token，尝试获取
    if (!accessToken) {
      if (!AUTH_CODE) {
        console.error('\n❌ 缺少授权码！');
        console.log('\n📝 获取授权码步骤:');
        console.log('1. 访问授权页面:');
        const authUrl = `${BASE}/h5/auth?app_id=${APP_ID}&scope=user_basic,access_personal_files&redirect_uri=${encodeURIComponent('http://localhost:3001/callback')}&state=abc123`;
        console.log(`   ${authUrl}`);
        console.log('2. 登录并授权');
        console.log('3. 从回调 URL 复制 code 参数');
        console.log('4. 添加到 .env: KDOCS_AUTH_CODE=你的code');
        process.exit(1);
      }

      const tokens = await getAccessToken(AUTH_CODE);
      accessToken = tokens.access_token;
    } else if (refreshToken) {
      // 尝试刷新 token
      try {
        accessToken = await refreshAccessToken(refreshToken);
      } catch (error) {
        console.log('⚠️  刷新失败，使用现有 token');
      }
    }

    // 获取文档 file_token
    let fileToken = FILE_TOKEN;
    if (!fileToken) {
      fileToken = await getFileToken(accessToken, process.env.KDOCS_URL);
    }

    console.log(`\n🎯 使用文档: ${fileToken}`);

    // 读取表格数据
    const range = RANGE;
    const cells = await readSheetCells(accessToken, fileToken, range);

    if (cells.length === 0) {
      console.log('⚠️  未读取到数据');
      return;
    }

    // 转换为二维数组
    const { startCol, endCol, startRow, endRow } = parseRange(range);
    const dataArray = cellsToArray(cells, startRow, endRow, startCol, endCol);

    console.log(`\n📊 数据预览 (前3行):`);
    console.log('─'.repeat(60));
    dataArray.slice(0, 3).forEach((row, idx) => {
      console.log(`${idx + startRow}: ${row.join(' | ')}`);
    });
    console.log('─'.repeat(60));

    // 导出 CSV
    const csv = arrayToCSV(dataArray);
    const outputFile = process.env.KDOCS_OUTPUT || './kdocs-export.csv';
    fs.writeFileSync(outputFile, csv, 'utf8');

    console.log(`\n✅ 数据已导出: ${outputFile}`);
    console.log(`📊 行数: ${dataArray.length}`);
    console.log(`📊 列数: ${dataArray[0]?.length || 0}`);

    console.log('\n' + '='.repeat(60));
    console.log('✨ 完成!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ 执行出错:', error.message);

    if (error.message.includes('401') || error.message.includes('token')) {
      console.log('\n💡 提示: access_token 可能已过期');
      console.log('   1. 如果有 refresh_token，会自动刷新');
      console.log('   2. 否则需要重新获取授权码');
    }
  }
}

main().catch(console.error);
