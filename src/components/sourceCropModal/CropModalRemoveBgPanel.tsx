import React from 'react';
import { Sparkles, RotateCcw, RefreshCw, Loader2, ShieldCheck, Check } from 'lucide-react';
import { RemoveBgSettings, DEFAULT_REMOVE_BG_SETTINGS } from './types';

export interface CropModalRemoveBgPanelProps {
  settings: RemoveBgSettings;
  updateSetting: <K extends keyof RemoveBgSettings>(key: K, value: RemoveBgSettings[K]) => void;
  resetSettings: () => void;
  isProcessing: boolean;
  hasOriginalBackup: boolean;
  onApplyRemoveBg: () => void | Promise<void>;
  onRestoreOriginal: () => void;
  statusMsg?: string | null;
}

export const CropModalRemoveBgPanel: React.FC<CropModalRemoveBgPanelProps> = ({
  settings,
  updateSetting,
  resetSettings,
  isProcessing,
  hasOriginalBackup,
  onApplyRemoveBg,
  onRestoreOriginal,
  statusMsg,
}) => {
  return (
    <div className="space-y-3.5 text-xs">
      {/* Giới thiệu tính năng */}
      <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-[11px] text-indigo-900 space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-indigo-800">
          <ShieldCheck size={14} className="text-indigo-600 shrink-0" />
          <span>Khử nền trắng & Gọt sạch bóng đổ (Drop Shadow)</span>
        </div>
        <p className="text-[10px] text-indigo-700/90 leading-relaxed">
          Tự động loại bỏ viền trắng và bóng đổ xám trên nền trắng. Bảo vệ 100% màu sắc (màu xanh thẻ, chữ, logo) và các chi tiết bên trong.
        </p>
      </div>

      {/* Thông báo trạng thái nếu có */}
      {statusMsg && (
        <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold flex items-center gap-1.5 animate-fadeIn">
          <Check size={13} className="text-emerald-600 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Phạm vi khử: 4 mép ngoài vào vs Toàn ảnh */}
      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
        <div className="text-[11px] font-bold text-slate-700">Phạm vi khử:</div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => updateSetting('floodFillFromBorder', true)}
            className={`p-2 rounded-lg border text-left transition cursor-pointer select-none ${
              settings.floodFillFromBorder
                ? 'bg-indigo-50/90 border-indigo-500 text-indigo-950 font-bold shadow-2xs'
                : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className="text-xs">Từ 4 viền ngoài</div>
            <div className="text-[9px] text-slate-400 font-normal">Bảo vệ chi tiết trắng bên trong</div>
          </button>

          <button
            type="button"
            onClick={() => updateSetting('floodFillFromBorder', false)}
            className={`p-2 rounded-lg border text-left transition cursor-pointer select-none ${
              !settings.floodFillFromBorder
                ? 'bg-indigo-50/90 border-indigo-500 text-indigo-950 font-bold shadow-2xs'
                : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className="text-xs">Toàn bộ ảnh</div>
            <div className="text-[9px] text-slate-400 font-normal">Khử mọi điểm trắng bất kỳ đâu</div>
          </button>
        </div>
      </div>

      {/* Danh sách Sliders */}
      <div className="space-y-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200">
        {/* Slider 1: Độ nhạy trắng (White Threshold) */}
        <div>
          <div className="flex justify-between items-center mb-1 text-[11px]">
            <span className="font-semibold text-slate-700">Độ nhạy màu trắng</span>
            <span className="font-mono font-bold text-indigo-700 px-1.5 py-0.5 rounded bg-white border border-slate-200">
              {settings.whiteThreshold} / 255
            </span>
          </div>
          <input
            type="range"
            min={180}
            max={255}
            step={1}
            value={settings.whiteThreshold}
            onChange={(e) => updateSetting('whiteThreshold', Number(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-slate-400">
            <span>180 (Khử rộng)</span>
            <span>230 (Chuẩn)</span>
            <span>255 (Chỉ trắng tinh)</span>
          </div>
        </div>

        {/* Slider 2: Khử bóng đổ (Drop Shadow Tolerance) */}
        <div>
          <div className="flex justify-between items-center mb-1 text-[11px]">
            <span className="font-semibold text-slate-700">Khử bóng đổ (Dung sai xám)</span>
            <span className="font-mono font-bold text-indigo-700 px-1.5 py-0.5 rounded bg-white border border-slate-200">
              {settings.shadowTolerance}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={60}
            step={1}
            value={settings.shadowTolerance}
            onChange={(e) => updateSetting('shadowTolerance', Number(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-slate-400">
            <span>0 (Tắt)</span>
            <span>25 (Gọt sạch shadow)</span>
            <span>60 (Khử bóng sâu)</span>
          </div>
        </div>

        {/* Slider 3: Độ sáng bóng đổ (Shadow Brightness) */}
        <div>
          <div className="flex justify-between items-center mb-1 text-[11px]">
            <span className="font-semibold text-slate-700">Độ sáng bóng đổ tối thiểu</span>
            <span className="font-mono font-bold text-indigo-700 px-1.5 py-0.5 rounded bg-white border border-slate-200">
              {settings.shadowBrightness}
            </span>
          </div>
          <input
            type="range"
            min={80}
            max={240}
            step={5}
            value={settings.shadowBrightness}
            onChange={(e) => updateSetting('shadowBrightness', Number(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-slate-400">
            <span>80 (Cả bóng đậm)</span>
            <span>135 (Mặc định)</span>
            <span>240 (Chỉ bóng nhạt)</span>
          </div>
        </div>

        {/* Slider 4: Độ mềm viền (Edge Feathering / Anti-aliasing) */}
        <div>
          <div className="flex justify-between items-center mb-1 text-[11px]">
            <span className="font-semibold text-slate-700">Độ mềm viền (Khử răng cưa)</span>
            <span className="font-mono font-bold text-indigo-700 px-1.5 py-0.5 rounded bg-white border border-slate-200">
              {settings.featherRadius} px
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={5}
            step={0.5}
            value={settings.featherRadius}
            onChange={(e) => updateSetting('featherRadius', Number(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-slate-400">
            <span>0 px (Sắc cạnh)</span>
            <span>1.5 px (Mịn chuẩn)</span>
            <span>5.0 px (Viền mờ)</span>
          </div>
        </div>

        {/* Slider 5: Bảo vệ màu sắc (Color Protection) */}
        <div>
          <div className="flex justify-between items-center mb-1 text-[11px]">
            <span className="font-semibold text-slate-700">Bảo vệ màu sắc (Giữ màu xanh/đỏ/vàng)</span>
            <span className="font-mono font-bold text-indigo-700 px-1.5 py-0.5 rounded bg-white border border-slate-200">
              {settings.protectSaturation}
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={50}
            step={1}
            value={settings.protectSaturation}
            onChange={(e) => updateSetting('protectSaturation', Number(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-slate-400">
            <span>5 (Giữ mọi tông màu)</span>
            <span>18 (Chuẩn in)</span>
            <span>50 (Chỉ giữ màu đậm)</span>
          </div>
        </div>

        {/* AI Rembg Toggle */}
        <div className="pt-2 border-t border-slate-200">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.useAiModel}
              onChange={(e) => updateSetting('useAiModel', e.target.checked)}
              className="text-indigo-600 focus:ring-indigo-500 rounded cursor-pointer"
            />
            <div>
              <span className="text-xs font-semibold text-slate-800">Dùng AI bóc tách chủ thể rời (Rembg)</span>
              <p className="text-[10px] text-slate-400">Chỉ dùng khi muốn cắt người / vật phẩm ra khỏi ảnh chụp</p>
            </div>
          </label>
        </div>
      </div>

      {/* Hành động chính: Nút Khử trắng & Nút Reset khôi phục ảnh gốc */}
      <div className="space-y-2 pt-1">
        <button
          type="button"
          disabled={isProcessing}
          onClick={onApplyRemoveBg}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
        >
          {isProcessing ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Đang khử nền trắng...</span>
            </>
          ) : (
            <>
              <Sparkles size={14} />
              <span>Khử nền trắng ngay</span>
            </>
          )}
        </button>

        {/* Nút Reset khôi phục ảnh gốc */}
        {hasOriginalBackup && (
          <button
            type="button"
            onClick={onRestoreOriginal}
            className="w-full py-2 px-3 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
            title="Khôi phục lại hoàn toàn file ảnh gốc ban đầu"
          >
            <RotateCcw size={13} className="text-amber-600" />
            <span>Khôi phục ảnh gốc ban đầu (Reset)</span>
          </button>
        )}

        {/* Nút đặt lại thông số slider về mặc định */}
        <button
          type="button"
          onClick={resetSettings}
          className="w-full py-1.5 text-center text-slate-500 hover:text-slate-800 text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer transition"
        >
          <RefreshCw size={11} />
          <span>Đặt lại thông số mặc định</span>
        </button>
      </div>
    </div>
  );
};
