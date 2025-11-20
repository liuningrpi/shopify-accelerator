# Shopify Management Tool

This Node.js application manages both Shopify orders and inventory using the Shopify Admin API.

## Features
- ✅ Create orders from CSV files
- ✅ Add products to inventory from CSV files
- ✅ Upload product images automatically
- ✅ Enable inventory tracking automatically
- ✅ Bulk processing with error handling
- ✅ Rate limiting to prevent API throttling

## Setup

1. **Configure your Shopify credentials** in `.env`:
   ```bash
   SHOP=your-shop.myshopify.com
   ADMIN_TOKEN=your_admin_api_access_token
   ```

3. **Set up product images** (optional):
   - Create an `images/` folder in the project directory
   - Place your product images in this folder
   - Reference images in your CSV using the `Photo` column
   - Supported formats: JPG, PNG, GIF, WebP

2. **Prepare your CSV files:**

**For inventory management** (`test.csv`) with columns:
   - `SKU` - Product SKU (optional - will be auto-generated if not provided)
   - `Title` - Product title/name
   - `Vendor` - Product vendor
   - `Type` - Product type/category (defaults to "Kitchenware")
   - `Price` - Product price (USD)
   - `Price( RMB)` - Alternative price field
   - `Photo` - Image filename (optional)
   - `Photo_Name` - Image alt text (optional)
   - Additional fields are supported

### 🏷️ SKU Auto-Generation
If no SKU is provided in the CSV, the system will automatically generate one using this format:

**Format:** `VENDOR-TYPE-INITIALS-DATE`

**Components:**
1. **Vendor** - Vendor name (cleaned, uppercase, alphanumeric only)
2. **Type** - Product type (cleaned, uppercase, alphanumeric only)
3. **Initials** - First letter of each word in the title (uppercase)
4. **Date** - Current date in YYYYMMDD format

**Examples:**
- Title: "Jar - Panda Color-Stripe" → SKU: `SHXM-KITCHENWARE-JPCS-20251120`
- Title: "Pink Orca Mug with Handle" → SKU: `SHXM-KITCHENWARE-POMWH-20251120`
- Title: "Bunny Apple Plate" → SKU: `SHXM-KITCHENWARE-BAP-20251120`

**For order creation** (`orders.csv`) with columns:
   - `email` - Customer email
   - `first_name` - Customer first name
   - `last_name` - Customer last name
   - `sku` - Product SKU
   - `quantity` - Order quantity
   - `price` - Unit price
   - `shipping_address1` - Shipping address
   - `shipping_city` - Shipping city
   - `shipping_province` - Shipping state/province
   - `shipping_zip` - Shipping ZIP code
   - `shipping_country` - Shipping country

## How to Run

### 📦 Add Products to Inventory (from test.csv)

**Option 1: Using the run script**
```bash
./run-inventory.sh
```

**Option 2: Manual execution**
```bash
# Load environment variables
export $(cat .env | grep -v ^# | xargs)

# Run the inventory script
node add-inventory.js
```

### 📝 Create Orders (from orders.csv)

**Option 1: Using the run script**
```bash
./run.sh
```

**Option 2: Manual execution**
```bash
# Load environment variables
export $(cat .env | grep -v ^# | xargs)

# Run the order creation script
node create-orders.js
```

## Requirements

- Node.js 18+ (for ES modules support)
- Valid Shopify store with Admin API access
- Products with matching SKUs in your Shopify store

## Notes

- The script will fail if a SKU doesn't exist in your Shopify store
- Orders are created one by one to avoid rate limiting
- Make sure your Admin API token has the necessary permissions for order creation and product management
- For product creation, the script automatically enables inventory tracking
- Images are uploaded with base64 encoding and support JPG, PNG, GIF, and WebP formats
- Failed products are logged to `failed-products.json` for review
- Successful products are saved to `successful-products.json` with Shopify IDs