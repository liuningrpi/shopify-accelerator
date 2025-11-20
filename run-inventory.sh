#!/bin/bash

# Load environment variables from .env file
export $(cat .env | grep -v ^# | xargs)

echo "🏪 Starting Shopify Inventory Addition Process"
echo "=============================================="
echo "Shop: $SHOP_DOMAIN"
echo "Reading from: test.csv"
echo ""

# Run the inventory addition script
node add-inventory.js