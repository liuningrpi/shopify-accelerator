// add-orders.js - Simple script to add orders using the new system
import fs from "fs";
import { parse } from "csv-parse/sync";
import { createOrdersBulk } from "./orderManager.js";

async function addOrdersFromCsv() {
  try {
    // Read and parse CSV file
    const csv = fs.readFileSync("./orders.csv", "utf8");
    const rows = parse(csv, { columns: true, skip_empty_lines: true });

    // Convert CSV data to order format
    const ordersData = rows.map(row => ({
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      sku: row.sku,
      quantity: row.quantity,
      price: row.price,
      shippingAddress: {
        address1: row.shipping_address1,
        city: row.shipping_city,
        province: row.shipping_province,
        zip: row.shipping_zip,
        country: row.shipping_country
      }
    }));

    console.log(`📦 Processing ${ordersData.length} orders...`);

    // Create all orders
    const results = await createOrdersBulk(ordersData);

    // Show summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`\n🎉 Process completed!`);
    console.log(`✅ Successfully created: ${successful} orders`);
    console.log(`❌ Failed to create: ${failed} orders`);

    // Save failed orders for review
    if (failed > 0) {
      const failedOrders = results.filter(r => !r.success);
      fs.writeFileSync(
        "./failed-orders.json", 
        JSON.stringify(failedOrders, null, 2)
      );
      console.log(`💾 Failed orders saved to: failed-orders.json`);
    }

  } catch (error) {
    console.error("❌ Error processing orders:", error.message);
  }
}

// Run the script
addOrdersFromCsv();