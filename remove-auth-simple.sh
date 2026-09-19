#!/bin/bash

# Script đơn giản để bỏ AuthGuard
cd /root/toolxprint/src

# Thay thế từng phần một cách chính xác
sed -i 's/IMPOSITION PAGE - Auth required/IMPOSITION PAGE - No auth required/' App.tsx
sed -i 's/IMPOSITION ADVANCED PAGE - Auth required/IMPOSITION ADVANCED PAGE - No auth required/' App.tsx  
sed -i 's/FILE MANAGER PAGE - Auth required/FILE MANAGER PAGE - No auth required/' App.tsx

# Bỏ AuthGuard cho imposition (chỉ thay thế trong block imposition)
sed -i '/currentPage === .imposition./,/^      )}/ s/<AuthGuard onLoginClick={() => setIsLoginModalOpen(true)}>/<div className="flex-1 overflow-hidden">/' App.tsx
sed -i '/currentPage === .imposition./,/^      )}/ s/<\/AuthGuard>/<\/div>/' App.tsx

# Bỏ AuthGuard cho imposition-advanced
sed -i '/currentPage === .imposition-advanced./,/^      )}/ s/<AuthGuard onLoginClick={() => setIsLoginModalOpen(true)}>/<div className="flex-1 overflow-hidden">/' App.tsx
sed -i '/currentPage === .imposition-advanced./,/^      )}/ s/<\/AuthGuard>/<\/div>/' App.tsx

# Bỏ AuthGuard cho file-manager
sed -i '/currentPage === .file-manager./,/^      )}/ s/<AuthGuard onLoginClick={() => setIsLoginModalOpen(true)}>/<div className="flex-1 overflow-hidden">/' App.tsx
sed -i '/currentPage === .file-manager./,/^      )}/ s/<\/AuthGuard>/<\/div>/' App.tsx

echo "✅ Hoàn thành bỏ yêu cầu đăng nhập cho các chức năng quan trọng"
