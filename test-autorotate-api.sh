#!/bin/bash

echo "🧪 Testing Auto-Rotate with Python API"
echo "======================================"
echo ""

# Create test landscape image
echo "📸 Creating test landscape image (1920x1080)..."
convert -size 1920x1080 xc:red -fill white -pointsize 100 -gravity center \
  -annotate +0+0 "LANDSCAPE\n1920x1080" /tmp/test-landscape.png

if [ ! -f /tmp/test-landscape.png ]; then
  echo "❌ Failed to create test image"
  exit 1
fi

echo "✅ Test image created: $(identify /tmp/test-landscape.png)"
echo ""

# Test 1: WITHOUT auto-rotate
echo "📤 Test 1: Sending WITHOUT auto-rotate..."
curl -s -X POST http://localhost:3005/api/generate-pdf \
  -F "file=@/tmp/test-landscape.png" \
  -F "itemW=210" \
  -F "itemH=297" \
  -F "pageW=210" \
  -F "pageH=297" \
  -F "autoRotate=0" \
  -F "processMode=raster" \
  -F "dpi=150" \
  -F "fitMode=fill" \
  -F 'pagesData=[{"rotation":0,"w":1920,"h":1080}]' \
  -o /tmp/test-no-autorotate.pdf

if [ -f /tmp/test-no-autorotate.pdf ]; then
  SIZE=$(stat -f%z /tmp/test-no-autorotate.pdf 2>/dev/null || stat -c%s /tmp/test-no-autorotate.pdf)
  echo "✅ PDF generated (no auto-rotate): $SIZE bytes"
  pdfinfo /tmp/test-no-autorotate.pdf 2>/dev/null | grep "Page size" || echo "   (pdfinfo not available)"
else
  echo "❌ Failed to generate PDF"
fi
echo ""

# Test 2: WITH auto-rotate
echo "📤 Test 2: Sending WITH auto-rotate..."
curl -s -X POST http://localhost:3005/api/generate-pdf \
  -F "file=@/tmp/test-landscape.png" \
  -F "itemW=210" \
  -F "itemH=297" \
  -F "pageW=210" \
  -F "pageH=297" \
  -F "autoRotate=1" \
  -F "processMode=raster" \
  -F "dpi=150" \
  -F "fitMode=fill" \
  -F 'pagesData=[{"rotation":0,"w":1920,"h":1080}]' \
  -o /tmp/test-with-autorotate.pdf

if [ -f /tmp/test-with-autorotate.pdf ]; then
  SIZE=$(stat -f%z /tmp/test-with-autorotate.pdf 2>/dev/null || stat -c%s /tmp/test-with-autorotate.pdf)
  echo "✅ PDF generated (with auto-rotate): $SIZE bytes"
  pdfinfo /tmp/test-with-autorotate.pdf 2>/dev/null | grep "Page size" || echo "   (pdfinfo not available)"
else
  echo "❌ Failed to generate PDF"
fi
echo ""

# Check Python logs
echo "📋 Python logs (last 20 lines with 'rotate'):"
tail -50 /root/toolxprint/python-new.log 2>/dev/null | grep -i "rotate" | tail -20 || echo "   No rotation logs found"
echo ""

echo "📁 Generated files:"
ls -lh /tmp/test-*.pdf 2>/dev/null || echo "   No PDFs generated"
echo ""

echo "✅ Test complete!"
echo ""
echo "To view PDFs:"
echo "  /tmp/test-no-autorotate.pdf"
echo "  /tmp/test-with-autorotate.pdf"
