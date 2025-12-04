// kdocs-api.js - 金山文档 API 调用脚本
import fetch from 'node-fetch';
import fs from 'fs';
import { getValidAccessToken } from './kdocs-oauth.js';

const BASE_URL = 'https://developer.kdocs.cn/api/v1';

/**
 * 通用 API 请求函数
 */
async function kdocsApiRequest(endpoint, options = {}) {
  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    throw new Error('无法获取有效的 access_token，请先运行授权流程: node kdocs-oauth.js');
  }

  // 在 URL 中添加 access_token
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${BASE_URL}${endpoint}${separator}access_token=${accessToken}`;

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await response.json();

    if (data.code === 0 && data.result === 'ok') {
      return data.data;
    } else {
      console.error('❌ API 请求失败:', data);
      throw new Error(data.msg || 'API 请求失败');
    }
  } catch (error) {
    console.error('❌ 请求错误:', error.message);
    throw error;
  }
}

/**
 * 获取用户基本信息
 */
async function getUserInfo() {
  console.log('📋 获取用户基本信息...');

  const userInfo = await kdocsApiRequest('/openapi/user/basic');

  console.log('\n✅ 用户信息:');
  console.log(`   open_id: ${userInfo.open_id}`);
  console.log(`   union_id: ${userInfo.union_id}`);
  console.log(`   昵称: ${userInfo.nickname}`);
  console.log(`   头像: ${userInfo.avatar}\n`);

  return userInfo;
}

/**
 * 获取文件列表
 */
async function getFileList(folderId = null) {
  console.log('📁 获取文件列表...');

  const endpoint = folderId
    ? `/openapi/personal/folders/${folderId}/files`
    : '/openapi/personal/files';

  const files = await kdocsApiRequest(endpoint);

  console.log(`\n✅ 找到 ${files.length} 个文件:\n`);
  files.forEach((file, index) => {
    console.log(`${index + 1}. ${file.name}`);
    console.log(`   ID: ${file.id}`);
    console.log(`   类型: ${file.type}`);
    console.log(`   创建时间: ${new Date(file.create_time * 1000).toLocaleString()}`);
    console.log('');
  });

  return files;
}

/**
 * 获取文件分享链接
 */
async function getFileShareLink(fileId) {
  console.log(`🔗 获取文件分享链接 (文件 ID: ${fileId})...`);

  const links = await kdocsApiRequest(`/openapi/personal/files/${fileId}/links`);

  console.log('\n✅ 分享链接信息:');
  console.log(`   链接: ${links.url}`);
  console.log(`   短链接: ${links.short_url}`);
  console.log(`   权限: ${links.permission}\n`);

  return links;
}

/**
 * 获取表格数据 (轻维表)
 */
async function getTableData(fileId, viewId = null) {
  console.log(`📊 获取表格数据 (文件 ID: ${fileId})...`);

  const endpoint = viewId
    ? `/openapi/table/${fileId}/views/${viewId}/records`
    : `/openapi/table/${fileId}/records`;

  const records = await kdocsApiRequest(endpoint);

  console.log(`\n✅ 获取到 ${records.length} 条记录\n`);

  return records;
}

/**
 * 获取文档内容 (在线文档)
 */
async function getDocumentContent(fileId) {
  console.log(`📄 获取文档内容 (文件 ID: ${fileId})...`);

  const content = await kdocsApiRequest(`/openapi/document/${fileId}/content`);

  console.log('\n✅ 文档内容获取成功\n');

  return content;
}

/**
 * 导出文档为 PDF
 */
async function exportDocumentToPdf(fileId, outputPath = './exported.pdf') {
  console.log(`📤 导出文档为 PDF (文件 ID: ${fileId})...`);

  const result = await kdocsApiRequest(`/openapi/document/${fileId}/export`, {
    method: 'POST',
    body: {
      format: 'pdf'
    }
  });

  // 下载文件
  const response = await fetch(result.download_url);
  const buffer = await response.buffer();
  fs.writeFileSync(outputPath, buffer);

  console.log(`✅ PDF 已导出到: ${outputPath}\n`);

  return outputPath;
}

/**
 * 搜索文件
 */
async function searchFiles(keyword) {
  console.log(`🔍 搜索文件: "${keyword}"...`);

  const results = await kdocsApiRequest(`/openapi/personal/search?keyword=${encodeURIComponent(keyword)}`);

  console.log(`\n✅ 找到 ${results.length} 个匹配的文件:\n`);
  results.forEach((file, index) => {
    console.log(`${index + 1}. ${file.name} (${file.type})`);
  });

  return results;
}

// 示例使用
async function main() {
  try {
    console.log('🚀 金山文档 API 示例');
    console.log('=' .repeat(50) + '\n');

    // 1. 获取用户信息
    await getUserInfo();

    // 2. 获取文件列表
    const files = await getFileList();

    // 如果有文件，获取第一个文件的分享链接
    if (files.length > 0) {
      const firstFile = files[0];
      await getFileShareLink(firstFile.id);
    }

    console.log('✨ 完成！');
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

// 导出所有函数
export {
  getUserInfo,
  getFileList,
  getFileShareLink,
  getTableData,
  getDocumentContent,
  exportDocumentToPdf,
  searchFiles
};

// 如果直接运行此文件，执行示例
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
