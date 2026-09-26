import { ENV_CONFIG } from '../config/environment';

// Use relative URL - nginx will route to Python
const API_BASE = '/api';
console.log('[DEBUG] API_BASE:', API_BASE);

// PDF processing-specific interfaces (not related to API data)
interface TaskStatus {
  id: string;
  task_type: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  progress: number;
  message: string;
  result: {
    file_path: string;
    file_name: string;
    file_size: number;
    total_sheets: number;
  } | null;
  error: string | null;
  created_at: string | null;
  started_at: string | null;
  completed_at: string | null;
}

interface AsyncPdfOptions {
  onProgress?: (progress: number, message: string) => void;
  onStatusChange?: (status: string) => void;
  pollInterval?: number;
  timeout?: number;
}

export async function generatePdfAsync(
  formData: FormData,
  options: AsyncPdfOptions = {}
): Promise<Blob> {
  const { 
    onProgress = () => {}, 
    onStatusChange = () => {},
    pollInterval = 500,
    timeout = 300000
  } = options;

  console.log('[PDF] Starting async PDF generation...');

  const startResponse = await fetch(API_BASE + '/generate-pdf-async', {
    method: 'POST',
    body: formData
  });

  if (!startResponse.ok) {
    const err = await startResponse.json().catch(() => ({ error: 'Unknown error' }));
    console.error('[PDF] Start request failed:', err);
    throw new Error(err.error || 'Lỗi khởi tạo xuất PDF');
  }

  const { task_id } = await startResponse.json();
  console.log('[PDF] Task created:', task_id);
  
  onStatusChange('running');
  onProgress(5, 'Đang bắt đầu xử lý...');

  const startTime = Date.now();

  while (true) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout: Xuất PDF quá lâu');
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));

    console.log('[PDF] Checking task status:', task_id);
    
    try {
      const statusResponse = await fetch(API_BASE + `/task/${task_id}`);
      
      if (!statusResponse.ok) {
        const errorText = await statusResponse.text().catch(() => 'Unknown error');
        console.error('[PDF] Status check failed:', statusResponse.status, errorText);
        throw new Error(`Lỗi kiểm tra trạng thái task: ${statusResponse.status} - ${errorText}`);
      }

      const status: TaskStatus = await statusResponse.json();
      console.log('[PDF] Task status:', status);
      
      onProgress(status.progress, status.message);
      onStatusChange(status.status);

      if (status.status === 'success') {
        console.log('[PDF] Task completed, downloading...');
        const downloadResponse = await fetch(API_BASE + `/task/${task_id}/download`);
        if (!downloadResponse.ok) {
          const errorText = await downloadResponse.text().catch(() => 'Unknown error');
          console.error('[PDF] Download failed:', downloadResponse.status, errorText);
          throw new Error(`Lỗi tải file PDF: ${downloadResponse.status}`);
        }
        
        onProgress(100, 'Hoàn thành!');
        const blob = await downloadResponse.blob();
        console.log('[PDF] Download completed, blob size:', blob.size);
        return blob;
      }

      if (status.status === 'failed') {
        console.error('[PDF] Task failed:', status.error);
        throw new Error(status.error || 'Lỗi xuất PDF');
      }
    } catch (error) {
      console.error('[PDF] Error in status check loop:', error);
      throw error;
    }
  }
}

export function downloadPdfBlob(blob: Blob, filename: string = 'print.pdf') {
  if (typeof window === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);
    } catch {}
  }, 120000);
}
