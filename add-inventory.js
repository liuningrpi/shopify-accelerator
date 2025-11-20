// add-inventory.js - Add products to Shopify inventory from test.csv
import fs from "fs";
import { parse } from "csv-parse/sync";
import { bulkAddToInventory } from "./inventoryManager.js";

async function addInventoryFromCsv() {
  try {
    // Read and parse CSV file
    const csv = fs.readFileSync("./test.csv", "utf8");
    const rows = parse(csv, { columns: true, skip_empty_lines: true });

    console.log(`📦 Found ${rows.length} products in test.csv`);

    // Convert CSV data to product format
    const productsData = rows.map((row, index) => {
      // Handle new CSV structure: Pic Name, Title, Vendor, Variant Price
      const title = row.Title || row.title || "";
      const vendor = row.Vendor || row.vendor || "";
      
      // Generate SKU from title and vendor if not provided
      let sku = row.SKU || row.sku || "";
      if (!sku && title) {
        // Create SKU from vendor and title (remove spaces, special chars, limit length)
        const vendorCode = vendor.replace(/[^A-Z0-9]/gi, '').substring(0, 4).toUpperCase() || 'PROD';
        const titleCode = title.replace(/[^A-Z0-9]/gi, '').substring(0, 8).toUpperCase();
        sku = `${vendorCode}-${titleCode}-${String(index + 1).padStart(3, '0')}`;
      }
      
      // Use Variant Price column
      let price = parseFloat(row["Variant Price"] || row.price || row.Price || "0");
      
      // Default quantity
      const quantity = parseInt(row.quantity || row.Quantity || "10", 10);
      
      // Default product type
      const productType = row.Type || row.type || row.product_type || "Kitchenware";
      
      // Handle tags - create from vendor and type
      let tags = [vendor, productType].filter(Boolean);
      if (row.tags) {
        tags = tags.concat(row.tags.split(',').map(tag => tag.trim()));
      }

      // Create description from available data
      let description = row.description || row.Description || "";
      if (!description && title) {
        description = `${title} - High quality product from ${vendor}`;
      }

      // Handle photo data - use Pic Name column (with BOM character handling)
      const photo = row["Pic Name"] || row["﻿Pic Name"] || row.Photo || row.photo || "";
      const photoName = row.photo_name || row.photo_alt || row.Photo_Name || row.Photo_Alt || title;

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
        imageAlt: photoName
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

    // Add all products to inventory
    const results = await bulkAddToInventory(productsData);

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
      console.log("💡 Make sure test.csv exists in the current directory");
    } else if (error.message.includes("GraphQL")) {
      console.log("💡 Check your Shopify credentials in the .env file");
    }
  }
}

// Run the script
console.log("🏪 Shopify Inventory Manager");
console.log("Reading from test.csv...\n");

addInventoryFromCsv();