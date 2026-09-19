#!/bin/bash

echo "=== Verify Scale Fix Applied ==="
echo ""

echo "1. Kiểm tra code đã sửa:"
if grep -q "page\.w / page\.h.*Use original dimensions" /root/toolxprint/src/components/ImpositionAdvancedPage.tsx; then
    echo "   ✅ Code đã được sửa (dòng 215)"
else
    echo "   ❌ Code chưa được sửa"
fi

echo ""
echo "2. Kiểm tra React service:"
if ps aux | grep -q "node.*start.js" | grep -v grep; then
    echo "   ✅ React đang chạy"
else
    echo "   ❌ React không chạy"
fi

echo ""
echo "3. Kiểm tra Python service:"
if ps aux | grep -q "python.*server.py" | grep -v grep; then
    echo "   ✅ Python đang chạy"
else
    echo "   ❌ Python không chạy"
fi

echo ""
echo "4. Để thấy thay đổi, làm theo:"
echo "   a) Mở browser: http://localhost:3000"
echo "   b) Hard refresh: Ctrl+Shift+R (hoặc Cmd+Shift+R trên Mac)"
echo "   c) Hoặc: Ctrl+F5"
echo "   d) Hoặc: Clear cache và reload"
echo ""
echo "5. Kiểm tra trong console (F12):"
echo "   - Upload ảnh và set scale"
echo "   - Tìm log: '🔍 FRONTEND SCALE DEBUG'"
echo "   - Phải thấy 'originalDimensions' và 'thumbnailDimensions'"
echo "   - originalDimensions phải khác thumbnailDimensions"
echo ""
echo "6. Nếu vẫn không thấy:"
echo "   - Đóng tất cả tab browser"
echo "   - Mở lại browser mới"
echo "   - Hoặc dùng Incognito/Private mode"
echo ""

# Kiểm tra timestamp file
echo "7. Timestamp file đã sửa:"
stat -c "   Modified: %y" /root/toolxprint/src/components/ImpositionAdvancedPage.tsx

echo ""
echo "8. Test nhanh:"
echo "   curl http://localhost:3000 > /dev/null 2>&1 && echo '   ✅ Frontend accessible' || echo '   ❌ Frontend not accessible'"
curl http://localhost:3000 > /dev/null 2>&1 && echo '   ✅ Frontend accessible' || echo '   ❌ Frontend not accessible'

echo ""
