#!/usr/bin/env python3
import requests, json, time
from PIL import Image, ImageDraw
from io import BytesIO

# Tạo ảnh test
img = Image.new('RGB', (400, 300), 'white')
draw = ImageDraw.Draw(img)
draw.rectangle([0, 0, 399, 299], outline='black', width=5)
draw.text((180, 20), "TOP", fill='red')
draw.text((160, 260), "BOTTOM", fill='green')

buffer = BytesIO()
img.save(buffer, format='PNG')
buffer.seek(0)

print("🧪 Test rotation với ảnh 400x300 (landscape)")
print("="*60)

# Test với rotation 90°
files = {'files': ('test.png', buffer, 'image/png')}
data = {
    'pagesData': '[{"rotation":90,"w":400,"h":300}]',
    'planData': '[{"x":10,"y":10,"w":100,"h":120,"rot":false}]',
    'pageW': '210', 'pageH': '297', 'itemW': '100', 'itemH': '120',
    'dpi': '150', 'fitMode': 'fill', 'colorMode': 'rgb',
    'processMode': 'multipage', 'totalOrder': '1', 'xUpQty': '1', 'standardQty': '1'
}

print("\n📤 Gửi request với rotation=90°...")
resp = requests.post('http://localhost:3005/api/generate-pdf-async', files=files, data=data, timeout=10)
print(f"✓ Response: {resp.status_code}")

if resp.status_code == 200:
    task_id = resp.json()['task_id']
    print(f"✓ Task ID: {task_id}")
    
    # Wait for completion
    for i in range(15):
        time.sleep(1)
        status = requests.get(f'http://localhost:3005/api/task/{task_id}').json()
        if status['status'] == 'completed':
            print(f"✓ PDF generated!")
            pdf = requests.get(f'http://localhost:3005/api/task/{task_id}/download')
            with open('/tmp/test_rot90.pdf', 'wb') as f:
                f.write(pdf.content)
            print(f"✓ Saved: /tmp/test_rot90.pdf")
            break
        elif status['status'] == 'failed':
            print(f"✗ Failed: {status.get('error')}")
            break
        print(f"  Waiting... ({i+1}/15)")

print("\n📋 Kiểm tra log:")
print("tail -30 /root/toolxprint/python-service-new.log | grep -E 'rotation|pages_meta'")
