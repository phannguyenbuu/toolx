# Thư mục Fonts

## Cách thêm font tùy chỉnh

1. **Copy file font** (.ttf, .otf, .woff, .woff2) vào thư mục này (`public/fonts/`)

2. **Cập nhật file `fonts.json`** với thông tin font mới:

```json
[
  {
    "name": "TenHienThi",
    "file": "ten-file-font.ttf"
  },
  {
    "name": "FontKhac",
    "file": "font-khac.woff"
  }
]
```

3. **Khởi động lại ứng dụng** để load font mới.

## Ví dụ

Nếu bạn có file `Roboto-Bold.ttf`, hãy:

1. Copy `Roboto-Bold.ttf` vào thư mục `public/fonts/`
2. Sửa `fonts.json`:

```json
[
  {
    "name": "Roboto Bold",
    "file": "Roboto-Bold.ttf"
  }
]
```

## Lưu ý

- Tên font (`name`) sẽ hiển thị trong danh sách chọn font của ứng dụng.
- Tên file (`file`) phải khớp chính xác với tên file font trong thư mục.
- Hỗ trợ các định dạng: `.ttf`, `.otf`, `.woff`, `.woff2`
