#!/bin/bash

# Script cuối cùng để bỏ AuthGuard một cách chính xác
cd /root/toolxprint/src

# Tạo file tạm để xử lý
cp App.tsx App.tsx.temp

# Sử dụng awk để xử lý chính xác
awk '
/IMPOSITION PAGE - Auth required/ { gsub(/Auth required/, "No auth required") }
/IMPOSITION ADVANCED PAGE - Auth required/ { gsub(/Auth required/, "No auth required") }
/FILE MANAGER PAGE - Auth required/ { gsub(/Auth required/, "No auth required") }

# Xử lý block imposition
/currentPage === .imposition./ && !processed_imposition {
    print
    getline; print  # in dòng (
    getline; gsub(/AuthGuard onLoginClick.*>/, "div className=\"flex-1 overflow-hidden\">"); print
    getline; print  # div flex-1
    getline; print  # ImpositionPage
    getline; print  # </div>
    getline; gsub(/AuthGuard/, "div"); print
    processed_imposition = 1
    next
}

# Xử lý block imposition-advanced  
/currentPage === .imposition-advanced./ && !processed_advanced {
    print
    getline; print  # in dòng (
    getline; gsub(/AuthGuard onLoginClick.*>/, "div className=\"flex-1 overflow-hidden\">"); print
    getline; print  # div flex-1
    getline; print  # ImpositionAdvancedPage
    getline; print  # </div>
    getline; gsub(/AuthGuard/, "div"); print
    processed_advanced = 1
    next
}

# Xử lý block file-manager
/currentPage === .file-manager./ && !processed_filemanager {
    print
    getline; print  # in dòng (
    getline; gsub(/AuthGuard onLoginClick.*>/, "div className=\"flex-1 overflow-hidden\">"); print
    getline; print  # div flex-1
    getline; print  # FileManagerPage
    getline; print  # </div>
    getline; gsub(/AuthGuard/, "div"); print
    processed_filemanager = 1
    next
}

{ print }
' App.tsx.temp > App.tsx

rm App.tsx.temp

echo "✅ Hoàn thành sửa đổi AuthGuard"
