# Fix Lỗi Scale Mode - ImpositionAdvancedPage

## 🐛 Vấn đề
Chế độ "Scale theo tỷ lệ %" (custom scale) không hoạt động đúng:
- **Hiện tại**: Scale 50% = scale ảnh gốc xuống 50% kích thước gốc
- **Mong đợi**: Scale 50% = ảnh chiếm 50% diện tích item (sau khi fit)

## 🔍 Nguyên nhân
Logic scale SAI - đang scale dựa trên kích thước ảnh gốc thay vì kích thước item:

### Ví dụ minh họa vấn đề:
```
Item size: 100x100mm
Ảnh gốc: 2000x2000px (169x169mm @ 300dpi)

Logic CŨ (SAI):
  Scale 50% => 2000px * 0.5 = 1000px (84mm)
  Kết quả: Ảnh 84mm trên item 100mm = 84% item (không phải 50%)

Logic MỚI (ĐÚNG):
  Fit vào item: 2000px -> 1181px (100mm)
  Scale 50%: 1181px * 0.5 = 591px (50mm)
  Kết quả: Ảnh 50mm trên item 100mm = 50% item ✅
```

## ✅ Giải pháp đã áp dụng

### 1. Backend - processor.py (dòng 305-330)

**Logic mới**: Fit trước → Scale sau

```python
# TRƯỚC (SAI):
elif mode == 'actual':
    scale_factor = custom_scale / 100.0
    # Tính mm từ ảnh gốc
    img_w_mm = (img.width / 300.0) * 25.4
    img_h_mm = (img.height / 300.0) * 25.4
    # Scale trực tiếp
    scaled_w_mm = img_w_mm * scale_factor
    scaled_h_mm = img_h_mm * scale_factor
    # Convert về px
    scaled_w = int((scaled_w_mm / 25.4) * 300)
    scaled_h = int((scaled_h_mm / 25.4) * 300)
    scaled_img = img.resize((scaled_w, scaled_h), ...)

# SAU (ĐÚNG):
elif mode == 'actual':
    scale_factor = custom_scale / 100.0
    # STEP 1: Fit vào item trước (như mode 'fit')
    fitted = ImageOps.contain(img, (target_w_px, target_h_px), ...)
    # STEP 2: Scale fitted dimensions
    scaled_w = int(fitted.width * scale_factor)
    scaled_h = int(fitted.height * scale_factor)
    scaled_img = fitted.resize((scaled_w, scaled_h), ...)
```

### 2. Frontend - ImpositionAdvancedPage.tsx (dòng 195-260)

**Logic mới**: Fit trước → Scale sau (đồng bộ với backend)

```typescript
// TRƯỚC (SAI):
const imgW_mm = (img.width / 300) * 25.4;
const imgH_mm = (img.height / 300) * 25.4;
const scaledImgW_mm = imgW_mm * scale;
const scaledImgH_mm = imgH_mm * scale;

// SAU (ĐÚNG):
// Step 1: Calculate fitted dimensions (contain within item)
const imgAspect = img.width / img.height;
const itemAspect = itemW_mm / itemH_mm;

let fittedW_mm, fittedH_mm;
if (imgAspect > itemAspect) {
  fittedW_mm = itemW_mm;
  fittedH_mm = itemW_mm / imgAspect;
} else {
  fittedH_mm = itemH_mm;
  fittedW_mm = itemH_mm * imgAspect;
}

// Step 2: Apply scale to fitted dimensions
const scaledW_mm = fittedW_mm * scale;
const scaledH_mm = fittedH_mm * scale;
```

## 📋 Logic mới chi tiết

### Backend (processor.py)
```python
1. Nhận: img (ảnh gốc), target_w_px, target_h_px (item size), custom_scale
2. Fit: fitted = ImageOps.contain(img, (target_w_px, target_h_px))
   → Ảnh vừa khít trong item, giữ tỷ lệ
3. Scale: scaled_w = fitted.width * (custom_scale / 100)
   → Scale dựa trên fitted size, không phải original size
4. Resize: scaled_img = fitted.resize((scaled_w, scaled_h))
5. Center: Paste scaled_img vào giữa canvas (target_w_px x target_h_px)
```

### Frontend (ImpositionAdvancedPage.tsx)
```typescript
1. Tính fitted dimensions:
   - Nếu ảnh rộng hơn item: fit theo width
   - Nếu ảnh cao hơn item: fit theo height
2. Scale fitted dimensions theo %
3. Vẽ lên canvas với background color
4. Center ảnh trong canvas
```

## 🎯 Kết quả

### Trước khi sửa:
- Scale 50% với ảnh 2000x2000px → 1000x1000px (không đúng tỷ lệ với item)
- Preview và output không khớp
- Ảnh quá lớn hoặc quá nhỏ so với mong đợi

### Sau khi sửa:
- ✅ Scale 50% = ảnh chiếm đúng 50% diện tích item
- ✅ Preview và output khớp nhau
- ✅ Scale % có ý nghĩa rõ ràng: % của item size
- ✅ Độc lập với kích thước ảnh gốc

## 🧪 Cách test

### Test 1: Scale 50%
```
1. Upload ảnh bất kỳ (ví dụ: 2000x2000px)
2. Set item: 100x100mm
3. Set scale: 50%
4. Preview: Ảnh phải chiếm 50x50mm (1/4 diện tích item)
5. Generate PDF: Output phải giống preview
```

### Test 2: Scale 100%
```
1. Upload ảnh
2. Set scale: 100%
3. Kết quả: Ảnh fit vừa khít item (như mode 'fit')
```

### Test 3: Scale 200%
```
1. Upload ảnh
2. Set scale: 200%
3. Kết quả: Ảnh gấp đôi fitted size (có thể vượt item, bị crop)
```

### Test 4: Ảnh khác tỷ lệ
```
1. Upload ảnh 1000x500px (2:1)
2. Item: 100x100mm (1:1)
3. Scale 50%:
   - Fit: 100x50mm (fit theo width)
   - Scale 50%: 50x25mm
   - Kết quả: Ảnh 50x25mm trên item 100x100mm ✅
```

## 📝 Files đã sửa

### Backend
- `/root/toolxprint/python-services/processor.py`
  - Dòng 305-330: Logic `mode == 'actual'` - Fit trước, scale sau

### Frontend
- `/root/toolxprint/src/components/ImpositionAdvancedPage.tsx`
  - Dòng 195-260: Preview logic - Fit trước, scale sau

## 🔄 Tương thích

- ✅ Không ảnh hưởng các mode khác (stretch, fill, fit)
- ✅ Scale 100% = mode 'fit' (ảnh vừa khít item)
- ✅ Preview và output đồng bộ
- ✅ Debug logs rõ ràng

## ⚠️ Lưu ý

### Scale > 100%
- Ảnh có thể vượt quá item size
- Phần vượt sẽ bị crop (không hiển thị)
- Đây là behavior mong đợi

### Scale < 100%
- Ảnh nhỏ hơn item
- Background color sẽ hiển thị xung quanh
- User có thể chọn background color

### Debug Logs
```python
# Backend
print(f"  Original image: {img.width}x{img.height}px")
print(f"  After fit: {fitted.width}x{fitted.height}px")
print(f"  Scale factor: {scale_factor} ({custom_scale}%)")
print(f"  Final scaled: {scaled_w}x{scaled_h}px")
```

```typescript
// Frontend
console.log('🔍 FRONTEND SCALE DEBUG:', {
  originalPx: { width, height },
  fittedMm: { width: fittedW_mm, height: fittedH_mm },
  scalePercent: customScale,
  finalScaledMm: { width: scaledW_mm, height: scaledH_mm }
});
```

## 📊 So sánh Logic

| Aspect | Logic CŨ (SAI) | Logic MỚI (ĐÚNG) |
|--------|----------------|-------------------|
| Base size | Ảnh gốc | Fitted size (item) |
| Scale 50% | 50% ảnh gốc | 50% fitted size |
| Ý nghĩa | Không rõ ràng | % của item size |
| Độc lập size | ❌ Phụ thuộc ảnh gốc | ✅ Độc lập |
| Preview/Output | ❌ Không khớp | ✅ Khớp nhau |

---
**Trạng thái**: ✅ ĐÃ SỬA XONG
**Ngày**: 2026-01-31
**Files**: processor.py, ImpositionAdvancedPage.tsx
**Python service**: Đã restart (PID: 2143700)
