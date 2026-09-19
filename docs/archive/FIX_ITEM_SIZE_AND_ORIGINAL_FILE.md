# Fix Kích Thước Item và File Gốc - ImpositionAdvancedPage

## 🐛 Vấn đề

### 1. Kích thước item giữa preview và output không chính xác
- **Circle shape**: Preview hiển thị đúng hình tròn, nhưng output PDF bị méo thành oval
- **Nguyên nhân**: Backend xử lý image với `itemW x itemH` thay vì `itemW x itemW` cho circle

### 2. File gốc không được xử lý
- **Output PDF bị mờ**: Chất lượng ảnh kém, không sắc nét
- **Nguyên nhân**: Frontend gửi thumbnail preview (200px max) thay vì ảnh gốc full resolution

## 🔍 Phân tích chi tiết

### Vấn đề 1: Kích thước Circle Shape

**Code lỗi trong `processor.py`:**

```python
# generate_pdf_vector() - dòng 853-855
target_w_px = mm_to_px(item_w, dpi)
target_h_px = mm_to_px(item_h, dpi)  # ❌ Sai với circle
processed_img = process_image_fit_mode(src_img, target_w_px, target_h_px, fit_mode, False)

# generate_pdf_multipage() - dòng 1794-1795
target_w_px = mm_to_px(item_w, dpi)
target_h_px = mm_to_px(item_h, dpi)  # ❌ Sai với circle
```

**Vấn đề**: 
- Circle shape cần `itemW x itemW` (hình vuông)
- Code dùng `itemW x itemH` → ảnh bị méo thành oval

### Vấn đề 2: Thumbnail thay vì File Gốc

**Code lỗi trong `ImpositionAdvancedPage.tsx`:**

```typescript
// dlPDF() - dòng 1102
const response = await fetch(page.thumb);  // ❌ Thumbnail nhỏ (200px)

// saveToFileManager() - dòng 1237
const response = await fetch(page.thumb);  // ❌ Thumbnail nhỏ (200px)
```

**Vấn đề**:
- `page.thumb`: Thumbnail preview 200px max (dòng 220-241)
- `page.originalThumb`: Ảnh gốc full resolution
- Backend nhận thumbnail 200px → scale lên → bị mờ

## ✅ Giải pháp đã áp dụng

### 1. Sửa kích thước xử lý image cho Circle Shape

**File**: `/root/toolxprint/python-services/processor.py`

#### a) Hàm `generate_pdf_vector()` (dòng 850-857)

```python
# TRƯỚC:
target_w_px = mm_to_px(item_w, dpi)
target_h_px = mm_to_px(item_h, dpi)
processed_img = process_image_fit_mode(src_img, target_w_px, target_h_px, fit_mode, False)

# SAU:
# For circle shape, use itemW for both dimensions
effective_item_h = item_w if shape == 'circle' else item_h
target_w_px = mm_to_px(item_w, dpi)
target_h_px = mm_to_px(effective_item_h, dpi)
processed_img = process_image_fit_mode(src_img, target_w_px, target_h_px, fit_mode, False)
```

#### b) Hàm `generate_pdf_multipage()` (dòng 1792-1797)

```python
# TRƯỚC:
processed_images = []
target_w_px = mm_to_px(item_w, dpi)
target_h_px = mm_to_px(item_h, dpi)

# SAU:
processed_images = []
# For circle shape, use itemW for both dimensions
effective_item_h = item_w if shape == 'circle' else item_h
target_w_px = mm_to_px(item_w, dpi)
target_h_px = mm_to_px(effective_item_h, dpi)
```

### 2. Sửa gửi ảnh gốc thay vì thumbnail

**File**: `/root/toolxprint/src/components/ImpositionAdvancedPage.tsx`

#### a) Hàm `dlPDF()` (dòng 1099-1110)

```typescript
// TRƯỚC:
for (let i = 0; i < allPages.length; i++) {
  const page = allPages[i];
  const response = await fetch(page.thumb);  // ❌ Thumbnail 200px
  const blob = await response.blob();
  const isPng = page.thumb.startsWith('data:image/png') || blob.type === 'image/png';
  ...
}

// SAU:
for (let i = 0; i < allPages.length; i++) {
  const page = allPages[i];
  // Use originalThumb (full resolution) instead of thumb (preview)
  const imageSource = page.originalThumb || page.thumb;
  const response = await fetch(imageSource);  // ✅ Ảnh gốc
  const blob = await response.blob();
  const isPng = imageSource.startsWith('data:image/png') || blob.type === 'image/png';
  ...
}
```

#### b) Hàm `saveToFileManager()` (dòng 1233-1244)

```typescript
// TRƯỚC:
const response = await fetch(page.thumb);  // ❌ Thumbnail 200px

// SAU:
// Use originalThumb (full resolution) instead of thumb (preview)
const imageSource = page.originalThumb || page.thumb;
const response = await fetch(imageSource);  // ✅ Ảnh gốc
```

## 🎯 Kết quả

### Vấn đề 1: Kích thước Circle Shape
- ✅ Circle shape giờ xử lý với `itemW x itemW` (hình vuông)
- ✅ Preview và output PDF giờ khớp nhau
- ✅ Không còn bị méo thành oval

### Vấn đề 2: Chất lượng ảnh
- ✅ Backend nhận ảnh gốc full resolution
- ✅ Output PDF sắc nét, không bị mờ
- ✅ Chất lượng in ấn tốt hơn

## 📋 Logic xử lý

### Circle Shape
```
itemW = 100mm
itemH = 50mm (bị bỏ qua)

→ effective_item_h = itemW = 100mm
→ target_w_px = mm_to_px(100, 300) = 1181px
→ target_h_px = mm_to_px(100, 300) = 1181px
→ Image processed: 1181x1181px (vuông)
```

### Rect/Oval Shape
```
itemW = 100mm
itemH = 50mm

→ effective_item_h = itemH = 50mm
→ target_w_px = mm_to_px(100, 300) = 1181px
→ target_h_px = mm_to_px(50, 300) = 591px
→ Image processed: 1181x591px (chữ nhật)
```

### Image Source Priority
```
1. page.originalThumb (ảnh gốc full resolution) ✅
2. page.thumb (thumbnail 200px) - fallback
```

## 🧪 Cách test

### Test 1: Circle Shape
1. Upload ảnh vào ImpositionAdvancedPage
2. Chọn shape = "Circle"
3. Set itemW = 100mm, itemH = 50mm
4. Click "Tính toán layout"
5. Click "Tạo PDF"
6. **Kết quả**: PDF output phải có hình tròn đúng, không bị méo

### Test 2: Chất lượng ảnh
1. Upload ảnh có text hoặc chi tiết nhỏ
2. Tạo layout và generate PDF
3. Zoom vào PDF output
4. **Kết quả**: Text/chi tiết phải sắc nét, không bị mờ

### Test 3: Rect/Oval Shape
1. Test với shape = "Rect" hoặc "Oval"
2. Set itemW = 100mm, itemH = 50mm
3. **Kết quả**: Phải giữ tỷ lệ 100:50, không bị vuông

## 📝 Files đã sửa

### Backend
- `/root/toolxprint/python-services/processor.py`
  - Dòng 850-857: `generate_pdf_vector()` - Circle shape fix
  - Dòng 1792-1797: `generate_pdf_multipage()` - Circle shape fix

### Frontend
- `/root/toolxprint/src/components/ImpositionAdvancedPage.tsx`
  - Dòng 1099-1110: `dlPDF()` - Use originalThumb
  - Dòng 1233-1244: `saveToFileManager()` - Use originalThumb

## ⚠️ Lưu ý

### Thumbnail vs Original
- **page.thumb**: Preview 200px max (dòng 220-241)
  - Dùng cho hiển thị UI
  - Không dùng cho PDF output
  
- **page.originalThumb**: Ảnh gốc full resolution
  - Dùng cho PDF output
  - Đảm bảo chất lượng in ấn

### Shape Types
- **Circle**: `effective_item_h = itemW` (bỏ qua itemH)
- **Rect/Oval/Others**: `effective_item_h = itemH` (giữ nguyên)

### DPI Calculation
```python
def mm_to_px(mm: float, dpi: int) -> int:
    return int(mm * dpi / 25.4)

# Example: 100mm @ 300dpi
# = 100 * 300 / 25.4
# = 1181px
```

## 🔄 Tương thích ngược

- ✅ Không ảnh hưởng đến các shape khác (rect, oval, triangle, etc.)
- ✅ Fallback `page.thumb` nếu không có `originalThumb`
- ✅ Tương thích với code cũ

---
**Trạng thái**: ✅ ĐÃ SỬA XONG
**Ngày**: 2026-01-30
**Files**: processor.py, ImpositionAdvancedPage.tsx
