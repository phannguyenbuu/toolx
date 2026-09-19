# Fix: Frontend Controls, Python Executes

## Vấn đề
Python tự ý "suy luận" và áp dụng logic riêng (auto-rotate), dẫn đến kết quả khác với preview.

## Giải pháp: Frontend là Master, Python là Slave

### Nguyên tắc mới
1. **Frontend (Preview)**: Tính toán TOÀN BỘ rotation cuối cùng
2. **Python (Output)**: Chỉ render đúng những gì frontend đã tính

### Thay đổi

#### 1. Frontend tính final rotation (ImpositionAdvancedPage.tsx)
**Trước:**
```typescript
fd.append('pagesData', JSON.stringify(allPages.map(p => ({ 
  rotation: p.rotation,  // Chỉ gửi manual rotation
  w: p.w, 
  h: p.h 
}))));
```

**Sau:**
```typescript
// Calculate final rotation for each page (including auto-rotate)
const pagesDataWithFinalRotation = allPages.map(p => {
  let finalRotation = p.rotation; // Start with manual rotation
  
  // Apply auto-rotate logic if enabled (only if no manual rotation)
  if (config.autoRotate && p.rotation === 0) {
    const srcRatio = p.w / p.h;
    const originalItemH = config.shape === 'circle' ? config.itemW : config.itemH;
    const dstRatio = config.itemW / originalItemH;
    
    // If orientations don't match, add -90° (CCW)
    if ((srcRatio > 1 && dstRatio < 1) || (srcRatio < 1 && dstRatio > 1)) {
      finalRotation = -90;
    }
  }
  
  return {
    rotation: finalRotation,  // Final rotation đã tính sẵn
    w: p.w,
    h: p.h
  };
});

fd.append('pagesData', JSON.stringify(pagesDataWithFinalRotation));
```

#### 2. Python bỏ auto-rotate logic (processor.py)
**Trước:**
```python
# Auto-rotate if needed
src_landscape = img.width > img.height
item_landscape = item_w > item_h

has_manual_rotation = idx < len(pages_meta) and pages_meta[idx].get('rotation', 0) != 0

if auto_rotate and not has_manual_rotation and (src_landscape != item_landscape):
    img = img.rotate(90, expand=True)
```

**Sau:**
```python
# No auto-rotate - frontend already calculated final rotation
# Just apply fit mode
```

Python chỉ còn:
1. Load ảnh
2. Áp dụng rotation từ `pages_meta[i]['rotation']`
3. Fit vào item dimensions
4. Render

## Kết quả

### Trước
- Frontend: Tính auto-rotate → Preview đúng
- Python: Tính auto-rotate lại → Output sai
- **Conflict!**

### Sau
- Frontend: Tính TOÀN BỘ rotation → Preview đúng
- Python: Nhận rotation từ frontend → Output đúng
- **100% khớp!**

## Lợi ích
1. ✅ **Single Source of Truth**: Frontend là nguồn duy nhất
2. ✅ **No Duplication**: Không duplicate logic
3. ✅ **Easy Debug**: Chỉ cần debug frontend
4. ✅ **Guaranteed Sync**: Preview = Output (luôn luôn)

## Test
1. Upload ảnh landscape vào item portrait
2. Bật "Tự động xoay" → Preview xoay -90° (CCW)
3. Download PDF → Khớp 100%
4. Tắt auto-rotate, xoay thủ công → Khớp 100%

## Service Status
- Python PID: 1316811 ✅
- Frontend: Running ✅
