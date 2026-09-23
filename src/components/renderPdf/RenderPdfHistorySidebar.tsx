import React from 'react';
import {
  Clock,
  RefreshCw,
  Terminal,
  ChevronDown,
  Settings,
  AlertTriangle,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import { RenderDocItem } from './types';

export interface RenderPdfHistorySidebarProps {
  isRightSidebarVisible: boolean;
  isRightSidebarHovered: boolean;
  handleRightSidebarHoverEnter: () => void;
  handleRightSidebarHoverLeave: () => void;
  toggleRightSidebar: () => void;
  totalCount: number;
  fetchDocuments: (isSilent?: boolean) => Promise<void>;
  isLoadingDocs: boolean;
  diagDropdownOpen: boolean;
  setDiagDropdownOpen: (open: boolean) => void;
  handleViewAgentLog: (filename: 'setting.json' | 'stdout.txt' | 'sterror.txt') => Promise<void>;
  documents: RenderDocItem[];
  handleClearAllDocs: () => Promise<void>;
  handleDeleteDoc: (id: string) => Promise<void>;
  handleDownloadRenderedDoc: (doc: RenderDocItem) => Promise<void>;
  handleOpenColorStudio: (url: string, title?: string, doc?: RenderDocItem) => void;
  perPage: number;
  setPerPage: (perPage: number) => void;
  currentPageNum: number;
  setCurrentPageNum: React.Dispatch<React.SetStateAction<number>>;
  totalPagesNum: number;
  isLightMode: boolean;
}

export const RenderPdfHistorySidebar: React.FC<RenderPdfHistorySidebarProps> = ({
  isRightSidebarVisible,
  isRightSidebarHovered,
  handleRightSidebarHoverEnter,
  handleRightSidebarHoverLeave,
  toggleRightSidebar,
  totalCount,
  fetchDocuments,
  isLoadingDocs,
  diagDropdownOpen,
  setDiagDropdownOpen,
  handleViewAgentLog,
  documents,
  handleClearAllDocs,
  handleDeleteDoc,
  handleDownloadRenderedDoc,
  handleOpenColorStudio,
  perPage,
  setPerPage,
  currentPageNum,
  setCurrentPageNum,
  totalPagesNum,
  isLightMode
}) => {
  const themeHeader = isLightMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800';
  const themeCardInner = isLightMode ? 'bg-slate-50/70 border-slate-200/80' : 'bg-slate-950/70 border-slate-850';
  const themeTextHead = isLightMode ? 'text-slate-900 font-semibold tracking-tight' : 'text-white font-semibold tracking-tight';
  const themeTextMuted = isLightMode ? 'text-slate-500 font-normal' : 'text-slate-400 font-normal';
  const themeBtnSecondary = isLightMode ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs' : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-750';
  const themeInput = isLightMode ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-750 text-slate-100';

  return (
    <>
      {/* Floating Toggle Button on Edge */}
      <button
        onClick={toggleRightSidebar}
        onMouseEnter={handleRightSidebarHoverEnter}
        onMouseLeave={handleRightSidebarHoverLeave}
        className={`fixed z-50 top-1/2 -translate-y-1/2 transition-all duration-200 ease-in-out w-5 hover:w-6.5 h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 border-r-0 rounded-l-xl shadow-xs hover:shadow-sm flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer group select-none ${
          !isRightSidebarVisible ? "right-0" : "right-[700px] -mr-px"
        }`}
        title={
          !isRightSidebarVisible
            ? "Mở rộng Hàng đợi & Lịch sử (Rê chuột để xem, click để ghim)"
            : isRightSidebarHovered
              ? "Ghim Hàng đợi & Lịch sử (Click để ghim cố định)"
              : "Thu gọn Hàng đợi & Lịch sử (Autohide sidebar)"
        }
      >
        {!isRightSidebarVisible ? (
          <ChevronLeft size={16} strokeWidth={1.75} className="transition-transform group-hover:scale-105" />
        ) : (
          <ChevronRight size={16} strokeWidth={1.75} className="transition-transform group-hover:scale-105" />
        )}
      </button>

      {/* Right Edge hover sensor when collapsed */}
      {!isRightSidebarVisible && (
        <div
          onMouseEnter={handleRightSidebarHoverEnter}
          className="fixed right-0 top-0 bottom-0 w-3.5 z-40 pointer-events-auto"
          aria-hidden="true"
        />
      )}

      {/* RIGHT SIDEBAR: JOBS / QUEUE PANEL */}
      <aside
        onMouseEnter={handleRightSidebarHoverEnter}
        onMouseLeave={handleRightSidebarHoverLeave}
        className={`flex-shrink-0 h-full flex flex-col justify-between z-40 select-none shadow-xl transition-all duration-300 ease-in-out relative overflow-hidden ${
          isLightMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        } ${
          !isRightSidebarVisible
            ? "w-0 min-w-0 border-l-0 opacity-0 pointer-events-none"
            : "w-[700px] max-w-[95vw] border-l opacity-100"
        }`}
      >
        <div className="w-[700px] max-w-[95vw] h-full flex flex-col justify-between overflow-hidden flex-shrink-0">
          {/* TOP: TITLE & BUTTONS */}
          <div className={`p-3.5 border-b flex items-center justify-between gap-2 flex-shrink-0 ${themeHeader}`}>
            <div className="flex items-center gap-2 min-w-0">
              <Clock size={18} className="text-indigo-500 flex-shrink-0" />
              <span className={`text-sm font-bold truncate ${themeTextHead}`}>Hàng đợi tác vụ & Lịch sử</span>
              {totalCount > 0 && (
                <span className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-full">
                  {totalCount}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => fetchDocuments(false)}
                disabled={isLoadingDocs}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center space-x-1 cursor-pointer ${themeBtnSecondary}`}
                title="Tải lại danh sách"
              >
                <RefreshCw size={12} className={isLoadingDocs ? 'animate-spin' : ''} />
                <span>Tải lại</span>
              </button>

              {/* Diagnostics Quick Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDiagDropdownOpen(!diagDropdownOpen)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center space-x-1 cursor-pointer ${themeBtnSecondary}`}
                >
                  <Terminal size={12} />
                  <span>Chẩn đoán</span>
                  <ChevronDown size={11} />
                </button>

                {diagDropdownOpen && (
                  <div className={`absolute right-0 mt-2 w-48 rounded-xl border shadow-2xl z-30 overflow-hidden py-1 ${isLightMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                    <button
                      onClick={() => handleViewAgentLog('setting.json')}
                      className={`w-full text-left px-4 py-2 text-xs transition flex items-center space-x-2 cursor-pointer ${isLightMode ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-slate-800 text-slate-300'}`}
                    >
                      <Settings size={13} className="text-indigo-500" />
                      <span>Xem setting.json</span>
                    </button>
                    <button
                      onClick={() => handleViewAgentLog('stdout.txt')}
                      className={`w-full text-left px-4 py-2 text-xs transition flex items-center space-x-2 cursor-pointer ${isLightMode ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-slate-800 text-slate-300'}`}
                    >
                      <Terminal size={13} className="text-emerald-500" />
                      <span>Xem stdout.txt</span>
                    </button>
                    <button
                      onClick={() => handleViewAgentLog('sterror.txt')}
                      className={`w-full text-left px-4 py-2 text-xs transition flex items-center space-x-2 cursor-pointer ${isLightMode ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-slate-800 text-slate-300'}`}
                    >
                      <AlertTriangle size={13} className="text-rose-500" />
                      <span>Xem sterror.txt</span>
                    </button>
                  </div>
                )}
              </div>

              {documents.length > 0 && (
                <button
                  onClick={handleClearAllDocs}
                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl text-xs font-semibold border border-rose-500/20 transition flex items-center cursor-pointer"
                  title="Xóa tất cả"
                >
                  <Trash2 size={13} />
                </button>
              )}

              <button
                onClick={toggleRightSidebar}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Thu gọn (Autohide)"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Task Table */}
          <div className="flex-1 overflow-y-auto overflow-x-auto [contain:paint]">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className={`border-b text-[11px] uppercase tracking-wider font-semibold ${isLightMode ? 'border-slate-200 text-slate-500 bg-slate-50/50' : 'border-slate-800 text-slate-400'}`}>
                  <th className="py-2.5 px-3">Tên file</th>
                  <th className="py-2.5 px-3 text-center">Profile & Thông số</th>
                  <th className="py-2.5 px-2 text-center">Trạng thái</th>
                  <th className="py-2.5 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs ${isLightMode ? 'divide-slate-200 text-slate-800' : 'divide-slate-800/50 text-slate-200'}`}>
                {documents.length > 0 ? (
                  documents.map((doc) => {
                    const isClickable = doc.status === 'completed' && Boolean(doc.preview_url);
                    return (
                      <tr
                        key={doc.id}
                        onClick={() => {
                          if (isClickable) {
                            handleOpenColorStudio(doc.preview_url!, doc.filename, doc);
                          }
                        }}
                        className={`transition-colors duration-75 ${
                          isClickable
                            ? 'cursor-pointer hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30'
                            : isLightMode
                            ? 'hover:bg-slate-50'
                            : 'hover:bg-slate-950/40'
                        }`}
                        title={
                          isClickable
                            ? 'Nhấp vào bản ghi để mở Color Studio & Xem trước'
                            : undefined
                        }
                      >
                        <td className="py-2.5 px-3 font-medium">
                          <div className="flex items-center space-x-2.5 min-w-0">
                            {doc.status === 'completed' && (doc.thumbnail_url || doc.preview_url) ? (
                              <img
                                src={doc.thumbnail_url || doc.preview_url}
                                alt="Preview"
                                width={40}
                                height={32}
                                loading="lazy"
                                decoding="async"
                                className="w-10 h-8 object-cover rounded-md border border-slate-700 group-hover:border-indigo-500 shadow-xs flex-shrink-0"
                                title="Nhấp để xem trước & chỉnh màu"
                              />
                            ) : (
                              <div className={`w-10 h-8 rounded-md border flex items-center justify-center text-[10px] font-semibold uppercase flex-shrink-0 ${themeCardInner}`}>
                                -
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="truncate block font-semibold text-xs max-w-[160px]" title={doc.filename}>
                                {doc.filename}
                              </span>
                              {doc.worker_name && (
                                <div className="mt-0.5">
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    <span className="w-1.5 h-1.5 mr-1 rounded-full bg-emerald-400 animate-pulse"></span>
                                    🖥️ {doc.worker_name}
                                  </span>
                                </div>
                              )}
                              <span className={`text-[10px] block ${themeTextMuted}`}>
                                {doc.created_at}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex flex-col items-center gap-1">
                            <span
                              className="inline-block max-w-[170px] truncate text-[10px] font-semibold px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                              title={doc.profile_name || (doc.colorspace?.toLowerCase().includes('cmyk') ? 'GCR 22%' : 'Mặc định')}
                            >
                              {doc.profile_name || (doc.colorspace?.toLowerCase().includes('cmyk') ? 'GCR 22%' : 'Mặc định')}
                            </span>
                            <div className="inline-flex items-center gap-1.5 flex-wrap justify-center text-[9px]">
                              <span className="text-indigo-500 font-semibold bg-indigo-500/10 px-1.5 py-0.2 rounded-full">
                                {doc.dpi} DPI
                              </span>
                              <span className={`uppercase ${themeTextMuted}`}>
                                {doc.colorspace} • {doc.compression}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-2 text-center">
                          <div className="inline-flex flex-col items-center gap-1">
                            {doc.status === 'pending' && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                <span className="w-1.5 h-1.5 mr-1 rounded-full bg-amber-500 animate-pulse"></span>
                                Chờ
                              </span>
                            )}
                            {doc.status === 'rendering' && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                <span className="w-1.5 h-1.5 mr-1 rounded-full bg-blue-500 animate-pulse"></span>
                                Render
                              </span>
                            )}
                            {doc.status === 'completed' && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 mr-1 rounded-full bg-emerald-500"></span>
                                Xong
                              </span>
                            )}
                            {doc.status === 'failed' && (
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20"
                                title={doc.error_message}
                              >
                                <span className="w-1.5 h-1.5 mr-1 rounded-full bg-rose-500"></span>
                                Lỗi
                              </span>
                            )}
                            <span className={`text-[10px] font-medium leading-none ${themeTextMuted}`}>
                              {doc.status === 'rendering' ? (
                                <span className="text-blue-500 animate-pulse text-[9px]">Đang chạy...</span>
                              ) : (
                                doc.duration || '-'
                              )}
                            </span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {doc.status === 'completed' && doc.download_url && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadRenderedDoc(doc);
                                }}
                                className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition shadow-xs cursor-pointer flex items-center justify-center w-7 h-7"
                                title={`Tải xuống ${doc.convert_to_pdf || doc.filename.toLowerCase().endsWith('.pdf') ? 'file PDF' : 'file TIFF'}`}
                              >
                                <Download size={13} />
                              </button>
                            )}
                            {doc.status === 'failed' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toast.error(`Chi tiết lỗi Render:\n${doc.error_message || 'Không có thông tin lỗi.'}`, { duration: 6000 });
                                }}
                                className={`p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg border transition cursor-pointer ${themeBtnSecondary} flex items-center justify-center w-7 h-7`}
                                title="Xem chi tiết lỗi"
                              >
                                <AlertTriangle size={13} />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDoc(doc.id);
                              }}
                              className={`p-1.5 rounded-lg border transition cursor-pointer ${themeBtnSecondary} text-rose-500 hover:text-rose-600 flex items-center justify-center w-7 h-7`}
                              title="Xóa tác vụ"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className={`py-10 text-center text-xs ${themeTextMuted}`}>
                      {isLoadingDocs
                        ? 'Đang tải danh sách tác vụ...'
                        : 'Chưa có tác vụ nào trong hàng đợi.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Control */}
          <div className={`p-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs flex-shrink-0 ${themeCardInner} ${themeTextMuted}`}>
            <div className="flex items-center space-x-1.5">
              <span>Hiện</span>
              <select
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
                className={`border rounded-lg px-2 py-1 cursor-pointer ${themeInput}`}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>/ {totalCount} tác vụ</span>
            </div>

            {totalPagesNum > 1 && (
              <div className="flex items-center space-x-1">
                <button
                  disabled={currentPageNum <= 1}
                  onClick={() => setCurrentPageNum((p) => Math.max(1, p - 1))}
                  className={`px-2.5 py-1 disabled:opacity-40 rounded-lg text-xs font-semibold border transition cursor-pointer ${themeBtnSecondary}`}
                >
                  Trước
                </button>
                <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow shadow-indigo-500/25">
                  {currentPageNum} / {totalPagesNum}
                </span>
                <button
                  disabled={currentPageNum >= totalPagesNum}
                  onClick={() => setCurrentPageNum((p) => Math.min(totalPagesNum, p + 1))}
                  className={`px-2.5 py-1 disabled:opacity-40 rounded-lg text-xs font-semibold border transition cursor-pointer ${themeBtnSecondary}`}
                >
                  Sau
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
