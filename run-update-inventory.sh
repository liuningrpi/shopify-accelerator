#!/bin/bash

# Load environment variables from .env
export $(cat .env | grep -v ^# | xargs)

# Use delta.csv as default if no file specified
CSV_FILE="${1:-delta.csv}"

# Run the inventory update script
node update-inventory-by-barcode.js "$CSV_FILE"
