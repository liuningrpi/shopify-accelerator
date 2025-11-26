#!/bin/bash

# Load environment variables from .env file
export $(cat .env | grep -v ^# | xargs)

echo "🏪 Shopify Inventory Sync - Two-Pass Process"
echo "=============================================="
echo "Shop: $SHOP_DOMAIN"
echo "Source: ShopifyReady.csv"
echo ""
echo "Pass 1: Add new products (IfNew = Y)"
echo "Pass 2: Update inventory quantities for all products"
echo "=============================================="
echo ""

# PASS 1: Add new products to Shopify
echo "📦 PASS 1: Adding New Products"
echo "─────────────────────────────────────────────"
node add-inventory.js

# Check if Pass 1 was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Pass 1 completed successfully"
    echo ""

    # Small delay to ensure Shopify has processed the new products
    echo "⏳ Waiting 3 seconds before updating inventory..."
    sleep 3
    echo ""

    # PASS 2: Update inventory quantities for all products
    echo "🔄 PASS 2: Updating Inventory Quantities"
    echo "─────────────────────────────────────────────"
    node update-inventory-by-barcode.js ShopifyReady.csv

    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Pass 2 completed successfully"
        echo ""
        echo "🎉 Shopify inventory sync complete!"
    else
        echo ""
        echo "❌ Pass 2 failed - check errors above"
        exit 1
    fi
else
    echo ""
    echo "❌ Pass 1 failed - skipping Pass 2"
    exit 1
fi