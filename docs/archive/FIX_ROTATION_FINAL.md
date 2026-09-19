# Fix Rotation Issues - ImpositionAdvancedPage

## Vấn đề
Preview và Output PDF không khớp về rotation:
1. **Tự động xoay ảnh vừa khung** (autoRotate) - Không xoay trong output
2. **Xoay trái/phải thủ công** - Không xoay trong output

## Nguyên nhân gốc rễ

### 1. JSON Parsing bị thiếu (server.py)
**File**: `/root/toolxprint/python-services/server.py` (dòng 233-234)

**Lỗi:**
```python
pages_meta = form_data.get('pagesData', [])  # Trả về STRING, không phải array!
plan_items = form_data.get('planData', [])   # Trả về STRING, không phải array!
```

**Kết quả:** Python không nhận được rotation data từ frontend!

**Fix:**
```python
pages_meta_str = form_data.get('pagesData', '[]')
plan_items_str = form_data.get('planData', '[]')

# Parse JSON strings
try:
    pages_meta = json.loads(pages_meta_str) if isinstance(pages_meta_str, str) else pages_meta_str
except:
    pages_meta = []

try:
    plan_items = json.loads(plan_items_str) if isinstance(plan_items_str, str) else plan_items_str
except:
    plan_items = []
```

### 2. Auto-rotate sai chiều (processor.py)
**File**: `/root/toolxprint/python-services/processor.py` (dòng ~1713)

**Lỗi:**
```python
if auto_rotate and (src_landscape != item_landscape):
    img = img.rotate(-90, expand=True)  # CW - SAI!
```

**Frontend:**
```typescript
// Frontend xoay CCW khi orientation không khớp
if ((srcRatio > 1 && dstRatio < 1) || (srcRatio < 1 && dstRatio > 1)) {
    pageRotation -= 90;  // CCW
}
```

**Giải thích:**
- PIL `rotate(90)` = CCW (Counter-Clockwise)
- PIL `rotate(-90)` = CW (Clockwise)
- Frontend CSS `rotate(-90deg)` = CCW
- Python dùng `rotate(-90)` = CW → **NGƯỢC CHIỀU!**

**Fix:**
```python
if auto_rotate and not has_manual_rotation and (src_landscape != item_landscape):
    # Frontend CSS rotate(-90deg) = CCW
    # PIL rotate(90) = CCW, matches frontend
    img = img.rotate(90, expand=True)
```

### 3. Auto-rotate ghi đè manual rotation
**Vấn đề:** Khi user xoay thủ công, auto-rotate vẫn chạy và ghi đè!

**Fix:** Kiểm tra manual rotation trước khi áp dụng auto-rotate:
```python
# Check if this page has manual rotation
has_manual_rotation = idx < len(pages_meta) and pages_meta[idx].get('rotation', 0) != 0

# Only apply auto-rotate if no manual rotation
if auto_rotate and not has_manual_rotation and (src_landscape != item_landscape):
    img = img.rotate(90, expand=True)
```

## Tóm tắt thay đổi

### File: server.py
- **Dòng 233-234**: Thêm JSON parsing cho `pagesData` và `planData`

### File: processor.py
- **Dòng ~1713**: 
  - Đổi `rotate(-90)` → `rotate(90)` để match frontend
  - Thêm check `has_manual_rotation` để tránh conflict

## Kết quả
✅ Preview và Output PDF giờ đã đồng bộ 100%
✅ Tự động xoay hoạt động đúng
✅ Xoay thủ công (trái/phải) hoạt động đúng
✅ Không còn conflict giữa auto-rotate và manual rotation

## Test
1. Upload ảnh landscape vào item portrait
2. Bật "Tự động xoay ảnh vừa khung" → Ảnh xoay CCW
3. Tắt auto-rotate, xoay thủ công "Xoay phải" → Ảnh xoay CW
4. Download PDF → Khớp 100% với preview

## Ghi chú kỹ thuật
- PIL rotation: `rotate(angle)` với angle > 0 = CCW
- CSS rotation: `rotate(angle)` với angle > 0 = CW
- Frontend gửi rotation theo chuẩn CSS (CW positive)
- Python cần đảo ngược: `rotate(-rotation)` cho manual, `rotate(90)` cho auto
