# Fix Lỗi Output PDF - ImpositionAdvancedPage

## 🐛 Vấn đề
ImpositionAdvancedPage bị lỗi khi generate PDF output với thông báo:
```
"Không có dữ liệu layout (planData). Vui lòng thử lại."
```

## 🔍 Nguyên nhân
1. **Thiếu validation**: Code không kiểm tra `currentPlan.items` có tồn tại và có dữ liệu hay không
2. **Trường hợp lỗi**: Khi user có `currentPlan` nhưng `items` là `undefined` hoặc empty array `[]`
3. **Backend yêu cầu**: Python API endpoint `/api/generate-pdf` yêu cầu `planData` phải có dữ liệu

## ✅ Giải pháp đã áp dụng

### 1. Thêm validation cho hàm `dlPDF()` (dòng 1091-1095)
```typescript
// TRƯỚC:
if (allPages.length === 0 || !currentPlan) { 
  alert('Vui lòng tải file lên trước!'); 
  return; 
}

// SAU:
if (allPages.length === 0 || !currentPlan || !currentPlan.items || currentPlan.items.length === 0) { 
  alert('Vui lòng tải file lên và tạo layout trước!'); 
  return; 
}
```

### 2. Thêm validation cho hàm `saveToFileManager()` (dòng 1225-1227)
```typescript
// TRƯỚC:
if (allPages.length === 0 || !currentPlan) { 
  alert('Vui lòng tải file lên trước!'); 
  return; 
}

// SAU:
if (allPages.length === 0 || !currentPlan || !currentPlan.items || currentPlan.items.length === 0) { 
  alert('Vui lòng tải file lên và tạo layout trước!'); 
  return; 
}
```

### 3. Update disabled condition cho button "Tạo PDF" (dòng 1668)
```typescript
// TRƯỚC:
disabled={!currentPlan || allPages.length === 0 || apiStatus !== 'online' || isGenerating}

// SAU:
disabled={!currentPlan || !currentPlan.items || currentPlan.items.length === 0 || allPages.length === 0 || apiStatus !== 'online' || isGenerating}
```

### 4. Update disabled condition cho button "Lưu vào File Manager" (dòng 1672)
```typescript
// TRƯỚC:
disabled={!currentPlan || allPages.length === 0 || apiStatus !== 'online' || isSaving}

// SAU:
disabled={!currentPlan || !currentPlan.items || currentPlan.items.length === 0 || allPages.length === 0 || apiStatus !== 'online' || isSaving}
```

## 📋 Checklist validation mới
- ✅ `allPages.length === 0` - Có file ảnh chưa?
- ✅ `!currentPlan` - Có layout plan chưa?
- ✅ `!currentPlan.items` - Plan có items array chưa?
- ✅ `currentPlan.items.length === 0` - Items có dữ liệu chưa?

## 🎯 Kết quả
- ✅ Buttons bị disable khi chưa có layout items
- ✅ Hiển thị thông báo rõ ràng: "Vui lòng tải file lên và tạo layout trước!"
- ✅ Ngăn chặn API call với planData rỗng
- ✅ Tránh lỗi 500 từ Python backend

## 🧪 Cách test
1. Mở ImpositionAdvancedPage
2. Upload file ảnh
3. **KHÔNG** click "Tính toán layout"
4. Thử click "Tạo PDF" → Button phải bị disable
5. Click "Tính toán layout" để tạo plan
6. Click "Tạo PDF" → Phải hoạt động bình thường

## 📝 Files đã sửa
- `/root/toolxprint/src/components/ImpositionAdvancedPage.tsx`
  - Dòng 1091-1095: Validation `dlPDF()`
  - Dòng 1225-1227: Validation `saveToFileManager()`
  - Dòng 1668: Button disabled condition
  - Dòng 1672: Button disabled condition

## ⚠️ Lưu ý
- Python service đang chạy bình thường (port 3005)
- Backend API endpoint: `/api/generate-pdf` (không phải `/generate-pdf`)
- Lỗi TypeScript từ pdfjs-dist là warning, không ảnh hưởng runtime

---
**Trạng thái**: ✅ ĐÃ SỬA XONG
**Ngày**: 2026-01-30
**File**: ImpositionAdvancedPage.tsx
