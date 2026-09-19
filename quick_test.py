#!/usr/bin/env python3
# Quick test
import requests, json
from PIL import Image, ImageDraw
from io import BytesIO

img = Image.new('RGB', (600, 400), 'white')
draw = ImageDraw.Draw(img)
draw.rectangle([0, 0, 599, 399], outline='black', width=10)
draw.text((250, 30), "TOP", fill='red')
draw.rectangle([200, 80, 400, 100], fill='red')
draw.text((220, 350), "BOTTOM", fill='blue')
draw.rectangle([200, 300, 400, 320], fill='blue')

buffer = BytesIO()
img.save(buffer, format='PNG')
buffer.seek(0)

print("Test rotation=90...")
resp = requests.post('https://python.congcu.id.vn/api/generate-pdf-async',
    files={'files': ('test.png', buffer, 'image/png')},
    data={
        'pagesData': json.dumps([{"rotation": 90, "w": 600, "h": 400}]),
        'planData': json.dumps([{"x": 10, "y": 10, "w": 100, "h": 120, "rot": False}]),
        'pageW': '210', 'pageH': '297', 'itemW': '100', 'itemH': '120',
        'dpi': '150', 'fitMode': 'fill', 'colorMode': 'rgb',
        'processMode': 'multipage', 'totalOrder': '1', 'xUpQty': '1', 'standardQty': '1'
    }, verify=False, timeout=10)

if resp.status_code == 200:
    task_id = resp.json()['task_id']
    print(f"Task: {task_id}")
    
    import time
    time.sleep(3)
    
    status = requests.get(f'https://python.congcu.id.vn/api/task/{task_id}', verify=False).json()
    print(f"Status: {status['status']}")
    
    if status['status'] in ['success', 'completed']:
        pdf = requests.get(f'https://python.congcu.id.vn/api/task/{task_id}/download', verify=False)
        with open('/tmp/quick_test.pdf', 'wb') as f:
            f.write(pdf.content)
        print(f"Saved: /tmp/quick_test.pdf ({len(pdf.content)} bytes)")
        print("\nCheck log: tail -50 /root/toolxprint/python-final.log | grep DEBUG")
