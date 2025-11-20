// test-rest-api.js - Test REST API instead of GraphQL
import fetch from "node-fetch";
import "dotenv/config";

async function testRestAPI() {
  console.log("🔍 Testing Shopify REST API Connection...");
  console.log("==========================================");
  
  const SHOP = process.env.SHOP_DOMAIN;
  const TOKEN = process.env.ADMIN_ACCESS_TOKEN;
  
  console.log("Shop Domain:", SHOP);
  console.log("Token Preview:", TOKEN ? TOKEN.substring(0, 10) + "..." : "NOT SET");
  
  try {
    // Test with REST API - get shop info
    const url = `https://${SHOP}/admin/api/2024-10/shop.json`;
    console.log("\n📡 Making REST API call to:", url);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json"
      }
    });
    
    console.log("Response Status:", response.status);
    console.log("Response Headers:", Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log("✅ REST API Connection successful!");
      console.log("Shop Details:");
      console.log("  Name:", data.shop.name);
      console.log("  Domain:", data.shop.myshopify_domain);
      console.log("  Email:", data.shop.email);
      console.log("  Plan:", data.shop.plan_name);
    } else {
      const errorText = await response.text();
      console.log("❌ REST API failed!");
      console.log("Error Response:", errorText);
    }
    
  } catch (error) {
    console.log("❌ Connection failed!");
    console.log("Error:", error.message);
  }
}

testRestAPI();