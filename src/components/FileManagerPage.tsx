import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  FolderOpen, Upload, RefreshCw, Download, Trash2, Clock, 
  FileText, Image, Type, Folder, File, AlertTriangle,
  ChevronLeft, MoreVertical, Timer, HardDrive, Edit3, Eye, X
} from 'lucide-react';
import { fileService, FileItem, StorageStats } from '../services/fileService';

interface FileManagerPageProps {
  onClose?: () => void;
  onSelectFile?: (file: FileItem) => void;
  selectMode?: boolean;
  allowedTypes?: string[];
}

const FileManagerPage: React.FC<FileManagerPageProps> = ({ 
  onClose, 
  onSelectFile, 
  selectMode = false,
  allowedTypes 
}) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [renameFile, setRenameFile] = useState<FileItem | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { id: 'all', label: 'Tất cả', icon: Folder },
    { id: 'PDF', label: 'PDF', icon: FileText },
    { id: 'IMAGE', label: 'Ảnh', icon: Image },
    { id: 'FONT', label: 'Font', icon: Type },
    { id: 'PROJECT', label: 'Dự án', icon: File },
  ];

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [filesData, statsData] = await Promise.all([
        fileService.getFiles(activeTab),
        fileService.getStorageStats(),
      ]);
      setFiles(filesData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách tệp');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadFiles();
  }, [activeTab]);

  // Auto refresh remaining time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setFiles(prev => prev.map(f => ({
        ...f,
        remainingTime: Math.max(0, f.remainingTime - 1),
      })));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      await fileService.uploadFile(file);
      await loadFiles();
    } catch (err: any) {
      setError(err.message || 'Không thể upload tệp');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = async (file: FileItem) => {
    try {
      await fileService.downloadFile(file.id, file.originalName);
    } catch (err: any) {
      setError(err.message || 'Không thể tải tệp');
    }
  };

  const handleDelete = async (file: FileItem) => {
    if (!window.confirm(`Xóa tệp "${file.originalName}"?`)) return;
    
    try {
      await fileService.deleteFile(file.id);
      await loadFiles();
    } catch (err: any) {
      setError(err.message || 'Không thể xóa tệp');
    }
  };

  const handleExtend = async (file: FileItem) => {
    try {
      const result = await fileService.extendFile(file.id);
      setFiles(prev => prev.map(f => 
        f.id === file.id 
          ? { ...f, expiresAt: result.expiresAt, remainingTime: result.remainingTime }
          : f
      ));
    } catch (err: any) {
      setError(err.message || 'Không thể gia hạn tệp');
    }
  };

  const handleSelect = (file: FileItem) => {
    if (selectMode && onSelectFile) {
      onSelectFile(file);
    } else {
      setSelectedFile(selectedFile?.id === file.id ? null : file);
    }
  };

  const handleRename = async () => {
    if (!renameFile || !newFileName.trim()) return;
    
    try {
      await fileService.renameFile(renameFile.id, newFileName.trim());
      await loadFiles();
      setRenameFile(null);
      setNewFileName('');
    } catch (err: any) {
      setError(err.message || 'Không thể đổi tên tệp');
    }
  };

  const openPreview = (file: FileItem) => {
    if (file.fileType === 'IMAGE' || file.fileType === 'PDF') {
      setPreviewFile(file);
    }
  };

  const getPreviewUrl = (file: FileItem) => {
    return fileService.getFileViewUrl(file.id);
  };

  const filteredFiles = allowedTypes 
    ? files.filter(f => allowedTypes.includes(f.fileType))
    : files;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft size={20} />
            </button>
          )}
          <FolderOpen className="text-indigo-600" size={24} />
          <div>
            <h1 className="text-xl font-bold text-gray-800">Quản lý tệp</h1>
            <p className="text-sm text-gray-500">Tệp sẽ tự động xóa sau 3 giờ</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Storage Stats */}
          {stats && (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
              <HardDrive size={16} className="text-gray-500" />
              <div className="text-sm">
                <span className="font-medium">{stats.usedMB}</span>
                <span className="text-gray-500">/{stats.limitMB} MB</span>
              </div>
              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${stats.usagePercent > 80 ? 'bg-red-500' : 'bg-indigo-500'}`}
                  style={{ width: `${stats.usagePercent}%` }}
                />
              </div>
            </div>
          )}
          
          <button 
            onClick={loadFiles} 
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            title="Làm mới"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          
          <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer">
            <Upload size={18} />
            <span>{uploading ? 'Đang tải...' : 'Upload'}</span>
            <input 
              ref={fileInputRef}
              type="file" 
              className="hidden" 
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-3">
        <AlertTriangle size={18} className="text-amber-600" />
        <p className="text-sm text-amber-800">
          <strong>Lưu ý:</strong> Tệp sẽ tự động xóa sau 3 giờ. Tải về để lưu vĩnh viễn hoặc nhấn "Gia hạn" để thêm 3 giờ.
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b px-6 py-2 flex gap-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const count = tab.id === 'all' 
            ? files.length 
            : files.filter(f => f.fileType === tab.id).length;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon size={16} />
              {tab.label}
              {count > 0 && (
                <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id ? 'bg-indigo-200' : 'bg-gray-200'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm select-text">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw size={32} className="animate-spin text-indigo-600" />
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <FolderOpen size={64} className="mb-4 text-gray-300" />
            <p className="text-lg font-medium">Chưa có tệp nào</p>
            <p className="text-sm">Upload tệp để bắt đầu</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredFiles.map(file => {
              const isExpiringSoon = file.remainingTime < 30;
              const isExpired = file.remainingTime <= 0;
              
              return (
                <div
                  key={file.id}
                  onClick={() => handleSelect(file)}
                  className={`relative bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-lg ${
                    selectedFile?.id === file.id ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-gray-200'
                  } ${isExpired ? 'opacity-50' : ''}`}
                >
                  {/* File Icon */}
                  <div className="text-4xl text-center mb-3">
                    {fileService.getFileIcon(file.fileType)}
                  </div>
                  
                  {/* File Name */}
                  <p className="text-sm font-medium text-gray-800 truncate text-center" title={file.originalName}>
                    {file.originalName}
                  </p>
                  
                  {/* File Size */}
                  <p className="text-xs text-gray-500 text-center mt-1">
                    {fileService.formatSize(file.size)}
                  </p>
                  
                  {/* Remaining Time */}
                  <div className={`flex items-center justify-center gap-1 mt-2 text-xs ${
                    isExpired ? 'text-red-600' : isExpiringSoon ? 'text-amber-600' : 'text-gray-500'
                  }`}>
                    <Clock size={12} />
                    {fileService.formatRemainingTime(file.remainingTime)}
                  </div>
                  
                  {/* Actions */}
                  {selectedFile?.id === file.id && !selectMode && (
                    <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center gap-2 flex-wrap p-2">
                      {(file.fileType === 'IMAGE' || file.fileType === 'PDF') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openPreview(file); }}
                          className="p-2 bg-white rounded-lg hover:bg-gray-100"
                          title="Xem trước"
                        >
                          <Eye size={18} className="text-purple-600" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                        className="p-2 bg-white rounded-lg hover:bg-gray-100"
                        title="Tải về"
                      >
                        <Download size={18} className="text-indigo-600" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setRenameFile(file); setNewFileName(file.originalName); }}
                        className="p-2 bg-white rounded-lg hover:bg-gray-100"
                        title="Đổi tên"
                      >
                        <Edit3 size={18} className="text-amber-600" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleExtend(file); }}
                        className="p-2 bg-white rounded-lg hover:bg-gray-100"
                        title="Gia hạn +3h"
                      >
                        <Timer size={18} className="text-green-600" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(file); }}
                        className="p-2 bg-white rounded-lg hover:bg-gray-100"
                        title="Xóa"
                      >
                        <Trash2 size={18} className="text-red-600" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rename Modal */}
      {renameFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Đổi tên tệp</h3>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Nhập tên mới..."
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setRenameFile(null); setNewFileName(''); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={handleRename}
                disabled={!newFileName.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-8">
          <div className="relative w-full h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-bold truncate flex-1">
                {previewFile.originalName}
              </h3>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center overflow-hidden rounded-lg bg-white/10">
              {previewFile.fileType === 'IMAGE' ? (
                <img
                  src={getPreviewUrl(previewFile)}
                  alt={previewFile.originalName}
                  className="max-w-full max-h-full object-contain"
                />
              ) : previewFile.fileType === 'PDF' ? (
                <iframe
                  src={getPreviewUrl(previewFile)}
                  className="w-full h-full bg-white rounded-lg"
                  title={previewFile.originalName}
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileManagerPage;
