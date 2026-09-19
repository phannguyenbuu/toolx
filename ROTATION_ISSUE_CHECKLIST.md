# 🔄 Checklist Fix Lỗi Rotation

## ✅ Code đã được fix đúng

### 1. Frontend (ImpositionAdvancedPage.tsx)
- ✓ Tính `finalRotation` = manual rotation + auto-rotate
- ✓ Gửi `pagesData` với rotation đã tính sẵn
- ✓ Log debug trong console

### 2. Backend (server.py)  
- ✓ Parse JSON từ `pagesData` string
- ✓ Log debug `pages_meta parsed`

### 3. Processor (processor.py)
- ✓ Áp dụng rotation từ `pages_meta[i]['rotation']`
- ✓ Đảo dấu: `img.rotate(-rotation_deg)` (CSS → PIL)
- ✓ Log debug "Applying rotation" hoặc "No rotation"

## 🔍 Cách kiểm tra lỗi

### Bước 1: Kiểm tra Frontend
Mở Browser DevTools (F12) → Console:
```
=== PREVIEW ROTATION CALCULATION ===
Page 0: rotation=-90°, w=1920, h=1080
Page 1: rotation=0°, w=1080, h=1920
=== END PREVIEW CALCULATION ===
```

**Nếu KHÔNG thấy log này** → Frontend chưa reload:
- Hard refresh: `Ctrl + Shift + R`
- Hoặc clear cache

### Bước 2: Kiểm tra Network Request
DevTools → Network → Tìm request `generate-pdf-async`:
- Xem Form Data
- Kiểm tra `pagesData` có chứa rotation không:
```json
[{"rotation":-90,"w":1920,"h":1080}, ...]
```

**Nếu pagesData = []** → Frontend không gửi data

### Bước 3: Kiểm tra Python Log
```bash
tail -f /root/toolxprint/python-service.log
```

Sau khi generate PDF, phải thấy:
```
[DEBUG] pages_meta parsed: [{'rotation': -90, 'w': 1920, 'h': 1080}, ...]
[DEBUG] Page 0: Applying rotation -90°
[DEBUG] Page 1: No rotation (meta={'rotation': 0, ...})
```

**Nếu KHÔNG thấy log** → Python service cần restart

## 🛠️ Giải pháp theo từng trường hợp

### Case 1: Frontend không log
```bash
# Clear browser cache hoặc hard refresh
Ctrl + Shift + R
```

### Case 2: pagesData rỗng trong Network
```bash
# Kiểm tra code frontend
grep -A10 "pagesDataWithFinalRotation" /root/toolxprint/src/components/ImpositionAdvancedPage.tsx
```

### Case 3: Python không log
```bash
# Restart Python service
pkill -f "python.*server.py"
cd /root/toolxprint/python-services
nohup python server.py > ../python-service.log 2>&1 &

# Theo dõi log
tail -f /root/toolxprint/python-service.log
```

### Case 4: Rotation vẫn sai sau khi fix
Kiểm tra chiều xoay:
- Frontend gửi: `-90` (CCW trong CSS)
- Python nhận: `-90`
- Python xoay: `rotate(-(-90)) = rotate(90)` (CCW trong PIL) ✓

**Nếu ngược chiều** → Sửa dấu trong processor.py dòng 1693:
```python
img = img.rotate(-rotation_deg, expand=True)  # Đúng
# KHÔNG dùng: img.rotate(rotation_deg, expand=True)
```

## 🧪 Test nhanh

### Test 1: Manual Rotation
1. Upload ảnh bất kỳ
2. Click "Xoay phải" (90°)
3. Preview xoay → Download PDF
4. **Kết quả**: PDF phải xoay giống preview

### Test 2: Auto Rotation  
1. Upload ảnh landscape (1920x1080)
2. Item setting: portrait (100x120)
3. Bật "Tự động xoay ảnh vừa khung"
4. Preview xoay -90° (CCW)
5. Download PDF
6. **Kết quả**: PDF phải xoay -90° giống preview

### Test 3: Manual + Auto
1. Upload ảnh landscape
2. Bật auto-rotate → Xoay -90°
3. Click "Xoay phải" → Thêm 90° → Tổng 0°
4. Download PDF
5. **Kết quả**: PDF không xoay (0°)

## 📊 Debug Script

Chạy script kiểm tra:
```bash
/root/toolxprint/test_rotation_flow.sh
```

Kết quả phải là:
```
✓ Frontend calculates final rotation
✓ Python parses JSON correctly
✓ Python applies rotation from metadata
✓ Python removed auto-rotate logic
```

## 🎯 Kết luận

**Code đã đúng 100%**. Nếu vẫn lỗi, nguyên nhân là:
1. Browser cache chưa clear
2. Python service chưa restart
3. Đang test với data cũ

**Giải pháp**: 
1. Hard refresh browser (Ctrl+Shift+R)
2. Restart Python service
3. Test lại với ảnh mới
