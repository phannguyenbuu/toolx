# Auto-Rotate Fix Summary

## Vấn đề
Auto-rotate không hoạt động đúng - Python có logic riêng (chỉ xoay -90°) không khớp với frontend (tính 4 góc và chọn best).

## Root Cause
- **Frontend**: Tính toán 4 góc (0°, 90°, -90°, 180°), chọn góc có waste space nhỏ nhất, gửi `rotation=bestAngle` trong pagesData
- **Python**: Có logic auto-rotate riêng (chỉ xoay -90° nếu landscape ≠ item orientation), bỏ qua rotation từ frontend khi autoRotate=True

## Solution
Sửa Python để dùng `rotation` từ frontend thay vì tự tính:

### 1. Vector Mode (processor.py line ~775)
**Before:**
```python
if rotation != 0:
    src_img = src_img.rotate(-rotation, expand=True)

# Auto-rotate logic riêng
if rotation == 0:
    if auto_rotate and (src_landscape != item_landscape):
        src_img = src_img.rotate(-90, expand=True)
```

**After:**
```python
# Apply rotation from frontend (manual or auto-calculated)
if rotation != 0:
    print(f"[DEBUG] Vector mode: Applying rotation {rotation}° (auto_rotate={auto_rotate})")
    src_img = src_img.rotate(-rotation, expand=True)
# Bỏ logic auto-rotate cũ
```

### 2. Raster Mode (processor.py line ~1280)
**Before:**
```python
if rotation != 0:
    source_img = source_img.rotate(-rotation, expand=True)

processed_unit = process_image_fit_mode(source_img, item_w_px, item_h_px, fit_mode, auto_rotate)
```

**After:**
```python
if rotation != 0:
    print(f"[DEBUG] Raster mode: Applying rotation {rotation}° (auto_rotate={auto_rotate})")
    source_img = source_img.rotate(-rotation, expand=True)

# Don't pass auto_rotate - rotation already applied
processed_unit = process_image_fit_mode(source_img, item_w_px, item_h_px, fit_mode, False)
```

### 3. Multipage Mode
Already correct - không dùng auto_rotate parameter.

## Logic Flow

### Frontend (ImpositionAdvancedPage.tsx)
```javascript
if (config.autoRotate) {
  const rotations = [0, 90, -90, 180];
  let bestRotation = 0;
  let minWaste = Infinity;
  
  for (const rot of rotations) {
    // Calculate waste for each angle
    const totalWaste = wasteW + wasteH;
    if (totalWaste < minWaste) {
      minWaste = totalWaste;
      bestRotation = rot;
    }
  }
  
  finalRotation = bestRotation; // Send to Python
}
```

### Python (processor.py)
```python
# Just apply rotation from frontend
if rotation != 0:
    src_img = src_img.rotate(-rotation, expand=True)  # CSS -> PIL
```

## Test Results

```
🔄 Auto-Rotate Test: Landscape 1920x1080 → Portrait A4 210x297
   0°: 1920x1080 scale=0.1094 waste=178.88
✅ 90°: 1080x1920 scale=0.1547 waste=42.94
   -90°: 1080x1920 scale=0.1547 waste=42.94
   180°: 1920x1080 scale=0.1094 waste=178.88

🎯 Best angle: 90° (waste: 42.94)
✅ Auto-rotate logic verified!
✅ Python service handles rotation correctly

2 passed (8.7s)
```

## Files Modified
- `/root/toolxprint/python-services/processor.py` (2 changes)
  - Line ~775: Vector mode - bỏ auto-rotate logic cũ
  - Line ~1280: Raster mode - không pass auto_rotate parameter

## Key Insight
**Frontend tính toán tốt hơn Python** - Frontend test 4 góc và chọn optimal, Python chỉ cần apply rotation đó.

## Status
✅ **FIXED** - Auto-rotate hoạt động đúng, Python dùng rotation từ frontend.
