import React from 'react';
import { X, Download, RefreshCw, Cpu, Server, Zap, CheckCircle } from 'lucide-react';
import { RenderNode } from '../types';
import { GoAgentInfo } from '../../../services/goAgentService';

export interface DownloadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  effectiveEngine: 'goagent' | 'server';
  selectedNode: RenderNode | null;
  goAgentInfo: GoAgentInfo | null;
  isMobile: boolean;
  checkGoAgent: () => Promise<void>;
  fetchRenderNodes: () => Promise<void>;
  isProbingAgent: boolean;
  isFetchingNodes: boolean;
  renderNodes: RenderNode[];
  selectedRenderNodeUid: string;
  handleSelectRenderOption: (engine: 'auto' | 'goagent' | 'server', nodeUid: string) => void;
  isLightMode: boolean;
}

export const DownloadsModal: React.FC<DownloadsModalProps> = ({
  isOpen,
  onClose,
  effectiveEngine,
  selectedNode,
  goAgentInfo,
  isMobile,
  checkGoAgent,
  fetchRenderNodes,
  isProbingAgent,
  isFetchingNodes,
  renderNodes,
  selectedRenderNodeUid,
  handleSelectRenderOption,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className={`w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl border flex flex-col overflow-hidden ${isLightMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
        <div className={`p-4 sm:px-6 border-b flex items-center justify-between flex-shrink-0 ${themeHeader}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center shadow-inner">
              <Download size={20} />
            </div>
            <div>
              <h2 className={`text-base font-bold tracking-tight ${themeTextHead}`}>Hạ tầng Render: PrintAgent PC & Máy trạm Server</h2>
              <p className={`text-xs truncate ${themeTextMuted}`}>Tải phần mềm PrintAgent trên PC và gói công cụ máy trạm xử lý vector</p>
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
          <div className="max-w-5xl mx-auto space-y-6">
            <div>
              <h2 className={`text-xl flex items-center gap-2 ${themeTextHead}`}>
                <Download className="text-indigo-500" size={22} />
                <span>Hạ tầng Render: PrintAgent PC & Máy trạm Server</span>
              </h2>
              <p className={`text-xs mt-1 ${themeTextMuted}`}>
                Cơ chế kết xuất kép thông minh: Bơm code thực thi (Exec) trực tiếp qua PrintAgent có sẵn trên PC, tự động fallback về Máy trạm Server 128GB RAM khi dùng Mobile hoặc không có Agent.
              </p>
            </div>

            {/* LIVE AGENT STATUS CARD */}
            <div className={`border rounded-2xl p-5 ${themeCard}`}>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${effectiveEngine === 'goagent' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
                    {effectiveEngine === 'goagent' ? <Cpu size={22} /> : <Server size={22} />}
                  </div>
                  <div>
                    <h3 className={`font-bold text-sm ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                      Trạng thái kết nối: {effectiveEngine === 'goagent' ? 'Đã kết nối PrintAgent (Máy này)' : selectedNode ? `Máy trạm Server (${selectedNode.hostname} • ${selectedNode.public_ip || selectedNode.local_ip || ''})` : 'Máy trạm Server (Tự động điều phối)'}
                    </h3>
                    <p className={`text-[11px] ${themeTextMuted}`}>
                      {effectiveEngine === 'goagent'
                        ? `Đã tìm thấy PrintAgent (UID: ${goAgentInfo?.agent_uid || 'administrator'}, PC: ${goAgentInfo?.pc_name || 'Administrator'}). Sẵn sàng nhận lệnh Exec xử lý PDF tức thì.`
                        : isMobile
                        ? 'Đang truy cập từ thiết bị di động -> Tự động kích hoạt luồng kết xuất qua cụm Máy trạm Server.'
                        : selectedNode
                        ? `Đang điều phối xử lý qua Máy trạm ${selectedNode.hostname} (IP: ${selectedNode.public_ip || selectedNode.local_ip}) được kích hoạt làm Máy Render.`
                        : 'Đang điều phối xử lý qua cụm Máy trạm Server (Tự động chọn máy trạm render đang online).'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    checkGoAgent();
                    fetchRenderNodes();
                  }}
                  disabled={isProbingAgent || isFetchingNodes}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${themeBtnSecondary}`}
                >
                  <RefreshCw size={13} className={isProbingAgent || isFetchingNodes ? 'animate-spin text-indigo-500' : ''} />
                  <span>Quét lại toàn bộ</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className={`p-3.5 rounded-xl border ${effectiveEngine === 'goagent' ? 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20' : themeCardInner}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                      <Zap size={14} className="text-emerald-500" />
                      PrintAgent (Máy này)
                    </span>
                    {effectiveEngine === 'goagent' && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                        ĐANG DÙNG
                      </span>
                    )}
                  </div>
                  <p className={`text-[11px] leading-relaxed ${themeTextMuted}`}>
                    Bơm trực tiếp mã Python vào endpoint <code className="text-indigo-500 font-mono">POST /api/local/exec</code> của PrintAgent cổng 9173 trên máy tính này. Xử lý ảnh và trang PDF ngay tại CPU máy tính mà không cần gửi dữ liệu qua Internet.
                  </p>
                </div>

                {renderNodes.length === 0 ? (
                  <div className={`p-3.5 rounded-xl border ${themeCardInner} text-center flex flex-col items-center justify-center`}>
                    <span className="text-xs text-slate-400">Đang tải danh sách máy trạm render...</span>
                  </div>
                ) : (
                  renderNodes.map((node) => {
                    const isSelected = effectiveEngine === 'server' && (selectedRenderNodeUid === node.agent_uid || (selectedRenderNodeUid === 'auto' && node.is_online));
                    return (
                      <div
                        key={node.agent_uid}
                        onClick={() => {
                          handleSelectRenderOption('server', node.agent_uid);
                        }}
                        className={`p-3.5 rounded-xl border cursor-pointer transition ${
                          isSelected
                            ? 'border-blue-500/40 bg-blue-50/50 dark:bg-blue-950/20 ring-1 ring-blue-500/30'
                            : themeCardInner
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                            <Server size={14} className={node.is_online ? 'text-emerald-500' : 'text-slate-400'} />
                            <span>{node.hostname || node.agent_uid}</span>
                            <span className={`w-2 h-2 rounded-full ${node.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                          </span>
                          {isSelected && (
                            <span className="text-[10px] bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">
                              {selectedRenderNodeUid === node.agent_uid ? 'ĐANG CHỌN' : 'TỰ ĐỘNG'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {node.public_ip || node.local_ip || 'N/A'}
                          </span>
                          <span className={`text-[10px] font-medium ${node.is_online ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                            {node.is_online ? 'Online (Sẵn sàng)' : 'Offline'}
                          </span>
                        </div>
                        <p className={`text-[11px] leading-relaxed ${themeTextMuted}`}>
                          Máy trạm render được kích hoạt tại <a href="https://agentapi.quanlymay.com/agents" target="_blank" rel="noreferrer" className="text-indigo-500 underline font-mono">agentapi.quanlymay.com/agents</a>. Nhận lệnh kết xuất qua PrintAgent Exec.
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Release Table */}
            <div className={`border rounded-2xl overflow-hidden ${themeCard}`}>
              <div className={`px-5 py-3 border-b flex justify-between items-center ${themeCardInner}`}>
                <div>
                  <h3 className={`font-bold text-sm ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Bộ cài đặt PrintAgent</h3>
                  <p className={`text-[11px] ${themeTextMuted}`}>Cài đặt trên PC để kích hoạt PrintAgent cổng 9173, phục vụ render vector & in ấn siêu tốc cục bộ</p>
                </div>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                  Bản mới nhất (Official)
                </span>
              </div>
              <div className="p-5">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className={`border-b pb-2 font-semibold ${themeTextMuted} ${isLightMode ? 'border-slate-200' : 'border-slate-800'}`}>
                      <th className="pb-3">Phần mềm</th>
                      <th className="pb-3">Phiên bản</th>
                      <th className="pb-3">Hệ điều hành</th>
                      <th className="pb-3 text-right">Tải về</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLightMode ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                    <tr className={isLightMode ? 'hover:bg-slate-50' : 'hover:bg-slate-950/30'}>
                      <td className={`py-4 font-semibold ${isLightMode ? 'text-slate-900' : 'text-slate-200'}`}>
                        <div className="flex items-center gap-1.5">
                          <span>PrintAgent Installer</span>
                          <span className="text-[9px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 px-1.5 py-0.2 rounded font-semibold">Khuyên dùng</span>
                        </div>
                        <div className={`text-[11px] font-normal ${themeTextMuted}`}>
                          Tự động thiết lập dịch vụ PrintAgent cổng 9173, chạy nền nhận lệnh exec kết xuất vector & in ấn
                        </div>
                      </td>
                      <td className="py-4 text-slate-500 dark:text-slate-300">Mới nhất</td>
                      <td className="py-4 text-slate-500 dark:text-slate-300">Windows 10 / 11 / Server 64-bit</td>
                      <td className="py-4 text-right">
                        <a
                          href="https://download.printagentx.com/printagentinstall.exe"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition shadow-xs"
                        >
                          <Download size={13} />
                          <span>Tải EXE</span>
                        </a>
                      </td>
                    </tr>
                    <tr className={isLightMode ? 'hover:bg-slate-50' : 'hover:bg-slate-950/30'}>
                      <td className={`py-4 font-semibold ${isLightMode ? 'text-slate-900' : 'text-slate-200'}`}>
                        <div>Toolx Core Engine</div>
                        <div className={`text-[11px] font-normal ${themeTextMuted}`}>Gói nhân C-Core kết xuất vector độc lập bổ trợ</div>
                      </td>
                      <td className="py-4 text-slate-500 dark:text-slate-300">v1.5.2</td>
                      <td className="py-4 text-slate-500 dark:text-slate-300">Windows 64-bit</td>
                      <td className="py-4 text-right">
                        <a
                          href="https://render.toolxprint.com/static/releases/toolx_core.zip"
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold border transition ${themeBtnSecondary}`}
                        >
                          <Download size={13} />
                          <span>Tải ZIP</span>
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Instructions */}
            <div className={`border rounded-2xl p-5 ${themeCard}`}>
              <h3 className={`font-bold text-sm mb-3 flex items-center gap-2 ${themeTextHead}`}>
                <CheckCircle size={16} className="text-emerald-500" />
                <span>Cách thức hoạt động & Tự động nhận diện</span>
              </h3>
              <ol className={`list-decimal list-inside space-y-2 text-xs leading-relaxed ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                <li><strong>Chưa có ToolxAgent trên máy:</strong> Tải và cài đặt gói <a href="https://download.printagentx.com/printagentinstall.exe" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 font-semibold underline"><code className="font-mono">printagentinstall.exe</code></a> từ <code className="text-indigo-500 font-mono">download.printagentx.com</code>. Trình cài đặt sẽ tự động kích hoạt dịch vụ chạy ngầm tại cổng <code className="text-indigo-500 font-mono">9173</code>.</li>
                <li><strong>Máy tính đã có Goxprint / PrintAgent:</strong> Hệ thống Toolx sẽ tự động quét và nhận diện ngay lập tức mà không cần cài thêm bất kỳ phần mềm nào khác.</li>
                <li><strong>Bơm code Exec trực tiếp:</strong> Khi kết xuất PDF, script Python tối ưu được gửi thẳng tới ToolxAgent, giải nén và trích xuất trang sang hình ảnh phân giải cao ngay trên máy trong chớp mắt (khoảng 0.5s).</li>
                <li><strong>Tự động Fallback:</strong> Nếu chưa mở ToolxAgent hoặc truy cập từ điện thoại/máy tính bảng (Mobile), tệp tin sẽ tự động được gửi về Máy trạm Server 128GB RAM xử lý an toàn và đồng bộ kết quả lên đám mây.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
