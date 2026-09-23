import React from 'react';
import {
  Globe,
  ExternalLink,
  Save,
  Check,
  Edit3,
  Trash2,
  RefreshCw,
  Play
} from 'lucide-react';
import { UtiCommandItem } from '../../../services/utiCommandService';
import { MicroserviceItem } from '../../../services/microservicesConfig';
import { ExecutionEngine } from '../types';

interface CommandEditorHeaderProps {
  currentItem: UtiCommandItem;
  currentService?: MicroserviceItem;
  engine: ExecutionEngine;
  setEngine: (engine: ExecutionEngine) => void;
  hasUnsavedChanges: boolean;
  saveToast: boolean;
  isRunning: boolean;
  onToggleVisibility: (slug: string) => void;
  onOpenServiceFrontend: (service: MicroserviceItem) => void;
  onSaveLiveCode: () => void;
  onOpenEditModal: (item: UtiCommandItem) => void;
  onDeleteItem: (slug: string) => void;
  onExecuteLive: () => void;
}

export const CommandEditorHeader: React.FC<CommandEditorHeaderProps> = ({
  currentItem,
  currentService,
  engine,
  setEngine,
  hasUnsavedChanges,
  saveToast,
  isRunning,
  onToggleVisibility,
  onOpenServiceFrontend,
  onSaveLiveCode,
  onOpenEditModal,
  onDeleteItem,
  onExecuteLive
}) => {
  return (
    <div className="p-3 px-5 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 flex-shrink-0 shadow-2xs">
      <div className="flex items-center gap-3 min-w-0">
        <label
          className="relative inline-flex items-center cursor-pointer flex-shrink-0"
          title={currentItem.is_visible !== false ? 'Script đang BẬT' : 'Script đang TẮT'}
        >
          <input
            type="checkbox"
            checked={currentItem.is_visible !== false}
            onChange={() => onToggleVisibility(currentItem.command)}
            className="sr-only peer"
          />
          <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:border-white"></div>
        </label>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm md:text-base font-bold text-slate-900 truncate">
              {currentItem.label}
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono border border-slate-200">
              {currentItem.command}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200 hidden sm:inline">
              {currentItem.category}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                currentItem.is_visible !== false
                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                  : 'text-slate-500 bg-slate-100 border border-slate-200'
              }`}
            >
              {currentItem.is_visible !== false ? 'ĐANG BẬT' : 'ĐANG TẮT'}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <p className="text-xs text-slate-500 truncate">
              {currentItem.description || 'Chạy code trực tiếp trên hệ thống qua GoAgent hoặc Server'}
            </p>
            {currentService && (
              <div className="inline-flex items-center gap-1.5 bg-indigo-50/90 border border-indigo-200/80 rounded-lg px-2 py-0.5 text-[11px] text-indigo-800">
                <Globe size={11} className="text-indigo-600" />
                <span className="font-medium">{currentService.name}</span>
                <span className="text-indigo-300">·</span>
                <button
                  type="button"
                  onClick={() => onOpenServiceFrontend(currentService)}
                  className="font-mono text-indigo-600 hover:text-indigo-900 font-semibold underline flex items-center gap-0.5 cursor-pointer"
                  title={`Mở giao diện dịch vụ: toolxprint.com${currentService.routePath}`}
                >
                  <span>toolxprint.com{currentService.routePath}</span>
                  <ExternalLink size={10} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Actions: Engine Selector + Build/Run Button */}
      <div className="flex items-center gap-2 flex-wrap">
        {currentService && (
          <button
            type="button"
            onClick={() => onOpenServiceFrontend(currentService)}
            className="py-1.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            title={`Mở dịch vụ ${currentService.name} (toolxprint.com${currentService.routePath})`}
          >
            <ExternalLink size={13} className="text-indigo-600" />
            <span className="hidden xl:inline">{currentService.routePath}</span>
            <span className="font-mono text-[10px] bg-indigo-200/70 px-1 py-0.5 rounded text-indigo-800">
              :{currentService.backendPort}
            </span>
          </button>
        )}

        {/* Engine Selector */}
        <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl p-1 text-xs">
          <button
            type="button"
            onClick={() => setEngine('goagent')}
            className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
              engine === 'goagent'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
            title="Chạy trực tiếp trên PC qua ToolxAgent"
          >
            ToolxAgent
          </button>
          <button
            type="button"
            onClick={() => setEngine('browser')}
            className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
              engine === 'browser'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-indigo-700'
            }`}
            title="Chạy thử nghiệm trong trình duyệt"
          >
            Web Sandbox
          </button>
        </div>

        {/* Save Code Button */}
        <button
          onClick={onSaveLiveCode}
          className={`py-1.5 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
            hasUnsavedChanges
              ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 shadow-xs'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
          }`}
          title="Lưu mã lệnh sống này vào cơ sở dữ liệu UtiCommands"
        >
          {saveToast ? <Check size={14} className="text-emerald-600" /> : <Save size={14} />}
          <span>{saveToast ? 'Đã lưu!' : hasUnsavedChanges ? 'Lưu Code Sống *' : 'Lưu Code'}</span>
        </button>

        {/* Edit Item Info */}
        <button
          onClick={() => onOpenEditModal(currentItem)}
          className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer"
          title="Cài đặt thông tin Menu Item (Tên, Icon, Danh mục)"
        >
          <Edit3 size={14} />
        </button>

        {/* Delete Item */}
        <button
          onClick={() => onDeleteItem(currentItem.command)}
          className="p-2 rounded-xl bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-500 border border-slate-200 shadow-2xs transition cursor-pointer"
          title="Xóa Menu Item này"
        >
          <Trash2 size={14} />
        </button>

        {/* Execute Button */}
        <button
          onClick={onExecuteLive}
          disabled={isRunning}
          className="py-1.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {isRunning ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              <span>Đang chạy...</span>
            </>
          ) : (
            <>
              <Play size={14} fill="currentColor" />
              <span>Build & Chạy Ngay</span>
              <span className="text-[10px] opacity-80 font-mono hidden md:inline">(Ctrl+Enter)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
