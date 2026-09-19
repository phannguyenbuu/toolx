# Fix Lỗi Scale Mode Stuck - ImpositionAdvancedPage

## 🐛 Vấn đề
Sau khi sử dụng scale mode (custom scale), các chế độ fit khác không hoạt động:
- Chuyển từ scale mode sang fit/fill/stretch → vẫn ra output như scale mode
- Chỉ ra đúng output lần đầu tiên, sau đó bị "stuck"
- Preview và output không cập nhật khi thay đổi fitMode

## 🔍 Nguyên nhân

### 1. Logic kiểm tra fitMode SAI
```typescript
// SAI - Chỉ check customScale, không check fitMode
fd.append('fitMode', customScale !== 100 ? 'actual' : config.fitMode);
```

**Vấn đề**: Nếu `customScale = 50` và user chuyển sang `fitMode = 'fill'`:
- Logic vẫn gửi `fitMode = 'actual'` (vì customScale !== 100)
- Backend xử lý theo 'actual' mode → output sai

### 2. State customScale không được reset
Khi user chuyển từ scale mode sang fit mode khác:
- `customScale` vẫn giữ giá trị cũ (ví dụ: 50)
- Logic kiểm tra `customScale !== 100` vẫn true
- Dẫn đến fitMode bị override thành 'actual'

### 3. Preview không restore
useEffect có điều kiện restore thumbnails nhưng không trigger đúng:
```typescript
// Chỉ restore khi fitMode !== 'actual'
// Nhưng nếu customScale = 50, preview vẫn bị stuck
else if (config.fitMode !== 'actual' && allPages.length > 0) {
  // Restore...
}
```

## ✅ Giải pháp đã áp dụng

### 1. Reset customScale khi chuyển fitMode (dòng 180-186)

```typescript
// Thêm useEffect mới
useEffect(() => {
  if (config.fitMode !== 'actual' && customScale !== 100) {
    console.log('🔄 Resetting customScale to 100 (fitMode changed to:', config.fitMode, ')');
    setCustomScale(100);
  }
}, [config.fitMode]);
```

**Tác dụng**: Tự động reset `customScale = 100` khi user chuyển sang fitMode khác

### 2. Sửa logic effectiveFitMode (dòng 1212-1214, 1341-1343)

```typescript
// TRƯỚC (SAI):
fd.append('fitMode', customScale !== 100 ? 'actual' : config.fitMode);

// SAU (ĐÚNG):
// Only use 'actual' mode if BOTH: fitMode is 'actual' AND customScale is not 100
const effectiveFitMode = (config.fitMode === 'actual' && customScale !== 100) ? 'actual' : config.fitMode;
fd.append('fitMode', effectiveFitMode);
```

**Tác dụng**: Chỉ dùng 'actual' mode khi:
- `config.fitMode === 'actual'` (user chọn scale mode) **VÀ**
- `customScale !== 100` (user đã thay đổi scale)

### 3. Sửa điều kiện restore preview (dòng 189-290)

```typescript
// TRƯỚC:
if (config.fitMode === 'actual' && allPages.length > 0) {
  // Apply custom scale preview
} else if (config.fitMode !== 'actual' && allPages.length > 0) {
  // Restore original
}

// SAU:
if (config.fitMode === 'actual' && customScale !== 100 && allPages.length > 0) {
  // Apply custom scale preview (chỉ khi scale != 100)
} else if ((config.fitMode !== 'actual' || customScale === 100) && allPages.length > 0) {
  // Restore original (khi fitMode khác HOẶC scale = 100)
  console.log('🔄 Restoring original thumbnails...');
  setAllPages(prev => prev.map(page => ({
    ...page,
    thumb: page.originalThumb || page.thumb
  })));
}
```

**Tác dụng**: 
- Preview chỉ apply custom scale khi `fitMode = 'actual'` VÀ `scale != 100`
- Restore về original khi chuyển fitMode hoặc scale = 100

## 📋 Flow hoạt động mới

### Scenario 1: User dùng scale mode
```
1. User chọn fitMode = 'actual'
2. User set customScale = 50%
3. useEffect trigger → Generate preview với scale 50%
4. Generate PDF → effectiveFitMode = 'actual', customScale = 50
5. ✅ Output đúng với scale 50%
```

### Scenario 2: User chuyển sang fit mode khác
```
1. User đang ở scale mode (customScale = 50)
2. User chọn fitMode = 'fill'
3. useEffect (dòng 180) trigger → Reset customScale = 100
4. useEffect (dòng 189) trigger → Restore original thumbnails
5. Generate PDF → effectiveFitMode = 'fill', customScale = 100
6. ✅ Output đúng với fill mode
```

### Scenario 3: User reset scale về 100%
```
1. User đang ở scale mode (customScale = 50)
2. User kéo slider về 100%
3. useEffect (dòng 189) trigger → Restore original thumbnails
4. Generate PDF → effectiveFitMode = config.fitMode (không override)
5. ✅ Output đúng với fitMode hiện tại
```

## 🎯 Kết quả

### Trước khi sửa:
- ❌ Chuyển fitMode → vẫn ra output cũ
- ❌ customScale stuck ở giá trị cũ
- ❌ Preview không cập nhật
- ❌ Chỉ hoạt động đúng lần đầu

### Sau khi sửa:
- ✅ Chuyển fitMode → output cập nhật đúng
- ✅ customScale tự động reset về 100
- ✅ Preview cập nhật real-time
- ✅ Hoạt động đúng mọi lần

## 🧪 Cách test

### Test 1: Scale mode → Fill mode
```
1. Upload ảnh
2. Chọn fitMode = 'actual', set scale = 50%
3. Generate PDF → Kiểm tra output (ảnh 50%)
4. Chọn fitMode = 'fill'
5. Generate PDF → Kiểm tra output (ảnh fill full)
6. ✅ Output phải khác nhau
```

### Test 2: Scale 50% → Scale 100%
```
1. Upload ảnh
2. Set scale = 50%
3. Preview phải hiển thị ảnh nhỏ (50%)
4. Set scale = 100%
5. Preview phải hiển thị ảnh full (100%)
6. ✅ Preview phải cập nhật
```

### Test 3: Chuyển qua lại nhiều lần
```
1. Chọn fill → Generate PDF
2. Chọn scale 50% → Generate PDF
3. Chọn stretch → Generate PDF
4. Chọn scale 75% → Generate PDF
5. Chọn fit → Generate PDF
6. ✅ Mỗi lần phải ra output đúng
```

### Test 4: Scale = 100% với actual mode
```
1. Chọn fitMode = 'actual'
2. Set scale = 100%
3. Generate PDF
4. ✅ Output phải giống fitMode = 'fit' (ảnh vừa khít item)
```

## 📝 Files đã sửa

### Frontend
- `/root/toolxprint/src/components/ImpositionAdvancedPage.tsx`
  - **Dòng 180-186**: Thêm useEffect reset customScale khi chuyển fitMode
  - **Dòng 189-290**: Sửa điều kiện useEffect preview (thêm check `customScale !== 100`)
  - **Dòng 1212-1214**: Sửa logic effectiveFitMode trong `dlPDF()`
  - **Dòng 1341-1343**: Sửa logic effectiveFitMode trong `saveToFileManager()`

## 🔄 Logic mới

### effectiveFitMode
```typescript
const effectiveFitMode = (config.fitMode === 'actual' && customScale !== 100) 
  ? 'actual' 
  : config.fitMode;
```

**Bảng quyết định**:
| config.fitMode | customScale | effectiveFitMode | Ý nghĩa |
|----------------|-------------|------------------|---------|
| 'actual' | 50 | 'actual' | ✅ Dùng scale 50% |
| 'actual' | 100 | 'actual' | ✅ Dùng actual (= fit) |
| 'fill' | 50 | 'fill' | ✅ Bỏ qua scale, dùng fill |
| 'fill' | 100 | 'fill' | ✅ Dùng fill |
| 'fit' | 50 | 'fit' | ✅ Bỏ qua scale, dùng fit |
| 'stretch' | 75 | 'stretch' | ✅ Bỏ qua scale, dùng stretch |

### Auto-reset customScale
```typescript
useEffect(() => {
  if (config.fitMode !== 'actual' && customScale !== 100) {
    setCustomScale(100); // Reset về 100
  }
}, [config.fitMode]);
```

**Trigger khi**: User chuyển từ 'actual' sang fitMode khác

## ⚠️ Lưu ý

### Scale = 100% với actual mode
- Khi `fitMode = 'actual'` và `scale = 100%`
- Backend vẫn nhận `fitMode = 'actual'`
- Nhưng với `scale = 100%`, kết quả giống `fitMode = 'fit'`
- Đây là behavior mong đợi

### Preview vs Output
- Preview và output giờ đồng bộ 100%
- Khi chuyển fitMode, preview cập nhật ngay lập tức
- Output PDF khớp với preview

### Debug Logs
```typescript
// Reset customScale
console.log('🔄 Resetting customScale to 100 (fitMode changed to:', config.fitMode, ')');

// Restore thumbnails
console.log('🔄 Restoring original thumbnails (fitMode:', config.fitMode, ', scale:', customScale, ')');
```

## 📊 So sánh

| Aspect | Logic CŨ (SAI) | Logic MỚI (ĐÚNG) |
|--------|----------------|-------------------|
| Check fitMode | ❌ Chỉ check customScale | ✅ Check cả fitMode VÀ customScale |
| Reset scale | ❌ Không reset | ✅ Auto-reset khi chuyển mode |
| Preview update | ❌ Stuck | ✅ Cập nhật real-time |
| Output consistency | ❌ Chỉ đúng lần đầu | ✅ Đúng mọi lần |

---
**Trạng thái**: ✅ ĐÃ SỬA XONG
**Ngày**: 2026-01-31
**File**: ImpositionAdvancedPage.tsx
**Liên quan**: FIX_SCALE_MODE.md
