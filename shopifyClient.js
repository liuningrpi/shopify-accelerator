// shopifyClient.js
import fetch from "node-fetch";
import "dotenv/config";

const SHOP = process.env.SHOP_DOMAIN;
const TOKEN = process.env.ADMIN_ACCESS_TOKEN;
const API_VERSION = "2024-10";

export async function shopifyGraphQL(query, variables = {}) {
  const res = await fetch(`https://${SHOP}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();

  if (!res.ok || json.errors) {
    console.error("GraphQL error:", JSON.stringify(json, null, 2));
    throw new Error("Shopify GraphQL request failed");
  }

  return json.data;
}