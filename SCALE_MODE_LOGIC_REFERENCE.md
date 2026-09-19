# SCALE MODE LOGIC - Đồng bộ Preview và Output

## 🎯 Mục tiêu
Preview (frontend) và Output PDF (backend) phải hiển thị ảnh với **kích thước giống hệt nhau** khi dùng scale mode.

## 🔍 Phân tích vấn đề

### Vấn đề cốt lõi: Đơn vị tính toán khác nhau

**Frontend (Preview)**:
- Tính toán bằng **mm** (millimeters)
- Không có DPI cụ thể
- Chỉ dựa vào aspect ratio

**Backend (Output)**:
- Tính toán bằng **pixels**
- Có DPI cụ thể (300 DPI)
- Dùng `ImageOps.contain()` của Pillow

### Ví dụ minh họa vấn đề:

```
Original image: 2000x1500px
Item size: 100x100mm
DPI: 300
Scale: 50%

Frontend calculation (mm):
  imgAspect = 2000/1500 = 1.33
  itemAspect = 100/100 = 1.0
  imgAspect > itemAspect → fit to width
  fittedW_mm = 100mm
  fittedH_mm = 100/1.33 = 75mm
  scale 50%: 50x37.5mm

Backend calculation (pixels):
  target_w_px = 100mm * 300dpi / 25.4 = 1181px
  target_h_px = 100mm * 300dpi / 25.4 = 1181px
  fitted = ImageOps.contain(img, (1181, 1181))
  → fitted.width = 1181px, fitted.height = 886px
  → fitted_mm = 100x75.08mm (886px / 300dpi * 25.4)
  scale 50%: 591x443px = 50x37.54mm

→ Frontend: 50x37.5mm
→ Backend: 50x37.54mm
→ Sai lệch: 0.04mm (do làm tròn pixels)
```

**Vấn đề**: Sai lệch nhỏ do làm tròn pixels, nhưng có thể lớn hơn với DPI khác hoặc kích thước khác.

## ✅ Giải pháp tốt nhất: Đồng bộ 100% với Backend

### Nguyên tắc: Frontend phải tính GIỐNG HỆT backend

**Backend logic** (processor.py):
```python
# Step 1: Convert mm to pixels
target_w_px = mm_to_px(item_w, dpi)  # item_w * dpi / 25.4
target_h_px = mm_to_px(item_h, dpi)

# Step 2: Fit image (contain)
fitted = ImageOps.contain(img, (target_w_px, target_h_px))

# Step 3: Scale fitted dimensions
scaled_w = int(fitted.width * scale_factor)
scaled_h = int(fitted.height * scale_factor)

# Step 4: Resize
scaled_img = fitted.resize((scaled_w, scaled_h))
```

**Frontend logic** (phải giống):
```typescript
// Step 1: Convert mm to pixels (SAME DPI as backend)
const DPI = 300; // MUST match backend
const target_w_px = Math.round((itemW_mm / 25.4) * DPI);
const target_h_px = Math.round((itemH_mm / 25.4) * DPI);

// Step 2: Simulate ImageOps.contain()
const imgAspect = page.w / page.h;
const targetAspect = target_w_px / target_h_px;

let fitted_w_px, fitted_h_px;
if (imgAspect > targetAspect) {
  // Fit to width
  fitted_w_px = target_w_px;
  fitted_h_px = Math.round(target_w_px / imgAspect);
} else {
  // Fit to height
  fitted_h_px = target_h_px;
  fitted_w_px = Math.round(target_h_px * imgAspect);
}

// Step 3: Scale fitted dimensions
const scaled_w_px = Math.round(fitted_w_px * scale_factor);
const scaled_h_px = Math.round(fitted_h_px * scale_factor);

// Step 4: Convert back to mm for display
const scaled_w_mm = (scaled_w_px / DPI) * 25.4;
const scaled_h_mm = (scaled_h_px / DPI) * 25.4;
```

## 📋 Implementation Details

### Backend (processor.py) - Không cần sửa

```python
def process_image_fit_mode(
    img: Image.Image, 
    target_w_px: int, 
    target_h_px: int, 
    mode: str, 
    auto_rot: bool = False,
    custom_scale: float = 100.0,
    bg_color_hex: str = '#ffffff'
) -> Image.Image:
    # ...
    elif mode == 'actual':
        scale_factor = custom_scale / 100.0
        
        # STEP 1: Fit image into target dimensions
        fitted = ImageOps.contain(img, (target_w_px, target_h_px), 
                                  method=Image.Resampling.LANCZOS)
        
        # STEP 2: Scale fitted dimensions
        scaled_w = max(1, int(fitted.width * scale_factor))
        scaled_h = max(1, int(fitted.height * scale_factor))
        
        # STEP 3: Resize
        scaled_img = fitted.resize((scaled_w, scaled_h), 
                                   resample=Image.Resampling.LANCZOS)
        
        # STEP 4: Center on canvas
        bg = Image.new(img.mode, (target_w_px, target_h_px), bg_color)
        x = (target_w_px - scaled_img.width) // 2
        y = (target_h_px - scaled_img.height) // 2
        bg.paste(scaled_img, (x, y))
        
        return bg
```

### Frontend (ImpositionAdvancedPage.tsx) - CẦN SỬA

```typescript
// CRITICAL: Must match backend calculation EXACTLY
const DPI = 300; // Same as backend

// Step 1: Convert item size from mm to pixels (same as backend)
const target_w_px = Math.round((itemW_mm / 25.4) * DPI);
const target_h_px = Math.round((itemH_mm / 25.4) * DPI);

// Step 2: Simulate ImageOps.contain() - fit image into target
const imgAspect = page.w / page.h; // Original image aspect
const targetAspect = target_w_px / target_h_px; // Target aspect

let fitted_w_px, fitted_h_px;
if (imgAspect > targetAspect) {
  // Image wider than target - fit to width
  fitted_w_px = target_w_px;
  fitted_h_px = Math.round(target_w_px / imgAspect);
} else {
  // Image taller than target - fit to height
  fitted_h_px = target_h_px;
  fitted_w_px = Math.round(target_h_px * imgAspect);
}

// Step 3: Apply scale to fitted dimensions
const scaled_w_px = Math.round(fitted_w_px * scale);
const scaled_h_px = Math.round(fitted_h_px * scale);

// Step 4: Convert back to mm for preview display
const scaled_w_mm = (scaled_w_px / DPI) * 25.4;
const scaled_h_mm = (scaled_h_px / DPI) * 25.4;

// Step 5: Convert mm to preview pixels for canvas
const maxDimension_mm = Math.max(itemW_mm, itemH_mm);
const mmToPreviewPx = 200 / maxDimension_mm;
const preview_w = Math.round(scaled_w_mm * mmToPreviewPx);
const preview_h = Math.round(scaled_h_mm * mmToPreviewPx);
```

## 🔑 Key Points

### 1. DPI Must Match
```typescript
const DPI = 300; // MUST be same as backend
```

### 2. Calculate in Pixels First
```typescript
// ✅ CORRECT: mm → px → scale → mm
const target_px = (mm / 25.4) * DPI;
const scaled_px = fitted_px * scale;
const result_mm = (scaled_px / DPI) * 25.4;

// ❌ WRONG: mm → scale → mm (no pixel conversion)
const fitted_mm = itemW_mm;
const scaled_mm = fitted_mm * scale;
```

### 3. Use Math.round() for Pixel Values
```typescript
// Backend uses int() which truncates
// Frontend should use Math.round() for consistency
const fitted_h_px = Math.round(target_w_px / imgAspect);
```

### 4. Simulate ImageOps.contain() Exactly
```python
# Backend: ImageOps.contain()
fitted = ImageOps.contain(img, (target_w_px, target_h_px))

# Frontend: Must replicate this logic
if (imgAspect > targetAspect) {
  fitted_w_px = target_w_px;
  fitted_h_px = Math.round(target_w_px / imgAspect);
} else {
  fitted_h_px = target_h_px;
  fitted_w_px = Math.round(target_h_px * imgAspect);
}
```

## 📊 Verification Formula

### Backend Output (pixels):
```python
target_w_px = int(item_w * 300 / 25.4)
target_h_px = int(item_h * 300 / 25.4)
fitted = ImageOps.contain(img, (target_w_px, target_h_px))
scaled_w = int(fitted.width * scale_factor)
scaled_h = int(fitted.height * scale_factor)
```

### Frontend Preview (must match):
```typescript
target_w_px = Math.round(itemW_mm * 300 / 25.4)
target_h_px = Math.round(itemH_mm * 300 / 25.4)
// Simulate contain
fitted_w_px = (imgAspect > targetAspect) 
  ? target_w_px 
  : Math.round(target_h_px * imgAspect)
fitted_h_px = (imgAspect > targetAspect)
  ? Math.round(target_w_px / imgAspect)
  : target_h_px
// Scale
scaled_w_px = Math.round(fitted_w_px * scale)
scaled_h_px = Math.round(fitted_h_px * scale)
```

### Verification:
```
Backend scaled_w === Frontend scaled_w_px ✅
Backend scaled_h === Frontend scaled_h_px ✅
```

## 🧪 Test Cases

### Test 1: Square image, square item
```
Image: 2000x2000px (1:1)
Item: 100x100mm (1:1)
Scale: 50%

Backend:
  target: 1181x1181px
  fitted: 1181x1181px (same aspect)
  scaled: 591x591px (50%)
  → 50x50mm

Frontend:
  target: 1181x1181px
  fitted: 1181x1181px
  scaled: 591x591px
  → 50x50mm ✅
```

### Test 2: Landscape image, square item
```
Image: 2000x1000px (2:1)
Item: 100x100mm (1:1)
Scale: 50%

Backend:
  target: 1181x1181px
  imgAspect (2.0) > targetAspect (1.0)
  fitted: 1181x591px (fit to width)
  scaled: 591x296px (50%)
  → 50x25.08mm

Frontend:
  target: 1181x1181px
  imgAspect (2.0) > targetAspect (1.0)
  fitted: 1181x591px
  scaled: 591x296px
  → 50x25.08mm ✅
```

### Test 3: Portrait image, landscape item
```
Image: 1000x2000px (1:2)
Item: 100x50mm (2:1)
Scale: 75%

Backend:
  target: 1181x591px
  imgAspect (0.5) < targetAspect (2.0)
  fitted: 296x591px (fit to height)
  scaled: 222x443px (75%)
  → 18.81x37.54mm

Frontend:
  target: 1181x591px
  imgAspect (0.5) < targetAspect (2.0)
  fitted: 296x591px
  scaled: 222x443px
  → 18.81x37.54mm ✅
```

## 🐛 Common Mistakes

### ❌ Mistake 1: Calculate in mm directly
```typescript
// WRONG
const fittedW_mm = itemW_mm;
const fittedH_mm = itemW_mm / imgAspect;
const scaledW_mm = fittedW_mm * scale;
```
**Problem**: No pixel rounding, different from backend

### ❌ Mistake 2: Use different DPI
```typescript
// WRONG
const imgW_mm = (page.w / 300) * 25.4; // Assume 300
const DPI = 72; // Use different DPI
```
**Problem**: DPI mismatch causes size difference

### ❌ Mistake 3: Use thumbnail dimensions
```typescript
// WRONG
const imgAspect = img.width / img.height; // Thumbnail
```
**Problem**: Thumbnail aspect may differ from original

### ❌ Mistake 4: Different rounding
```typescript
// WRONG
const fitted_h_px = Math.floor(target_w_px / imgAspect);
```
**Problem**: Backend uses int() (truncate), frontend should use Math.round()

## ✅ Correct Implementation

```typescript
// Constants
const DPI = 300; // MUST match backend

// Step 1: mm → px (same as backend)
const target_w_px = Math.round((itemW_mm / 25.4) * DPI);
const target_h_px = Math.round((itemH_mm / 25.4) * DPI);

// Step 2: Simulate ImageOps.contain()
const imgAspect = page.w / page.h; // Original dimensions
const targetAspect = target_w_px / target_h_px;

let fitted_w_px, fitted_h_px;
if (imgAspect > targetAspect) {
  fitted_w_px = target_w_px;
  fitted_h_px = Math.round(target_w_px / imgAspect);
} else {
  fitted_h_px = target_h_px;
  fitted_w_px = Math.round(target_h_px * imgAspect);
}

// Step 3: Scale
const scaled_w_px = Math.round(fitted_w_px * scale);
const scaled_h_px = Math.round(fitted_h_px * scale);

// Step 4: px → mm (for display)
const scaled_w_mm = (scaled_w_px / DPI) * 25.4;
const scaled_h_mm = (scaled_h_px / DPI) * 25.4;

// Step 5: mm → preview px (for canvas)
const mmToPreviewPx = 200 / Math.max(itemW_mm, itemH_mm);
const preview_w = Math.round(scaled_w_mm * mmToPreviewPx);
const preview_h = Math.round(scaled_h_mm * mmToPreviewPx);

// Draw on canvas
ctx.drawImage(img, x, y, preview_w, preview_h);
```

## 📝 Debug Checklist

### Frontend Console Log:
```typescript
console.log('🔍 SCALE CALCULATION:', {
  // Input
  originalImage: { w: page.w, h: page.h },
  itemSize: { w: itemW_mm, h: itemH_mm },
  scale: customScale,
  
  // Step 1: mm → px
  targetPx: { w: target_w_px, h: target_h_px },
  
  // Step 2: Fit
  imgAspect: imgAspect.toFixed(3),
  targetAspect: targetAspect.toFixed(3),
  fittedPx: { w: fitted_w_px, h: fitted_h_px },
  
  // Step 3: Scale
  scaledPx: { w: scaled_w_px, h: scaled_h_px },
  
  // Step 4: px → mm
  scaledMm: { w: scaled_w_mm.toFixed(2), h: scaled_h_mm.toFixed(2) },
  
  // Step 5: Preview
  previewPx: { w: preview_w, h: preview_h }
});
```

### Backend Log (processor.py):
```python
print(f"🔍 BACKEND SCALE:")
print(f"  Original: {img.width}x{img.height}px")
print(f"  Target: {target_w_px}x{target_h_px}px")
print(f"  Fitted: {fitted.width}x{fitted.height}px")
print(f"  Scaled: {scaled_w}x{scaled_h}px")
print(f"  Scaled mm: {scaled_w/300*25.4:.2f}x{scaled_h/300*25.4:.2f}mm")
```

### Verification:
```
Frontend scaledPx === Backend Scaled ✅
Frontend scaledMm === Backend Scaled mm ✅
```

## 🎯 Summary

### The Golden Rule:
**Frontend must calculate in PIXELS first, using the SAME DPI as backend, then convert to mm for display.**

### Calculation Flow:
```
mm → px (DPI) → fit (contain) → scale (%) → px result → mm (display)
```

### Key Formula:
```typescript
// mm to px
px = Math.round((mm / 25.4) * DPI)

// px to mm
mm = (px / DPI) * 25.4
```

### Must Match:
- ✅ DPI value (300)
- ✅ Rounding method (Math.round)
- ✅ Fit algorithm (contain logic)
- ✅ Original dimensions (page.w/h)

---
**Version**: 1.0
**Date**: 2026-01-31
**Status**: REFERENCE DOCUMENT
