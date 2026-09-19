#!/bin/bash
# Deploy rotation fix to production

echo "🚀 DEPLOY ROTATION FIX"
echo "="*70

# Files cần deploy
FILES=(
    "python-services/processor.py"
    "python-services/server.py"
    "src/components/ImpositionAdvancedPage.tsx"
)

echo "📦 Files cần deploy:"
for file in "${FILES[@]}"; do
    if [ -f "/root/toolxprint/$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ✗ $file - NOT FOUND"
    fi
done

echo ""
echo "🔧 Các thay đổi:"
echo "  1. processor.py: Áp dụng rotation từ pagesData"
echo "  2. server.py: Parse JSON pagesData đúng"
echo "  3. ImpositionAdvancedPage.tsx: Tính finalRotation (manual + auto)"

echo ""
echo "⚠️  LƯU Ý:"
echo "  - Cần restart Python service sau khi deploy"
echo "  - Cần rebuild frontend (npm run build)"
echo "  - Hoặc restart frontend dev server"

echo ""
echo "📋 Các bước deploy:"
echo "  1. Backup code hiện tại"
echo "  2. Copy files mới"
echo "  3. Restart services"

echo ""
read -p "Tiếp tục deploy? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Hủy deploy"
    exit 1
fi

# Backup
BACKUP_DIR="/root/toolxprint_backup_$(date +%Y%m%d_%H%M%S)"
echo ""
echo "💾 Backup to: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
for file in "${FILES[@]}"; do
    if [ -f "/root/toolxprint/$file" ]; then
        mkdir -p "$BACKUP_DIR/$(dirname $file)"
        cp "/root/toolxprint/$file" "$BACKUP_DIR/$file"
    fi
done

echo "✓ Backup completed"

# Restart Python service
echo ""
echo "🔄 Restarting Python service..."
pkill -f "python.*server.py"
sleep 2

cd /root/toolxprint/python-services
nohup python server.py > ../python-service.log 2>&1 &
PID=$!

echo "✓ Python service restarted (PID: $PID)"

# Check if frontend needs rebuild
echo ""
echo "📦 Frontend:"
if pgrep -f "react-scripts" > /dev/null; then
    echo "  ℹ️  Dev server đang chạy - sẽ tự động reload"
else
    echo "  ⚠️  Cần rebuild: cd /root/toolxprint && npm run build"
fi

echo ""
echo "✅ DEPLOY COMPLETED"
echo ""
echo "🧪 Test ngay:"
echo "  python3 /root/toolxprint/test_production.py"
