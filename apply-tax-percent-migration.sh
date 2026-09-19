#!/bin/bash

# Script để apply migration thay certifications bằng tax_percent

echo "🔄 Đang apply migration: Thay certifications bằng tax_percent..."

# Kiểm tra xem có file .env không
if [ ! -f .env ]; then
    echo "❌ Không tìm thấy file .env"
    exit 1
fi

# Load environment variables
source .env

# Apply migration
psql "$SUPABASE_DB_URL" -f supabase-migration-tax-percent.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration thành công!"
    echo ""
    echo "📝 Các thay đổi:"
    echo "  - Đã xóa cột 'certifications' khỏi bảng print_shops"
    echo "  - Đã thêm cột 'tax_percent' (DECIMAL 5,2, mặc định 10)"
    echo "  - % Thuế này sẽ được sử dụng làm giá trị mặc định cho báo giá và hóa đơn"
else
    echo "❌ Migration thất bại!"
    exit 1
fi
