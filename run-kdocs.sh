#!/bin/bash

# Load environment variables from .env
export $(cat .env | grep -v ^# | xargs)

# Run the KDocs extractor
node kdocs-extract.js
