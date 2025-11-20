// inventoryManager.js - Manage product inventory in Shopify
import { shopifyGraphQL } from "./shopifyClient.js";
import { updateVariantREST, addProductImageREST } from "./restClient.js";
import fs from "fs";
import path from "path";

// Create a new product (without variants in initial creation)
export async function createProduct(productData) {
  const mutation = `
    mutation productCreate($input: ProductInput!) {
      productCreate(input: $input) {
        product {
          id
          title
          handle
          status
          variants(first: 10) {
            edges {
              node {
                id
                title
                sku
                price
                inventoryQuantity
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  // Remove variants from productData as they're not supported in ProductInput
  const { variants, ...productInput } = productData;
  
  const data = await shopifyGraphQL(mutation, { input: productInput });
  
  if (data.productCreate.userErrors?.length > 0) {
    throw new Error(`Product creation failed: ${data.productCreate.userErrors[0].message}`);
  }

  return data.productCreate.product;
}

// Create a product variant
export async function createProductVariant(productId, variantData) {
  const mutation = `
    mutation productVariantCreate($input: ProductVariantInput!) {
      productVariantCreate(input: $input) {
        productVariant {
          id
          sku
          price
          inventoryQuantity
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const input = {
    productId,
    ...variantData
  };

  const data = await shopifyGraphQL(mutation, { input });
  
  if (data.productVariantCreate.userErrors?.length > 0) {
    throw new Error(`Variant creation failed: ${data.productVariantCreate.userErrors[0].message}`);
  }

  return data.productVariantCreate.productVariant;
}

// Update a product variant
export async function updateProductVariant(variantId, variantData) {
  const mutation = `
    mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          sku
          price
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  // For bulk update, we need the product ID
  // Let's get it from the variant first
  const getVariantQuery = `
    query getVariant($id: ID!) {
      productVariant(id: $id) {
        id
        sku
        price
        product {
          id
        }
      }
    }
  `;

  const variantData_result = await shopifyGraphQL(getVariantQuery, { id: variantId });
  const productId = variantData_result.productVariant.product.id;

  const input = {
    productId,
    variants: [{
      id: variantId,
      ...variantData
    }]
  };

  const data = await shopifyGraphQL(mutation, input);
  
  if (data.productVariantsBulkUpdate.userErrors?.length > 0) {
    throw new Error(`Variant update failed: ${data.productVariantsBulkUpdate.userErrors[0].message}`);
  }

  return data.productVariantsBulkUpdate.productVariants[0];
}

// Upload product image
async function uploadProductImage(productId, imagePath, altText = "") {
  if (!imagePath || !fs.existsSync(imagePath)) {
    console.log(`⚠️  Image file not found: ${imagePath}`);
    return null;
  }

  try {
    // Read image file and convert to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const extension = path.extname(imagePath).toLowerCase();
    
    // Determine MIME type
    let mimeType = 'image/jpeg';
    if (extension === '.png') mimeType = 'image/png';
    else if (extension === '.gif') mimeType = 'image/gif';
    else if (extension === '.webp') mimeType = 'image/webp';

    const imageData = {
      attachment: base64Image,
      filename: path.basename(imagePath),
      alt: altText
    };

    console.log(`📸 Uploading image: ${path.basename(imagePath)}`);
    const image = await addProductImageREST(productId, imageData);
    console.log(`✅ Image uploaded successfully`);
    
    return image;
  } catch (error) {
    console.log(`❌ Failed to upload image: ${error.message}`);
    return null;
  }
}

// Update inventory quantity for a variant
export async function updateInventoryQuantity(variantId, quantity, locationId = null) {
  // If no location provided, get the first location
  if (!locationId) {
    const locations = await getLocations();
    if (locations.length === 0) {
      throw new Error("No locations found in the store");
    }
    locationId = locations[0].id;
  }

  const mutation = `
    mutation inventorySetOnHandQuantities($input: InventorySetOnHandQuantitiesInput!) {
      inventorySetOnHandQuantities(input: $input) {
        inventoryAdjustmentGroup {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const input = {
    reason: "correction",
    setQuantities: [
      {
        inventoryItemId: await getInventoryItemId(variantId),
        locationId,
        quantity: parseInt(quantity, 10)
      }
    ]
  };

  const data = await shopifyGraphQL(mutation, { input });
  
  if (data.inventorySetOnHandQuantities.userErrors?.length > 0) {
    throw new Error(`Inventory update failed: ${data.inventorySetOnHandQuantities.userErrors[0].message}`);
  }

  return data.inventorySetOnHandQuantities.inventoryAdjustmentGroup;
}

// Get inventory item ID from variant
async function getInventoryItemId(variantId) {
  const query = `
    query getInventoryItem($id: ID!) {
      productVariant(id: $id) {
        inventoryItem {
          id
        }
      }
    }
  `;

  const data = await shopifyGraphQL(query, { id: variantId });
  return data.productVariant.inventoryItem.id;
}

// Get store locations
export async function getLocations() {
  const query = `
    query getLocations {
      locations(first: 10) {
        edges {
          node {
            id
            name
            isActive
          }
        }
      }
    }
  `;

  const data = await shopifyGraphQL(query);
  return data.locations.edges.map(edge => edge.node).filter(location => location.isActive);
}

// Find or create product by title and SKU
export async function findOrCreateProduct({
  title,
  sku,
  price,
  quantity = 0,
  description = "",
  productType = "",
  vendor = "",
  tags = [],
  imagePath = "",
  imageAlt = ""
}) {
  // First try to find existing product by SKU
  let variant = await findVariantBySku(sku);
  
  if (variant) {
    console.log(`📦 Found existing product: ${variant.product.title} (SKU: ${sku})`);
    
    // Update existing variant to enable tracking and set inventory
    console.log(`🔄 Updating existing product variant to enable tracking`);
    const updatedVariant = await updateVariantREST(variant.id, {
      inventory_management: "shopify",
      inventory_policy: "deny", // deny = track inventory
      inventory_quantity: quantity || 0
    });
    
    if (quantity > 0) {
      console.log(`✅ Updated existing product with tracking enabled and ${quantity} units`);
    }
    
    return variant;
  }

  // Create new product if not found
  console.log(`🆕 Creating new product: ${title} (SKU: ${sku})`);
  
  const productInput = {
    title,
    descriptionHtml: description,
    productType,
    vendor,
    tags,
    status: "ACTIVE"
  };

  const product = await createProduct(productInput);
  
  // Shopify automatically creates a default variant, let's update it with our SKU and price
  const defaultVariant = product.variants.edges[0].node;
  
  // Update the variant SKU, price, and enable tracking using REST API
  console.log(`🔄 Updating variant with SKU: ${sku}, price: $${price}, and enabling inventory tracking`);
  const updatedVariant = await updateVariantREST(defaultVariant.id, {
    sku: sku,
    price: price.toString(),
    inventory_management: "shopify",
    inventory_policy: "deny", // deny = track inventory
    inventory_quantity: quantity || 0
  });

  // Upload product image if provided
  if (imagePath) {
    await uploadProductImage(product.id, imagePath, imageAlt || title);
  }

  // Inventory tracking and quantity set via variant update
  console.log(`📈 Product created successfully with inventory tracking enabled and ${quantity || 0} units`);
  if (quantity > 0) {
    console.log(`✅ Initial inventory of ${quantity} units set automatically`);
  }

  return updatedVariant;
}

// Find variant by SKU
async function findVariantBySku(sku) {
  const query = `
    query findVariantBySku($query: String!) {
      productVariants(first: 1, query: $query) {
        edges {
          node {
            id
            sku
            price
            inventoryQuantity
            product {
              id
              title
              handle
            }
          }
        }
      }
    }
  `;

  const data = await shopifyGraphQL(query, { query: `sku:${sku}` });
  return data.productVariants.edges[0]?.node || null;
}

// Bulk add products to inventory
export async function bulkAddToInventory(productsData) {
  const results = [];
  
  for (const productData of productsData) {
    try {
      const variant = await findOrCreateProduct(productData);
      console.log(`✅ Processed: ${productData.title} (SKU: ${productData.sku})`);
      results.push({ success: true, variant, data: productData });
    } catch (error) {
      console.error(`❌ Failed to process ${productData.title}:`, error.message);
      results.push({ success: false, error: error.message, data: productData });
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}