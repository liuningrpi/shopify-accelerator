// test-connection.js - Test Shopify API connection
import { shopifyGraphQL } from "./shopifyClient.js";

async function testConnection() {
  console.log("🔍 Testing Shopify API Connection...");
  console.log("=====================================");
  
  // Check environment variables
  console.log("Shop Domain:", process.env.SHOP_DOMAIN);
  console.log("Token Preview:", process.env.ADMIN_ACCESS_TOKEN ? 
    process.env.ADMIN_ACCESS_TOKEN.substring(0, 10) + "..." : "NOT SET");
  
  try {
    // Simple query to test connection
    const query = `
      query {
        shop {
          name
          email
          myshopifyDomain
          plan {
            displayName
          }
        }
      }
    `;
    
    console.log("\n📡 Making test API call...");
    const data = await shopifyGraphQL(query);
    
    console.log("✅ Connection successful!");
    console.log("Shop Details:");
    console.log("  Name:", data.shop.name);
    console.log("  Domain:", data.shop.myshopifyDomain);
    console.log("  Email:", data.shop.email);
    console.log("  Plan:", data.shop.plan.displayName);
    
  } catch (error) {
    console.log("❌ Connection failed!");
    console.log("Error:", error.message);
    
    console.log("\n💡 Troubleshooting tips:");
    console.log("1. Check your .env file has the correct SHOP_DOMAIN and ADMIN_ACCESS_TOKEN");
    console.log("2. Verify your shop domain format: your-store.myshopify.com");
    console.log("3. Make sure your access token has the right permissions");
    console.log("4. Token should start with 'shpss_' or 'shpat_'");
  }
}

testConnection();