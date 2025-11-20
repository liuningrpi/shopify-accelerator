// orderManager.js - Enhanced order management using the new shopifyClient
import { shopifyGraphQL } from "./shopifyClient.js";

// Get product variant by SKU
export async function getVariantBySku(sku) {
  const query = `
    query getVariantBySku($query: String!) {
      productVariants(first: 1, query: $query) {
        edges {
          node {
            id
            sku
            price
            product {
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

// Create a single order
export async function createOrder(orderData) {
  const mutation = `
    mutation orderCreate($input: OrderInput!) {
      orderCreate(input: $input) {
        order {
          id
          name
          email
          totalPrice
          createdAt
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyGraphQL(mutation, { input: orderData });
  
  if (data.orderCreate.userErrors?.length > 0) {
    throw new Error(`Order creation failed: ${data.orderCreate.userErrors[0].message}`);
  }

  return data.orderCreate.order;
}

// Create order from simplified data
export async function createOrderFromData({
  email,
  firstName,
  lastName,
  sku,
  quantity,
  price,
  shippingAddress
}) {
  // Get variant information
  const variant = await getVariantBySku(sku);
  if (!variant) {
    throw new Error(`Product variant with SKU '${sku}' not found`);
  }

  // Prepare order input
  const orderInput = {
    email,
    customer: {
      firstName,
      lastName,
      email
    },
    shippingAddress: {
      firstName,
      lastName,
      address1: shippingAddress.address1,
      city: shippingAddress.city,
      province: shippingAddress.province,
      zip: shippingAddress.zip,
      country: shippingAddress.country
    },
    lineItems: [{
      variantId: variant.id,
      quantity: parseInt(quantity, 10),
      originalUnitPrice: price || variant.price
    }]
  };

  return await createOrder(orderInput);
}

// Bulk create orders from array
export async function createOrdersBulk(ordersData) {
  const results = [];
  
  for (const orderData of ordersData) {
    try {
      const order = await createOrderFromData(orderData);
      console.log(`✅ Created order: ${order.name} for ${order.email}`);
      results.push({ success: true, order });
    } catch (error) {
      console.error(`❌ Failed to create order for ${orderData.email}:`, error.message);
      results.push({ success: false, error: error.message, data: orderData });
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  
  return results;
}