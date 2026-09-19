#!/usr/bin/env python3
import requests
import json

# Test the MockFile fix
def test_pdf_generation():
    url = "http://localhost:3005/api/generate-pdf-async"
    
    # Create test data
    files = {
        'files': ('test.pdf', b'%PDF-1.4 test content', 'application/pdf')
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
                'text': 'Test Label'
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
            
            # Check task status
            status_url = f"http://localhost:3005/api/task/{task_id}"
            status_response = requests.get(status_url)
            print(f"Task Status: {status_response.json()}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_pdf_generation()
