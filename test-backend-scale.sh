#!/bin/bash

echo "🧪 Testing Scale Mode - Backend Calculation"
echo ""

# Test với curl
echo "Test 1: Upload ảnh và generate PDF..."

# Tạo form data
TEMP_DIR=$(mktemp -d)
cd $TEMP_DIR

# Copy test image
cp /root/toolxprint/test-landscape-2000x1000.png ./test.png

# Create simple layout plan
cat > plan.json << 'EOF'
[{"x":0,"y":0,"rot":0,"pageIndex":0}]
EOF

cat > pages.json << 'EOF'
[{"rotation":0,"w":2000,"h":1000}]
EOF

echo "Calling Python API..."
curl -X POST http://localhost:3005/api/generate-pdf \
  -F "files=@test.png" \
  -F "pagesData=$(cat pages.json)" \
  -F "planData=$(cat plan.json)" \
  -F "pageW=210" \
  -F "pageH=297" \
  -F "itemW=100" \
  -F "itemH=100" \
  -F "dpi=300" \
  -F "fitMode=actual" \
  -F "customScale=50" \
  -F "backgroundColor=#ffffff" \
  -F "colorMode=original" \
  -F "processMode=vector" \
  -F "shape=rect" \
  -F "totalOrder=1" \
  -o output.pdf \
  2>&1 | grep -i "error\|success" || echo "Request sent"

echo ""
echo "Checking backend log..."
tail -30 /root/toolxprint/python-service.log | grep -A10 "BACKEND SCALE DEBUG" | tail -15

echo ""
echo "Expected: Final scaled: 591x296px"
echo ""

# Cleanup
cd /root/toolxprint
rm -rf $TEMP_DIR
