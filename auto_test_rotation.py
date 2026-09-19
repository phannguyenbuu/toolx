#!/usr/bin/env python3
"""
Auto test rotation với ảnh base64
"""
import requests
import base64
import json
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont

# Tạo ảnh test landscape với text để dễ nhận biết rotation
def create_test_image():
    # Tạo ảnh landscape 400x300 (landscape)
    img = Image.new('RGB', (400, 300), color='white')
    draw = ImageDraw.Draw(img)
    
    # Vẽ border
    draw.rectangle([0, 0, 399, 299], outline='black', width=5)
    
    # Vẽ text "TOP" ở trên
    draw.text((180, 20), "TOP", fill='red')
    
    # Vẽ mũi tên chỉ lên
    draw.polygon([(200, 80), (180, 120), (220, 120)], fill='blue')
    
    # Vẽ text "BOTTOM" ở dưới
    draw.text((160, 260), "BOTTOM", fill='green')
    
    # Convert to base64
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    b64 = base64.b64encode(buffer.read()).decode()
    
    return b64, img

print("🎨 Tạo ảnh test...")
img_b64, test_img = create_test_image()
print(f"✓ Ảnh test: {test_img.size[0]}x{test_img.size[1]} (landscape)")

# Test cases
test_cases = [
    {
        "name": "Test 1: Manual rotation 90° (CW)",
        "rotation": 90,
        "autoRotate": False,
        "expected": "Ảnh xoay 90° clockwise"
    },
    {
        "name": "Test 2: Manual rotation -90° (CCW)", 
        "rotation": -90,
        "autoRotate": False,
        "expected": "Ảnh xoay 90° counter-clockwise"
    },
    {
        "name": "Test 3: Auto-rotate (landscape → portrait item)",
        "rotation": 0,
        "autoRotate": True,
        "expected": "Ảnh tự động xoay -90° để vừa item portrait"
    },
    {
        "name": "Test 4: No rotation",
        "rotation": 0,
        "autoRotate": False,
        "expected": "Ảnh không xoay"
    }
]

print("\n🧪 Bắt đầu test...\n")

for i, test in enumerate(test_cases, 1):
    print(f"{'='*60}")
    print(f"{test['name']}")
    print(f"{'='*60}")
    
    # Prepare request data
    files = {
        'files': ('test.png', base64.b64decode(img_b64), 'image/png')
    }
    
    # Pages data với rotation
    pages_data = [{
        "rotation": test["rotation"],
        "w": 400,
        "h": 300
    }]
    
    # Plan data - 1 item portrait (100x120)
    plan_data = [{
        "x": 10,
        "y": 10, 
        "w": 100,
        "h": 120,
        "rot": False
    }]
    
    data = {
        'pagesData': json.dumps(pages_data),
        'planData': json.dumps(plan_data),
        'pageW': '210',
        'pageH': '297',
        'itemW': '100',
        'itemH': '120',
        'dpi': '150',
        'fitMode': 'fill',
        'colorMode': 'rgb',
        'useCrop': '0',
        'autoRotate': '1' if test['autoRotate'] else '0',
        'shape': 'rect',
        'processMode': 'multipage',
        'totalOrder': '1',
        'xUpQty': '1',
        'standardQty': '1'
    }
    
    print(f"📤 Request:")
    print(f"   - Rotation: {test['rotation']}°")
    print(f"   - Auto-rotate: {test['autoRotate']}")
    print(f"   - Item: 100x120mm (portrait)")
    print(f"   - Image: 400x300px (landscape)")
    
    try:
        # Send request
        response = requests.post(
            'http://localhost:3005/api/generate-pdf-async',
            files=files,
            data=data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            task_id = result.get('task_id')
            print(f"✓ Task created: {task_id}")
            
            # Poll task status
            import time
            for _ in range(10):
                status_resp = requests.get(f'http://localhost:3005/api/task/{task_id}')
                status = status_resp.json()
                
                if status['status'] == 'completed':
                    print(f"✓ PDF generated successfully")
                    print(f"✓ Expected: {test['expected']}")
                    
                    # Download PDF
                    pdf_resp = requests.get(f'http://localhost:3005/api/task/{task_id}/download')
                    pdf_path = f'/tmp/test_rotation_{i}.pdf'
                    with open(pdf_path, 'wb') as f:
                        f.write(pdf_resp.content)
                    print(f"✓ PDF saved: {pdf_path}")
                    break
                elif status['status'] == 'failed':
                    print(f"✗ Failed: {status.get('error', 'Unknown error')}")
                    break
                    
                time.sleep(1)
        else:
            print(f"✗ Request failed: {response.status_code}")
            print(f"   {response.text}")
            
    except Exception as e:
        print(f"✗ Error: {e}")
    
    print()

print(f"{'='*60}")
print("✅ Test hoàn tất!")
print(f"{'='*60}")
print("\n📋 Kiểm tra kết quả:")
print("   1. Mở các file PDF trong /tmp/test_rotation_*.pdf")
print("   2. Kiểm tra xem rotation có khớp với expected không")
print("   3. Xem log Python: tail -50 /root/toolxprint/python-service.log")
