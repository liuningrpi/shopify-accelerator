// process-kdocs-data.js - Process KDocs CSV export and update Shopify
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Configuration
const config = {
  kdocsFile: process.env.KDOCS_EXPORT_FILE || './kdocs-export.csv',
  outputFile: './delta.csv',
  startRow: parseInt(process.env.KDOCS_START_ROW || '10'),
  endRow: parseInt(process.env.KDOCS_END_ROW || '23'),
  barcodeColumn: process.env.KDOCS_BARCODE_COLUMN || 'B',
  quantityColumn: process.env.KDOCS_QUANTITY_COLUMN || 'I',
  autoUpdate: process.env.SHOPIFY_AUTO_UPDATE !== 'false'
};

// Convert column letter to index (A=0, B=1, etc.)
function columnToIndex(col) {
  let index = 0;
  for (let i = 0; i < col.length; i++) {
    index = index * 26 + (col.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
  }
  return index - 1;
}

// Process KDocs export
function processKDocsExport() {
  console.log('📄 KDocs to Shopify Processor');
  console.log('='.repeat(60));

  // Check if file exists
  if (!fs.existsSync(config.kdocsFile)) {
    console.error(`\n❌ File not found: ${config.kdocsFile}`);
    console.log('\n💡 Steps:');
    console.log('   1. Open KDocs document');
    console.log('   2. Export as CSV');
    console.log('   3. Save as: ' + config.kdocsFile);
    process.exit(1);
  }

  console.log(`\n📂 Reading: ${config.kdocsFile}`);

  // Read CSV
  const csv = fs.readFileSync(config.kdocsFile, 'utf8');
  const rows = parse(csv, { relax_column_count: true });

  console.log(`📊 Total rows in file: ${rows.length}`);
  console.log(`🎯 Extracting rows ${config.startRow} to ${config.endRow}`);

  // Get column indices
  const barcodeIdx = columnToIndex(config.barcodeColumn);
  const quantityIdx = columnToIndex(config.quantityColumn);

  console.log(`📍 Barcode column: ${config.barcodeColumn} (index ${barcodeIdx})`);
  console.log(`📍 Quantity column: ${config.quantityColumn} (index ${quantityIdx})`);

  // Extract data
  const deltaData = [];
  let processed = 0;
  let skipped = 0;

  for (let i = config.startRow - 1; i < config.endRow && i < rows.length; i++) {
    const row = rows[i];
    const barcode = row[barcodeIdx]?.toString().trim();
    const quantity = row[quantityIdx]?.toString().trim();

    if (!barcode || !quantity) {
      console.log(`⚠️  Row ${i + 1}: Missing barcode or quantity - skipped`);
      skipped++;
      continue;
    }

    // Validate quantity is a number
    const qty = parseInt(quantity);
    if (isNaN(qty)) {
      console.log(`⚠️  Row ${i + 1}: Invalid quantity "${quantity}" - skipped`);
      skipped++;
      continue;
    }

    console.log(`✅ Row ${i + 1}: ${barcode} → ${qty}`);
    deltaData.push({
      Barcode: barcode,
      'Variant Inventory': qty
    });
    processed++;
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Processing Summary');
  console.log('='.repeat(60));
  console.log(`✅ Processed: ${processed} rows`);
  console.log(`⚠️  Skipped: ${skipped} rows`);

  if (deltaData.length === 0) {
    console.log('\n❌ No valid data to process');
    process.exit(1);
  }

  // Create delta.csv
  console.log(`\n💾 Creating: ${config.outputFile}`);
  const csvOutput = [
    'Barcode,Variant Inventory',
    ...deltaData.map(row => `${row.Barcode},${row['Variant Inventory']}`)
  ].join('\n');

  fs.writeFileSync(config.outputFile, csvOutput, 'utf8');
  console.log(`✅ Saved ${deltaData.length} items to ${config.outputFile}`);

  // Preview
  console.log('\n📋 Preview:');
  console.log('─'.repeat(60));
  deltaData.slice(0, 5).forEach((row, idx) => {
    console.log(`${idx + 1}. ${row.Barcode} → +${row['Variant Inventory']} units`);
  });
  if (deltaData.length > 5) {
    console.log(`... and ${deltaData.length - 5} more`);
  }
  console.log('─'.repeat(60));

  return deltaData.length;
}

// Update Shopify inventory
async function updateShopify() {
  console.log('\n🛒 Updating Shopify Inventory');
  console.log('='.repeat(60));

  try {
    const { stdout, stderr } = await execAsync('./run-update-inventory.sh');
    console.log(stdout);
    if (stderr) console.error(stderr);

    console.log('\n✅ Shopify update complete!');
  } catch (error) {
    console.error('\n❌ Shopify update failed:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    const count = processKDocsExport();

    if (config.autoUpdate) {
      console.log('\n🚀 Auto-update enabled. Proceeding to Shopify...');
      await updateShopify();
    } else {
      console.log('\n⏸️  Auto-update disabled.');
      console.log('💡 To update Shopify, run: ./run-update-inventory.sh');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ Process Complete!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
