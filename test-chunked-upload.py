#!/usr/bin/env python3
import requests
import json
import os

# Test chunked upload endpoints
API_BASE = "http://localhost:3005"

def test_init_chunked_upload():
    print("Testing init chunked upload...")
    response = requests.post(f"{API_BASE}/api/init-chunked-upload", 
                           json={"filename": "test.pdf", "file_size": 1000000})
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    return response.json() if response.status_code == 200 else None

def test_upload_chunk(upload_id):
    print(f"Testing upload chunk for {upload_id}...")
    # Create a dummy chunk
    chunk_data = b"dummy chunk data" * 1000  # 16KB chunk
    
    files = {'chunk': ('chunk', chunk_data)}
    data = {
        'upload_id': upload_id,
        'chunk_index': '0',
        'total_chunks': '1',
        'original_filename': 'test.pdf'
    }
    
    response = requests.post(f"{API_BASE}/api/upload-chunk", files=files, data=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    return response.status_code == 200

def test_finalize_upload(upload_id):
    print(f"Testing finalize upload for {upload_id}...")
    response = requests.post(f"{API_BASE}/api/finalize-upload", 
                           json={"upload_id": upload_id, "total_chunks": 1, "original_filename": "test.pdf"})
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    return response.status_code == 200

if __name__ == "__main__":
    # Test init
    result = test_init_chunked_upload()
    if result and 'upload_id' in result:
        upload_id = result['upload_id']
        print(f"Got upload_id: {upload_id}")
        
        # Test chunk upload
        if test_upload_chunk(upload_id):
            # Test finalize
            test_finalize_upload(upload_id)
    else:
        print("Failed to initialize chunked upload")
