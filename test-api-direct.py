#!/usr/bin/env python3
import requests
import json

print("🧪 Testing Scale Mode - Direct API Call\n")

# Test parameters
test_image = "/root/toolxprint/test-landscape-2000x1000.png"
item_w = 100  # mm
item_h = 100  # mm
scale = 50    # %

print(f"Test: 2000x1000px image, item {item_w}x{item_h}mm, scale {scale}%\n")

# Expected calculation
DPI = 300
target_w_px = round((item_w / 25.4) * DPI)  # 1181
target_h_px = round((item_h / 25.4) * DPI)  # 1181

img_aspect = 2000 / 1000  # 2.0
target_aspect = target_w_px / target_h_px  # 1.0

if img_aspect > target_aspect:
    fitted_w_px = target_w_px
    fitted_h_px = round(target_w_px / img_aspect)
else:
    fitted_h_px = target_h_px
    fitted_w_px = round(target_h_px * img_aspect)

scaled_w_px = round(fitted_w_px * (scale / 100))
scaled_h_px = round(fitted_h_px * (scale / 100))

print(f"Expected calculation:")
print(f"  target: {target_w_px}x{target_h_px}px")
print(f"  fitted: {fitted_w_px}x{fitted_h_px}px")
print(f"  scaled: {scaled_w_px}x{scaled_h_px}px")
print(f"  scaled mm: {scaled_w_px/DPI*25.4:.2f}x{scaled_h_px/DPI*25.4:.2f}mm\n")

# Prepare request
files = {
    'files': ('test.png', open(test_image, 'rb'), 'image/png')
}

data = {
    'pagesData': json.dumps([{"rotation": 0, "w": 2000, "h": 1000}]),
    'planData': json.dumps([{"x": 0, "y": 0, "rot": 0, "pageIndex": 0}]),
    'pageW': '210',
    'pageH': '297',
    'itemW': str(item_w),
    'itemH': str(item_h),
    'dpi': '300',
    'fitMode': 'actual',  # Force actual mode
    'customScale': str(scale),
    'backgroundColor': '#ffffff',
    'colorMode': 'original',
    'processMode': 'vector',
    'shape': 'rect',
    'totalOrder': '1',
    'autoRotate': '0',
    'useCrop': '0',
    'usePageCrop': '0',
    'is2Sided': '0'
}

print("Calling API: http://localhost:3005/api/generate-pdf")
print(f"  fitMode: {data['fitMode']}")
print(f"  customScale: {data['customScale']}")
print(f"  All data keys: {list(data.keys())}\n")

try:
    response = requests.post(
        'http://localhost:3005/api/generate-pdf',
        files=files,
        data=data,
        timeout=30
    )
    
    if response.status_code == 200:
        # Save PDF
        with open('test-output.pdf', 'wb') as f:
            f.write(response.content)
        print("✅ PDF generated: test-output.pdf\n")
        
        # Check backend log
        import subprocess
        result = subprocess.run(
            ['tail', '-50', '/root/toolxprint/python-service.log'],
            capture_output=True,
            text=True
        )
        
        log_lines = result.stdout.split('\n')
        
        print("Backend log:")
        for line in log_lines:
            if 'BACKEND SCALE DEBUG' in line or 'Final scaled' in line or 'Actual mode' in line:
                print(f"  {line}")
        
        # Parse Final scaled
        for line in reversed(log_lines):
            if 'Final scaled:' in line:
                import re
                match = re.search(r'Final scaled:\s*(\d+)x(\d+)', line)
                if match:
                    actual_w = int(match.group(1))
                    actual_h = int(match.group(2))
                    print(f"\n📊 Result:")
                    print(f"  Expected: {scaled_w_px}x{scaled_h_px}px")
                    print(f"  Actual:   {actual_w}x{actual_h}px")
                    
                    if actual_w == scaled_w_px and actual_h == scaled_h_px:
                        print(f"  ✅ MATCH!")
                    else:
                        print(f"  ❌ MISMATCH!")
                        print(f"  Difference: {actual_w - scaled_w_px}x{actual_h - scaled_h_px}px")
                break
        
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text[:500])
        
except Exception as e:
    print(f"❌ Exception: {e}")
