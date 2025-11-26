// process-ktest.js - Process ktest.csv and generate ShopifyReady.csv
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { parse } from 'csv-parse/sync';

const INPUT_FILE = './ktest.csv';
const OUTPUT_FILE = './ShopifyReady.csv';
const IMAGES_DIR = './images';
const BARCODE_TRACKING_FILE = './barcodes-used.json';
const VENDOR_CODE = 'SH';
const BARCODE_LENGTH = 10;
const TRANSLATE_VARIANTS = process.env.TRANSLATE_VARIANTS !== 'false'; // Default: true

// Translation dictionary for common product terms
const TRANSLATION_DICT = {
  // Variant types
  '颜色': 'Color',
  '尺寸': 'Size',
  '大小': 'Size',
  '材质': 'Material',
  '材料': 'Material',
  '款式': 'Style',
  '图案': 'Pattern',
  '容量': 'Capacity',

  // Colors
  '红色': 'Red',
  '蓝色': 'Blue',
  '绿色': 'Green',
  '黄色': 'Yellow',
  '黑色': 'Black',
  '白色': 'White',
  '灰色': 'Gray',
  '粉色': 'Pink',
  '紫色': 'Purple',
  '橙色': 'Orange',
  '棕色': 'Brown',
  '金色': 'Gold',
  '银色': 'Silver',

  // Sizes
  '小': 'Small',
  '中': 'Medium',
  '大': 'Large',
  '特大': 'Extra Large',
  '超大': 'Extra Large',

  // Materials
  '陶瓷': 'Ceramic',
  '玻璃': 'Glass',
  '塑料': 'Plastic',
  '木': 'Wood',
  '金属': 'Metal',
  '不锈钢': 'Stainless Steel',

  // Common terms
  '是': 'Yes',
  '否': 'No',
  'Y': 'Y',
  'N': 'N'
};

console.log('📄 Processing ktest.csv → ShopifyReady.csv');
console.log('='.repeat(60));

// Load or initialize barcode tracking
let usedBarcodes = new Set();
if (fs.existsSync(BARCODE_TRACKING_FILE)) {
  const data = JSON.parse(fs.readFileSync(BARCODE_TRACKING_FILE, 'utf8'));
  usedBarcodes = new Set(data.barcodes || []);
  console.log(`📋 Loaded ${usedBarcodes.size} existing barcodes`);
}

/**
 * Generate unique barcode
 * Format: SH + 8 digits (hash of Name + timestamp)
 * Algorithm: MD5(Name + timestamp) → take first 8 hex chars → convert to ensure numeric
 */
function generateBarcode(name) {
  const HASH_LENGTH = BARCODE_LENGTH - VENDOR_CODE.length;

  let barcode;
  let attempts = 0;
  const maxAttempts = 1000;

  do {
    // Create hash input: name + timestamp + attempt number
    const timestamp = Date.now();
    const input = `${name}_${timestamp}_${attempts}`;

    // Generate MD5 hash
    const hash = crypto.createHash('md5').update(input).digest('hex');

    // Take first HASH_LENGTH characters and convert to alphanumeric
    // Remove any special chars and ensure it's uppercase
    const hashPart = hash
      .substring(0, HASH_LENGTH)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    barcode = VENDOR_CODE + hashPart.padEnd(HASH_LENGTH, '0').substring(0, HASH_LENGTH);

    attempts++;

    if (attempts >= maxAttempts) {
      throw new Error(`Failed to generate unique barcode after ${maxAttempts} attempts for: ${name}`);
    }
  } while (usedBarcodes.has(barcode));

  // Mark as used
  usedBarcodes.add(barcode);

  return barcode;
}

/**
 * Find photo file in images directory and return just the filename
 */
function findPhotoFilename(photoName) {
  if (!photoName) return '';

  try {
    // Check if images directory exists
    if (!fs.existsSync(IMAGES_DIR)) {
      console.log(`⚠️  Images directory not found: ${IMAGES_DIR}`);
      return photoName; // Return original name
    }

    // List all files in images directory
    const files = fs.readdirSync(IMAGES_DIR);

    // Try exact match first
    if (files.includes(photoName)) {
      return photoName; // Return just filename
    }

    // Try case-insensitive match
    const lowerPhotoName = photoName.toLowerCase();
    const match = files.find(f => f.toLowerCase() === lowerPhotoName);

    if (match) {
      return match; // Return just filename
    }

    // Try match without extension
    const nameWithoutExt = photoName.replace(/\.[^.]+$/, '');
    const matchWithoutExt = files.find(f => {
      const fileWithoutExt = f.replace(/\.[^.]+$/, '');
      return fileWithoutExt.toLowerCase() === nameWithoutExt.toLowerCase();
    });

    if (matchWithoutExt) {
      return matchWithoutExt; // Return just filename
    }

    console.log(`⚠️  Photo not found: ${photoName}`);
    return photoName; // Return original if not found
  } catch (error) {
    console.error(`❌ Error finding photo ${photoName}:`, error.message);
    return photoName;
  }
}

/**
 * Translate Chinese text to English using dictionary
 */
function translate(text) {
  if (!text || !TRANSLATE_VARIANTS) return text;

  const trimmed = text.trim();

  // Try exact match first
  if (TRANSLATION_DICT[trimmed]) {
    return TRANSLATION_DICT[trimmed];
  }

  // Try case-insensitive match
  const lowerText = trimmed.toLowerCase();
  for (const [cn, en] of Object.entries(TRANSLATION_DICT)) {
    if (cn.toLowerCase() === lowerText) {
      return en;
    }
  }

  // If no translation found, return original
  return text;
}

/**
 * Calculate sale price (rounded up)
 * Formula: (PriceCN * 0.14 + 2) / 0.45
 */
function calculateSalePrice(priceCN) {
  const price = parseFloat(priceCN) || 0;
  const salePrice = (price * 0.14 + 2) / 0.45;
  return Math.ceil(salePrice).toString();
}

/**
 * Process CSV
 */
function processCSV() {
  console.log(`\n📂 Reading: ${INPUT_FILE}`);

  // Read CSV file
  const csv = fs.readFileSync(INPUT_FILE, 'utf8');

  // Parse CSV - skip first row (Chinese headers), use second row as headers
  const allRows = parse(csv, {
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true // Handle BOM
  });

  console.log(`📊 Total rows: ${allRows.length}`);

  // Row 0: Chinese headers (skip)
  // Row 1: English headers (use this)
  // Row 2+: Data

  if (allRows.length < 3) {
    throw new Error('CSV file must have at least 3 rows (Chinese headers, English headers, data)');
  }

  const headers = allRows[1]; // Second row as headers
  const dataRows = allRows.slice(2); // Data starts from row 3

  console.log(`📋 Headers: ${headers.join(', ')}`);
  console.log(`📊 Data rows: ${dataRows.length}`);

  // Find column indices
  const getColumnIndex = (name) => headers.findIndex(h => h.trim() === name);

  const photoIdx = getColumnIndex('Photo');
  const nameCNIdx = getColumnIndex('NameCN');
  const nameIdx = getColumnIndex('Name');
  const option1NameIdx = getColumnIndex('Option1 Name');
  const option1ValueIdx = getColumnIndex('Option1 Value');
  const variantInventoryIdx = getColumnIndex('Variant Inventory');
  const priceCNIdx = getColumnIndex('PriceCN');
  const ifNewIdx = getColumnIndex('IfNew');

  console.log(`\n📍 Column indices:`);
  console.log(`   Photo: ${photoIdx}`);
  console.log(`   NameCN: ${nameCNIdx} (will be ignored)`);
  console.log(`   Name: ${nameIdx}`);
  console.log(`   Option1 Name: ${option1NameIdx}`);
  console.log(`   Option1 Value: ${option1ValueIdx}`);
  console.log(`   Variant Inventory: ${variantInventoryIdx}`);
  console.log(`   PriceCN: ${priceCNIdx}`);
  console.log(`   IfNew: ${ifNewIdx}`);

  // Process each row
  const outputData = [];
  const barcodeMap = {}; // For logging

  console.log(`\n🔄 Processing rows...`);

  dataRows.forEach((row, idx) => {
    const rowNum = idx + 3; // Actual row number in file

    const photoName = (row[photoIdx] || '').trim();
    const name = (row[nameIdx] || '').trim();
    const option1Name = (row[option1NameIdx] || '').trim();
    const option1Value = (row[option1ValueIdx] || '').trim();
    const variantInventory = (row[variantInventoryIdx] || '0').trim();
    const priceCN = (row[priceCNIdx] || '0').trim();
    const ifNew = (row[ifNewIdx] || '').trim();

    // Translate variant names if enabled
    const option1NameEN = translate(option1Name);
    const option1ValueEN = translate(option1Value);

    if (!name) {
      console.log(`⚠️  Row ${rowNum}: Skipping - no Name`);
      return;
    }

    // For variants, include the variant value in barcode generation to ensure uniqueness
    const barcodeInput = option1Value ? `${name}_${option1Value}` : name;
    const barcode = generateBarcode(barcodeInput);

    // Build full product name with variant
    let fullName = name;
    if (option1Value) {
      fullName = `${name} - ${option1Value}`;
    }

    barcodeMap[fullName] = barcode;

    // Find photo (just filename, not path)
    const photoFilename = findPhotoFilename(photoName);

    // Calculate sale price (rounded up)
    const salePrice = calculateSalePrice(priceCN);

    console.log(`✅ Row ${rowNum}: ${fullName}`);
    console.log(`   Barcode: ${barcode}`);
    console.log(`   Photo: ${photoName} → ${photoFilename}`);
    if (option1Value) {
      console.log(`   Variant: ${option1Name} = ${option1Value}`);
      if (TRANSLATE_VARIANTS && (option1NameEN !== option1Name || option1ValueEN !== option1Value)) {
        console.log(`   Translated: ${option1NameEN} = ${option1ValueEN}`);
      }
    }
    console.log(`   Price: ¥${priceCN} → $${salePrice}`);

    outputData.push({
      Photo: photoFilename,
      Name: name, // Keep original name without variant
      'Option1 Name': option1NameEN,
      'Option1 Value': option1ValueEN,
      'Variant Inventory': variantInventory,
      IfNew: ifNew,
      Barcode: barcode,
      SalePrice: salePrice
    });
  });

  console.log(`\n📊 Processed ${outputData.length} rows`);

  // Save barcode tracking
  fs.writeFileSync(
    BARCODE_TRACKING_FILE,
    JSON.stringify({ barcodes: Array.from(usedBarcodes) }, null, 2)
  );
  console.log(`💾 Saved ${usedBarcodes.size} barcodes to: ${BARCODE_TRACKING_FILE}`);

  // Generate CSV output
  const outputHeaders = ['Barcode', 'Name', 'Option1 Name', 'Option1 Value', 'Variant Inventory', 'SalePrice', 'Photo', 'IfNew'];
  const csvLines = [
    outputHeaders.join(','),
    ...outputData.map(row => {
      return outputHeaders.map(header => {
        const value = String(row[header] || '');
        // Escape commas and quotes
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',');
    })
  ];

  const csvOutput = csvLines.join('\n');
  fs.writeFileSync(OUTPUT_FILE, csvOutput, 'utf8');

  console.log(`\n✅ Output saved to: ${OUTPUT_FILE}`);
  console.log(`📊 Rows: ${outputData.length}`);
  console.log(`📊 Columns: ${outputHeaders.join(', ')}`);

  // Show sample
  console.log(`\n📋 Sample output (first 3 rows):`);
  console.log('─'.repeat(60));
  console.log(outputHeaders.join(' | '));
  console.log('─'.repeat(60));
  outputData.slice(0, 3).forEach(row => {
    console.log(outputHeaders.map(h => (row[h] || '').substring(0, 15)).join(' | '));
  });
  console.log('─'.repeat(60));

  console.log('\n' + '='.repeat(60));
  console.log('✨ Complete!');
  console.log('='.repeat(60));

  console.log('\n📝 Barcode Generation Algorithm:');
  console.log('   Format: VENDOR_CODE (2 chars) + HASH (8 chars)');
  console.log('   Example: SH + 8 alphanumeric chars');
  console.log('   Method: MD5(Name + Timestamp + Attempt) → First 8 hex chars');
  console.log('   Uniqueness: Checked against barcodes-used.json');
  console.log('   Forward-safe: All generated barcodes are tracked for future runs');
}

// Main execution
try {
  processCSV();
} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
