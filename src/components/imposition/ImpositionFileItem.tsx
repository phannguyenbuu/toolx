import React, { useState, useRef, useEffect } from 'react';
import { Briefcase, FileText, Image as ImageIcon, Shapes, Trash2, Pencil, Check, X } from 'lucide-react';
import { FileGroupItem } from './impositionFileService';

interface ImpositionFileItemProps {
  group: FileGroupItem;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onRename?: (newName: string) => void;
}

export const ImpositionFileItem: React.FC<ImpositionFileItemProps> = ({
  group,
  onSelect,
  onDelete,
  onRename,
}) => {
  const isSelected = group.hasActiveJob || group.hasActiveLayer;
  const count = group.jobCount || group.layerCount;

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.fileName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditName(group.fileName);
  }, [group.fileName]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSaveRename = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== group.fileName && onRename) {
      onRename(trimmed);
    }
    setIsEditing(false);
  };

  return (
    <div
      onClick={onSelect}
      className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer group my-1 ${
        isSelected
          ? 'bg-violet-50/90 border border-violet-200 shadow-2xs'
          : 'hover:bg-slate-50 border border-transparent'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div
          className="relative w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-2xs"
          style={group.thumbUrl ? {
            backgroundColor: '#ffffff',
            backgroundImage: 'conic-gradient(#cbd5e1 25%, #ffffff 0 50%, #cbd5e1 0 75%, #ffffff 0)',
            backgroundSize: '8px 8px',
            backgroundPosition: '0 0',
          } : undefined}
        >
          {group.thumbUrl ? (
            <img src={group.thumbUrl} alt="" className="w-full h-full object-contain" />
          ) : group.fileType === 'pdf' ? (
            <FileText size={22} className="text-red-500" />
          ) : group.fileType === 'image' ? (
            <ImageIcon size={22} className="text-blue-500" />
          ) : (
            <Shapes size={22} className="text-violet-500" />
          )}

          {group.fileType === 'pdf' && (
            <span className="absolute bottom-0 right-0 bg-red-600 text-[8px] text-white font-bold px-1 rounded-tl-xs">
              PDF
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="flex items-center gap-1.5 py-0.5" onClick={(e) => e.stopPropagation()}>
              <input
                ref={inputRef}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                className="w-full text-xs font-semibold text-slate-800 bg-white border border-violet-400 rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-violet-400 shadow-2xs"
                placeholder="Nhập tên job..."
              />
              <button
                type="button"
                onClick={handleSaveRename}
                className="p-1 rounded-md bg-violet-600 text-white hover:bg-violet-700 transition cursor-pointer shrink-0"
                title="Lưu tên job"
              >
                <Check size={12} />
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer shrink-0"
                title="Hủy"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-semibold text-slate-800 truncate" title={group.fileName}>
                {group.fileName}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditName(group.fileName);
                  setIsEditing(true);
                }}
                className="p-0.5 rounded text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition cursor-pointer shrink-0"
                title="Sửa tên job"
              >
                <Pencil size={11} />
              </button>
              {isSelected && (
                <span className="text-[10px] bg-violet-600 text-white font-medium px-1.5 py-0.2 rounded-full flex-shrink-0">
                  Đang chọn
                </span>
              )}
            </div>
          )}

          {/* Bên dưới mỗi file hiển thị có bao nhiêu job */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
            <span className="inline-flex items-center gap-1 font-medium text-violet-700 bg-violet-100/80 px-1.5 py-0.2 rounded-md text-[10px]">
              <Briefcase size={10} className="text-violet-600" />
              {count} {count > 1 ? 'jobs' : 'job'}
            </span>
            {group.dimensionsText && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-[10px] text-slate-500">{group.dimensionsText}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
          title={`Xóa tệp "${group.fileName}" (${count} job)`}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};
