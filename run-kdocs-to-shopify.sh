#!/bin/bash

# Load environment variables from .env
export $(cat .env | grep -v ^# | xargs)

# Process KDocs export and update Shopify
node process-kdocs-data.js
