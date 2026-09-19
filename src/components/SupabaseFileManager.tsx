import React, { useState, useEffect, useCallback } from 'react';
import { Cloud, Upload, Download, Trash2, RefreshCw, FileText, Image as ImageIcon, File, Folder } from 'lucide-react';
import { filesApi, storageApi } from '../services/supabaseApi';
import { useAuth } from '../components/auth';

export const SupabaseFileManager: React.FC = () => {
  const { user: authUser, isAuthenticated } = useAuth();
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Map auth user to Supabase format
  const user = authUser ? { id: authUser.id, email: authUser.email } : null;

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await filesApi.getAll();
      setFiles(data || []);
    } catch (error) {
      console.error('Error loading files:', error);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const path = `${user.id}/${Date.now()}_${file.name}`;
    
    const { error: uploadError } = await storageApi.upload('files', path, file);
    if (!uploadError) {
      const url = storageApi.getPublicUrl('files', path);
      await filesApi.create({
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'pdf' : 'other',
        url,
        size: file.size,
        metadata: { originalName: file.name }
      });
      loadFiles();
    }
    setUploading(false);
  };

  const handleDownload = (file: any) => {
    window.open(file.url, '_blank');
  };

  const handleDelete = async (file: any) => {
    if (!window.confirm('Xóa file này?')) return;
    await filesApi.delete(file.id);
    loadFiles();
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="p-8 text-center">
        <Cloud size={48} className="mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600">Đăng nhập để sử dụng Cloud Storage</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cloud size={24} className="text-blue-600" />
          <h2 className="text-xl font-bold">Cloud Storage</h2>
          <span className="text-sm text-gray-500">({files.length} files)</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadFiles}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <label className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer flex items-center gap-2">
            <Upload size={16} />
            {uploading ? 'Uploading...' : 'Upload'}
            <input type="file" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
      </div>

      {/* Files Grid */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw size={32} className="animate-spin mx-auto mb-2 text-gray-400" />
            <p className="text-gray-600">Đang tải...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-12">
            <Folder size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-4">Chưa có file nào</p>
            <label className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
              <Upload size={16} className="inline mr-2" />
              Upload file đầu tiên
              <input type="file" onChange={handleUpload} className="hidden" />
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {files.map((file) => (
              <div key={file.id} className="bg-white rounded-lg border p-4 hover:shadow-lg transition-shadow">
                <div className="flex flex-col items-center">
                  {/* Icon */}
                  <div className="w-16 h-16 flex items-center justify-center mb-2">
                    {file.type === 'image' ? (
                      <ImageIcon size={48} className="text-green-600" />
                    ) : file.type === 'pdf' ? (
                      <FileText size={48} className="text-red-600" />
                    ) : (
                      <File size={48} className="text-gray-600" />
                    )}
                  </div>
                  
                  {/* Name */}
                  <p className="text-sm font-medium text-center truncate w-full mb-2" title={file.name}>
                    {file.name}
                  </p>
                  
                  {/* Size */}
                  <p className="text-xs text-gray-500 mb-3">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  
                  {/* Actions */}
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => handleDownload(file)}
                      className="flex-1 px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs"
                    >
                      <Download size={14} className="inline" />
                    </button>
                    <button
                      onClick={() => handleDelete(file)}
                      className="flex-1 px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs"
                    >
                      <Trash2 size={14} className="inline" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
