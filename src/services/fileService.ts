// Uses proxy - relative URLs
const API_URL = '/api';

export interface FileItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  fileType: 'PDF' | 'IMAGE' | 'FONT' | 'PROJECT' | 'OTHER';
  expiresAt: string;
  createdAt: string;
  remainingTime: number; // minutes
}

export interface StorageStats {
  usedBytes: number;
  usedMB: number;
  limitMB: number;
  limitBytes: number;
  fileCount: number;
  usagePercent: number;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Authorization': `Bearer ${token}`,
  };
};

export const fileService = {
  // Get all files
  async getFiles(fileType?: string): Promise<FileItem[]> {
    const url = fileType && fileType !== 'all' 
      ? `${API_URL}/files?type=${fileType}`
      : `${API_URL}/files`;
    
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch files');
    }
    
    return response.json();
  },

  // Get storage stats
  async getStorageStats(): Promise<StorageStats> {
    const response = await fetch(`${API_URL}/files/stats`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch storage stats');
    }
    
    return response.json();
  },

  // Upload file
  async uploadFile(file: File, fileType?: string): Promise<FileItem> {
    const formData = new FormData();
    formData.append('file', file);
    
    const url = fileType 
      ? `${API_URL}/files/upload?fileType=${fileType}`
      : `${API_URL}/files/upload`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    
    if (!response.ok) {
      let errMsg = `Không thể tải tệp lên server (Mã lỗi ${response.status})`;
      try {
        const error = await response.json();
        errMsg = error.message || errMsg;
      } catch {
        const text = await response.text().catch(() => '');
        if (text && text.length < 150) {
          errMsg = text;
        }
      }
      throw new Error(errMsg);
    }
    
    return response.json();
  },

  // Download file
  async downloadFile(fileId: string, filename: string): Promise<void> {
    const response = await fetch(`${API_URL}/files/${fileId}`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to download file');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Get file URL for viewing
  getFileViewUrl(fileId: string): string {
    const token = localStorage.getItem('auth_token');
    return `${API_URL}/files/${fileId}/view?token=${token}`;
  },

  // Delete file
  async deleteFile(fileId: string): Promise<void> {
    const response = await fetch(`${API_URL}/files/${fileId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete file');
    }
  },

  // Extend file TTL
  async extendFile(fileId: string): Promise<{ expiresAt: string; remainingTime: number }> {
    const response = await fetch(`${API_URL}/files/${fileId}/extend`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to extend file');
    }
    
    return response.json();
  },

  // Rename file
  async renameFile(fileId: string, newName: string): Promise<void> {
    const response = await fetch(`${API_URL}/files/${fileId}/rename`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ newName }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to rename file');
    }
  },

  // Format file size
  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  },

  // Format remaining time
  formatRemainingTime(minutes: number): string {
    if (minutes <= 0) return 'Hết hạn';
    if (minutes < 60) return `${minutes} phút`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} giờ`;
  },

  // Get file icon based on type
  getFileIcon(fileType: string): string {
    switch (fileType) {
      case 'PDF': return '📄';
      case 'IMAGE': return '🖼️';
      case 'FONT': return '🔤';
      case 'PROJECT': return '📁';
      default: return '📎';
    }
  },

  // Get file as blob (for importing into other components)
  async getFileBlob(fileId: string): Promise<Blob> {
    const response = await fetch(`${API_URL}/files/${fileId}`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to get file');
    }
    
    return response.blob();
  },

  // Convert blob to File object
  async getFileAsFile(fileId: string, filename: string): Promise<File> {
    const blob = await this.getFileBlob(fileId);
    return new File([blob], filename, { type: blob.type });
  },
};
