import React from 'react';
import {
  Play,
  Cpu,
  Server,
  Sparkles,
  CheckCircle2,
  Zap,
  Loader2
} from 'lucide-react';
import { ImpositionConfig, ShapeTabItem, RENDER_PRESETS } from '../types';
import { LayoutPlan } from '../../../utils/layoutSolver';

export interface ImpositionRenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSubmittingRender: boolean;
  isProbingAgent: boolean;
  selectedRenderEngine: 'auto' | 'goagent' | 'server';
  setSelectedRenderEngine: (engine: 'auto' | 'goagent' | 'server') => void;
  goAgentInfo: { detected: boolean; pc_name?: string } | null;
  selectedPresetId: string;
  setSelectedPresetId: (id: string) => void;
  config: ImpositionConfig;
  shapeTabs: ShapeTabItem[];
  currentPlan: LayoutPlan | null;
  handleStartRender: () => void;
  renderProgressText: string;
}

export const ImpositionRenderModal: React.FC<ImpositionRenderModalProps> = ({
  isOpen,
  onClose,
  isSubmittingRender,
  isProbingAgent,
  selectedRenderEngine,
  setSelectedRenderEngine,
  goAgentInfo,
  selectedPresetId,
  setSelectedPresetId,
  config,
  shapeTabs,
  currentPlan,
  handleStartRender,
  renderProgressText
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => !isSubmittingRender && onClose()}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 text-slate-800 relative flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 flex-shrink-0">
              <Play size={20} className="fill-current ml-0.5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Render
              </h3>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmittingRender}
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors disabled:opacity-40 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {/* 1. Chọn Agent / Môi trường Render */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Cpu size={14} className="text-indigo-600" />
                1. Chọn Môi trường thực thi (Render Engine)
              </label>
              {isProbingAgent && (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" /> Đang kiểm tra GoAgent...
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option: Auto */}
              <div
                onClick={() => setSelectedRenderEngine('auto')}
                className={`p-3 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                  selectedRenderEngine === 'auto'
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-indigo-600" />
                    Tự động (Auto)
                  </span>
                  {selectedRenderEngine === 'auto' && (
                    <CheckCircle2 size={16} className="text-indigo-600 fill-indigo-100" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Ưu tiên GoAgent PC nếu online, tự động điều phối linh hoạt.
                </p>
              </div>

              {/* Option: GoAgent PC */}
              <div
                onClick={() => setSelectedRenderEngine('goagent')}
                className={`p-3 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                  selectedRenderEngine === 'goagent'
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Cpu size={14} className="text-emerald-600" />
                    GoAgent Cục bộ
                  </span>
                  {selectedRenderEngine === 'goagent' && (
                    <CheckCircle2 size={16} className="text-emerald-600 fill-emerald-100" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <p className="text-[11px] font-medium text-slate-700">
                    {goAgentInfo?.detected ? (goAgentInfo.pc_name || 'PC 128GB RAM') : 'Chưa bật GoAgent'}
                  </p>
                  <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    goAgentInfo?.detected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {goAgentInfo?.detected ? '● Đã kết nối' : '○ Tự động chuyển Cloud'}
                  </span>
                </div>
              </div>

              {/* Option: Server */}
              <div
                onClick={() => setSelectedRenderEngine('server')}
                className={`p-3 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                  selectedRenderEngine === 'server'
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Server size={14} className="text-blue-600" />
                    Máy trạm Server
                  </span>
                  {selectedRenderEngine === 'server' && (
                    <CheckCircle2 size={16} className="text-blue-600 fill-blue-100" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Máy chủ phân tán, hỗ trợ hàng đợi và profiles đầy đủ.
                </p>
              </div>
            </div>
          </div>

          {/* 2. Chọn Preset Render */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5 mb-2">
              <Zap size={14} className="text-amber-500" />
              2. Chọn Preset Tiêu chuẩn In & Màu sắc
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {RENDER_PRESETS.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => setSelectedPresetId(preset.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 shadow-xs ring-1 ring-indigo-500/20'
                        : 'border-slate-200 bg-slate-50/40 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xl shrink-0 mt-0.5">{preset.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-950' : 'text-slate-800'}`}>
                          {preset.name}
                        </span>
                        {isSelected && <CheckCircle2 size={15} className="text-indigo-600 fill-indigo-100 shrink-0 ml-1" />}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                        {preset.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Tóm tắt bố cục trang hiện tại */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-4 text-slate-600">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Khổ trang</span>
                <span className="font-semibold text-slate-800">{config.pageW} &times; {config.pageH} mm</span>
              </div>
              <div className="w-px h-6 bg-slate-200" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Mẫu / Layer</span>
                <span className="font-semibold text-slate-800">{shapeTabs.length} Layer ({currentPlan?.items?.length || 0} con/trang)</span>
              </div>
              <div className="w-px h-6 bg-slate-200" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Hình dáng</span>
                <span className="font-semibold text-slate-800 uppercase">{config.shape}</span>
              </div>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
              Sẵn sàng xuất PDF
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={isSubmittingRender}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold text-xs transition disabled:opacity-40 cursor-pointer"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            disabled={isSubmittingRender}
            onClick={() => {
              onClose();
              handleStartRender();
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/25 active:scale-95 transition disabled:opacity-60 cursor-pointer"
          >
            <Play size={16} className="fill-current" />
            <span>Render</span>
          </button>
        </div>
      </div>
    </div>
  );
};
