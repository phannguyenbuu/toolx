# ItemW Initialization Fix

## Problem
Khi bấm "Tải PDF In", gặp lỗi:
```
Cannot access 'itemW' before initialization
```

## Root Cause
Trong `ImpositionAdvancedPage.tsx`, function `dlPDF()` có 2 chỗ sử dụng `itemW` và `itemH` trước khi khai báo:

**Before (Line 1026 & 1156):**
```javascript
console.log(`[AUTO-ROTATE] Image: ${p.w}x${p.h}, Item: ${itemW}x${itemH}, Manual: ${p.rotation}°`);
const originalItemH = config.shape === 'circle' ? config.itemW : config.itemH;
const itemW = config.itemW;  // ← Khai báo sau khi đã dùng
const itemH = originalItemH;
```

## Solution
Di chuyển `console.log` xuống sau khi khai báo `itemW`, `itemH`:

**After:**
```javascript
const originalItemH = config.shape === 'circle' ? config.itemW : config.itemH;
const itemW = config.itemW;
const itemH = originalItemH;
console.log(`[AUTO-ROTATE] Image: ${p.w}x${p.h}, Item: ${itemW}x${itemH}, Manual: ${p.rotation}°`);
```

## Files Modified
- `/root/toolxprint/src/components/ImpositionAdvancedPage.tsx`
  - Line 1026: Di chuyển console.log xuống sau khai báo
  - Line 1156: Di chuyển console.log xuống sau khai báo

## Test Results
```
Running 15 tests using 5 workers
15 passed (35.3s)

✅ No itemW initialization errors
✅ PDF download functionality works
✅ All existing tests still pass
```

## Status
✅ **FIXED** - "Tải PDF In" button hoạt động bình thường, không còn lỗi itemW initialization.
