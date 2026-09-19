# Python Services - Layout Master

## Yêu Cầu

- Python 3.11+
- pip

## Cài Đặt Python (Windows)

### Cách 1: Tải từ Website
1. Vào https://www.python.org/downloads/
2. Tải **Python 3.11.x** (Windows installer 64-bit)
3. **QUAN TRỌNG**: Khi cài, tick vào **"Add Python to PATH"**
4. Click "Install Now"

### Cách 2: Dùng Winget (Windows 11)
```powershell
winget install Python.Python.3.11
```

## Cài Đặt Dependencies

```bash
cd python-services
pip install -r requirements.txt
```

## Chạy Server

```bash
python server.py
```

Server sẽ chạy tại: http://100.97.176.70:3005

## Copy ICC Profiles

Copy 2 file ICC vào thư mục `icc/`:
- `myrgb.icc`
- `mycmyk.icc`

## API Endpoints

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/health` | GET | Kiểm tra status |
| `/api/calculate` | POST | Tính layout |
| `/api/generate-pdf` | POST | Tạo PDF |
| `/api/generate-svg` | POST | Tạo SVG cắt |

## Troubleshooting

### Lỗi "python không được nhận dạng"
- Cài lại Python và tick "Add to PATH"
- Hoặc thêm Python vào PATH thủ công

### Lỗi "pip không được nhận dạng"
```powershell
python -m pip install -r requirements.txt
```

### Lỗi port 3005 đang được sử dụng
- Đổi PORT trong `server.py`
- Hoặc tắt process đang dùng port đó
