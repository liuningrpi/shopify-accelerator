// add-inventory.js - Add products to Shopify inventory from test.csv
import fs from "fs";
import { parse } from "csv-parse/sync";
import { bulkAddToInventory, findOrCreateProduct, createProductWithVariants } from "./inventoryManager.js";

async function addInventoryFromCsv() {
  try {
    // Read and parse CSV file
    const csv = fs.readFileSync("./ShopifyReady.csv", "utf8");
    const rows = parse(csv, { columns: true, skip_empty_lines: true });

    console.log(`📦 Found ${rows.length} products in ShopifyReady.csv`);

    // Convert CSV data to product format (process all rows first)
    const productsData = rows.map((row, index) => {
      // Handle ShopifyReady.csv structure: Barcode, Name, Option1 Name, Option1 Value, Variant Inventory, SalePrice, Photo, IfNew
      const title = row.Name || row.name || row.Title || row.title || "";
      const vendor = row.Vendor || row.vendor || "SHXM"; // Default to SHXM vendor

      // Default product type (needed before SKU generation)
      const productType = row.Type || row.type || row.product_type || "Kitchenware";

      // Check if product has variants (options)
      const option1Name = row["Option1 Name"] || row.option1_name || "";
      const option1Value = row["Option1 Value"] || row.option1_value || "";
      const hasVariants = !!(option1Name && option1Value);

      // Generate SKU from title and vendor if not provided
      // New format: VENDOR-TYPE-INITIALS-DATE[-OPTIONVALUE]
      let sku = row.SKU || row.sku || "";
      if (!sku && title) {
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
        if (hasVariants) {
          const optionCode = option1Value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
          sku = `${baseSku}-${optionCode}`;
        } else {
          sku = baseSku;
        }
      }

      // Use SalePrice column from ShopifyReady.csv
      let price = parseFloat(row.SalePrice || row["Variant Price"] || row.price || row.Price || "0");

      // Use Variant Inventory column from ShopifyReady.csv
      const quantity = parseInt(row["Variant Inventory"] || row.quantity || row.Quantity || "0", 10);
      
      // Handle tags - create from vendor and type
      let tags = [vendor, productType].filter(Boolean);
      if (row.tags) {
        tags = tags.concat(row.tags.split(',').map(tag => tag.trim()));
      }

      // Use description from CSV only (leave blank if not provided)
      let description = row.description || row.Description || "";

      // Handle photo data - prioritize Photo column
      const photo = row.Photo || row.photo || row["Pic Name"] || row["﻿Pic Name"] || "";
      const photoName = row.photo_name || row.photo_alt || row.Photo_Name || row.Photo_Alt || title;

      // Handle barcode from CSV
      const barcode = row.Barcode || row.barcode || "";

      // Handle IfNew flag
      const ifNew = (row.IfNew || row.ifNew || row.ifnew || '').trim().toUpperCase();

      // Construct image path if photo is provided
      let imagePath = "";
      if (photo) {
        // Support both relative and absolute paths
        imagePath = photo.startsWith('/') ? photo : `./images/${photo}`;
      }

      return {
        title,
        sku,
        price,
        quantity,
        description,
        productType,
        vendor,
        tags,
        imagePath,
        imageAlt: photoName,
        hasVariants,
        option1Name,
        option1Value,
        barcode,
        ifNew
      };
    }).filter(product => product.title); // Only include products with title

    if (productsData.length === 0) {
      console.log("❌ No valid products found in CSV file");
      return;
    }

    console.log(`🚀 Processing ${productsData.length} valid products...`);
    console.log("\nProducts to be processed:");
    productsData.forEach((product, index) => {
      const imageInfo = product.imagePath ? ` - Image: ${product.imagePath}` : " - No image";
      console.log(`${index + 1}. ${product.title} (SKU: ${product.sku}) - $${product.price} - Qty: ${product.quantity}${imageInfo}`);
    });

    console.log("\n" + "=".repeat(60));
    console.log("Starting inventory addition process...");
    console.log("=".repeat(60));

    // Group products by title (to handle variants)
    const productGroups = new Map();
    productsData.forEach(product => {
      if (!productGroups.has(product.title)) {
        productGroups.set(product.title, []);
      }
      productGroups.get(product.title).push(product);
    });

    // Filter product groups - only keep groups where at least one variant has IfNew = 'Y'
    const newProductGroups = new Map();
    for (const [title, variants] of productGroups) {
      const hasNewVariant = variants.some(v => v.ifNew === 'Y');
      if (hasNewVariant) {
        newProductGroups.set(title, variants);
      } else {
        console.log(`⏭️  Skipping ${title} - no variants with IfNew = 'Y'`);
      }
    }

    const totalVariants = Array.from(newProductGroups.values()).reduce((sum, variants) => sum + variants.length, 0);
    console.log(`\n📊 Found ${newProductGroups.size} unique product(s) to process with ${totalVariants} total variant(s)`);

    // Process each product group
    const results = [];
    for (const [title, variants] of newProductGroups) {
      try {
        if (variants.length === 1 && !variants[0].hasVariants) {
          // Single product without variants - process normally
          console.log(`\n📦 Processing: ${title} (single product)`);
          const variant = await findOrCreateProduct(variants[0]);
          results.push({ success: true, variant, data: variants[0] });
        } else {
          // Product with multiple variants - create as one product with options
          console.log(`\n📦 Processing: ${title} (${variants.length} variants)`);
          console.log(`   Option: ${variants[0].option1Name} with values: ${variants.map(v => v.option1Value).join(', ')}`);

          const product = await createProductWithVariants(variants);

          // Add all variants to results
          variants.forEach((v, index) => {
            results.push({
              success: true,
              variant: product.variants[index],
              data: v
            });
            console.log(`   ✅ Created variant: ${v.option1Value} (SKU: ${v.sku})`);
          });
        }
      } catch (error) {
        console.error(`❌ Failed to process ${title}:`, error.message);
        variants.forEach(v => {
          results.push({ success: false, error: error.message, data: v });
        });
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Show summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log("\n" + "=".repeat(60));
    console.log("🎉 Process completed!");
    console.log("=".repeat(60));
    console.log(`✅ Successfully processed: ${successful} products`);
    console.log(`❌ Failed to process: ${failed} products`);

    // Save failed products for review
    if (failed > 0) {
      const failedProducts = results.filter(r => !r.success);
      fs.writeFileSync(
        "./failed-products.json", 
        JSON.stringify(failedProducts, null, 2)
      );
      console.log(`💾 Failed products saved to: failed-products.json`);
      
      console.log("\nFailed products:");
      failedProducts.forEach((result, index) => {
        console.log(`${index + 1}. ${result.data.title} (${result.data.sku}): ${result.error}`);
      });
    }

    // Save successful products summary
    if (successful > 0) {
      const successfulProducts = results.filter(r => r.success).map(r => ({
        title: r.data.title,
        sku: r.data.sku,
        shopify_variant_id: r.variant?.id || "unknown",
        shopify_product_id: r.variant?.product?.id || "unknown"
      }));
      
      fs.writeFileSync(
        "./successful-products.json", 
        JSON.stringify(successfulProducts, null, 2)
      );
      console.log(`📊 Successful products summary saved to: successful-products.json`);
    }

  } catch (error) {
    console.error("❌ Error processing inventory:", error.message);

    if (error.message.includes("ENOENT")) {
      console.log("💡 Make sure ShopifyReady.csv exists in the current directory");
    } else if (error.message.includes("GraphQL")) {
      console.log("💡 Check your Shopify credentials in the .env file");
    }
  }
}

// Run the script
console.log("🏪 Shopify Inventory Manager");
console.log("Reading from ShopifyReady.csv...\n");

addInventoryFromCsv();