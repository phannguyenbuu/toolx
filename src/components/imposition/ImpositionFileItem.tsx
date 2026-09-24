import React from 'react';
import { Layers, FileText, Image as ImageIcon, Shapes, Trash2 } from 'lucide-react';
import { FileGroupItem } from './impositionFileService';

interface ImpositionFileItemProps {
  group: FileGroupItem;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

export const ImpositionFileItem: React.FC<ImpositionFileItemProps> = ({
  group,
  onSelect,
  onDelete,
}) => {
  return (
    <div
      onClick={onSelect}
      className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer group my-1 ${
        group.hasActiveLayer
          ? 'bg-violet-50/90 border border-violet-200 shadow-2xs'
          : 'hover:bg-slate-50 border border-transparent'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="relative w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-2xs">
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
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-800 truncate" title={group.fileName}>
              {group.fileName}
            </span>
            {group.hasActiveLayer && (
              <span className="text-[10px] bg-violet-600 text-white font-medium px-1.5 py-0.2 rounded-full flex-shrink-0">
                Đang chọn
              </span>
            )}
          </div>

          {/* Bên dưới mỗi file hiển thị có bao nhiêu layer */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
            <span className="inline-flex items-center gap-1 font-medium text-violet-700 bg-violet-100/80 px-1.5 py-0.2 rounded-md text-[10px]">
              <Layers size={10} className="text-violet-600" />
              {group.layerCount} {group.layerCount > 1 ? 'layers' : 'layer'}
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
          title={`Xóa tệp "${group.fileName}" (${group.layerCount} layer)`}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};
