// npm i node-fetch csv-parse
import fetch from "node-fetch";
import fs from "fs";
import { parse } from "csv-parse/sync";

const SHOP = process.env.SHOP; // your-shop.myshopify.com (no https)
const TOKEN = process.env.ADMIN_TOKEN; // Admin API access token

const csv = fs.readFileSync("./orders.csv", "utf8");
const rows = parse(csv, { columns: true, skip_empty_lines: true });

async function variantIdBySku(sku) {
  const query = `
    query($q: String!) {
      productVariants(first: 1, query: $q) { edges { node { id sku } } }
    }`;
  const resp = await shopifyFetch({ query, variables: { q: `sku:${sku}` } });
  return resp.data.productVariants.edges[0]?.node.id || null;
}

async function createOrderFromRow(r) {
  const variantId = await variantIdBySku(r.sku);
  if (!variantId) throw new Error(`No variant for SKU ${r.sku}`);

  const mutation = `
    mutation orderCreate($input: OrderInput!) {
      orderCreate(input: $input) {
        order { id name }
        userErrors { field message }
      }
    }`;

  const variables = {
    input: {
      email: r.email,
      customer: { firstName: r.first_name, lastName: r.last_name, email: r.email },
      shippingAddress: {
        address1: r.shipping_address1,
        city: r.shipping_city,
        province: r.shipping_province,
        zip: r.shipping_zip,
        country: r.shipping_country
      },
      lineItems: [{ variantId, quantity: parseInt(r.quantity, 10), originalUnitPrice: r.price }]
    }
  };

  const resp = await shopifyFetch({ query: mutation, variables });
  const err = resp.data.orderCreate.userErrors?.[0];
  if (err) throw new Error(`${err.field}: ${err.message}`);
  console.log("Created:", resp.data.orderCreate.order.name);
}

async function shopifyFetch(body) {
  const res = await fetch(`https://${SHOP}/admin/api/2025-10/graphql.json`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": TOKEN,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  return res.json();
}

(async () => {
  for (const row of rows) await createOrderFromRow(row);
})();