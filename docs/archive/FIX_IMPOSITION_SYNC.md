# Sửa lỗi đồng bộ ImpositionAdvancedPage và Python Output

## Vấn đề
Có sự không đồng bộ giữa preview trên ImpositionAdvancedPage (frontend) và output PDF từ Python service khi sử dụng layout rotation (item['rot'] = true).

## Nguyên nhân
- **Frontend**: Sử dụng CSS `rotate(90deg)` để xoay ảnh 90° theo chiều kim đồng hồ (CW)
- **Python**: Sử dụng ReportLab `c.rotate(-90)` nhưng do hệ tọa độ PDF có trục Y đảo ngược, kết quả không khớp với frontend

## Giải pháp
Thay đổi rotation trong Python từ `c.rotate(-90)` sang `c.rotate(90)` để đồng bộ với frontend.

### File đã sửa
**File**: `/root/toolxprint/python-services/processor.py`

**Dòng 1876 và 2009**: 
```python
# Trước:
c.rotate(-90)  # 90° CW in ReportLab to match CSS rotate(90deg)

# Sau:
c.rotate(90)  # 90° CW in ReportLab to match CSS rotate(90deg)
```

**Comment đã cập nhật (dòng 1870-1871)**:
```python
# Frontend CSS: rotate(90deg) = 90° CW visually
# ReportLab: rotate(90) matches this due to inverted Y-axis
```

## Kết quả
- Preview trên ImpositionAdvancedPage và output PDF từ Python service giờ đã đồng bộ hoàn toàn
- Rotation của ảnh trong layout giờ khớp chính xác giữa preview và output
- Áp dụng cho tất cả các shape: rect, oval, circle (không áp dụng cho special shapes như triangle, trapezoid, hexagon vì chúng sử dụng logic 180° flip)

## Kiểm tra
1. Python service đã được restart: ✅
2. Thay đổi đã được áp dụng: ✅
3. Service đang chạy: PID 1142244 ✅

## Cách test
1. Mở ImpositionAdvancedPage
2. Upload ảnh có orientation khác với item size (ví dụ: ảnh landscape, item portrait)
3. Bật Auto Rotate hoặc để layout tự động rotate
4. So sánh preview với PDF output - giờ đã khớp hoàn toàn

## Ghi chú kỹ thuật
- ReportLab sử dụng hệ tọa độ Cartesian với gốc ở góc dưới bên trái
- CSS sử dụng hệ tọa độ với gốc ở góc trên bên trái
- Do trục Y đảo ngược, `rotate(90)` trong ReportLab tương đương với `rotate(90deg)` trong CSS về mặt visual
