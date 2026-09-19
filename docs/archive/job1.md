# Job 1: Triển khai Chunked Upload cho ToolXPrint

## Mục tiêu
Giải quyết lỗi 413 Request Entity Too Large khi upload nhiều files lớn bằng chunked upload system.

## Danh sách công việc

### 1. Backend - Python Service (server.py)

#### 1.1 Thêm endpoints chunked upload
```python
# Thêm vào server.py
@app.route('/api/upload-chunk', methods=['POST'])
def upload_chunk():
    # Nhận chunk, index, total_chunks, upload_id
    # Lưu chunk tạm thời
    # Trả về status

@app.route('/api/finalize-upload', methods=['POST'])  
def finalize_upload():
    # Ghép các chunks thành file hoàn chỉnh
    # Xóa files tạm
    # Trả về file info

@app.route('/api/upload-status/<upload_id>')
def get_upload_status(upload_id):
    # Kiểm tra trạng thái upload
    # Trả về progress
```

#### 1.2 Tạo thư mục temp
```bash
mkdir -p /root/toolxprint/python-services/temp
```

#### 1.3 Thêm utility functions
```python
def generate_upload_id():
    # Tạo unique ID cho mỗi upload session

def save_chunk(chunk, upload_id, chunk_index):
    # Lưu chunk vào temp folder

def merge_chunks(upload_id, total_chunks):
    # Ghép chunks thành file hoàn chỉnh
    # Validate file integrity

def cleanup_temp_files(upload_id):
    # Xóa temp files sau khi hoàn thành
```

### 2. Frontend - React Component (ImpositionAdvancedPage.tsx)

#### 2.1 Thêm chunked upload functions
```typescript
const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

const uploadFileInChunks = async (file: File, onProgress?: (percent: number) => void) => {
    // Chia file thành chunks
    // Upload từng chunk
    // Theo dõi progress
    // Finalize upload
}

const uploadChunk = async (chunk: Blob, index: number, total: number, uploadId: string) => {
    // Upload single chunk với retry logic
}
```

#### 2.2 Cập nhật UI components
```typescript
// Thêm progress bar cho từng file
const FileUploadProgress = ({ fileName, progress, status }) => {
    // Component hiển thị progress upload
}

// Cập nhật file picker để sử dụng chunked upload
const handleFileSelect = async (files: FileList) => {
    // Thay thế logic upload hiện tại
    // Sử dụng uploadFileInChunks
}
```

#### 2.3 Error handling & retry logic
```typescript
const uploadWithRetry = async (chunk: Blob, maxRetries = 3) => {
    // Retry failed chunks
    // Exponential backoff
}
```

### 3. Cấu hình & Tối ưu

#### 3.1 Nginx configuration
```nginx
# Cập nhật nginx.conf
client_body_timeout 300s;
client_header_timeout 300s;
proxy_read_timeout 300s;
proxy_send_timeout 300s;
```

#### 3.2 Python service configuration
```python
# Tăng timeout cho chunked upload
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=1)
```

### 4. Testing & Validation

#### 4.1 Test cases
- [ ] Upload single file < 5MB (baseline)
- [ ] Upload single file > 50MB (chunked)
- [ ] Upload multiple files (6 files x 5MB)
- [ ] Network interruption recovery
- [ ] Concurrent uploads

#### 4.2 Performance monitoring
- [ ] Measure upload speed improvement
- [ ] Monitor memory usage
- [ ] Track error rates

### 5. Deployment Steps

#### 5.1 Backup hiện tại
```bash
cp server.py server.py.backup
cp ImpositionAdvancedPage.tsx ImpositionAdvancedPage.tsx.backup
```

#### 5.2 Deploy sequence
1. Deploy backend changes
2. Test backend endpoints
3. Deploy frontend changes  
4. Test end-to-end flow
5. Monitor production

### 6. Rollback Plan

#### 6.1 Nếu có lỗi
```bash
# Restore backup files
mv server.py.backup server.py
mv ImpositionAdvancedPage.tsx.backup ImpositionAdvancedPage.tsx
# Restart services
./restart-with-1gb-limit.sh
```

## Timeline
- Backend implementation: 2-3 hours
- Frontend implementation: 2-3 hours  
- Testing & debugging: 1-2 hours
- Total: 5-8 hours

## Success Criteria
- [ ] Upload 6 files x 5MB thành công
- [ ] Progress tracking hoạt động
- [ ] Error handling robust
- [ ] Performance cải thiện đáng kể
- [ ] Không breaking changes cho existing features

## Notes
- Implement theo từng bước, test kỹ từng bước
- Giữ backward compatibility với upload method hiện tại
- Monitor server resources trong quá trình test
- Có thể adjust CHUNK_SIZE dựa trên performance testing
