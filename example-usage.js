// example-usage.js - Example of using the new order management system
import { createOrderFromData, createOrdersBulk, getVariantBySku } from "./orderManager.js";

// Example 1: Create a single order
async function createSingleOrder() {
  try {
    const order = await createOrderFromData({
      email: "customer@example.com",
      firstName: "John",
      lastName: "Doe",
      sku: "SKU123",
      quantity: 2,
      price: "49.99",
      shippingAddress: {
        address1: "123 Main Street",
        city: "New York",
        province: "NY",
        zip: "10001",
        country: "US"
      }
    });
    
    console.log("Order created:", order);
  } catch (error) {
    console.error("Error creating order:", error.message);
  }
}

// Example 2: Create multiple orders
async function createMultipleOrders() {
  const ordersData = [
    {
      email: "alice@example.com",
      firstName: "Alice",
      lastName: "Smith",
      sku: "SKU456",
      quantity: 1,
      price: "99.99",
      shippingAddress: {
        address1: "456 Oak Avenue",
        city: "Los Angeles",
        province: "CA",
        zip: "90210",
        country: "US"
      }
    },
    {
      email: "bob@example.com",
      firstName: "Bob",
      lastName: "Johnson",
      sku: "SKU789",
      quantity: 3,
      price: "29.99",
      shippingAddress: {
        address1: "789 Pine Street",
        city: "Chicago",
        province: "IL",
        zip: "60601",
        country: "US"
      }
    }
  ];

  try {
    const results = await createOrdersBulk(ordersData);
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`\n📊 Summary:`);
    console.log(`✅ Successful orders: ${successful}`);
    console.log(`❌ Failed orders: ${failed}`);
    
    if (failed > 0) {
      console.log("\nFailed orders:");
      results.filter(r => !r.success).forEach((result, index) => {
        console.log(`${index + 1}. ${result.data.email}: ${result.error}`);
      });
    }
  } catch (error) {
    console.error("Error creating bulk orders:", error.message);
  }
}

// Example 3: Check if a SKU exists
async function checkSku() {
  try {
    const variant = await getVariantBySku("SKU123");
    if (variant) {
      console.log("Found variant:", {
        id: variant.id,
        sku: variant.sku,
        price: variant.price,
        product: variant.product.title
      });
    } else {
      console.log("Variant not found");
    }
  } catch (error) {
    console.error("Error checking SKU:", error.message);
  }
}

// Run examples (uncomment the one you want to test)
// createSingleOrder();
// createMultipleOrders();
// checkSku();

console.log("Example usage file ready. Uncomment the function you want to test and run: node example-usage.js");