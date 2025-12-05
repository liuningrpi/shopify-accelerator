// check-token-scope.js - 检查 access_token 包含的权限范围
import { getValidAccessToken } from './get-access-token.js';

async function checkTokenScope() {
  console.log('🔍 检查 Access Token 的权限范围（Scope）');
  console.log('='.repeat(80));

  try {
    const token = await getValidAccessToken();

    console.log('\n📋 Token 信息:');
    console.log(`   Token (前50字符): ${token.substring(0, 50)}...`);

    // JWT token 格式: header.payload.signature
    const parts = token.split('.');

    if (parts.length !== 3) {
      console.error('❌ 这不是一个有效的 JWT token');
      return;
    }

    // 解码 header
    const header = JSON.parse(
      Buffer.from(parts[0], 'base64url').toString('utf8')
    );

    // 解码 payload
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8')
    );

    console.log('\n📦 Token Header:');
    console.log(JSON.stringify(header, null, 2));

    console.log('\n📦 Token Payload:');
    console.log(JSON.stringify(payload, null, 2));

    // 检查权限范围
    const scope = payload.scope || payload.scp || payload.scopes || '';

    console.log('\n🔑 权限范围（Scope）:');
    if (scope) {
      console.log(`   ✅ 找到 scope: ${scope}`);

      const scopes = typeof scope === 'string' ? scope.split(' ') : scope;
      console.log('\n   包含的权限:');
      (Array.isArray(scopes) ? scopes : [scopes]).forEach(s => {
        console.log(`   - ${s}`);
      });

      // 检查必需的权限
      const hasSheetRead = scope.includes('kso.sheets.read');
      const hasSheetWrite = scope.includes('kso.sheets.readwrite');
      const hasFileRead = scope.includes('kso.files.read') || scope.includes('file.read');

      console.log('\n📊 权限检查:');
      console.log(`   ${hasSheetRead ? '✅' : '❌'} kso.sheets.read - 读取表格`);
      console.log(`   ${hasSheetWrite ? '✅' : '❌'} kso.sheets.readwrite - 读写表格`);
      console.log(`   ${hasFileRead ? '✅' : '❌'} kso.files.read / file.read - 文件列表`);

      if (!hasSheetRead && !hasSheetWrite) {
        console.log('\n⚠️  警告: Token 缺少表格读取权限！');
        console.log('\n需要的权限:');
        console.log('   - kso.sheets.read 或');
        console.log('   - kso.sheets.readwrite');
      } else {
        console.log('\n✅ Token 包含表格读取权限！');
      }

    } else {
      console.log('   ❌ Token 中没有找到 scope 字段');
      console.log('\n   这可能意味着:');
      console.log('   1. 使用的是 client_credentials 授权，scope 在应用配置中固定');
      console.log('   2. Token payload 使用了不同的字段名');
      console.log('   3. 权限配置还未生效');
    }

    // 检查过期时间
    if (payload.exp) {
      const expiresAt = new Date(payload.exp * 1000);
      const now = new Date();
      const remaining = Math.floor((expiresAt - now) / 1000);

      console.log('\n⏰ Token 过期时间:');
      console.log(`   过期于: ${expiresAt.toLocaleString('zh-CN')}`);
      console.log(`   剩余: ${remaining} 秒 (${Math.floor(remaining / 60)} 分钟)`);
    }

    // 其他可能的字段
    console.log('\n📌 其他 Payload 字段:');
    Object.entries(payload).forEach(([key, value]) => {
      if (!['exp', 'scope', 'scp', 'scopes'].includes(key)) {
        console.log(`   ${key}: ${JSON.stringify(value)}`);
      }
    });

  } catch (err) {
    console.error('\n❌ 错误:', err.message);
    console.error(err.stack);
  }
}

checkTokenScope();
