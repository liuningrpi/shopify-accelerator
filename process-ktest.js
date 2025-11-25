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
  const getColumnIndex = (name) => headers.findIndex(h => h === name);

  const photoIdx = getColumnIndex('Photo');
  const nameCNIdx = getColumnIndex('NameCN');
  const nameIdx = getColumnIndex('Name');
  const stockIdx = getColumnIndex('Stock');
  const priceCNIdx = getColumnIndex('PriceCN');
  const ifNewIdx = getColumnIndex('IfNew');

  console.log(`\n📍 Column indices:`);
  console.log(`   Photo: ${photoIdx}`);
  console.log(`   NameCN: ${nameCNIdx} (will be ignored)`);
  console.log(`   Name: ${nameIdx}`);
  console.log(`   Stock: ${stockIdx}`);
  console.log(`   PriceCN: ${priceCNIdx}`);
  console.log(`   IfNew: ${ifNewIdx}`);

  // Process each row
  const outputData = [];
  const barcodeMap = {}; // For logging

  console.log(`\n🔄 Processing rows...`);

  dataRows.forEach((row, idx) => {
    const rowNum = idx + 3; // Actual row number in file

    const photoName = row[photoIdx] || '';
    const name = row[nameIdx] || '';
    const stock = row[stockIdx] || '0';
    const priceCN = row[priceCNIdx] || '0';
    const ifNew = row[ifNewIdx] || '';

    if (!name) {
      console.log(`⚠️  Row ${rowNum}: Skipping - no Name`);
      return;
    }

    // Generate barcode
    const barcode = generateBarcode(name);
    barcodeMap[name] = barcode;

    // Find photo (just filename, not path)
    const photoFilename = findPhotoFilename(photoName);

    // Calculate sale price (rounded up)
    const salePrice = calculateSalePrice(priceCN);

    console.log(`✅ Row ${rowNum}: ${name}`);
    console.log(`   Barcode: ${barcode}`);
    console.log(`   Photo: ${photoName} → ${photoFilename}`);
    console.log(`   Price: ¥${priceCN} → $${salePrice}`);

    outputData.push({
      Photo: photoFilename,
      Name: name,
      Stock: stock,
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
  const outputHeaders = ['Barcode', 'Name', 'Stock', 'SalePrice', 'Photo', 'IfNew'];
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
