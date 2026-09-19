# ✅ SCALE MODE TEST - Automated Calculation & Images

## 🎯 Test đã tạo

### 1. Calculation Test (test-scale-calculation.js)
Script Node.js tự động tính toán expected values cho 3 test cases.

### 2. Test Images
3 ảnh test đã được tạo với canvas:
- `test-landscape-2000x1000.png` (2000x1000px)
- `test-portrait-1000x2000.png` (1000x2000px)
- `test-square-2000x2000.png` (2000x2000px)

## 📊 Expected Results

### Test 1: Landscape @ 50%
```
Image: 2000x1000px (2:1)
Item: 100x100mm (1:1)
Scale: 50%

Expected:
  targetPx: 1181x1181px
  fittedPx: 1181x591px (fit to width)
  scaledPx: 591x296px
  scaledMm: 50.04x25.06mm
```

### Test 2: Portrait @ 75%
```
Image: 1000x2000px (1:2)
Item: 100x50mm (2:1)
Scale: 75%

Expected:
  targetPx: 1181x591px
  fittedPx: 296x591px (fit to height)
  scaledPx: 222x443px
  scaledMm: 18.80x37.51mm
```

### Test 3: Square @ 60%
```
Image: 2000x2000px (1:1)
Item: 100x100mm (1:1)
Scale: 60%

Expected:
  targetPx: 1181x1181px
  fittedPx: 1181x1181px (same aspect)
  scaledPx: 709x709px
  scaledMm: 60.03x60.03mm
```

## 🧪 Manual Test Steps

### 1. Chạy calculation test
```bash
cd /root/toolxprint
node test-scale-calculation.js
```

### 2. Test trong browser

#### Test 1: Landscape
1. Mở http://localhost:3000
2. Hard refresh (Ctrl+Shift+R)
3. Vào ImpositionAdvancedPage
4. Upload `test-landscape-2000x1000.png`
5. Set: Item 100x100mm, Scale 50%
6. Mở Console (F12)
7. Tìm log "🔍 FRONTEND SCALE DEBUG"
8. Verify: `scaledPx: { w: 591, h: 296 }`
9. Generate PDF
10. Check backend log: `Final scaled: 591x296px`

#### Test 2: Portrait
1. Upload `test-portrait-1000x2000.png`
2. Set: Item 100x50mm, Scale 75%
3. Verify: `scaledPx: { w: 222, h: 443 }`
4. Generate PDF
5. Check backend: `Final scaled: 222x443px`

#### Test 3: Square
1. Upload `test-square-2000x2000.png`
2. Set: Item 100x100mm, Scale 60%
3. Verify: `scaledPx: { w: 709, h: 709 }`
4. Generate PDF
5. Check backend: `Final scaled: 709x709px`

## ✅ Success Criteria

### Frontend Console Log
```javascript
🔍 FRONTEND SCALE DEBUG: {
  originalImage: { w: 2000, h: 1000 },
  itemSizeMm: { w: 100, h: 100 },
  scale: "50%",
  targetPx: { w: 1181, h: 1181 },
  imgAspect: "2.000",
  targetAspect: "1.000",
  fittedPx: { w: 1181, h: 591 },
  scaledPx: { w: 591, h: 296 },      // ← Must match expected
  scaledMm: { w: "50.04", h: "25.06" }
}
```

### Backend Log
```
🔍 BACKEND SCALE DEBUG:
  Original image: 2000x1000px
  Target canvas: 1181x1181px
  After fit: 1181x591px
  Scale factor: 0.5 (50%)
  Final scaled: 591x296px              // ← Must match expected
```

### Verification
```
✅ Frontend scaledPx === Expected
✅ Backend scaledPx === Expected
✅ Frontend scaledPx === Backend scaledPx
```

## 📝 Files Created

1. **test-scale-calculation.js** - Calculation test script
2. **test-landscape-2000x1000.png** - Landscape test image
3. **test-portrait-1000x2000.png** - Portrait test image
4. **test-square-2000x2000.png** - Square test image
5. **tests/scale-mode-test.spec.js** - Playwright test (needs fixing)
6. **run-scale-test.sh** - Test runner script

## 🔧 Playwright Test (TODO)

Playwright test cần sửa selector để tìm đúng navigation.
Hiện tại dùng manual test với images đã tạo.

## 📊 Test Matrix

| Test | Image | Item | Scale | Expected Px | Expected mm |
|------|-------|------|-------|-------------|-------------|
| 1 | 2000x1000 | 100x100 | 50% | 591x296 | 50.04x25.06 |
| 2 | 1000x2000 | 100x50 | 75% | 222x443 | 18.80x37.51 |
| 3 | 2000x2000 | 100x100 | 60% | 709x709 | 60.03x60.03 |

## 🎯 Quick Test Command

```bash
# Run calculation and create images
cd /root/toolxprint
node test-scale-calculation.js

# Images will be created in current directory
ls -lh test-*.png
```

---
**Status**: ✅ Test images and calculations ready
**Next**: Manual verification in browser
**Reference**: SCALE_MODE_LOGIC_REFERENCE.md
