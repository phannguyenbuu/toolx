#!/bin/bash

# Simple test upload endpoint
curl -X POST http://localhost:3001/api/files/upload-multiple \
  -F "files=@/root/toolxprint/package.json" \
  -H "Content-Type: multipart/form-data" \
  -v

echo ""
echo "Testing through nginx proxy:"
curl -X POST http://localhost:3000/api/files/upload-multiple \
  -F "files=@/root/toolxprint/package.json" \
  -H "Content-Type: multipart/form-data" \
  -v
