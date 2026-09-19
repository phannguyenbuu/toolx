#!/bin/bash

echo "=== Test Scale Mode Issue ==="
echo ""
echo "Vấn đề: Chế độ fit => chế độ scale theo tỷ lệ % đang bị lỗi"
echo ""

# Kiểm tra logic trong code
echo "1. Kiểm tra logic frontend (ImpositionAdvancedPage.tsx):"
echo "   - Khi customScale != 100 => fitMode = 'actual'"
grep -n "customScale !== 100" /root/toolxprint/src/components/ImpositionAdvancedPage.tsx | head -5

echo ""
echo "2. Kiểm tra logic backend (processor.py):"
echo "   - Xử lý mode 'actual' với custom_scale"
grep -n "elif mode == 'actual':" /root/toolxprint/python-services/processor.py

echo ""
echo "3. Vấn đề có thể là:"
echo "   a) Scale % đang tính dựa trên kích thước ảnh gốc"
echo "   b) Không đồng bộ giữa preview và output"
echo "   c) Logic scale không đúng với ý nghĩa 'scale theo tỷ lệ %'"
echo ""

echo "4. Kiểm tra log debug:"
if [ -f /root/toolxprint/backend.log ]; then
    echo "   Backend log (10 dòng cuối):"
    tail -10 /root/toolxprint/backend.log | grep -i "scale\|actual\|fitmode" || echo "   (Không có log scale gần đây)"
fi

echo ""
echo "=== Phân tích vấn đề ==="
echo ""
echo "Logic hiện tại:"
echo "  - Frontend: customScale = 50% => scale ảnh gốc xuống 50%"
echo "  - Backend: nhận scale 50% => scale ảnh gốc xuống 50%"
echo ""
echo "Vấn đề:"
echo "  - Nếu ảnh gốc 1000x1000px, item 100x100mm"
echo "  - Scale 50% => ảnh 500x500px"
echo "  - Nhưng user mong đợi: ảnh chiếm 50% diện tích item (50x50mm)"
echo "  - Kết quả: Không khớp nếu ảnh gốc != kích thước item"
echo ""
echo "Giải pháp đề xuất:"
echo "  1. Scale % nên dựa trên kích thước item, không phải ảnh gốc"
echo "  2. Hoặc: Fit ảnh vào item trước, sau đó scale theo %"
echo ""
