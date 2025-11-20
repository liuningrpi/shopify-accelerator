// add-images.js - Add images to existing products
import fs from "fs";
import { parse } from "csv-parse/sync";
import { addProductImageREST } from "./restClient.js";

async function addImagesToProducts() {
  try {
    // Read CSV file
    const csv = fs.readFileSync("./test.csv", "utf8");
    const rows = parse(csv, { columns: true, skip_empty_lines: true });

    // Read successful products to get product IDs
    const successfulProducts = JSON.parse(fs.readFileSync("./successful-products.json", "utf8"));

    console.log("🖼️  Adding images to existing products...\n");

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const product = successfulProducts[i];
      
      if (!product) {
        console.log(`⚠️  No product found for row ${i + 1}`);
        continue;
      }

      // Get photo from CSV
      const photo = row["Pic Name"] || row["﻿Pic Name"] || "";
      
      if (!photo) {
        console.log(`⚠️  No image specified for ${product.title}`);
        continue;
      }

      const imagePath = `./images/${photo}`;
      
      if (!fs.existsSync(imagePath)) {
        console.log(`❌ Image not found: ${imagePath}`);
        continue;
      }

      try {
        // Read and encode image
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        
        const imageData = {
          attachment: base64Image,
          filename: photo,
          alt: product.title
        };

        console.log(`📸 Uploading ${photo} for ${product.title}...`);
        
        // Extract numeric product ID from GraphQL ID
        const productId = product.shopify_product_id.split('/').pop();
        
        const result = await addProductImageREST(productId, imageData);
        console.log(`✅ Image uploaded successfully for ${product.title}`);
        
      } catch (error) {
        console.log(`❌ Failed to upload image for ${product.title}: ${error.message}`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log("\n🎉 Image upload process completed!");

  } catch (error) {
    console.error("❌ Error uploading images:", error.message);
  }
}

console.log("🖼️  Shopify Image Uploader");
addImagesToProducts();