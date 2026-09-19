# DEBUG SCALE MODE - Checklist

## 🔍 Vui lòng kiểm tra và cung cấp thông tin:

### 1. Console Log (F12)
Sau khi upload ảnh và set scale, tìm log `🔍 FRONTEND SCALE DEBUG`

**Cần thông tin:**
```
scaledPx: { w: ?, h: ? }
scaledMm: { w: ?, h: ? }
```

### 2. Visual Preview
**Mô tả:**
- Ảnh trong preview có vẻ quá lớn hay quá nhỏ?
- Ảnh chiếm bao nhiêu % của item box?
- Có background color hiển thị xung quanh không?

### 3. Output PDF
**Mô tả:**
- Ảnh trong PDF có vẻ quá lớn hay quá nhỏ?
- So với preview, PDF lớn hơn hay nhỏ hơn?
- Tỷ lệ sai khoảng bao nhiêu? (2x, 0.5x, etc.)

### 4. Backend Log
Check file: `/root/toolxprint/python-service.log`

Tìm dòng:
```
🔍 BACKEND SCALE DEBUG:
  Final scaled: ?x?px
```

### 5. Test Case
**Thông số bạn đang test:**
- Image size: ?x?px
- Item size: ?x?mm
- Scale: ?%

---

## 🐛 Các vấn đề có thể:

### A. Preview quá lớn/nhỏ
→ Vấn đề: Canvas rendering (mmToPreviewPx)

### B. Output PDF quá lớn/nhỏ
→ Vấn đề: Backend calculation hoặc DPI

### C. Preview ≠ Output
→ Vấn đề: Frontend và backend tính khác nhau

### D. Cả preview và output đều sai
→ Vấn đề: Logic tính toán cơ bản

---

## 📝 Vui lòng cung cấp:

1. **Console log** (copy text hoặc screenshot)
2. **Mô tả visual** (preview vs output)
3. **Test parameters** (image size, item size, scale)
4. **Backend log** (nếu có)

Với thông tin này tôi sẽ tìm ra vấn đề chính xác!
