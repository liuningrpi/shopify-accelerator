#!/bin/bash

# Load environment variables from .env
export $(cat .env | grep -v ^# | xargs)

# Run the KDocs API extractor
node kdocs-api-extractor.js
