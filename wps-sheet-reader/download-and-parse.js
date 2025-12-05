// download-and-parse.js - 从 WPS 下载文件并解析为 CSV
import { getValidAccessToken } from './get-access-token.js';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// 配置
const FILE_NAME = process.env.WPS_FILE_NAME || 'testSheet';
const FILE_TOKEN = process.env.WPS_FILE_TOKEN || '';
const OUTPUT_CSV = path.join(__dirname, `${FILE_NAME}.csv`);
const TEMP_FILE = path.join(__dirname, `temp_${FILE_NAME}.xlsx`);

/**
 * 方法 1: 通过 file_token 获取文件下载链接
 */
async function getDownloadUrlByToken(fileToken) {
  console.log(`\n🔗 通过 file_token 获取下载链接...`);
  console.log(`   file_token: ${fileToken}`);

  const token = await getValidAccessToken();

  // WPS 可能的下载 API 端点
  const endpoints = [
    // 方法 1: WPS OAuth API (优先使用带认证的API)
    {
      url: `https://openapi.wps.cn/oauthapi/v2/appfile/download/url?access_token=${token}&file_token=${fileToken}`,
      type: 'oauth',
      method: 'GET'
    },
    // 方法 2: WPS v7 API
    {
      url: `https://openapi.wps.cn/v7/files/${fileToken}/download?access_token=${token}`,
      type: 'v7',
      method: 'GET'
    },
    // 方法 3: WPS v7 API (alternative)
    {
      url: `https://openapi.wps.cn/v7/files/${fileToken}/download_url?access_token=${token}`,
      type: 'v7-alt',
      method: 'GET'
    },
    // 方法 4: WPS 直接下载 (带token)
    {
      url: `https://www.kdocs.cn/api/v3/office/file/${fileToken}/download?access_token=${token}`,
      type: 'kdocs-api',
      method: 'GET'
    }
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`   尝试 ${endpoint.type}: ${endpoint.url.substring(0, 80)}...`);

      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        redirect: 'manual', // 不自动跟随重定向
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });

      console.log(`   响应状态: ${response.status}`);

      // 检查是否是重定向到下载链接
      if (response.status === 302 || response.status === 301) {
        const downloadUrl = response.headers.get('location');
        console.log(`✅ 获取到下载链接（重定向）`);
        return { url: downloadUrl, method: endpoint.type };
      }

      // 检查是否返回 JSON（包含下载链接）
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log(`   JSON 响应:`, JSON.stringify(data, null, 2).substring(0, 200));

        if (data.download_url || data.url || data.data?.download_url) {
          const downloadUrl = data.download_url || data.url || data.data?.download_url;
          console.log(`✅ 获取到下载链接（JSON）`);
          return { url: downloadUrl, method: endpoint.type };
        }
      }

      // 直接链接尝试
      if (endpoint.type === 'direct') {
        console.log(`   尝试直接下载...`);
        return { url: endpoint.url, method: 'direct' };
      }

    } catch (err) {
      console.log(`   ⚠️  ${endpoint.type} 失败: ${err.message}`);
    }
  }

  throw new Error('无法获取文件下载链接');
}

/**
 * 方法 2: 通过文件列表 API 查找文件 (已知不可用)
 */
async function findFileInList(fileName) {
  console.log(`\n📁 在文件列表中搜索: "${fileName}"...`);
  console.log(`   ⚠️  注意: 当前 access_token 无法访问文件列表 API`);
  return null;
}

/**
 * 尝试通过公开分享 API 获取文件信息
 */
async function tryPublicShareAPI(fileToken) {
  console.log(`\n🔍 尝试通过公开分享 API 获取文件信息...`);

  const endpoints = [
    // 金山文档公开分享 API
    {
      url: `https://www.kdocs.cn/api/v3/ide/file/${fileToken}`,
      type: 'kdocs-public',
      headers: {}
    },
    // 尝试不带认证获取文件信息
    {
      url: `https://www.kdocs.cn/api/v3/office/file/${fileToken}`,
      type: 'kdocs-office',
      headers: {}
    }
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`   尝试: ${endpoint.type}`);
      const response = await fetch(endpoint.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          ...endpoint.headers
        }
      });

      console.log(`   响应状态: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`   响应数据:`, JSON.stringify(data, null, 2).substring(0, 300));
        return data;
      }
    } catch (err) {
      console.log(`   ⚠️  失败: ${err.message}`);
    }
  }

  return null;
}

/**
 * 下载文件
 */
async function downloadFile(url, outputPath) {
  console.log(`\n📥 下载文件...`);
  console.log(`   URL: ${url.substring(0, 80)}...`);
  console.log(`   保存到: ${outputPath}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`下载失败: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const bufferData = Buffer.from(buffer);

    // 验证文件类型（检查是否是Excel文件）
    const contentType = response.headers.get('content-type') || '';
    const isExcel = contentType.includes('spreadsheet') ||
                    contentType.includes('excel') ||
                    contentType.includes('officedocument') ||
                    // 检查文件头（Excel文件以PK开头，即ZIP格式）
                    (bufferData[0] === 0x50 && bufferData[1] === 0x4B);

    // 检查是否是HTML（登录页面）
    const isHTML = contentType.includes('text/html') ||
                   bufferData.toString('utf8', 0, 15).includes('<!DOCTYPE') ||
                   bufferData.toString('utf8', 0, 15).includes('<html');

    if (isHTML) {
      throw new Error('下载的是HTML页面（可能是登录页），不是Excel文件');
    }

    if (!isExcel) {
      console.log(`   ⚠️  警告: Content-Type = ${contentType}`);
      console.log(`   文件头: ${bufferData.toString('hex', 0, 4)}`);
    }

    fs.writeFileSync(outputPath, bufferData);

    const fileSize = (bufferData.length / 1024).toFixed(2);
    console.log(`✅ 下载完成: ${fileSize} KB`);

    return outputPath;
  } catch (err) {
    throw new Error(`下载文件失败: ${err.message}`);
  }
}

/**
 * 解析 Excel 文件为 CSV
 */
function parseExcelToCSV(excelPath, csvPath) {
  console.log(`\n📊 解析 Excel 文件...`);
  console.log(`   输入: ${excelPath}`);
  console.log(`   输出: ${csvPath}`);

  try {
    // 读取 Excel 文件
    const workbook = XLSX.readFile(excelPath);

    // 获取第一个工作表
    const sheetName = workbook.SheetNames[0];
    console.log(`   工作表: ${sheetName}`);

    const worksheet = workbook.Sheets[sheetName];

    // 转换为 CSV
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    // 保存 CSV
    fs.writeFileSync(csvPath, csv, 'utf8');

    // 统计行数
    const lines = csv.split('\n').filter(line => line.trim());
    console.log(`✅ 解析完成: ${lines.length} 行`);

    // 显示预览
    console.log(`\n📋 数据预览（前 5 行）:`);
    console.log('─'.repeat(80));
    lines.slice(0, 5).forEach((line, idx) => {
      const preview = line.length > 80 ? line.substring(0, 77) + '...' : line;
      console.log(`${idx + 1}. ${preview}`);
    });
    console.log('─'.repeat(80));

    return csvPath;
  } catch (err) {
    throw new Error(`解析 Excel 失败: ${err.message}`);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 WPS 文件下载与解析器');
  console.log('=' .repeat(80));
  console.log(`目标文件: ${FILE_NAME}`);
  console.log(`File Token: ${FILE_TOKEN || '未指定（将从列表查找）'}`);
  console.log(`输出文件: ${OUTPUT_CSV}`);
  console.log('=' .repeat(80));

  try {
    let downloadUrl = null;

    // 步骤 0: 尝试通过公开分享 API 获取文件信息（无需认证）
    if (FILE_TOKEN) {
      const shareInfo = await tryPublicShareAPI(FILE_TOKEN);
      if (shareInfo && (shareInfo.download_url || shareInfo.url)) {
        downloadUrl = shareInfo.download_url || shareInfo.url;
        console.log(`✅ 从公开分享 API 获取到下载链接`);
      }
    }

    // 步骤 1: 如果公开 API 失败，尝试使用认证 API 获取下载链接
    if (!downloadUrl && FILE_TOKEN) {
      try {
        const result = await getDownloadUrlByToken(FILE_TOKEN);
        downloadUrl = result.url;
      } catch (err) {
        console.log(`   ⚠️  认证 API 失败: ${err.message}`);
      }
    }

    // 步骤 2: 从文件列表查找（已知不可用，但保留代码）
    if (!downloadUrl && !FILE_TOKEN) {
      const file = await findFileInList(FILE_NAME);
      if (file) {
        downloadUrl = file.download_url || file.url;
      }
    }

    if (!downloadUrl) {
      throw new Error('无法获取下载链接 - 所有方法都失败了');
    }

    // 步骤 2: 下载文件
    await downloadFile(downloadUrl, TEMP_FILE);

    // 步骤 3: 解析为 CSV
    parseExcelToCSV(TEMP_FILE, OUTPUT_CSV);

    // 步骤 4: 清理临时文件
    if (fs.existsSync(TEMP_FILE)) {
      fs.unlinkSync(TEMP_FILE);
      console.log(`\n🗑️  已删除临时文件`);
    }

    console.log(`\n✨ 完成！CSV 文件已保存到: ${OUTPUT_CSV}`);

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error('\n💡 可能的原因：');
    console.error('   1. file_token 不正确或文件不存在');
    console.error('   2. 没有下载权限（文件需要公开分享）');
    console.error('   3. WPS API 端点已更改');
    console.error('\n💡 解决方案：');
    console.error('   1. 确认文件链接: https://www.kdocs.cn/l/' + FILE_TOKEN);
    console.error('   2. 确保文件可以公开访问（无需登录）');
    console.error('   3. 或者手动导出 CSV（最快）');

    // 清理临时文件
    if (fs.existsSync(TEMP_FILE)) {
      fs.unlinkSync(TEMP_FILE);
    }

    process.exit(1);
  }
}

// 运行
main().catch(console.error);
