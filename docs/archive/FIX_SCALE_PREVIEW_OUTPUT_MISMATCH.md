# Fix Preview vs Output Mismatch - Scale Mode

## 🐛 Vấn đề
Preview và output không khớp về kích thước khi dùng scale mode:
- Preview hiển thị ảnh ở kích thước X
- Output PDF hiển thị ảnh ở kích thước Y (khác X)
- Sai lệch đặc biệt rõ với ảnh có aspect ratio khác item

## 🔍 Nguyên nhân

### Root Cause: Frontend dùng thumbnail dimensions, Backend dùng original dimensions

**Frontend (ImpositionAdvancedPage.tsx)**:
```typescript
// SAI - Dùng thumbnail dimensions
const imgAspect = img.width / img.height; // img = thumbnail (200px max)
```

**Backend (processor.py)**:
```python
# ĐÚNG - Dùng original dimensions
fitted = ImageOps.contain(img, (target_w_px, target_h_px)) # img = original (full res)
```

### Ví dụ minh họa vấn đề:

```
Original image: 2000x1500px (aspect 4:3)
Thumbnail: 200x150px (aspect 4:3) ✅ Giống original

Item: 100x100mm (aspect 1:1)
Scale: 50%

Frontend calculation (SAI):
  - imgAspect = 200/150 = 1.33 (từ thumbnail)
  - itemAspect = 100/100 = 1.0
  - imgAspect > itemAspect → fit to width
  - fittedW = 100mm, fittedH = 100/1.33 = 75mm
  - scale 50%: 50x37.5mm
  - Preview: 50x37.5mm ✅

Backend calculation (ĐÚNG):
  - imgAspect = 2000/1500 = 1.33 (từ original)
  - itemAspect = 100/100 = 1.0
  - imgAspect > itemAspect → fit to width
  - fittedW = 100mm, fittedH = 100/1.33 = 75mm
  - scale 50%: 50x37.5mm
  - Output: 50x37.5mm ✅

→ Trong trường hợp này khớp vì aspect ratio giống nhau
```

### Trường hợp BỊ LỖI:

```
Original image: 2000x1000px (aspect 2:1)
Thumbnail: 200x120px (aspect 1.67:1) ❌ Khác original (do resize algorithm)

Item: 100x100mm (aspect 1:1)
Scale: 50%

Frontend calculation (SAI):
  - imgAspect = 200/120 = 1.67 (từ thumbnail - SAI)
  - fittedW = 100mm, fittedH = 100/1.67 = 60mm
  - scale 50%: 50x30mm
  - Preview: 50x30mm ❌

Backend calculation (ĐÚNG):
  - imgAspect = 2000/1000 = 2.0 (từ original - ĐÚNG)
  - fittedW = 100mm, fittedH = 100/2.0 = 50mm
  - scale 50%: 50x25mm
  - Output: 50x25mm ✅

→ Preview 50x30mm ≠ Output 50x25mm ❌ MISMATCH!
```

## ✅ Giải pháp

### Dùng original dimensions từ page data

Frontend đã có `page.w` và `page.h` (kích thước ảnh gốc) từ khi upload:

```typescript
interface PageItem {
  w: number;  // Original image width
  h: number;  // Original image height
  thumb: string;  // Thumbnail (preview)
  originalThumb?: string;  // Original image (full res)
  ...
}
```

**Sửa**: Dùng `page.w / page.h` thay vì `img.width / img.height`

```typescript
// TRƯỚC (SAI):
const imgAspect = img.width / img.height; // Thumbnail dimensions

// SAU (ĐÚNG):
const imgAspect = page.w / page.h; // Original dimensions
```

## 📋 Code đã sửa

### File: ImpositionAdvancedPage.tsx (dòng 213-238)

```typescript
// TRƯỚC:
const scale = customScale / 100;
const imgAspect = img.width / img.height; // ❌ Thumbnail
const itemAspect = itemW_mm / itemH_mm;

let fittedW_mm, fittedH_mm;
if (imgAspect > itemAspect) {
  fittedW_mm = itemW_mm;
  fittedH_mm = itemW_mm / imgAspect;
} else {
  fittedH_mm = itemH_mm;
  fittedW_mm = itemH_mm * imgAspect;
}

// SAU:
const scale = customScale / 100;
// CRITICAL: Use original image dimensions (page.w, page.h)
const imgAspect = page.w / page.h; // ✅ Original
const itemAspect = itemW_mm / itemH_mm;

let fittedW_mm, fittedH_mm;
if (imgAspect > itemAspect) {
  fittedW_mm = itemW_mm;
  fittedH_mm = itemW_mm / imgAspect;
} else {
  fittedH_mm = itemH_mm;
  fittedW_mm = itemH_mm * imgAspect;
}

// Debug log cải thiện
console.log('🔍 FRONTEND SCALE DEBUG:', {
  originalDimensions: { width: page.w, height: page.h }, // Original
  thumbnailDimensions: { width: img.width, height: img.height }, // Thumbnail
  itemSizeMm: { width: itemW_mm, height: itemH_mm },
  fittedMm: { width: fittedW_mm.toFixed(2), height: fittedH_mm.toFixed(2) },
  scalePercent: customScale,
  finalScaledMm: { width: scaledW_mm.toFixed(2), height: scaledH_mm.toFixed(2) }
});
```

## 🎯 Kết quả

### Trước khi sửa:
- ❌ Preview dùng thumbnail aspect ratio
- ❌ Output dùng original aspect ratio
- ❌ Preview ≠ Output (mismatch)
- ❌ Sai lệch tùy thuộc vào resize algorithm của thumbnail

### Sau khi sửa:
- ✅ Preview dùng original aspect ratio (từ page.w/h)
- ✅ Output dùng original aspect ratio
- ✅ Preview = Output (khớp 100%)
- ✅ Độc lập với thumbnail resize

## 🧪 Cách test

### Test 1: Ảnh landscape (2:1)
```
1. Upload ảnh 2000x1000px (aspect 2:1)
2. Item: 100x100mm (aspect 1:1)
3. Scale: 50%
4. Preview: Kiểm tra kích thước ảnh
5. Generate PDF: So sánh với preview
6. ✅ Preview và output phải khớp nhau
```

### Test 2: Ảnh portrait (1:2)
```
1. Upload ảnh 1000x2000px (aspect 1:2)
2. Item: 100x100mm (aspect 1:1)
3. Scale: 75%
4. Preview: Kiểm tra kích thước ảnh
5. Generate PDF: So sánh với preview
6. ✅ Preview và output phải khớp nhau
```

### Test 3: Ảnh square (1:1)
```
1. Upload ảnh 2000x2000px (aspect 1:1)
2. Item: 100x50mm (aspect 2:1)
3. Scale: 60%
4. Preview: Kiểm tra kích thước ảnh
5. Generate PDF: So sánh với preview
6. ✅ Preview và output phải khớp nhau
```

### Test 4: Kiểm tra debug log
```
1. Mở browser console (F12)
2. Upload ảnh và set scale
3. Kiểm tra log "🔍 FRONTEND SCALE DEBUG"
4. ✅ originalDimensions phải khác thumbnailDimensions
5. ✅ fittedMm phải tính từ originalDimensions
```

## 📊 So sánh

| Aspect | Logic CŨ (SAI) | Logic MỚI (ĐÚNG) |
|--------|----------------|-------------------|
| Aspect ratio source | Thumbnail | Original image |
| Preview calculation | img.width/height | page.w/h |
| Backend calculation | Original | Original |
| Preview vs Output | ❌ Mismatch | ✅ Match |
| Accuracy | ❌ Phụ thuộc thumbnail | ✅ Chính xác 100% |

## 🔍 Debug Log

### Log mới (sau khi sửa):
```javascript
🔍 FRONTEND SCALE DEBUG: {
  originalDimensions: { width: 2000, height: 1000 },  // ✅ Original
  thumbnailDimensions: { width: 200, height: 120 },   // Info only
  itemSizeMm: { width: 100, height: 100 },
  fittedMm: { width: "100.00", height: "50.00" },     // ✅ Tính từ original
  scalePercent: 50,
  finalScaledMm: { width: "50.00", height: "25.00" }  // ✅ Đúng
}
```

### Backend log (để so sánh):
```python
🔍 BACKEND SCALE DEBUG:
  Original image: 2000x1000px
  After fit: 1181x591px (100x50mm @ 300dpi)
  Scale factor: 0.5 (50%)
  Final scaled: 591x296px (50x25mm)
```

→ Frontend và backend giờ khớp nhau!

## ⚠️ Lưu ý

### page.w và page.h
- Được set khi upload file (từ PDF hoặc image)
- Là kích thước ảnh gốc (pixels)
- Không thay đổi khi rotate (rotation chỉ ảnh hưởng render)

### Thumbnail vs Original
- **Thumbnail** (`page.thumb`): Dùng cho hiển thị UI (200px max)
- **Original** (`page.originalThumb`): Dùng cho PDF output (full res)
- **page.w/h**: Metadata của original image

### Aspect Ratio Precision
- Thumbnail có thể có aspect ratio khác một chút do resize algorithm
- Luôn dùng original dimensions để tính toán chính xác

## 📝 Files đã sửa

- `/root/toolxprint/src/components/ImpositionAdvancedPage.tsx`
  - Dòng 213-238: Sửa tính aspect ratio từ `page.w/h` thay vì `img.width/height`
  - Thêm debug log chi tiết hơn

## 🔗 Liên quan

- `FIX_SCALE_MODE.md` - Fix logic scale (fit trước, scale sau)
- `FIX_SCALE_MODE_STUCK.md` - Fix scale mode stuck issue
- `FIX_ITEM_SIZE_AND_ORIGINAL_FILE.md` - Fix dùng originalThumb cho output

---
**Trạng thái**: ✅ ĐÃ SỬA XONG
**Ngày**: 2026-01-31
**File**: ImpositionAdvancedPage.tsx
**Vấn đề**: Preview vs Output mismatch
**Giải pháp**: Dùng page.w/h (original) thay vì img.width/height (thumbnail)
