// process-ktest.js - Process ktest.csv and generate ShopifyReady.csv
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { parse } from 'csv-parse/sync';

const INPUT_FILE = './ktest.csv';
const OUTPUT_FILE = './ShopifyReady.csv';
const IMAGES_DIR = './images';
const BARCODE_TRACKING_FILE = './barcodes-used.json';
const VENDOR_CODE = 'CB';
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
 * Generate unique barcode with custom prefix
 * Format: PREFIX + 8 chars (hash of Name + timestamp)
 * Algorithm: MD5(Name + timestamp) → take first 8 hex chars → convert to alphanumeric
 */
function generateBarcodeWithPrefix(name, prefix = VENDOR_CODE) {
  const HASH_LENGTH = BARCODE_LENGTH - prefix.length;

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

    barcode = prefix + hashPart.padEnd(HASH_LENGTH, '0').substring(0, HASH_LENGTH);

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
 * Generate unique barcode with default prefix (for backward compatibility)
 */
function generateBarcode(name) {
  return generateBarcodeWithPrefix(name, VENDOR_CODE);
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

  // Find the header row - look for row containing 'Photo' and 'Name'
  let headerRowIndex = -1;
  for (let i = 0; i < allRows.length; i++) {
    const row = allRows[i];
    // Check if this row contains key column names
    if (row.includes('Photo') && row.includes('Name') && row.includes('IfNew')) {
      headerRowIndex = i;
      console.log(`📋 Found headers at row ${i + 1}`);
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('Could not find header row in CSV. Expected row with Photo, Name, IfNew columns.');
  }

  const headers = allRows[headerRowIndex]; // Header row
  const dataRows = allRows.slice(headerRowIndex + 1); // Data starts after header row

  console.log(`📋 Headers: ${headers.join(', ')}`);
  console.log(`📊 Data rows: ${dataRows.length}`);

  // Find column indices
  const getColumnIndex = (name) => headers.findIndex(h => h.trim() === name);

  const photoIdx = getColumnIndex('Photo');
  const photoNameIdx = getColumnIndex('PhotoName');
  const nameCNIdx = getColumnIndex('NameCN');
  const nameIdx = getColumnIndex('Name');
  const option1NameIdx = getColumnIndex('Option1 Name');
  const option1ValueIdx = getColumnIndex('Option1 Value');
  const variantInventoryIdx = getColumnIndex('Variant Inventory');
  const priceCNIdx = getColumnIndex('PriceCN');
  const discountIdx = getColumnIndex('Discount');
  const salePriceCNIdx = getColumnIndex('SalePriceCN');
  const ifNewIdx = getColumnIndex('IfNew');
  const barcodeIdx = getColumnIndex('Barcode');
  const vendorIdx = getColumnIndex('Vendor');

  console.log(`\n📍 Column indices:`);
  console.log(`   Photo: ${photoIdx}`);
  console.log(`   PhotoName: ${photoNameIdx} (optional, preferred if present)`);
  console.log(`   NameCN: ${nameCNIdx} (will be ignored)`);
  console.log(`   Name: ${nameIdx}`);
  console.log(`   Option1 Name: ${option1NameIdx}`);
  console.log(`   Option1 Value: ${option1ValueIdx}`);
  console.log(`   Variant Inventory: ${variantInventoryIdx}`);
  console.log(`   PriceCN: ${priceCNIdx}`);
  console.log(`   Discount: ${discountIdx}`);
  console.log(`   SalePriceCN: ${salePriceCNIdx}`);
  console.log(`   IfNew: ${ifNewIdx}`);
  console.log(`   Barcode: ${barcodeIdx} (optional, will generate if missing)`);
  console.log(`   Vendor: ${vendorIdx} (optional, first 2 letters used as barcode prefix)`);

  // Process each row
  const outputData = [];
  const barcodeMap = {}; // For logging

  console.log(`\n🔄 Processing rows...`);

  dataRows.forEach((row, idx) => {
    const rowNum = headerRowIndex + 2 + idx; // Actual row number in file (1-indexed)

    // Use PhotoName if available, otherwise use Photo
    let photoName = '';
    if (photoNameIdx >= 0 && row[photoNameIdx]) {
      photoName = row[photoNameIdx].trim();
    } else if (photoIdx >= 0 && row[photoIdx]) {
      photoName = row[photoIdx].trim();
    }

    const name = (row[nameIdx] || '').trim();
    const option1Name = (row[option1NameIdx] || '').trim();
    const option1Value = (row[option1ValueIdx] || '').trim();
    const variantInventory = (row[variantInventoryIdx] || '0').trim();
    const ifNew = (row[ifNewIdx] || '').trim();
    const vendor = (vendorIdx >= 0 && row[vendorIdx]) ? row[vendorIdx].trim() : '';

    // Calculate PriceCN if missing: PriceCN = SalePriceCN * Discount
    let priceCN = (row[priceCNIdx] || '').trim();
    if (!priceCN || priceCN === '0' || priceCN === '') {
      const salePriceCN = parseFloat(row[salePriceCNIdx] || '0');
      const discount = parseFloat(row[discountIdx] || '1');
      if (salePriceCN > 0 && discount > 0) {
        priceCN = (salePriceCN * discount).toString();
        console.log(`   ℹ️  Row ${rowNum}: Calculated PriceCN = ${salePriceCN} × ${discount} = ${priceCN}`);
      } else {
        priceCN = '0';
      }
    }

    // Translate variant names if enabled
    const option1NameEN = translate(option1Name);
    const option1ValueEN = translate(option1Value);

    if (!name) {
      console.log(`⚠️  Row ${rowNum}: Skipping - no Name`);
      return;
    }

    // Barcode logic based on IfNew status
    let barcode = '';
    let barcodeSource = '';

    if (ifNew === 'Y') {
      // NEW PRODUCT: Generate new barcode using algorithm
      // Determine barcode prefix from Vendor column or use default
      let barcodePrefix = VENDOR_CODE; // Default: CB
      if (vendorIdx >= 0 && row[vendorIdx] && row[vendorIdx].trim()) {
        const vendor = row[vendorIdx].trim();
        // Use first 2 letters of vendor name (uppercase)
        barcodePrefix = vendor.substring(0, 2).toUpperCase().replace(/[^A-Z]/g, '');
        // If less than 2 letters after filtering, use default
        if (barcodePrefix.length < 2) {
          barcodePrefix = VENDOR_CODE;
        }
      }

      // Generate new barcode with determined prefix
      const barcodeInput = option1Value ? `${name}_${option1Value}` : name;
      barcode = generateBarcodeWithPrefix(barcodeInput, barcodePrefix);
      barcodeSource = `generated (${barcodePrefix})`;
    } else {
      // OLD PRODUCT (IfNew = 'N'): Use barcode from Barcode column
      if (barcodeIdx >= 0 && row[barcodeIdx] && row[barcodeIdx].trim()) {
        let rawBarcode = row[barcodeIdx].trim();

        // Handle barcodes starting with ' (spreadsheet text format marker)
        if (rawBarcode.startsWith("'")) {
          rawBarcode = rawBarcode.substring(1);
        }

        // Extract only alphanumeric characters
        barcode = rawBarcode.replace(/[^A-Z0-9]/gi, '').toUpperCase();

        if (!barcode) {
          console.error(`\n❌ ERROR: Old product has invalid barcode!`);
          console.error(`   Row ${rowNum}: ${name}`);
          console.error(`   Raw barcode value: "${row[barcodeIdx].trim()}"`);
          console.error(`   After cleaning: "${barcode}" (empty)`);
          console.error(`\n⚠️  Barcode must contain at least one alphanumeric character.\n`);
          throw new Error(`Row ${rowNum}: Old product "${name}" has invalid barcode`);
        }

        // Log if barcode was cleaned
        const originalBarcode = row[barcodeIdx].trim();
        if (originalBarcode !== barcode) {
          barcodeSource = `from CSV (cleaned: "${originalBarcode}" → "${barcode}")`;
        } else {
          barcodeSource = 'from CSV';
        }
        // Add to used barcodes to prevent duplicates
        usedBarcodes.add(barcode);
      } else {
        // No barcode found for old product - STOP SCRIPT
        console.error(`\n❌ ERROR: Old product missing barcode!`);
        console.error(`   Row ${rowNum}: ${name}`);
        console.error(`   IfNew: ${ifNew}`);
        console.error(`   Barcode column: ${barcodeIdx >= 0 ? 'exists but empty' : 'missing'}`);
        console.error(`\n⚠️  Old products (IfNew = 'N') MUST have a barcode in the Barcode column.`);
        console.error(`   Please add the barcode for this product and try again.\n`);
        throw new Error(`Row ${rowNum}: Old product "${name}" is missing required barcode`);
      }
    }

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

    console.log(`✅ Row ${rowNum}: ${fullName} ${ifNew === 'Y' ? '(NEW)' : '(OLD)'}`);
    console.log(`   Barcode: ${barcode} (${barcodeSource})`);

    // Show photo source
    if (photoNameIdx >= 0 && row[photoNameIdx]) {
      console.log(`   Photo: ${photoName} (from PhotoName column) → ${photoFilename}`);
    } else {
      console.log(`   Photo: ${photoName} → ${photoFilename}`);
    }
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
      SalePrice: salePrice,
      Vendor: vendor
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
  const outputHeaders = ['Barcode', 'Name', 'Option1 Name', 'Option1 Value', 'Variant Inventory', 'SalePrice', 'Photo', 'IfNew', 'Vendor'];
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
  console.log('   Example: CB + 8 alphanumeric chars');
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
