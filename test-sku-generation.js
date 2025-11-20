// Test SKU generation with the new format
import fs from "fs";
import { parse } from "csv-parse/sync";

// Read test.csv
const csv = fs.readFileSync("./test.csv", "utf8");
const rows = parse(csv, { columns: true, skip_empty_lines: true });

console.log("🔍 Testing New SKU Generation Format");
console.log("=" .repeat(80));
console.log("Format: VENDOR-TYPE-INITIALS-DATE\n");

rows.forEach((row, index) => {
  const title = row.Title || row.title || "";
  const vendor = row.Vendor || row.vendor || "";
  const productType = row.Type || row.type || row.product_type || "Kitchenware";
  const option1Name = row["Option1 Name"] || row.option1_name || "";
  const option1Value = row["Option1 Value"] || row.option1_value || "";
  const hasVariants = !!(option1Name && option1Value);

  if (!title) return;

  // 1. Vendor name (clean, uppercase)
  const vendorCode = vendor.replace(/[^A-Z0-9]/gi, '').toUpperCase() || 'UNKNOWN';

  // 2. Product type (clean, uppercase)
  const typeCode = productType.replace(/[^A-Z0-9]/gi, '').toUpperCase();

  // 3. Extract initials from title (first letter of each word)
  const titleWords = title.split(/[\s\-,\.]+/).filter(word => word.length > 0);
  const initials = titleWords
    .map(word => word.charAt(0).toUpperCase())
    .join('');

  // 4. Current date in YYYYMMDD format
  const today = new Date();
  const dateCode = today.getFullYear() +
                  String(today.getMonth() + 1).padStart(2, '0') +
                  String(today.getDate()).padStart(2, '0');

  // 5. Base SKU
  let baseSku = `${vendorCode}-${typeCode}-${initials}-${dateCode}`;

  // 6. Append option value if this is a variant
  let sku = baseSku;
  if (hasVariants) {
    const optionCode = option1Value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    sku = `${baseSku}-${optionCode}`;
  }

  console.log(`${index + 1}. ${title}`);
  console.log(`   Vendor: ${vendor} → ${vendorCode}`);
  console.log(`   Type: ${productType} → ${typeCode}`);
  console.log(`   Initials: ${titleWords.join(' ')} → ${initials}`);
  console.log(`   Date: ${dateCode}`);
  if (hasVariants) {
    console.log(`   Option: ${option1Name} = ${option1Value} → ${option1Value.replace(/[^A-Z0-9]/gi, '').toUpperCase()}`);
  }
  console.log(`   ✅ SKU: ${sku}`);
  console.log("");
});

console.log("=" .repeat(80));
console.log("✨ SKU generation test complete!");
