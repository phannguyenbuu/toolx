#!/usr/bin/env python3
import PyPDF2
from PIL import Image
import io

pdf_path = 'test-output.pdf'

with open(pdf_path, 'rb') as f:
    pdf = PyPDF2.PdfReader(f)
    page = pdf.pages[0]
    
    # Get page size in points (1 point = 1/72 inch)
    page_width = float(page.mediabox.width)
    page_height = float(page.mediabox.height)
    
    # Convert to mm
    page_w_mm = page_width / 72 * 25.4
    page_h_mm = page_height / 72 * 25.4
    
    print(f"📄 PDF Page size:")
    print(f"  {page_width:.2f} x {page_height:.2f} points")
    print(f"  {page_w_mm:.2f} x {page_h_mm:.2f} mm")
    
    # Try to extract image
    if '/XObject' in page['/Resources']:
        xobjects = page['/Resources']['/XObject'].get_object()
        for obj_name in xobjects:
            obj = xobjects[obj_name]
            if obj['/Subtype'] == '/Image':
                width = obj['/Width']
                height = obj['/Height']
                
                # Image size in pixels
                print(f"\n🖼️  Image in PDF:")
                print(f"  {width} x {height} px")
                
                # Calculate expected size
                # Original: 2000x1000px
                # Item: 100x100mm = 1181x1181px at 300dpi
                # Fitted: 1181x590px (maintain aspect ratio)
                # Scaled 50%: 590x295px
                expected_w = 590
                expected_h = 295
                
                print(f"\n✅ Expected: {expected_w} x {expected_h} px")
                
                if abs(width - expected_w) <= 2 and abs(height - expected_h) <= 2:
                    print("✅ PASS: Size matches!")
                else:
                    print(f"❌ FAIL: Size mismatch!")
                    print(f"   Difference: {width - expected_w} x {height - expected_h} px")
