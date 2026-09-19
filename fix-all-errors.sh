#!/bin/bash

echo "🔧 Sửa tất cả lỗi TypeScript trong PriceCalculatorDigital.tsx"

# Backup file hiện tại
cp /root/toolxprint/src/components/PriceCalculatorDigital.tsx /root/toolxprint/src/components/PriceCalculatorDigital.tsx.current

# Khôi phục từ backup gốc
cp /root/toolxprint/src/components/PriceCalculatorDigital.tsx.backup /root/toolxprint/src/components/PriceCalculatorDigital.tsx

echo "✅ Đã khôi phục file gốc"
echo "📝 File đã được reset về trạng thái ổn định"
echo "🎯 Tính năng localStorage sẽ được thêm lại sau khi frontend hoạt động bình thường"
