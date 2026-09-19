# FIX: Output to hơn Preview

## 🐛 Vấn đề
Output PDF to hơn preview khi dùng scale mode.

## 🔍 Root Cause

**Logic cũ (SAI):**
```typescript
const effectiveFitMode = (config.fitMode === 'actual' && customScale !== 100) 
  ? 'actual' 
  : config.fitMode;
```

**Vấn đề:**
- Nếu user chọn fitMode='fill' hoặc 'fit'
- Và set customScale=50%
- Logic vẫn gửi fitMode='fill' cho backend
- Backend không apply scale → output to hơn!

**Ví dụ:**
```
User: fitMode='fill', scale=50%
Frontend gửi: fitMode='fill', customScale=50
Backend: Dùng 'fill' mode, BỎ QUA customScale
→ Output = 100% (không scale) ≠ Preview = 50%
```

## ✅ Giải pháp

**Logic mới (ĐÚNG):**
```typescript
// ALWAYS use 'actual' when scale != 100
const effectiveFitMode = (customScale !== 100) ? 'actual' : config.fitMode;
```

**Giải thích:**
- Khi customScale != 100 → LUÔN force fitMode='actual'
- Không quan tâm user chọn fitMode gì
- Backend sẽ nhận 'actual' và apply scale đúng

**Flow mới:**
```
User: fitMode='fill', scale=50%
Frontend: Detect scale != 100 → Force fitMode='actual'
Frontend gửi: fitMode='actual', customScale=50
Backend: Dùng 'actual' mode, apply scale 50%
→ Output = 50% = Preview ✅
```

## 📋 Code Changes

### File: ImpositionAdvancedPage.tsx

**Dòng 1230-1231 (dlPDF):**
```typescript
// BEFORE:
const effectiveFitMode = (config.fitMode === 'actual' && customScale !== 100) 
  ? 'actual' : config.fitMode;

// AFTER:
const effectiveFitMode = (customScale !== 100) ? 'actual' : config.fitMode;
```

**Dòng 1359-1360 (saveToFileManager):**
```typescript
// BEFORE:
const effectiveFitMode2 = (config.fitMode === 'actual' && customScale !== 100) 
  ? 'actual' : config.fitMode;

// AFTER:
const effectiveFitMode2 = (customScale !== 100) ? 'actual' : config.fitMode;
```

## 🎯 Kết quả

### Trước:
```
fitMode='fill', scale=50%
→ Backend nhận: fitMode='fill'
→ Output: 100% (không scale)
→ Preview: 50% (có scale)
→ Output > Preview ❌
```

### Sau:
```
fitMode='fill', scale=50%
→ Frontend force: fitMode='actual'
→ Backend nhận: fitMode='actual', customScale=50
→ Output: 50% (có scale)
→ Preview: 50% (có scale)
→ Output = Preview ✅
```

## 🧪 Test

1. **Hard refresh**: Ctrl+Shift+R
2. Upload ảnh
3. Chọn **bất kỳ fitMode nào** (fill/fit/stretch)
4. Set scale 50%
5. Generate PDF
6. **Kết quả**: Output phải = Preview

## 📊 Logic Table

| fitMode | customScale | effectiveFitMode | Backend Action |
|---------|-------------|------------------|----------------|
| fill | 100 | fill | Fill mode (no scale) |
| fill | 50 | **actual** | Scale 50% ✅ |
| fit | 100 | fit | Fit mode (no scale) |
| fit | 75 | **actual** | Scale 75% ✅ |
| actual | 100 | actual | Actual mode (100% = fit) |
| actual | 60 | actual | Scale 60% ✅ |

## 🔑 Key Point

**Scale control OVERRIDES fitMode selection.**

Khi user set scale != 100%, ý nghĩa là:
- "Tôi muốn scale ảnh theo %"
- Không quan tâm fitMode đang chọn gì
- → Phải force 'actual' mode

---
**Status**: ✅ ĐÃ SỬA
**Frontend**: Restarted (PID: 2155694)
**Test**: Hard refresh và test lại
