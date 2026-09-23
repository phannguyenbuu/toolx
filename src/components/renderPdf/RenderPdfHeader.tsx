import React from 'react';
import {
  Activity,
  Printer,
  CheckCircle,
  Settings,
  Moon,
  Sun,
  RefreshCw,
  Clock,
  X
} from 'lucide-react';
import { RenderColorProfile } from '../../types/renderProfile';
import { GoAgentInfo } from '../../services/goAgentService';
import { SlicingWarningInfo } from './types';

export interface RenderPdfHeaderProps {
  diagnoseModalOpen: boolean;
  setDiagnoseModalOpen: (open: boolean) => void;
  activeProfile: RenderColorProfile;
  profilesList: RenderColorProfile[];
  handleSelectProfileById: (id: string) => void;
  slicingWarning: SlicingWarningInfo | null;
  profileModalOpen: boolean;
  setProfileModalOpen: (open: boolean) => void;
  isLightMode: boolean;
  toggleTheme: () => void;
  goAgentInfo: GoAgentInfo | null;
  checkGoAgent: () => Promise<void>;
  isProbingAgent: boolean;
  isRightSidebarVisible: boolean;
  toggleRightSidebar: () => void;
  totalCount: number;
  onClose?: () => void;
}

export const RenderPdfHeader: React.FC<RenderPdfHeaderProps> = ({
  diagnoseModalOpen,
  setDiagnoseModalOpen,
  activeProfile,
  profilesList,
  handleSelectProfileById,
  slicingWarning,
  profileModalOpen,
  setProfileModalOpen,
  isLightMode,
  toggleTheme,
  goAgentInfo,
  checkGoAgent,
  isProbingAgent,
  isRightSidebarVisible,
  toggleRightSidebar,
  totalCount,
  onClose
}) => {
  const themeHeader = isLightMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800';
  const themeCardInner = isLightMode ? 'bg-slate-50/70 border-slate-200/80' : 'bg-slate-950/70 border-slate-850';
  const themeTextHead = isLightMode ? 'text-slate-900 font-semibold tracking-tight' : 'text-white font-semibold tracking-tight';
  const themeTextMuted = isLightMode ? 'text-slate-500 font-normal' : 'text-slate-400 font-normal';
  const themeBtnSecondary = isLightMode ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs' : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-750';

  return (
    <header className={`h-14 border-b px-4 flex items-center justify-between gap-3 flex-shrink-0 z-20 ${themeHeader}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-indigo-600 flex items-center justify-center shadow-xs text-white font-medium">
          <span className="text-base">X</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className={`text-sm ${themeTextHead}`}>Render PDF</h1>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
              128GB RAM Vector System
            </span>
          </div>
          <p className={`text-[11px] truncate ${themeTextMuted}`}>Hệ thống kết xuất vector & cân màu chuẩn in ấn</p>
        </div>
      </div>

      {/* QUICK MODAL LAUNCH & CONFIG TOOLBAR */}
      <div className={`hidden md:flex items-center space-x-1 p-1 rounded-xl border ${themeCardInner} whitespace-nowrap`}>
        <button
          type="button"
          onClick={() => setDiagnoseModalOpen(true)}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            diagnoseModalOpen
              ? 'bg-amber-600 text-white shadow-xs'
              : `${themeTextMuted} hover:text-amber-600`
          }`}
          title="Mở bảng Chẩn đoán từ xa & Logs hệ thống"
        >
          <Activity size={13} className={diagnoseModalOpen ? 'text-white' : 'text-amber-500'} />
          <span className="whitespace-nowrap">Chẩn đoán</span>
        </button>

        {/* MỤC CẤU HÌNH & PROFILE SELECTOR */}
        <div className="flex items-center gap-1.5 pl-0.5 whitespace-nowrap">
          <Printer size={13} className="text-slate-500 flex-shrink-0" />
          <select
            value={activeProfile.id}
            onChange={(e) => handleSelectProfileById(e.target.value)}
            className={`bg-transparent border-0 text-xs font-medium focus:outline-none cursor-pointer max-w-[160px] truncate whitespace-nowrap ${
              isLightMode ? 'text-slate-800' : 'text-slate-200'
            }`}
            title="Chọn Profile Render & Cân màu cho máy in"
          >
            {profilesList.map((p) => (
              <option key={p.id} value={p.id} className={isLightMode ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-100'}>
                {p.name}
              </option>
            ))}
          </select>

          {slicingWarning?.autoSelectedProfile && (
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0"
              title="Profile được hệ thống tự động nhận diện và kích hoạt từ file gốc"
            >
              <CheckCircle size={10} />
              Đề xuất: {slicingWarning.autoSelectedProfile}
            </span>
          )}

          {/* Nút Cấu hình chi tiết */}
          <button
            type="button"
            onClick={() => setProfileModalOpen(true)}
            className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer whitespace-nowrap ${
              profileModalOpen
                ? 'bg-indigo-600 text-white shadow-xs'
                : `${themeTextMuted} hover:text-indigo-600 hover:bg-slate-200/60 dark:hover:bg-slate-800`
            }`}
            title="Cấu hình chi tiết Profile & Render"
          >
            <Settings size={13} className={profileModalOpen ? 'text-white' : 'text-slate-400'} />
            <span className="whitespace-nowrap">Cấu hình</span>
          </button>
        </div>
      </div>

      {/* RIGHT STATUS, THEME TOGGLE & CLOSE */}
      <div className="flex items-center gap-2">
        {/* THEME TOGGLE BUTTON */}
        <button
          type="button"
          onClick={toggleTheme}
          className={`p-2 rounded-xl border flex items-center justify-center transition cursor-pointer ${themeBtnSecondary}`}
          title={isLightMode ? 'Chuyển sang Theme Tối (Dark)' : 'Chuyển sang Theme Sáng (Light)'}
        >
          {isLightMode ? (
            <Moon size={15} className="text-indigo-600" />
          ) : (
            <Sun size={15} className="text-amber-400" />
          )}
        </button>

        {/* AGENT ENGINE STATUS BADGE */}
        <button
          type="button"
          onClick={checkGoAgent}
          className={`hidden md:flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl border cursor-pointer transition shadow-xs select-none ${
            goAgentInfo?.detected
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-slate-100 border-slate-300 text-slate-600 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-400'
          }`}
          title={
            goAgentInfo?.detected
              ? 'ToolxAgent đang chạy trên máy. Nhấp để quét lại.'
              : 'Chưa phát hiện ToolxAgent. Nhấp để quét lại hoặc tải cài đặt.'
          }
        >
          <span className="relative flex h-2 w-2">
            {goAgentInfo?.detected ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
            )}
          </span>
          <span className="font-semibold">PrintAgent:</span>
          <span className={`font-bold ${goAgentInfo?.detected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
            {goAgentInfo?.detected ? 'Online' : 'Offline'}
          </span>
          {isProbingAgent && (
            <RefreshCw size={11} className="animate-spin text-slate-400 ml-0.5" />
          )}
        </button>

        {/* HISTORY SIDEBAR TOGGLE BUTTON IN HEADER */}
        <button
          onClick={toggleRightSidebar}
          className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition cursor-pointer ${
            isRightSidebarVisible
              ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
              : themeBtnSecondary
          }`}
          title={isRightSidebarVisible ? 'Thu gọn Hàng đợi & Lịch sử' : 'Mở Hàng đợi & Lịch sử'}
        >
          <Clock size={15} className="text-indigo-500" />
          <span className="hidden sm:inline">Lịch sử</span>
          {totalCount > 0 && (
            <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {totalCount}
            </span>
          )}
        </button>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/20 hover:bg-rose-600/80 text-slate-400 hover:text-white transition-colors ml-1 cursor-pointer"
            title="Đóng trang"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </header>
  );
};
