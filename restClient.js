// restClient.js - REST API client for simpler operations
import fetch from "node-fetch";
import "dotenv/config";

const SHOP = process.env.SHOP_DOMAIN;
const TOKEN = process.env.ADMIN_ACCESS_TOKEN;
const API_VERSION = "2024-10";

export async function shopifyREST(endpoint, method = "GET", data = null) {
  const url = `https://${SHOP}/admin/api/${API_VERSION}/${endpoint}`;
  
  const options = {
    method,
    headers: {
      "X-Shopify-Access-Token": TOKEN,
      "Content-Type": "application/json",
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`REST API Error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// Update product variant using REST API
export async function updateVariantREST(variantId, variantData) {
  // Extract numeric ID from GraphQL ID
  const numericId = variantId.split('/').pop();
  
  const data = {
    variant: variantData
  };

  const result = await shopifyREST(`variants/${numericId}.json`, "PUT", data);
  return result.variant;
}

// Add product image using REST API
export async function addProductImageREST(productId, imageData) {
  // Extract numeric ID from GraphQL ID if needed
  const numericId = productId.includes('gid://') ? productId.split('/').pop() : productId;

  const data = {
    image: imageData
  };

  const result = await shopifyREST(`products/${numericId}/images.json`, "POST", data);
  return result.image;
}

// Create product with options and variants using REST API
export async function createProductWithVariantsREST(productData) {
  const data = {
    product: productData
  };

  const result = await shopifyREST(`products.json`, "POST", data);
  return result.product;
}

// Get product by ID using REST API
export async function getProductREST(productId) {
  const numericId = productId.includes('gid://') ? productId.split('/').pop() : productId;
  const result = await shopifyREST(`products/${numericId}.json`, "GET");
  return result.product;
}