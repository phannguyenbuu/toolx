#!/usr/bin/env python3
import requests
import json

# Test multiple files PDF generation
def test_multifile_pdf():
    url = "http://localhost:3005/api/generate-pdf-async"
    
    # Create test data with multiple files
    # Create simple valid PDF content
    pdf_content1 = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
>>
endobj

xref
0 4
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000125 00000 n 
trailer
<<
/Size 4
/Root 1 0 R
>>
startxref
199
%%EOF"""
    
    files = [
        ('files', ('test1.pdf', pdf_content1, 'application/pdf')),
        ('files', ('test2.pdf', pdf_content1, 'application/pdf'))
    ]
    
    data = {
        'config': json.dumps({
            'pageSize': 'A4',
            'orientation': 'portrait',
            'margin': 10
        }),
        'dataMode': '1',
        'xUpQty': '1',
        'standardQty': '1',
        'planData': json.dumps([
            {
                'id': 'test1',
                'type': 'text',
                'x': 10,
                'y': 10,
                'width': 100,
                'height': 20,
                'text': 'Test Label 1',
                'rot': 0
            },
            {
                'id': 'test2',
                'type': 'text',
                'x': 10,
                'y': 40,
                'width': 100,
                'height': 20,
                'text': 'Test Label 2',
                'rot': 0
            }
        ])
    }
    
    try:
        response = requests.post(url, files=files, data=data)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            task_id = result.get('task_id')
            print(f"Task ID: {task_id}")
            
            # Check task status multiple times
            import time
            for i in range(5):
                time.sleep(1)
                status_url = f"http://localhost:3005/api/task/{task_id}"
                status_response = requests.get(status_url)
                status_data = status_response.json()
                print(f"Check {i+1}: {status_data.get('status')} - {status_data.get('message')}")
                
                if status_data.get('status') in ['success', 'failed']:
                    break
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_multifile_pdf()
