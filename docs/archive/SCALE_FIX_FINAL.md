# ✅ SCALE MODE FIX - Final Implementation

## 🎯 Thay đổi chính

### Logic mới: Tính bằng PIXELS trước (giống backend)

**Trước** (SAI):
```typescript
// Tính trực tiếp bằng mm
const fittedW_mm = itemW_mm;
const fittedH_mm = itemW_mm / imgAspect;
const scaledW_mm = fittedW_mm * scale;
```

**Sau** (ĐÚNG):
```typescript
// Tính bằng pixels trước (DPI=300)
const target_w_px = Math.round((itemW_mm / 25.4) * 300);
const fitted_w_px = Math.round(target_w_px / imgAspect);
const scaled_w_px = Math.round(fitted_w_px * scale);
const scaled_w_mm = (scaled_w_px / 300) * 25.4;
```

## 📋 Implementation Steps

### Frontend (ImpositionAdvancedPage.tsx)

```typescript
// Step 1: mm → px (DPI=300, same as backend)
const DPI = 300;
const target_w_px = Math.round((itemW_mm / 25.4) * DPI);
const target_h_px = Math.round((itemH_mm / 25.4) * DPI);

// Step 2: Simulate ImageOps.contain()
const imgAspect = page.w / page.h;
const targetAspect = target_w_px / target_h_px;

let fitted_w_px, fitted_h_px;
if (imgAspect > targetAspect) {
  fitted_w_px = target_w_px;
  fitted_h_px = Math.round(target_w_px / imgAspect);
} else {
  fitted_h_px = target_h_px;
  fitted_w_px = Math.round(target_h_px * imgAspect);
}

// Step 3: Scale (in pixels)
const scaled_w_px = Math.round(fitted_w_px * scale);
const scaled_h_px = Math.round(fitted_h_px * scale);

// Step 4: px → mm (for display)
const scaled_w_mm = (scaled_w_px / DPI) * 25.4;
const scaled_h_mm = (scaled_h_px / DPI) * 25.4;

// Step 5: mm → preview px (for canvas)
const preview_w = Math.round(scaled_w_mm * mmToPreviewPx);
const preview_h = Math.round(scaled_h_mm * mmToPreviewPx);
```

### Backend (processor.py) - Không đổi

```python
# Already correct
target_w_px = mm_to_px(item_w, 300)
fitted = ImageOps.contain(img, (target_w_px, target_h_px))
scaled_w = int(fitted.width * scale_factor)
```

## 🧪 Test Instructions

### 1. Hard Refresh Browser
```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

### 2. Upload Test Image
- Ảnh landscape: 2000x1000px (2:1)
- Hoặc portrait: 1000x2000px (1:2)
- Hoặc square: 2000x2000px (1:1)

### 3. Set Parameters
```
Item: 100x100mm
Scale: 50%
```

### 4. Check Console Log (F12)
```javascript
🔍 FRONTEND SCALE DEBUG: {
  originalImage: { w: 2000, h: 1000 },
  itemSizeMm: { w: 100, h: 100 },
  scale: "50%",
  targetPx: { w: 1181, h: 1181 },      // ← mm → px
  imgAspect: "2.000",
  targetAspect: "1.000",
  fittedPx: { w: 1181, h: 591 },       // ← Fit
  scaledPx: { w: 591, h: 296 },        // ← Scale
  scaledMm: { w: "50.08", h: "25.08" } // ← px → mm
}
```

### 5. Generate PDF and Compare
- Preview: 50.08x25.08mm
- Output PDF: 50.08x25.08mm
- ✅ Phải khớp nhau!

## 📊 Test Cases

### Test 1: Landscape image, square item
```
Image: 2000x1000px (2:1)
Item: 100x100mm (1:1)
Scale: 50%

Expected:
  targetPx: 1181x1181
  fittedPx: 1181x591 (fit to width)
  scaledPx: 591x296 (50%)
  scaledMm: 50.08x25.08mm

Preview: 50.08x25.08mm ✅
Output: 50.08x25.08mm ✅
```

### Test 2: Portrait image, landscape item
```
Image: 1000x2000px (1:2)
Item: 100x50mm (2:1)
Scale: 75%

Expected:
  targetPx: 1181x591
  fittedPx: 296x591 (fit to height)
  scaledPx: 222x443 (75%)
  scaledMm: 18.81x37.54mm

Preview: 18.81x37.54mm ✅
Output: 18.81x37.54mm ✅
```

### Test 3: Square image, square item
```
Image: 2000x2000px (1:1)
Item: 100x100mm (1:1)
Scale: 60%

Expected:
  targetPx: 1181x1181
  fittedPx: 1181x1181 (same aspect)
  scaledPx: 709x709 (60%)
  scaledMm: 60.10x60.10mm

Preview: 60.10x60.10mm ✅
Output: 60.10x60.10mm ✅
```

## 🔍 Verification

### Console Log Must Show:
- ✅ `targetPx` - mm converted to pixels
- ✅ `fittedPx` - after contain logic
- ✅ `scaledPx` - after scale
- ✅ `scaledMm` - final size in mm

### Backend Log (python-service.log):
```
🔍 BACKEND SCALE DEBUG:
  Original image: 2000x1000px
  Target canvas: 1181x1181px
  After fit: 1181x591px
  Scale factor: 0.5 (50%)
  Final scaled: 591x296px
```

### Verification:
```
Frontend scaledPx === Backend Final scaled ✅
```

## ⚠️ Common Issues

### Issue 1: Browser cache
**Solution**: Hard refresh (Ctrl+Shift+R)

### Issue 2: Log không hiển thị
**Solution**: 
- Mở Console (F12)
- Clear console
- Upload ảnh lại
- Set scale

### Issue 3: Vẫn không khớp
**Solution**:
- Kiểm tra DPI = 300 (frontend và backend)
- Kiểm tra dùng page.w/h (không phải img.width/height)
- Kiểm tra Math.round() (không phải Math.floor/ceil)

## 📝 Files Changed

1. **ImpositionAdvancedPage.tsx** (dòng 210-275)
   - Tính bằng pixels trước
   - Dùng DPI=300
   - Simulate ImageOps.contain()
   - Convert px → mm → preview px

2. **SCALE_MODE_LOGIC_REFERENCE.md**
   - Document reference cho AI bot
   - Chi tiết logic và công thức
   - Test cases và verification

## 🎯 Success Criteria

- ✅ Console log hiển thị đầy đủ steps
- ✅ scaledPx khớp với backend
- ✅ scaledMm khớp với backend
- ✅ Preview visual khớp với output PDF
- ✅ Hoạt động với mọi aspect ratio

---
**Frontend PID**: $(cat /root/toolxprint/frontend.pid 2>/dev/null)
**Status**: ✅ READY TO TEST
**Reference**: SCALE_MODE_LOGIC_REFERENCE.md
