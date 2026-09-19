# QUY CHUẨN BẮT BUỘC: KIẾN TRÚC CỤM AGENT & PHÂN TÁCH LUỒNG DỮ LIỆU TOOLXPRINT
> **LƯU Ý DÀNH CHO TẤT CẢ AI ASSISTANT / DEVELOPER TIẾP QUẢN DỰ ÁN:**
> Bắt buộc phải đọc và tuân thủ tuyệt đối tài liệu này trước khi chỉnh sửa hoặc mở rộng bất kỳ tính năng nào liên quan đến Admin, UtiCommands, Render, hoặc giao tiếp với Agent máy trạm.

---

## 1. NGUYÊN TẮC CỐT LÕI: "MƯỢN MÁY AGENT" (AGENT MESH)

Toàn bộ hệ thống ToolxPrint không chạy các tác vụ nặng (như render PDF vector, bóc tách trang, xử lý file in) trực tiếp trên Web Server nhẹ. Thay vào đó, toàn bộ công tác được thực thi theo mô hình **Mượn máy Agent** (Distributed Worker Nodes):
Hệ thống kết nối đến các máy trạm chạy dịch vụ **GoAgent (cổng mặc định :9173)**.

Trong cụm máy Agent, **BẮT BUỘC PHẢI PHÂN BIỆT RÕ 2 VAI TRÒ CHUYÊN BIỆT**:

### 1.1. Máy Render-Server Chuyên Dụng (`role: 'render_server'`)
- **Đặc điểm**: Máy trạm cấu hình cực cao (ví dụ: Trạm 128GB RAM, MuPDF C-Core No-Tiling, CPU nhiều luồng).
- **Trách nhiệm**:
  - Nhận các job render nặng, xử lý file in dung lượng lớn từ xa.
  - Sau khi xử lý xong, **BẮT BUỘC PHẢI TRẢ KẾT QUẢ VỀ CLOUD**:
    - Upload file/ảnh kết quả lên Cloud Storage / VPS API (`/render-agent` hoặc server tập trung).
    - Trả về cho Client: Đường dẫn xem trực tuyến (`cloud_url`), preview base64 hoặc link tải về từ Cloud.
  - **Không** lưu trữ cục bộ để thợ in phải lấy thủ công từ ổ đĩa máy render-server.

### 1.2. Máy Agent Thường / Cục Bộ (`role: 'local_agent'`)
- **Đặc điểm**: Máy trạm đặt tại xưởng in, văn phòng thiết kế, hoặc máy trạm nối trực tiếp với máy in / RIP.
- **Trách nhiệm**:
  - Nhận lệnh trực tiếp từ Admin Console hoặc Client UI.
  - Xử lý file trực tiếp tại máy tính người dùng.
  - Sau khi xử lý xong, **BẮT BUỘC PHẢI OUTPUT RA Ổ ĐĨA CỤC BỘ (LOCAL PATH)**:
    - Lưu file trực tiếp vào thư mục chỉ định trên máy (ví dụ: `D:/Dropbox/_Documents/Toolx/output` hoặc Hot Folder của RIP in ấn).
    - Trả về cho Client: Đường dẫn file cục bộ (`local_path`) trên máy tính để người dùng hoặc phần mềm in ấn sử dụng ngay.
  - **Không** upload ngược lên cloud gây tốn băng thông và lãng phí tài nguyên mạng nội bộ.

---

## 2. NGUYÊN TẮC TÁCH BIỆT 3 LUỒNG DỮ LIỆU ĐỘC LẬP (DATA STREAMS)

Mọi phản hồi từ Agent hoặc bộ thực thi UtiCommand **TUYỆT ĐỐI KHÔNG ĐƯỢC GỘP CHUNG THÀNH 1 CHUỖI TEXT**. Bắt buộc phải tách bạch 3 luồng sau:

```
+-----------------------------------------------------------------------------------+
|                                  EXECUTION RESULT                                 |
+-------------------------+-------------------------+-------------------------------+
|       1. STDOUT         |        2. STDERR        |       3. RESULT_PAYLOAD       |
| (Nhật ký tiến trình)    |    (Cảnh báo & Lỗi)     |     (Dữ liệu có cấu trúc)     |
+-------------------------+-------------------------+-------------------------------+
| - sys.stdout, print()   | - sys.stderr, warning   | - globals()['context']        |
| - echo, thông báo bước  | - Exception tracebacks  |   ['result_payload']          |
| - Hiển thị màu xanh lá  | - Lỗi cú pháp/runtime   | - JSON object / Dictionary    |
|   hoặc trắng ngọc       | - Hiển thị màu đỏ / cam | - Cây dữ liệu, Copy JSON      |
+-------------------------+-------------------------+-------------------------------+
```

### Chi tiết từng luồng:
1. **`stdout` (Standard Output)**:
   - Chứa thông tin ghi nhận tiến trình, benchmark, log `print(...)`.
   - Trên UI Terminal: Hiển thị với màu xanh ngọc (`text-emerald-400`), có tab lọc riêng.
2. **`stderr` (Standard Error)**:
   - Chứa thông tin cảnh báo (warnings), thông báo ngoại lệ (exception traces) khi script gặp lỗi.
   - Trên UI Terminal: Hiển thị với màu đỏ/cam (`text-rose-400` / `text-amber-400`), có tab lọc riêng.
3. **`result_payload` (Structured JSON Payload)**:
   - Chứa dữ liệu có cấu trúc được trả về qua `context['result_payload']` trong Python hoặc JSON object trong JS.
   - Chứa các trường nghiệp vụ quan trọng:
     - Đối với `render_server`: `cloud_url`, `download_url`, `total_pages`, `pages`, `preview_b64`.
     - Đối với `local_agent`: `local_path`, `output_dir`, `file_name`, `file_size_bytes`.
   - Trên UI Terminal: Hiển thị bằng Tab **PAYLOAD (JSON)** với định dạng cây JSON có màu cú pháp và nút Sao Chép JSON nhanh.

---

## 3. CẤU TRÚC ĐỐI TƯỢNG DỮ LIỆU CHUẨN

```typescript
// Định nghĩa Node Agent trong hệ thống
export type AgentNodeRole = 'render_server' | 'local_agent';
export type OutputDestination = 'cloud' | 'local_path';

export interface AgentNode {
  id: string;                    // Khóa định danh (vd: 'node-render-server-128gb')
  name: string;                  // Tên hiển thị (vd: 'Trạm Render Chuyên Dụng 128GB')
  role: AgentNodeRole;           // 'render_server' | 'local_agent'
  ip: string;                    // IP / Hostname (vd: '127.0.0.1', '157.66.80.125')
  port: number;                  // Port GoAgent (mặc định 9173)
  status: 'online' | 'offline' | 'busy' | 'probing';
  output_destination: OutputDestination; // 'cloud' (render_server) hoặc 'local_path' (local_agent)
  local_output_path?: string;    // Thư mục lưu file trên máy agent (vd: 'D:/Toolx_Output')
  cloud_endpoint?: string;       // Endpoint đẩy file lên Cloud (vd: '/render-agent')
  specs?: {
    ram_gb: number;
    cpu: string;
    os: string;
    mupdf_version?: string;
  };
  is_default?: boolean;
}

// Kết quả thực thi chuẩn tách biệt luồng
export interface ExecResult {
  ok: boolean;
  stdout: string;                // Luồng xuất chuẩn
  stderr: string;                // Luồng lỗi / cảnh báo
  result_payload?: any;          // Dữ liệu JSON có cấu trúc
  duration_ms?: number;
  timestamp: string;
  node_id?: string;              // Máy agent đã thực thi
  node_name?: string;
  node_role?: AgentNodeRole;
  output_destination?: OutputDestination;
  cloud_url?: string;
  local_path?: string;
}
```

---

## 4. BIẾN MÔI TRƯỜNG TỰ ĐỘNG BƠM VÀO SCRIPT KHI CHẠY

Khi một UtiCommand được thực thi, hệ thống sẽ tự động thay thế các placeholder sau tùy thuộc vào máy Agent được chọn:

- `__TARGET_IP__`: Địa chỉ IP của máy Agent.
- `__TARGET_PORT__`: Cổng kết nối của Agent (9173).
- `__NODE_ROLE__`: `'render_server'` hoặc `'local_agent'`.
- `__OUTPUT_DESTINATION__`: `'cloud'` hoặc `'local_path'`.
- `__LOCAL_OUTPUT_DIR__`: Đường dẫn thư mục cục bộ của máy agent (nếu là `local_agent`).
- `__WORKSPACE__`: Thư mục workspace làm việc (ví dụ `D:/Dropbox/_Documents/Toolx`).

**YÊU CẦU**: Bất kỳ AI Assistant nào thêm mới hoặc chỉnh sửa UtiCommand phải tận dụng các biến trên để đảm bảo script chạy đúng với cả 2 vai trò máy!
