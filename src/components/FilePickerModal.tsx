import React, { useState, useEffect } from 'react';
import { X, FileText, Image, Loader2, FolderOpen, Check } from 'lucide-react';
import { fileService, FileItem } from '../services/fileService';

interface FilePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (file: File) => void;
  accept?: string[]; // ['PDF', 'IMAGE']
  title?: string;
}

export const FilePickerModal: React.FC<FilePickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  accept = ['PDF', 'IMAGE'],
  title = 'Chọn tệp từ Quản lý tệp'
}) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadFiles();
    }
  }, [isOpen]);

  const loadFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const allFiles = await fileService.getFiles();
      // Filter by accepted types
      const filtered = allFiles.filter(f => accept.includes(f.fileType));
      setFiles(filtered);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách tệp');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    
    setImporting(true);
    try {
      const file = await fileService.getFileAsFile(selectedFile.id, selectedFile.originalName);
      onSelect(file);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Không thể import tệp');
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FolderOpen className="text-indigo-500" size={20} />
            {title}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">{error}</div>
          ) : files.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FolderOpen size={48} className="mx-auto mb-3 text-gray-300" />
              <p>Không có tệp nào phù hợp</p>
              <p className="text-sm mt-1">Hãy upload tệp vào Quản lý tệp trước</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {files.map(file => (
                <button
                  key={file.id}
                  onClick={() => setSelectedFile(file)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    selectedFile?.id === file.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {file.fileType === 'PDF' ? (
                      <FileText size={20} className="text-red-500" />
                    ) : (
                      <Image size={20} className="text-blue-500" />
                    )}
                    {selectedFile?.id === file.id && (
                      <Check size={16} className="text-indigo-500 ml-auto" />
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {file.originalName}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {fileService.formatSize(file.size)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium"
          >
            Hủy
          </button>
          <button
            onClick={handleImport}
            disabled={!selectedFile || importing}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {importing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Đang import...
              </>
            ) : (
              <>
                <Check size={16} />
                Chọn tệp
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilePickerModal;
