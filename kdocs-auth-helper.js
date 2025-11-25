// kdocs-auth-helper.js - Helper to get initial OAuth tokens from KDocs
import http from 'http';
import { exec } from 'child_process';

const APP_ID = process.env.KDOCS_APP_ID;
const APP_KEY = process.env.KDOCS_APP_SECRET;
const PORT = 3001;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

console.log('🔐 KDocs OAuth Authorization Helper');
console.log('='.repeat(60));
console.log('\nThis will help you get your initial access token and refresh token.');
console.log('You only need to do this ONCE. The refresh token lasts 90 days.\n');

console.log('⚠️  IMPORTANT: Before proceeding, make sure you\'ve added this redirect URI');
console.log('   to your KDocs app settings at https://developer.kdocs.cn/');
console.log(`   Redirect URI: ${REDIRECT_URI}\n`);

// Build authorization URL
const authUrl = `https://developer.kdocs.cn/h5/auth?` +
  `app_id=${APP_ID}&` +
  `scope=user:read,file:read&` +
  `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
  `state=auth123`;

console.log('📋 Steps:');
console.log('1. A browser window will open');
console.log('2. Login to KDocs and authorize the app');
console.log('3. You\'ll be redirected back here');
console.log('4. Tokens will be saved to .env\n');

// Create a simple HTTP server to receive the callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/callback') {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code) {
      res.writeHead(400);
      res.end('Error: No authorization code received');
      server.close();
      return;
    }

    console.log('✅ Authorization code received:', code);
    console.log('🔄 Exchanging for access token...\n');

    try {
      // Exchange code for tokens
      const tokenUrl = `https://developer.kdocs.cn/api/v1/oauth2/access_token?` +
        `code=${code}&` +
        `app_id=${APP_ID}&` +
        `app_key=${APP_KEY}`;

      const response = await fetch(tokenUrl);
      const data = await response.json();

      if (data.code !== 0) {
        throw new Error(`Token exchange failed: ${JSON.stringify(data)}`);
      }

      const { access_token, refresh_token, expires_in } = data.data;

      console.log('✅ Tokens received!');
      console.log('\n📝 Add these to your .env file:');
      console.log('─'.repeat(60));
      console.log(`KDOCS_ACCESS_TOKEN=${access_token}`);
      console.log(`KDOCS_REFRESH_TOKEN=${refresh_token}`);
      console.log('─'.repeat(60));
      console.log(`\n⏰ Access token expires in: ${expires_in / 3600} hours`);
      console.log('⏰ Refresh token valid for: 90 days\n');

      // Send success response
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h1 style="color: green;">✅ Authorization Successful!</h1>
            <p>You can close this window and return to the terminal.</p>
            <p>Your tokens have been displayed in the terminal.</p>
          </body>
        </html>
      `);

      // Close server after a delay
      setTimeout(() => {
        server.close();
        console.log('✨ Done! Add the tokens to your .env file and run the extractor.\n');
      }, 2000);

    } catch (error) {
      console.error('❌ Error:', error.message);
      res.writeHead(500);
      res.end('Error exchanging code for token');
      server.close();
    }
  }
});

server.listen(PORT, () => {
  console.log(`🌐 Server running on http://localhost:${PORT}`);
  console.log(`\n🔗 Opening authorization URL...\n`);
  console.log(authUrl);
  console.log('\n');

  // Open browser
  const start = process.platform === 'darwin' ? 'open' :
                process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${start} "${authUrl}"`);
});
