#!/usr/bin/env python3
import requests, json, time, base64
from PIL import Image, ImageDraw, ImageFont

# Tạo ảnh test với text rõ ràng để nhận biết rotation
img = Image.new('RGB', (600, 400), 'white')
draw = ImageDraw.Draw(img)

# Border
draw.rectangle([0, 0, 599, 399], outline='black', width=10)

# Text TOP (màu đỏ, font lớn)
draw.text((250, 30), "TOP", fill='red', font=None)
draw.rectangle([200, 80, 400, 100], fill='red')

# Text BOTTOM (màu xanh, font lớn)
draw.text((220, 350), "BOTTOM", fill='blue', font=None)
draw.rectangle([200, 300, 400, 320], fill='blue')

# Mũi tên chỉ lên
draw.polygon([(300, 150), (250, 220), (350, 220)], fill='green')

print("🎨 Ảnh test: 600x400 (landscape)")
print("   - TOP (đỏ) ở trên")
print("   - BOTTOM (xanh) ở dưới")
print("   - Mũi tên xanh chỉ lên")

# Convert to bytes
from io import BytesIO
buffer = BytesIO()
img.save(buffer, format='PNG')
buffer.seek(0)
img_bytes = buffer.getvalue()

print("\n" + "="*70)
print("TEST 1: Manual Rotation 90° (Clockwise)")
print("="*70)

files = {'files': ('test.png', img_bytes, 'image/png')}
data = {
    'pagesData': json.dumps([{"rotation": 90, "w": 600, "h": 400}]),
    'planData': json.dumps([{"x": 10, "y": 10, "w": 100, "h": 120, "rot": False}]),
    'pageW': '210', 'pageH': '297',
    'itemW': '100', 'itemH': '120',
    'dpi': '150', 'fitMode': 'fill', 'colorMode': 'rgb',
    'processMode': 'multipage', 'totalOrder': '1',
    'xUpQty': '1', 'standardQty': '1'
}

print(f"📤 Gửi request đến: https://python.congcu.id.vn")
print(f"   pagesData: {data['pagesData']}")

try:
    resp = requests.post('https://python.congcu.id.vn/api/generate-pdf-async', 
                        files=files, data=data, timeout=30, verify=False)
    print(f"✓ Status: {resp.status_code}")
    
    if resp.status_code == 200:
        result = resp.json()
        task_id = result.get('task_id')
        print(f"✓ Task ID: {task_id}")
        
        # Poll for result
        for i in range(20):
            time.sleep(2)
            status_resp = requests.get(f'https://python.congcu.id.vn/api/task/{task_id}', verify=False)
            status = status_resp.json()
            
            print(f"  [{i+1}/20] Status: {status.get('status', 'unknown')}")
            
            if status['status'] in ['completed', 'success']:
                print(f"\n✅ PDF generated successfully!")
                
                # Download PDF
                pdf_resp = requests.get(f'https://python.congcu.id.vn/api/task/{task_id}/download', verify=False)
                pdf_path = '/tmp/test_rotation_90.pdf'
                with open(pdf_path, 'wb') as f:
                    f.write(pdf_resp.content)
                
                print(f"✓ PDF saved: {pdf_path} ({len(pdf_resp.content)} bytes)")
                print(f"\n📋 Kiểm tra PDF:")
                print(f"   1. Mở file: {pdf_path}")
                print(f"   2. Nếu ĐÚNG: TOP phải ở bên PHẢI, BOTTOM ở bên TRÁI")
                print(f"   3. Nếu SAI: TOP vẫn ở trên → Rotation không hoạt động")
                break
                
            elif status['status'] == 'failed':
                print(f"\n❌ Failed: {status.get('error', 'Unknown')}")
                break
    else:
        print(f"❌ Request failed: {resp.text[:500]}")
        
except Exception as e:
    print(f"❌ Error: {e}")

print("\n" + "="*70)
print("TEST 2: No Rotation (0°)")
print("="*70)

buffer.seek(0)
files2 = {'files': ('test.png', buffer, 'image/png')}
data2 = data.copy()
data2['pagesData'] = json.dumps([{"rotation": 0, "w": 600, "h": 400}])

print(f"📤 Gửi request với rotation=0°")

try:
    resp = requests.post('https://python.congcu.id.vn/api/generate-pdf-async',
                        files=files2, data=data2, timeout=30, verify=False)
    
    if resp.status_code == 200:
        task_id = resp.json().get('task_id')
        print(f"✓ Task ID: {task_id}")
        
        for i in range(20):
            time.sleep(2)
            status = requests.get(f'https://python.congcu.id.vn/api/task/{task_id}', verify=False).json()
            print(f"  [{i+1}/20] Status: {status.get('status')}")
            
            if status['status'] in ['completed', 'success']:
                pdf = requests.get(f'https://python.congcu.id.vn/api/task/{task_id}/download', verify=False)
                with open('/tmp/test_rotation_0.pdf', 'wb') as f:
                    f.write(pdf.content)
                print(f"\n✅ PDF saved: /tmp/test_rotation_0.pdf ({len(pdf.content)} bytes)")
                print(f"   Nếu ĐÚNG: TOP ở trên, BOTTOM ở dưới (không xoay)")
                break
            elif status['status'] == 'failed':
                print(f"\n❌ Failed: {status.get('error')}")
                break
                
except Exception as e:
    print(f"❌ Error: {e}")

print("\n" + "="*70)
print("📊 KẾT QUẢ")
print("="*70)
print("So sánh 2 file PDF:")
print("  - /tmp/test_rotation_90.pdf  (rotation=90°)")
print("  - /tmp/test_rotation_0.pdf   (rotation=0°)")
print("\nNếu 2 file GIỐNG NHAU → Rotation KHÔNG hoạt động")
print("Nếu 2 file KHÁC NHAU → Rotation hoạt động")
