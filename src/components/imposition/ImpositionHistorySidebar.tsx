import React, { useState } from 'react';
import {
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  FileJson
} from 'lucide-react';
import { ImpositionHistoryItem } from './types';

export interface ImpositionHistorySidebarProps {
  impositionHistory: ImpositionHistoryItem[];
  handleRequestRestoreHistory: (item: ImpositionHistoryItem) => void;
  handleExportSortJob: (item: ImpositionHistoryItem) => void;
  isExportingSortJob: boolean;
  deleteHistoryItem: (id: string, e?: React.MouseEvent) => void;
  clearHistory: () => void;
}

export const ImpositionHistorySidebar: React.FC<ImpositionHistorySidebarProps> = ({
  impositionHistory,
  handleRequestRestoreHistory,
  handleExportSortJob,
  isExportingSortJob,
  deleteHistoryItem,
  clearHistory
}) => {
  const [isHistorySectionOpen, setIsHistorySectionOpen] = useState(true);

  return (
    <div className="border-t border-slate-200">
      <div 
        className="px-4 py-3 bg-slate-50 border-b flex items-center justify-between cursor-pointer select-none hover:bg-slate-100/70 transition"
        onClick={() => setIsHistorySectionOpen(v => !v)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Clock size={16} className="text-indigo-600 flex-shrink-0" />
          <span className="text-xs font-medium text-slate-800 uppercase tracking-wider">Lịch sử bình trang</span>
          {impositionHistory.length > 0 && (
            <span className="text-[10px] bg-indigo-100 text-indigo-700 font-medium px-2 py-0.5 rounded-full">
              {impositionHistory.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          {impositionHistory.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
              title="Xoá tất cả lịch sử"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsHistorySectionOpen(v => !v)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition cursor-pointer"
            title={isHistorySectionOpen ? "Thu gọn" : "Mở rộng"}
          >
            {isHistorySectionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {isHistorySectionOpen && (
        <div className="p-4">
          {impositionHistory.length === 0 ? (
            <div className="py-10 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Clock size={32} className="mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-xs font-medium text-slate-600">Chưa có lịch sử bình trang</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
                Mỗi lần bạn bấm xuất file PDF hoặc lưu vào Quản lý tệp, tác vụ và thông số bình trang sẽ tự động được lưu trữ tại đây để bạn có thể xem lại hoặc nạp lại thông số chỉ với 1 click.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {impositionHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleRequestRestoreHistory(item)}
                  className="p-3 bg-white hover:bg-violet-50/50 hover:border-violet-300 border border-slate-200 rounded-xl shadow-xs transition group cursor-pointer"
                  title="Nhấn để nạp lại thông số bình trang này"
                >
                  {/* Main Row: Thumbnail + Info (mỗi item 1 hàng) + Nút JSON */}
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt="Thumbnail"
                        className="w-12 h-12 object-cover rounded-lg border border-slate-200 shadow-xs flex-shrink-0 bg-slate-100 mt-0.5"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0 mt-0.5">
                        <LayoutGrid size={18} />
                      </div>
                    )}

                    {/* Info: Mỗi item nằm trên 1 hàng */}
                    <div className="min-w-0 flex-1 text-[11px] text-slate-600 space-y-0.5">
                      <div className="truncate">
                        <span className="text-slate-400">Khổ:</span> <strong className="text-slate-700 font-semibold">{item.paperW}×{item.pageH}mm</strong>
                      </div>
                      <div className="truncate">
                        <span className="text-slate-400">Tem:</span> <strong className="text-slate-700 font-semibold">{item.itemW}×{item.itemH}mm</strong>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <span><span className="text-slate-400">Số lượng:</span> <strong className="text-slate-700 font-semibold">{item.layoutCount} tem</strong></span>
                        {item.shapeTabsSnapshot && item.shapeTabsSnapshot.length > 0 && (
                          <span className="px-1.5 py-0.2 bg-violet-100 text-violet-700 font-semibold rounded text-[10px] flex-shrink-0">
                            {item.shapeTabsSnapshot.length} Layer
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Nút JSON */}
                    <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleExportSortJob(item)}
                        disabled={isExportingSortJob}
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                        title="Xuất JSON SortJob của lịch sử này lưu về VPS"
                      >
                        <FileJson size={13} />
                        <span>JSON</span>
                      </button>
                    </div>
                  </div>

                  {/* Nút ngày tháng năm + nút xóa nằm bên dưới */}
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 text-[11px] text-slate-400" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock size={12} className="flex-shrink-0" />
                      <span>{item.date}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => deleteHistoryItem(item.id, e)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                      title="Xóa mục này"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
