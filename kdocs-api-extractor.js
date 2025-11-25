// kdocs-api-extractor.js - Extract data from KDocs using API
import fetch from 'node-fetch';
import fs from 'fs';

const config = {
  appId: process.env.KDOCS_APP_ID,
  appKey: process.env.KDOCS_APP_SECRET,
  accessToken: process.env.KDOCS_ACCESS_TOKEN,
  refreshToken: process.env.KDOCS_REFRESH_TOKEN,
  docUrl: process.env.KDOCS_URL,
  range: process.env.KDOCS_RANGE || 'Sheet1!B10:I23',
  outputFile: process.env.KDOCS_OUTPUT || './kdocs-export.csv'
};

// Parse document ID from URL
function parseDocumentId(url) {
  const match = url.match(/\/l\/([^?]+)/);
  return match ? match[1] : null;
}

// Refresh access token
async function refreshAccessToken() {
  console.log('🔄 Refreshing access token...');

  const response = await fetch(`https://developer.kdocs.cn/api/v1/oauth2/refresh_token?app_id=${config.appId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      app_key: config.appKey,
      refresh_token: config.refreshToken
    })
  });

  const data = await response.json();

  if (data.code !== 0) {
    throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  }

  const newToken = data.data.access_token;
  console.log('✅ Token refreshed successfully');
  console.log(`💡 Update your .env: KDOCS_ACCESS_TOKEN=${newToken}\n`);

  return newToken;
}

// Get spreadsheet data
async function getSpreadsheetData(fileToken, accessToken) {
  // Try to get sheet data - try both et (WPS Tables) and ksheet (Online Tables) APIs
  const endpoints = [
    {
      url: `https://developer.kdocs.cn/api/v1/openapi/et/${fileToken}/sheets/0/cells?access_token=${accessToken}`,
      type: 'et'
    },
    {
      url: `https://developer.kdocs.cn/api/v1/openapi/ksheet/${fileToken}/sheets?access_token=${accessToken}`,
      type: 'ksheet'
    }
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔍 Trying ${endpoint.type} API...`);
      console.log(`   ${endpoint.url.replace(accessToken, '***')}`);

      const response = await fetch(endpoint.url);
      const text = await response.text();

      console.log(`   Status: ${response.status}`);

      if (response.ok) {
        const data = JSON.parse(text);
        if (data.code === 0) {
          console.log('   ✅ Success!');
          return { data: data.data, type: endpoint.type };
        } else {
          console.log(`   ⚠️  Error code: ${data.code}, message: ${data.message || 'unknown'}`);
        }
      } else {
        console.log(`   ❌ HTTP ${response.status}: ${text.substring(0, 100)}`);
      }
    } catch (error) {
      console.log(`   ❌ ${error.message}`);
    }
  }

  throw new Error('Failed to fetch data from all endpoints');
}

// Parse range (e.g., "Sheet1!B10:I23")
function parseRange(rangeStr) {
  const match = rangeStr.match(/(?:([^!]+)!)?([A-Z]+)(\d+):([A-Z]+)(\d+)/);
  if (!match) {
    throw new Error(`Invalid range format: ${rangeStr}`);
  }

  const [, sheet, startCol, startRow, endCol, endRow] = match;

  const colToIndex = (col) => {
    let index = 0;
    for (let i = 0; i < col.length; i++) {
      index = index * 26 + (col.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
    }
    return index - 1;
  };

  return {
    sheet: sheet || '0',
    startCol: colToIndex(startCol),
    endCol: colToIndex(endCol),
    startRow: parseInt(startRow) - 1,
    endRow: parseInt(endRow) - 1
  };
}

// Extract data based on range
function extractRange(data, type, range) {
  console.log('\n📊 Extracting range:', range);

  // This will depend on the actual data structure returned
  // We'll need to adapt based on what we get
  console.log('📝 Data structure:', JSON.stringify(data).substring(0, 200));

  // For now, save the raw data for inspection
  fs.writeFileSync('./kdocs-raw-data.json', JSON.stringify(data, null, 2));
  console.log('💾 Raw data saved to: kdocs-raw-data.json');

  // TODO: Implement actual range extraction based on data structure
  return [];
}

// Convert to CSV
function convertToCSV(values) {
  if (!values || values.length === 0) {
    return '';
  }

  const rows = values.map(row => {
    return row.map(cell => {
      const value = String(cell || '');
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });

  return rows.join('\n');
}

// Main function
async function main() {
  console.log('📄 KDocs API Extractor');
  console.log('='.repeat(60));

  // Validate configuration
  if (!config.accessToken) {
    console.error('\n❌ No access token found!');
    console.log('\n💡 To get your access token:');
    console.log('   1. Run: node kdocs-auth-helper.js');
    console.log('   2. Authorize the app in your browser');
    console.log('   3. Add the tokens to .env');
    console.log('   4. Run this script again\n');
    process.exit(1);
  }

  const fileToken = parseDocumentId(config.docUrl);
  if (!fileToken) {
    throw new Error('Invalid KDocs URL');
  }

  console.log(`\n📋 Document ID: ${fileToken}`);
  console.log(`📊 Range: ${config.range}`);

  try {
    // Try to get data
    let result = await getSpreadsheetData(fileToken, config.accessToken);

    if (!result) {
      console.log('\n⚠️  Access token might be expired. Trying to refresh...');
      const newToken = await refreshAccessToken();
      result = await getSpreadsheetData(fileToken, newToken);
    }

    if (result) {
      console.log('\n✅ Data retrieved!');

      // Parse range and extract data
      const rangeInfo = parseRange(config.range);
      const values = extractRange(result.data, result.type, rangeInfo);

      if (values.length > 0) {
        const csv = convertToCSV(values);
        fs.writeFileSync(config.outputFile, csv);

        console.log(`\n💾 Data saved to: ${config.outputFile}`);
        console.log(`📊 Rows: ${values.length}`);
        console.log(`📊 Columns: ${values[0]?.length || 0}`);
      } else {
        console.log('\n⚠️  No data extracted. Check kdocs-raw-data.json to see the structure.');
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);

    if (error.message.includes('401') || error.message.includes('token')) {
      console.log('\n💡 Your access token may have expired.');
      console.log('   Try running: node kdocs-auth-helper.js');
    }
  }

  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);
