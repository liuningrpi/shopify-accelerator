#!/bin/bash

# Load environment variables from .env
export $(cat .env | grep -v ^# | xargs)

# Run the inventory update script
node update-inventory-by-barcode.js "$@"
