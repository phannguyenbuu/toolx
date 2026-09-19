#!/bin/bash

# Script để bỏ yêu cầu đăng nhập cho các chức năng quan trọng

cd /root/toolxprint/src

# Backup file gốc
cp App.tsx App.tsx.backup

# Bỏ AuthGuard cho imposition
sed -i '/IMPOSITION PAGE/,/^      )}/ {
  s/<AuthGuard onLoginClick={() => setIsLoginModalOpen(true)}>/<div className="flex-1 overflow-hidden">/
  s/<\/AuthGuard>/<\/div>/
}' App.tsx

# Bỏ AuthGuard cho imposition-advanced  
sed -i '/IMPOSITION ADVANCED PAGE/,/^      )}/ {
  s/<AuthGuard onLoginClick={() => setIsLoginModalOpen(true)}>/<div className="flex-1 overflow-hidden">/
  s/<\/AuthGuard>/<\/div>/
}' App.tsx

# Bỏ AuthGuard cho file-manager
sed -i '/FILE MANAGER PAGE/,/^      )}/ {
  s/<AuthGuard onLoginClick={() => setIsLoginModalOpen(true)}>/<div className="flex-1 overflow-hidden">/
  s/<\/AuthGuard>/<\/div>/
}' App.tsx

# Cập nhật comment
sed -i 's/IMPOSITION PAGE - Auth required/IMPOSITION PAGE - No auth required/' App.tsx
sed -i 's/IMPOSITION ADVANCED PAGE - Auth required/IMPOSITION ADVANCED PAGE - No auth required/' App.tsx  
sed -i 's/FILE MANAGER PAGE - Auth required/FILE MANAGER PAGE - No auth required/' App.tsx

echo "✅ Đã bỏ yêu cầu đăng nhập cho các chức năng quan trọng"
