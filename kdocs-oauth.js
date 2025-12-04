// kdocs-oauth.js - 金山文档 OAuth 授权脚本
import fetch from 'node-fetch';
import express from 'express';
import open from 'open';
import 'dotenv/config';
import fs from 'fs';

const APP_ID = process.env.KDOCS_APP_ID;
const APP_SECRET = process.env.KDOCS_APP_SECRET;
const REDIRECT_URI = 'http://localhost:3000/callback';
const PORT = 3000;

// 存储 token 的文件
const TOKEN_FILE = './kdocs-tokens.json';

/**
 * 步骤 1: 生成授权 URL
 */
function getAuthorizationUrl(scope = 'user_basic') {
  const state = Math.random().toString(36).substring(7);
  const encodedRedirectUri = encodeURIComponent(REDIRECT_URI);

  const authUrl = `https://developer.kdocs.cn/h5/auth?app_id=${APP_ID}&scope=${scope}&redirect_uri=${encodedRedirectUri}&state=${state}`;

  return { authUrl, state };
}

/**
 * 步骤 2: 使用 code 换取 access_token
 */
async function getAccessToken(code) {
  const url = `https://developer.kdocs.cn/api/v1/oauth2/access_token?code=${code}&app_id=${APP_ID}&app_key=${APP_SECRET}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.code === 0 && data.result === 'ok') {
      console.log('\n✅ 获取 Access Token 成功！');
      console.log(`   access_token: ${data.data.access_token}`);
      console.log(`   expires_in: ${data.data.expires_in} 秒 (24小时)`);
      console.log(`   refresh_token: ${data.data.refresh_token} (90天有效期)`);

      // 保存 token 到文件
      const tokenData = {
        access_token: data.data.access_token,
        refresh_token: data.data.refresh_token,
        expires_in: data.data.expires_in,
        expires_at: Date.now() + (data.data.expires_in * 1000),
        app_id: data.data.app_id
      };

      fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2));
      console.log(`\n💾 Token 已保存到: ${TOKEN_FILE}`);

      return data.data;
    } else {
      console.error('❌ 获取 token 失败:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    return null;
  }
}

/**
 * 步骤 3: 刷新 access_token
 */
async function refreshAccessToken(refreshToken) {
  const url = `https://developer.kdocs.cn/api/v1/oauth2/refresh_token?app_id=${APP_ID}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        app_key: APP_SECRET,
        refresh_token: refreshToken
      })
    });

    const data = await response.json();

    if (data.code === 0 && data.result === 'ok') {
      console.log('\n✅ 刷新 Access Token 成功！');

      // 更新保存的 token
      const tokenData = {
        access_token: data.data.access_token,
        refresh_token: refreshToken,
        expires_in: data.data.expires_in,
        expires_at: Date.now() + (data.data.expires_in * 1000),
        app_id: data.data.app_id
      };

      fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2));
      console.log(`💾 新 Token 已保存`);

      return data.data.access_token;
    } else {
      console.error('❌ 刷新 token 失败:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ 刷新请求失败:', error.message);
    return null;
  }
}

/**
 * 获取有效的 access_token (自动刷新过期的)
 */
async function getValidAccessToken() {
  if (!fs.existsSync(TOKEN_FILE)) {
    console.log('⚠️  Token 文件不存在，请先运行授权流程');
    return null;
  }

  const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));

  // 检查是否过期 (提前5分钟刷新)
  if (Date.now() > tokenData.expires_at - (5 * 60 * 1000)) {
    console.log('🔄 Token 即将过期，正在刷新...');
    return await refreshAccessToken(tokenData.refresh_token);
  }

  return tokenData.access_token;
}

/**
 * 启动 OAuth 授权流程
 */
async function startOAuthFlow() {
  console.log('🔐 金山文档 OAuth 授权流程');
  console.log('=' .repeat(50));

  if (!APP_ID || !APP_SECRET) {
    console.error('❌ 请在 .env 文件中设置 KDOCS_APP_ID 和 KDOCS_APP_SECRET');
    process.exit(1);
  }

  const { authUrl, state } = getAuthorizationUrl();

  // 创建临时 HTTP 服务器接收回调
  const app = express();

  app.get('/callback', async (req, res) => {
    const { code, state: returnedState } = req.query;

    if (!code) {
      res.send('<h1>❌ 授权失败</h1><p>未收到授权码</p>');
      return;
    }

    console.log('\n📩 收到授权码:', code);
    console.log('⏳ 正在换取 access_token...\n');

    // 换取 access_token
    const tokenData = await getAccessToken(code);

    if (tokenData) {
      res.send(`
        <h1>✅ 授权成功！</h1>
        <p>Access Token 已获取并保存</p>
        <p>你现在可以关闭这个窗口了</p>
        <script>setTimeout(() => window.close(), 3000);</script>
      `);

      // 延迟关闭服务器
      setTimeout(() => {
        console.log('\n✨ 授权流程完成！');
        console.log('你现在可以使用 kdocs-api.js 读取文档数据了\n');
        process.exit(0);
      }, 2000);
    } else {
      res.send('<h1>❌ 获取 Token 失败</h1><p>请查看控制台错误信息</p>');
    }
  });

  const server = app.listen(PORT, () => {
    console.log(`\n🌐 本地服务器启动: http://localhost:${PORT}`);
    console.log(`📝 回调地址: ${REDIRECT_URI}`);
    console.log('\n🔗 正在打开授权页面...\n');
    console.log(`授权 URL: ${authUrl}\n`);

    // 自动打开浏览器
    open(authUrl);
  });

  // 超时处理
  setTimeout(() => {
    console.log('\n⏰ 授权超时 (5分钟)');
    server.close();
    process.exit(1);
  }, 5 * 60 * 1000);
}

// 导出函数供其他模块使用
export { getAccessToken, refreshAccessToken, getValidAccessToken };

// 如果直接运行此文件，启动授权流程
if (import.meta.url === `file://${process.argv[1]}`) {
  startOAuthFlow();
}
