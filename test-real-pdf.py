#!/usr/bin/env python3
import requests
import json

def test_real_pdf():
    url = "http://localhost:3005/api/generate-pdf-async"
    
    # Use real PDF file
    with open('/root/toolxprint/test.pdf', 'rb') as f:
        pdf_content = f.read()
    
    files = {
        'files': ('test.pdf', pdf_content, 'application/pdf')
    }
    
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
                'text': 'Test Label',
                'rot': 0
            }
        ])
    }
    
    try:
        response = requests.post(url, files=files, data=data)
        print(f"Status: {response.status_code}")
        result = response.json()
        print(f"Response: {result}")
        
        if response.status_code == 200:
            task_id = result.get('task_id')
            
            # Check status
            import time
            for i in range(10):
                time.sleep(1)
                status_url = f"http://localhost:3005/api/task/{task_id}"
                status_response = requests.get(status_url)
                status_data = status_response.json()
                print(f"Check {i+1}: {status_data.get('status')} - {status_data.get('message')}")
                
                if status_data.get('status') in ['success', 'failed']:
                    if status_data.get('error'):
                        print(f"Error: {status_data.get('error')}")
                    break
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_real_pdf()
