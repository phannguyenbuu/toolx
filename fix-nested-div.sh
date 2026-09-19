#!/bin/bash

# Script sửa lỗi div lồng nhau
cd /root/toolxprint/src

# Sửa lỗi div lồng nhau cho imposition
sed -i '/IMPOSITION PAGE - No auth required/,/^      )}/ {
  /<div className="flex-1 overflow-hidden">/{
    N
    s/<div className="flex-1 overflow-hidden">\n          <div className="flex-1 overflow-hidden">/<div className="flex-1 overflow-hidden">/
  }
  s/<\/div>\n        <\/div>/<\/div>/
}' App.tsx

# Sửa lỗi div lồng nhau cho imposition-advanced
sed -i '/IMPOSITION ADVANCED PAGE - No auth required/,/^      )}/ {
  /<div className="flex-1 overflow-hidden">/{
    N
    s/<div className="flex-1 overflow-hidden">\n          <div className="flex-1 overflow-hidden">/<div className="flex-1 overflow-hidden">/
  }
  s/<\/div>\n        <\/div>/<\/div>/
}' App.tsx

# Sửa lỗi div lồng nhau cho file-manager
sed -i '/FILE MANAGER PAGE - No auth required/,/^      )}/ {
  /<div className="flex-1 overflow-hidden">/{
    N
    s/<div className="flex-1 overflow-hidden">\n          <div className="flex-1 overflow-hidden">/<div className="flex-1 overflow-hidden">/
  }
  s/<\/div>\n        <\/div>/<\/div>/
}' App.tsx

echo "✅ Đã sửa lỗi div lồng nhau"
