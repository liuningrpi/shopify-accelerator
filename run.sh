#!/bin/bash

# Load environment variables from .env file
export $(cat .env | grep -v ^# | xargs)

# Run the Node.js script
node create-orders.js