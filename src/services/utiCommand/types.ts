import { AgentNodeRole, OutputDestination } from '../agentMeshService';

export interface UtiCommandItem {
  command: string;          // Khóa chính / ID (slug)
  label: string;            // Tên menu item hiển thị
  icon?: string;            // Biểu tượng (emoji hoặc icon name)
  description?: string;     // Mô tả ngắn
  category: string;         // Nhóm danh mục
  command_content: string;  // Nội dung mã lệnh sống (Python / PowerShell / Shell / JS)
  language?: 'python' | 'powershell' | 'bash' | 'javascript' | 'json';
  output_modal?: boolean;   // Hiển thị modal riêng hay terminal inline
  is_visible: boolean;      // Bật/tắt hiển thị trên menu
  created_at?: string;
  updated_at?: string;
}

export interface ExecResult {
  ok: boolean;
  stdout: string;           // Luồng xuất chuẩn (print, log, output)
  stderr: string;           // Luồng lỗi & cảnh báo (traceback, warning)
  result_payload?: any;     // Dữ liệu JSON có cấu trúc (dict/object trả về)
  duration_ms?: number;
  timestamp: string;
  node_id?: string;         // ID máy agent đã thực thi
  node_name?: string;       // Tên máy agent
  node_role?: AgentNodeRole;// 'render_server' | 'local_agent'
  output_destination?: OutputDestination; // 'cloud' | 'local_path'
  cloud_url?: string;       // Link kết quả Cloud (nếu là render_server)
  local_path?: string;      // Đường dẫn file cục bộ (nếu là local_agent)
  output?: string;          // Tương thích ngược
  error?: string;           // Tương thích ngược
}
