// get-access-token.js - Get WPS tenant_access_token for enterprise self-built apps
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

/**
 * Load configuration from .env file (one level up)
 */
const APP_ID = process.env.WPS_APP_ID;
const APP_SECRET = process.env.WPS_APP_SECRET;
const TENANT_TOKEN_URL = process.env.WPS_TENANT_TOKEN_URL;

// Token storage file
const TOKEN_FILE = path.join(__dirname, 'wps-token.json');

if (!APP_ID || !APP_SECRET || !TENANT_TOKEN_URL) {
  console.error('❌ 请先在 .env 中配置以下环境变量:');
  console.error('   WPS_APP_ID=你的应用ID');
  console.error('   WPS_APP_SECRET=你的应用密钥');
  console.error('   WPS_TENANT_TOKEN_URL=https://open.wps.cn/api/v1/oauth2/tenant_access_token');
  process.exit(1);
}

/**
 * Get tenant_access_token from WPS Open Platform
 * Documentation: https://open.wps.cn/documents/app-integration-dev/wps365/server/certification-authorization/summary.html
 */
async function getTenantAccessToken() {
  try {
    console.log('🚀 正在请求 tenant_access_token ...');
    console.log(`→ POST ${TENANT_TOKEN_URL}\n`);

    // Use URLSearchParams for application/x-www-form-urlencoded format
    // Try standard OAuth2 parameter names: client_id / client_secret
    const params = new URLSearchParams();
    params.append('client_id', APP_ID);
    params.append('client_secret', APP_SECRET);
    params.append('grant_type', 'client_credentials'); // Required by OAuth2

    console.log('📤 Request body (OAuth2 standard):', params.toString());

    const resp = await fetch(TENANT_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await resp.json().catch(() => ({}));

    console.log('📥 原始返回：', JSON.stringify(data, null, 2));

    // Check for OAuth2 standard response format
    if (data.access_token) {
      const token = data.access_token;
      const expire = data.expires_in || 7200; // Default to 2 hours
      const tokenType = data.token_type || 'bearer';

      console.log('\n✅ 成功获取 access_token！');
      console.log(`   access_token: ${token.substring(0, 50)}...`);
      console.log(`   token_type: ${tokenType}`);
      console.log(`   过期时间（秒）: ${expire}`);

      // Save token to file with expiration timestamp
      const tokenData = {
        access_token: token,
        token_type: tokenType,
        expires_in: expire,
        expires_at: Date.now() + (expire * 1000),
        app_id: APP_ID,
        created_at: new Date().toISOString()
      };

      fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2));
      console.log(`\n💾 Token 已保存到: ${TOKEN_FILE}`);

      return token;
    }
    // Check for WPS custom format (legacy support)
    else if (data.code === 0 || data.code === 200 || data.success) {
      const token =
        data.tenant_access_token ||
        data.data?.tenant_access_token;

      const expire =
        data.expire ||
        data.expire_in ||
        data.data?.expire_in;

      if (!token) {
        console.error('⚠️  看起来请求成功，但没有找到 access_token 字段');
        console.error('请对照 WPS 开放平台文档确认返回结构');
        return null;
      }

      console.log('\n✅ 成功获取 tenant_access_token！');
      console.log(`   token: ${token}`);
      if (expire) {
        console.log(`   过期时间（秒）: ${expire}`);
      }

      // Save token to file with expiration timestamp
      const tokenData = {
        access_token: token,
        token_type: 'bearer',
        expires_in: expire,
        expires_at: Date.now() + (expire * 1000),
        app_id: APP_ID,
        created_at: new Date().toISOString()
      };

      fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2));
      console.log(`\n💾 Token 已保存到: ${TOKEN_FILE}`);

      return token;
    }
    // Error response
    else {
      console.error('\n❌ 接口返回错误：');
      console.error('   code:', data.code);
      console.error('   msg :', data.msg || data.message || data.error_description);
      console.error('\n💡 常见错误原因：');
      console.error('   - APP_ID 或 APP_SECRET 配置错误');
      console.error('   - 应用未在 WPS 开放平台审核通过');
      console.error('   - 应用类型不正确（需要"企业自建应用"）');
      return null;
    }
  } catch (err) {
    console.error('❌ 请求失败：', err.message);
    console.error('\n💡 请检查：');
    console.error('   - 网络连接是否正常');
    console.error('   - TENANT_TOKEN_URL 是否正确');
    return null;
  }
}

/**
 * Get valid access_token (load from file or request new one)
 */
export async function getValidAccessToken() {
  // Check if token file exists and is valid
  if (fs.existsSync(TOKEN_FILE)) {
    try {
      const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));

      // Check if token is still valid (with 5 minute buffer)
      if (Date.now() < tokenData.expires_at - (5 * 60 * 1000)) {
        console.log('✅ 使用已保存的 token（未过期）');
        console.log(`   token: ${tokenData.access_token.substring(0, 50)}...`);
        const remainingTime = Math.floor((tokenData.expires_at - Date.now()) / 1000);
        console.log(`   剩余有效时间: ${remainingTime} 秒`);
        return tokenData.access_token;
      } else {
        console.log('⚠️  已保存的 token 已过期，正在获取新 token...\n');
      }
    } catch (err) {
      console.log('⚠️  读取已保存 token 失败，正在获取新 token...\n');
    }
  }

  // Request new token
  return await getTenantAccessToken();
}

// Legacy alias for backward compatibility
export const getValidTenantAccessToken = getValidAccessToken;

// Export for use in other modules
export { getTenantAccessToken };

// Run directly if this file is executed
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🔐 WPS 企业自建应用 - 获取 tenant_access_token');
  console.log('=' .repeat(60));
  console.log(`App ID: ${APP_ID}`);
  console.log(`Token URL: ${TENANT_TOKEN_URL}`);
  console.log('=' .repeat(60) + '\n');

  getTenantAccessToken()
    .then(token => {
      if (token) {
        console.log('\n✨ 完成！现在可以使用此 token 调用 WPS API');
        process.exit(0);
      } else {
        console.error('\n❌ 获取 token 失败');
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('❌ 错误:', err.message);
      process.exit(1);
    });
}
