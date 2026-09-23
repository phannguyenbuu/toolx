import React from 'react';
import {
  X,
  Activity,
  Sliders,
  RefreshCw,
  Terminal,
  Settings,
  AlertTriangle,
  Copy
} from 'lucide-react';
import { DiagData } from '../types';

export interface DiagnoseModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagData: DiagData;
  handleMaximizePagefile: () => Promise<void>;
  handleRestartAgent: () => Promise<void>;
  handleViewAgentLog: (filename: 'setting.json' | 'stdout.txt' | 'sterror.txt') => Promise<void>;
  logModalOpen: boolean;
  setLogModalOpen: (open: boolean) => void;
  logModalTitle: string;
  logModalContent: string;
  logLoading: boolean;
  copiedLog: boolean;
  handleCopyLogContent: () => void;
  isLightMode: boolean;
}

export const DiagnoseModal: React.FC<DiagnoseModalProps> = ({
  isOpen,
  onClose,
  diagData,
  handleMaximizePagefile,
  handleRestartAgent,
  handleViewAgentLog,
  logModalOpen,
  setLogModalOpen,
  logModalTitle,
  logModalContent,
  logLoading,
  copiedLog,
  handleCopyLogContent,
  isLightMode
}) => {
  if (!isOpen) return null;

  const themeHeader = isLightMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800';
  const themeCard = isLightMode ? 'bg-white border-slate-200/90 shadow-xs' : 'bg-slate-900 border-slate-800 shadow-lg';
  const themeCardInner = isLightMode ? 'bg-slate-50/70 border-slate-200/80' : 'bg-slate-950/70 border-slate-850';
  const themeTextHead = isLightMode ? 'text-slate-900 font-semibold tracking-tight' : 'text-white font-semibold tracking-tight';
  const themeTextMuted = isLightMode ? 'text-slate-500 font-normal' : 'text-slate-400 font-normal';
  const themeBtnSecondary = isLightMode ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs' : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-750';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in">
        <div className={`w-full max-w-6xl max-h-[92vh] rounded-3xl shadow-2xl border flex flex-col overflow-hidden ${isLightMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
          <div className={`p-4 sm:px-6 border-b flex items-center justify-between flex-shrink-0 ${themeHeader}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shadow-inner">
                <Activity size={20} />
              </div>
              <div>
                <h2 className={`text-base font-bold tracking-tight ${themeTextHead}`}>Chẩn đoán & Giám sát lỗi từ xa</h2>
                <p className={`text-xs truncate ${themeTextMuted}`}>Thông số phần cứng, dung lượng RAM 128GB và nhật ký hoạt động thời gian thực</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl border transition cursor-pointer ${themeBtnSecondary}`}
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className={`text-xl flex items-center gap-2 ${themeTextHead}`}>
                    <Activity className="text-indigo-500" size={22} />
                    <span>Chẩn đoán & Giám sát lỗi từ xa</span>
                  </h2>
                  <p className={`text-xs mt-1 ${themeTextMuted}`}>
                    Xem thông số phần cứng, dung lượng RAM 128GB và nhật ký hoạt động thời gian thực của máy chủ
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleMaximizePagefile}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${themeBtnSecondary}`}
                  >
                    <Sliders size={14} />
                    <span>Tối đa hóa Pagefile</span>
                  </button>
                  <button
                    onClick={handleRestartAgent}
                    className="px-3 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600 text-amber-500 hover:text-white text-xs font-semibold border border-amber-500/30 transition flex items-center gap-1.5"
                  >
                    <RefreshCw size={14} />
                    <span>Khởi động lại Agent</span>
                  </button>
                </div>
              </div>

              {/* Status 4-Card Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className={`border rounded-2xl p-5 ${themeCard}`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${themeTextMuted}`}>Trạng thái Agent</p>
                  <div className="flex items-center space-x-3 mt-2">
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-emerald-400 animate-pulse"></div>
                    <span className={`text-xl font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>ONLINE</span>
                  </div>
                  <p className={`text-[11px] mt-3 ${themeTextMuted}`}>Hệ thống sẵn sàng xử lý vector</p>
                </div>

                <div className={`border rounded-2xl p-5 ${themeCard}`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${themeTextMuted}`}>Tên máy chủ</p>
                  <h3 className={`text-lg font-bold mt-1 truncate ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{diagData.hostname}</h3>
                  <p className={`text-[11px] mt-3 ${themeTextMuted}`}>{diagData.os}</p>
                </div>

                <div className={`border rounded-2xl p-5 ${themeCard}`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${themeTextMuted}`}>Hiệu năng CPU</p>
                  <div className="flex items-baseline space-x-1 mt-1">
                    <span className={`text-3xl font-extrabold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{diagData.cpu_usage}</span>
                    <span className={`text-base font-medium ${themeTextMuted}`}>%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${diagData.cpu_usage}%` }}></div>
                  </div>
                </div>

                <div className={`border rounded-2xl p-5 ${themeCard}`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${themeTextMuted}`}>Bộ nhớ RAM vật lý</p>
                  <div className="flex items-baseline space-x-1 mt-1">
                    <span className={`text-3xl font-extrabold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{diagData.ram_used_gb}</span>
                    <span className={`text-sm font-medium ${themeTextMuted}`}>/ {diagData.ram_total_gb} GB</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full"
                      style={{ width: `${(diagData.ram_used_gb / diagData.ram_total_gb) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Realtime Log Viewer Tabs */}
              <div className={`border rounded-2xl p-5 ${themeCard}`}>
                <h3 className={`text-base mb-4 flex items-center gap-2 ${themeTextHead}`}>
                  <Terminal size={18} className="text-emerald-500" />
                  <span>Tra cứu nhật ký từ xa</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => handleViewAgentLog('setting.json')}
                    className={`p-4 rounded-xl border hover:border-indigo-500 transition text-left group ${themeCardInner}`}
                  >
                    <div className="flex items-center gap-2 text-indigo-500 font-semibold text-xs mb-1">
                      <Settings size={15} />
                      <span>setting.json</span>
                    </div>
                    <p className={`text-[11px] ${themeTextMuted}`}>Xem cấu hình cổng, giới hạn RAM và URL máy chủ</p>
                  </button>

                  <button
                    onClick={() => handleViewAgentLog('stdout.txt')}
                    className={`p-4 rounded-xl border hover:border-emerald-500 transition text-left group ${themeCardInner}`}
                  >
                    <div className="flex items-center gap-2 text-emerald-500 font-semibold text-xs mb-1">
                      <Terminal size={15} />
                      <span>stdout.txt</span>
                    </div>
                    <p className={`text-[11px] ${themeTextMuted}`}>Xem log quá trình biên dịch và kết xuất file vector</p>
                  </button>

                  <button
                    onClick={() => handleViewAgentLog('sterror.txt')}
                    className={`p-4 rounded-xl border hover:border-rose-500 transition text-left group ${themeCardInner}`}
                  >
                    <div className="flex items-center gap-2 text-rose-500 font-semibold text-xs mb-1">
                      <AlertTriangle size={15} />
                      <span>sterror.txt</span>
                    </div>
                    <p className={`text-[11px] ${themeTextMuted}`}>Xem log bắt lỗi C-Core, tràn bộ nhớ hoặc timeout</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LOG VIEWER POPUP */}
      {logModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className={`relative border rounded-2xl overflow-hidden max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl ${themeCard}`}>
            <div className={`flex justify-between items-center p-4 border-b ${themeCardInner}`}>
              <h4 className={`font-bold text-sm flex items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-slate-200'}`}>
                <Terminal size={16} className="text-indigo-500" />
                <span>{logModalTitle}</span>
              </h4>
              <button
                onClick={() => setLogModalOpen(false)}
                className={`p-1 rounded-lg text-slate-400 hover:text-rose-500 transition ${isLightMode ? 'hover:bg-slate-100' : 'hover:bg-slate-800'}`}
              >
                <X size={18} />
              </button>
            </div>
            <div className={`p-4 flex-grow overflow-auto font-mono text-xs select-text leading-relaxed whitespace-pre-wrap break-all max-h-[60vh] ${isLightMode ? 'bg-slate-50 text-slate-800' : 'bg-slate-950 text-slate-300'}`}>
              {logLoading ? (
                <div className={`flex items-center justify-center py-8 gap-2 ${themeTextMuted}`}>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Đang tải nhật ký từ máy chủ...</span>
                </div>
              ) : (
                <pre>{logModalContent}</pre>
              )}
            </div>
            <div className={`p-3 border-t flex justify-end space-x-2 text-xs ${themeCardInner}`}>
              <button
                onClick={handleCopyLogContent}
                className={`px-4 py-2 rounded-xl font-semibold transition flex items-center space-x-1.5 border ${themeBtnSecondary}`}
              >
                <Copy size={13} />
                <span>{copiedLog ? 'Đã sao chép!' : 'Sao chép nhật ký'}</span>
              </button>
              <button
                onClick={() => setLogModalOpen(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
