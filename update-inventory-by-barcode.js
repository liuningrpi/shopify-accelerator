// update-inventory-by-barcode.js - Update inventory quantities directly from barcode CSV
import fs from "fs";
import { parse } from "csv-parse/sync";
import { shopifyGraphQL } from "./shopifyClient.js";
import { shopifyREST } from "./restClient.js";

// Find product variant by barcode
async function findVariantByBarcode(barcode) {
  const query = `
    query findVariantByBarcode($query: String!) {
      productVariants(first: 1, query: $query) {
        edges {
          node {
            id
            title
            sku
            barcode
            price
            inventoryItem {
              id
            }
            inventoryQuantity
            product {
              id
              title
              vendor
              productType
            }
          }
        }
      }
    }
  `;

  const data = await shopifyGraphQL(query, { query: `barcode:${barcode}` });
  return data.productVariants.edges[0]?.node || null;
}

// Add quantity to existing inventory using REST API
async function addInventoryQuantity(inventoryItemId, locationId, currentQuantity, quantityToAdd) {
  // Calculate new total
  const newTotal = currentQuantity + quantityToAdd;

  // Extract numeric IDs from GraphQL IDs
  const numericInventoryItemId = inventoryItemId.split('/').pop();
  const numericLocationId = locationId.split('/').pop();

  // Use REST API to set inventory level to new total
  const endpoint = `inventory_levels/set.json`;
  const data = {
    location_id: parseInt(numericLocationId),
    inventory_item_id: parseInt(numericInventoryItemId),
    available: newTotal
  };

  const result = await shopifyREST(endpoint, "POST", data);
  return result.inventory_level;
}

// Main function to update inventory from CSV
async function updateInventoryFromBarcodeCsv(csvFilePath) {
  try {
    console.log("📦 Shopify Inventory Updater");
    console.log("=" .repeat(60));

    // Read and parse CSV file
    const csv = fs.readFileSync(csvFilePath, "utf8");
    const rows = parse(csv, { columns: true, skip_empty_lines: true });

    console.log(`\n📋 Found ${rows.length} items in CSV\n`);

    const updatedProducts = [];
    const notFoundBarcodes = [];
    const errors = [];

    // Get first location (primary location)
    const locationsQuery = `
      query {
        locations(first: 1) {
          edges {
            node {
              id
            }
          }
        }
      }
    `;
    const locationsData = await shopifyGraphQL(locationsQuery, {});
    const locationId = locationsData.locations.edges[0]?.node.id;

    if (!locationId) {
      throw new Error("No locations found in Shopify store");
    }

    console.log(`📍 Using primary location\n`);

    // Process each row
    for (const row of rows) {
      const barcode = row.Barcode || row.barcode || "";
      const quantityToAdd = parseInt(row["Variant Inventory"] || row["Variant Inventory Qty"] || row.quantity || "0", 10);

      if (!barcode) {
        console.log(`⚠️  Skipping row with empty barcode`);
        continue;
      }

      if (quantityToAdd === 0) {
        console.log(`⚠️  Skipping ${barcode} - quantity is 0`);
        continue;
      }

      console.log(`🔍 ${barcode} → Add ${quantityToAdd} units`);

      try {
        const variant = await findVariantByBarcode(barcode);

        if (variant) {
          const currentQty = variant.inventoryQuantity || 0;
          const newTotal = currentQty + quantityToAdd;

          console.log(`   ✅ ${variant.product.title} - ${variant.title}`);
          console.log(`      SKU: ${variant.sku} | Current: ${currentQty} + ${quantityToAdd} = ${newTotal}`);

          // Update inventory
          try {
            const inventoryItemId = variant.inventoryItem.id;
            await addInventoryQuantity(inventoryItemId, locationId, currentQty, quantityToAdd);

            console.log(`      ✅ Updated (+${quantityToAdd})`);

            updatedProducts.push({
              barcode,
              productTitle: variant.product.title,
              variantTitle: variant.title,
              sku: variant.sku,
              oldQuantity: currentQty,
              quantityAdded: quantityToAdd,
              newQuantity: newTotal
            });
          } catch (error) {
            console.log(`      ❌ Failed to update: ${error.message}`);
            errors.push({ barcode, error: error.message });
          }
        } else {
          console.log(`   ❌ Not found in inventory`);
          notFoundBarcodes.push({ barcode, quantityToAdd: quantityToAdd });
        }
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        errors.push({ barcode, error: error.message });
      }

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 Update Summary");
    console.log("=".repeat(60));
    console.log(`✅ Updated: ${updatedProducts.length} products`);
    console.log(`❌ Not found: ${notFoundBarcodes.length} barcodes`);
    console.log(`⚠️  Errors: ${errors.length}`);

    // Save update log
    if (updatedProducts.length > 0) {
      const updateLog = {
        updatedAt: new Date().toISOString(),
        locationId: locationId,
        totalUpdated: updatedProducts.length,
        updates: updatedProducts
      };

      fs.writeFileSync(
        "./inventory-update-log.json",
        JSON.stringify(updateLog, null, 2)
      );

      console.log(`\n💾 Update log saved to: inventory-update-log.json`);

      // Show summary stats
      const totalAdded = updatedProducts.reduce((sum, p) => sum + p.quantityAdded, 0);
      console.log(`\n📦 Total units added: ${totalAdded}`);
    }

    // Save errors
    if (notFoundBarcodes.length > 0) {
      console.log("\n" + "=".repeat(60));
      console.log("❌ Barcodes Not Found");
      console.log("=".repeat(60));

      notFoundBarcodes.forEach((item, index) => {
        console.log(`${index + 1}. ${item.barcode}`);
      });

      fs.writeFileSync(
        "./barcodes-not-found.json",
        JSON.stringify(notFoundBarcodes, null, 2)
      );
      console.log(`\n💾 Saved to: barcodes-not-found.json`);
    }

    if (errors.length > 0) {
      fs.writeFileSync(
        "./inventory-update-errors.json",
        JSON.stringify(errors, null, 2)
      );
      console.log(`\n💾 Errors saved to: inventory-update-errors.json`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("✨ Complete!");
    console.log("=".repeat(60));

  } catch (error) {
    console.error("❌ Error:", error.message);

    if (error.message.includes("ENOENT")) {
      console.log("💡 Make sure the CSV file exists");
    } else if (error.message.includes("GraphQL")) {
      console.log("💡 Check your Shopify credentials in .env");
    }
  }
}

// Get CSV file from command line or use default
const csvFile = process.argv[2] || "./delta.csv";

console.log(`\n📄 Reading: ${csvFile}\n`);

updateInventoryFromBarcodeCsv(csvFile).catch(console.error);
