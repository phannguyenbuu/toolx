import React, { useState, useRef } from 'react';
import {
  Sparkles,
  X,
  Gauge,
  Flame,
  Droplets,
  Layers,
  Wand2,
  Sliders,
  Check,
  Zap,
  Upload,
  Image as ImageIcon,
  Key,
  TrendingUp,
  Camera,
  Trash2
} from 'lucide-react';
import {
  ColorInspectionReport,
  PrintMatchComparisonReport,
  comparePrintWithPCUsingChatGPT,
  imageFileToOptimizedBase64,
  getOpenAIKey,
  setOpenAIKey
} from '../utils/aiColorInspection';
import { ColorAdjustSettings } from '../utils/colorAdjustment';

interface AIColorInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ColorInspectionReport | null;
  isAnalyzing: boolean;
  onApplyRecommendations: (settings: Partial<ColorAdjustSettings>) => void;
  activeHeatmapMode: 'none' | 'tac' | 'gamut' | 'tone';
  onToggleHeatmap: (mode: 'none' | 'tac' | 'gamut' | 'tone') => void;
  onRecheck: () => void;
  isLightMode: boolean;
  studioCanvas?: HTMLCanvasElement | null;
  currentSettings: ColorAdjustSettings;
}

export const AIColorInspectionModal: React.FC<AIColorInspectionModalProps> = ({
  isOpen,
  onClose,
  report,
  isAnalyzing,
  onApplyRecommendations,
  activeHeatmapMode,
  onToggleHeatmap,
  onRecheck,
  isLightMode,
  studioCanvas,
  currentSettings
}) => {
  const [activeTab, setActiveTab] = useState<'compare' | 'inspect'>('compare');

  // State so sánh bản PC vs Bản in thực tế
  const [printedPhotoBase64, setPrintedPhotoBase64] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [comparisonReport, setComparisonReport] = useState<PrintMatchComparisonReport | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [appliedToast, setAppliedToast] = useState<boolean>(false);

  // Cấu hình API Key
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>(getOpenAIKey());
  const [apiKeySavedToast, setApiKeySavedToast] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const themeModalBg = isLightMode ? 'bg-white text-slate-800' : 'bg-slate-900 text-slate-100';
  const themeCardBg = isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/80 border-slate-700/80';
  const themeCardInner = isLightMode ? 'bg-white border-slate-200' : 'bg-slate-950/60 border-slate-700/60';
  const themeTextMuted = isLightMode ? 'text-slate-500' : 'text-slate-400';

  // Xử lý upload ảnh chụp bản in thực tế
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await imageFileToOptimizedBase64(file, 1024);
      setPrintedPhotoBase64(base64);
      setCompareError(null);
    } catch (err: any) {
      setCompareError('Không thể đọc file ảnh: ' + err?.message);
    }
  };

  // Kích hoạt phân tích so sánh 2 ảnh bằng ChatGPT Vision
  const handleRunCompare = async () => {
    if (!studioCanvas) {
      setCompareError('Không tìm thấy hình ảnh Bản xem PC');
      return;
    }
    if (!printedPhotoBase64) {
      setCompareError('Vui lòng tải lên ảnh chụp Bản in thực tế để so sánh');
      return;
    }

    setIsComparing(true);
    setCompareError(null);
    try {
      const res = await comparePrintWithPCUsingChatGPT(studioCanvas, printedPhotoBase64, currentSettings);
      setComparisonReport(res);
    } catch (err: any) {
      setCompareError(err?.message || 'Lỗi khi phân tích với ChatGPT Vision');
    } finally {
      setIsComparing(false);
    }
  };

  // Áp dụng thông số bù trừ từ ChatGPT vào Color Studio
  const handleApplyComparison = () => {
    if (!comparisonReport) return;
    onApplyRecommendations(comparisonReport.actionableSettings);
    setAppliedToast(true);
    setTimeout(() => setAppliedToast(false), 2500);
  };

  const handleSaveApiKey = () => {
    setOpenAIKey(apiKeyInput);
    setApiKeySavedToast(true);
    setTimeout(() => {
      setApiKeySavedToast(false);
      setApiKeyModalOpen(false);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div
        className={`w-full max-w-5xl max-h-[94vh] rounded-2xl shadow-2xl border flex flex-col overflow-hidden transition-all ${
          isLightMode ? 'border-slate-200 shadow-slate-400/20' : 'border-slate-700 shadow-black/80'
        } ${themeModalBg}`}
      >
        {/* MODAL HEADER */}
        <div className={`px-5 py-3.5 border-b flex items-center justify-between gap-3 ${
          isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
              <Sparkles size={20} className={isComparing || isAnalyzing ? 'animate-spin' : 'animate-pulse text-amber-300'} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight">Kiểm tra Bản in bằng AI (ChatGPT Vision)</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                  <span>GPT-4o Vision</span>
                </span>
              </div>
              <p className={`text-xs ${themeTextMuted}`}>
                So sánh bản xem PC với bản in thực tế để tính toán thông số bù trừ Color Balance & Curves
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* API Key Settings Button */}
            <button
              onClick={() => setApiKeyModalOpen(true)}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                isLightMode
                  ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200'
              }`}
              title="Cấu hình OpenAI API Token"
            >
              <Key size={14} className="text-amber-400" />
              <span className="hidden md:inline">Token AI</span>
            </button>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-xl transition ${
                isLightMode ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-slate-800 text-slate-400'
              }`}
              title="Đóng"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* TAB SWITCHER */}
        <div className={`px-5 pt-2 border-b flex items-center gap-3 ${themeCardInner}`}>
          <button
            onClick={() => setActiveTab('compare')}
            className={`pb-2.5 px-2 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
              activeTab === 'compare'
                ? 'border-emerald-500 text-emerald-500'
                : `border-transparent ${themeTextMuted} hover:text-emerald-500`
            }`}
          >
            <Camera size={14} />
            <span>So sánh Bản PC & Bản in thực tế (Print Match)</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
              Khuyên dùng
            </span>
          </button>

          <button
            onClick={() => setActiveTab('inspect')}
            className={`pb-2.5 px-2 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
              activeTab === 'inspect'
                ? 'border-indigo-600 text-indigo-500'
                : `border-transparent ${themeTextMuted} hover:text-indigo-500`
            }`}
          >
            <Sliders size={14} />
            <span>Kiểm tra lỗi kỹ thuật Prepress (TAC & Gamut)</span>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* ================= TAB 1: SO SÁNH BẢN PC & BẢN IN THỰC TẾ ================= */}
          {activeTab === 'compare' && (
            <div className="space-y-5">
              {/* DUAL IMAGE COMPARISON BOXES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Bản xem PC */}
                <div className={`p-3.5 rounded-2xl border flex flex-col ${themeCardBg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs flex items-center gap-1.5 text-indigo-500">
                      <ImageIcon size={15} />
                      <span>Bản xem PC (File thiết kế chuẩn)</span>
                    </span>
                    <span className={`text-[10px] ${themeTextMuted}`}>Lấy từ màn hình Canvas</span>
                  </div>

                  <div className="flex-1 min-h-[190px] max-h-[230px] rounded-xl overflow-hidden bg-black/40 border border-slate-700/50 flex items-center justify-center p-2 relative">
                    {studioCanvas ? (
                      <img
                        src={studioCanvas.toDataURL('image/png')}
                        alt="Bản xem PC"
                        className="max-h-[190px] max-w-full object-contain rounded shadow"
                      />
                    ) : (
                      <span className={themeTextMuted}>Chưa có hình ảnh bản PC</span>
                    )}
                  </div>
                </div>

                {/* 2. Bản in ra thực tế */}
                <div className={`p-3.5 rounded-2xl border flex flex-col ${themeCardBg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs flex items-center gap-1.5 text-amber-500">
                      <Camera size={15} />
                      <span>Bản in ra (Ảnh chụp thực tế)</span>
                    </span>
                    {printedPhotoBase64 && (
                      <button
                        onClick={() => {
                          setPrintedPhotoBase64(null);
                          setComparisonReport(null);
                        }}
                        className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        <span>Xóa ảnh</span>
                      </button>
                    )}
                  </div>

                  <div className="flex-1 min-h-[190px] max-h-[230px] rounded-xl overflow-hidden bg-black/40 border border-dashed border-slate-700 flex items-center justify-center p-2 relative">
                    {printedPhotoBase64 ? (
                      <img
                        src={printedPhotoBase64}
                        alt="Bản in ra thực tế"
                        className="max-h-[190px] max-w-full object-contain rounded shadow"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Upload size={28} className="mx-auto text-slate-400 mb-2" />
                        <p className="font-semibold text-xs mb-1">Tải lên ảnh chụp tờ in thực tế</p>
                        <p className={`text-[11px] mb-3 ${themeTextMuted}`}>
                          Chụp ảnh sản phẩm in bằng điện thoại và tải lên để AI so màu
                        </p>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition"
                        >
                          Chọn ảnh chụp...
                        </button>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* ACTION: RUN CHATGPT VISION ANALYSIS */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/20">
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <Sparkles size={16} />
                    <span>Phân tích sai lệch màu & Tính thông số bù trừ bằng ChatGPT AI</span>
                  </h4>
                  <p className={`text-[11px] mt-0.5 ${themeTextMuted}`}>
                    AI sẽ đối chiếu sắc độ giữa 2 ảnh và xuất bảng Color Balance (Shadows, Midtones, Highlights) cùng Curves
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {printedPhotoBase64 && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold ${themeCardInner}`}
                    >
                      Đổi ảnh chụp khác
                    </button>
                  )}

                  <button
                    onClick={handleRunCompare}
                    disabled={isComparing || !printedPhotoBase64}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-500/25 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles size={15} className={isComparing ? 'animate-spin' : 'animate-bounce text-amber-300'} />
                    <span>{isComparing ? 'ChatGPT đang phân tích 2 ảnh...' : 'Phân tích màu bằng AI'}</span>
                  </button>
                </div>
              </div>

              {/* ERROR ALERT */}
              {compareError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs">
                  {compareError}
                </div>
              )}

              {/* COMPARISON RESULTS */}
              {comparisonReport && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Summary Box */}
                  <div className={`p-4 rounded-2xl border ${
                    isLightMode ? 'bg-emerald-50/70 border-emerald-200' : 'bg-emerald-950/20 border-emerald-500/30'
                  }`}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <Check size={16} />
                        <span>Kết quả nhận định từ ChatGPT Vision:</span>
                      </span>

                      {/* Quick Apply Button */}
                      <button
                        onClick={handleApplyComparison}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition active:scale-95 cursor-pointer"
                      >
                        {appliedToast ? <Check size={14} className="text-white" /> : <Zap size={14} className="text-amber-300" />}
                        <span>{appliedToast ? 'Đã áp dụng vào Studio!' : 'Áp dụng vào Color Studio'}</span>
                      </button>
                    </div>

                    <p className="text-xs leading-relaxed font-medium">
                      "{comparisonReport.summary}"
                    </p>
                    {comparisonReport.colorShiftDescription && (
                      <p className={`text-[11px] mt-1.5 leading-relaxed ${themeTextMuted}`}>
                        {comparisonReport.colorShiftDescription}
                      </p>
                    )}
                  </div>

                  {/* 1. COLOR BALANCE TABLE (PHOTOSHOP STYLE) */}
                  <div className={`p-4 rounded-2xl border overflow-hidden ${themeCardBg}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h5 className="font-bold text-xs text-indigo-500 flex items-center gap-1.5">
                          <Sliders size={15} />
                          <span>Bảng thông số bù trừ Color Balance (Photoshop Format)</span>
                        </h5>
                        <p className={`text-[11px] ${themeTextMuted}`}>
                          Áp dụng cho từng vùng sắc độ Shadows (Vùng tối), Midtones (Vùng trung), Highlights (Vùng sáng)
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-center border-collapse">
                        <thead>
                          <tr className={`border-b text-[11px] font-bold ${isLightMode ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-200'}`}>
                            <th className="py-2.5 px-3 text-left">Tone Balance</th>
                            <th className="py-2.5 px-3 text-rose-500">Cyan ↔ Red</th>
                            <th className="py-2.5 px-3 text-emerald-500">Magenta ↔ Green</th>
                            <th className="py-2.5 px-3 text-blue-500">Yellow ↔ Blue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/30 font-mono text-xs">
                          <tr>
                            <td className="py-2.5 px-3 text-left font-sans font-semibold">Shadows (Vùng tối)</td>
                            <td className={`py-2.5 px-3 font-bold ${comparisonReport.toneBalance.shadows.cyanRed > 0 ? 'text-rose-500' : comparisonReport.toneBalance.shadows.cyanRed < 0 ? 'text-cyan-400' : ''}`}>
                              {comparisonReport.toneBalance.shadows.cyanRed > 0 ? `+${comparisonReport.toneBalance.shadows.cyanRed}` : comparisonReport.toneBalance.shadows.cyanRed}
                            </td>
                            <td className={`py-2.5 px-3 font-bold ${comparisonReport.toneBalance.shadows.magentaGreen > 0 ? 'text-emerald-500' : comparisonReport.toneBalance.shadows.magentaGreen < 0 ? 'text-fuchsia-400' : ''}`}>
                              {comparisonReport.toneBalance.shadows.magentaGreen > 0 ? `+${comparisonReport.toneBalance.shadows.magentaGreen}` : comparisonReport.toneBalance.shadows.magentaGreen}
                            </td>
                            <td className={`py-2.5 px-3 font-bold ${comparisonReport.toneBalance.shadows.yellowBlue > 0 ? 'text-blue-500' : comparisonReport.toneBalance.shadows.yellowBlue < 0 ? 'text-amber-400' : ''}`}>
                              {comparisonReport.toneBalance.shadows.yellowBlue > 0 ? `+${comparisonReport.toneBalance.shadows.yellowBlue}` : comparisonReport.toneBalance.shadows.yellowBlue}
                            </td>
                          </tr>
                          <tr className={isLightMode ? 'bg-indigo-50/50' : 'bg-indigo-950/20'}>
                            <td className="py-2.5 px-3 text-left font-sans font-bold text-indigo-500">Midtones (Vùng trung) ★</td>
                            <td className={`py-2.5 px-3 font-bold ${comparisonReport.toneBalance.midtones.cyanRed > 0 ? 'text-rose-500' : comparisonReport.toneBalance.midtones.cyanRed < 0 ? 'text-cyan-400' : ''}`}>
                              {comparisonReport.toneBalance.midtones.cyanRed > 0 ? `+${comparisonReport.toneBalance.midtones.cyanRed}` : comparisonReport.toneBalance.midtones.cyanRed}
                            </td>
                            <td className={`py-2.5 px-3 font-bold ${comparisonReport.toneBalance.midtones.magentaGreen > 0 ? 'text-emerald-500' : comparisonReport.toneBalance.midtones.magentaGreen < 0 ? 'text-fuchsia-400' : ''}`}>
                              {comparisonReport.toneBalance.midtones.magentaGreen > 0 ? `+${comparisonReport.toneBalance.midtones.magentaGreen}` : comparisonReport.toneBalance.midtones.magentaGreen}
                            </td>
                            <td className={`py-2.5 px-3 font-bold ${comparisonReport.toneBalance.midtones.yellowBlue > 0 ? 'text-blue-500' : comparisonReport.toneBalance.midtones.yellowBlue < 0 ? 'text-amber-400' : ''}`}>
                              {comparisonReport.toneBalance.midtones.yellowBlue > 0 ? `+${comparisonReport.toneBalance.midtones.yellowBlue}` : comparisonReport.toneBalance.midtones.yellowBlue}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 text-left font-sans font-semibold">Highlights (Vùng sáng)</td>
                            <td className={`py-2.5 px-3 font-bold ${comparisonReport.toneBalance.highlights.cyanRed > 0 ? 'text-rose-500' : comparisonReport.toneBalance.highlights.cyanRed < 0 ? 'text-cyan-400' : ''}`}>
                              {comparisonReport.toneBalance.highlights.cyanRed > 0 ? `+${comparisonReport.toneBalance.highlights.cyanRed}` : comparisonReport.toneBalance.highlights.cyanRed}
                            </td>
                            <td className={`py-2.5 px-3 font-bold ${comparisonReport.toneBalance.highlights.magentaGreen > 0 ? 'text-emerald-500' : comparisonReport.toneBalance.highlights.magentaGreen < 0 ? 'text-fuchsia-400' : ''}`}>
                              {comparisonReport.toneBalance.highlights.magentaGreen > 0 ? `+${comparisonReport.toneBalance.highlights.magentaGreen}` : comparisonReport.toneBalance.highlights.magentaGreen}
                            </td>
                            <td className={`py-2.5 px-3 font-bold ${comparisonReport.toneBalance.highlights.yellowBlue > 0 ? 'text-blue-500' : comparisonReport.toneBalance.highlights.yellowBlue < 0 ? 'text-amber-400' : ''}`}>
                              {comparisonReport.toneBalance.highlights.yellowBlue > 0 ? `+${comparisonReport.toneBalance.highlights.yellowBlue}` : comparisonReport.toneBalance.highlights.yellowBlue}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 2. CURVES & LUMINOSITY RECOMMENDATIONS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Curves Advice */}
                    <div className={`p-4 rounded-xl border flex flex-col justify-between ${themeCardBg}`}>
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <TrendingUp size={16} className="text-purple-400" />
                          <span className="font-bold text-xs">Đường cong Sắc độ (Curves)</span>
                        </div>
                        <p className={`text-[11px] leading-relaxed ${themeTextMuted}`}>
                          {comparisonReport.curvesRecommendation || 'Không cần can thiệp Curves nếu độ sáng đã cân đối.'}
                        </p>
                      </div>
                      {comparisonReport.curvesMidtoneLift > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-purple-400">Nâng Midtone:</span>
                          <span className="font-mono font-bold text-purple-400">+{comparisonReport.curvesMidtoneLift}%</span>
                        </div>
                      )}
                    </div>

                    {/* Brightness & Contrast Advice */}
                    <div className={`p-4 rounded-xl border flex flex-col justify-between ${themeCardBg}`}>
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Gauge size={16} className="text-amber-400" />
                          <span className="font-bold text-xs">Độ sáng & Độ tương phản</span>
                        </div>
                        <p className={`text-[11px] leading-relaxed ${themeTextMuted}`}>
                          Bù trừ quang độ cho máy in: Sáng (Brightness) và Tương phản (Contrast)
                        </p>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px]">
                        <span>Brightness: <strong className="text-amber-400 font-mono">{comparisonReport.brightness > 0 ? `+${comparisonReport.brightness}` : comparisonReport.brightness}</strong></span>
                        <span>Contrast: <strong className="text-amber-400 font-mono">{comparisonReport.contrast > 0 ? `+${comparisonReport.contrast}` : comparisonReport.contrast}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 2: KIỂM TRA PREPRESS ĐƠN HÌNH (TAC & GAMUT) ================= */}
          {activeTab === 'inspect' && (
            <div className="space-y-4">
              {isAnalyzing ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-4">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-ping" />
                    <div className="w-16 h-16 rounded-full border-4 border-t-indigo-600 border-r-purple-600 border-b-pink-500 border-l-transparent animate-spin" />
                    <Sparkles size={24} className="absolute inset-0 m-auto text-indigo-500 animate-pulse" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-semibold text-sm">ChatGPT Vision đang quét phổ màu bản in...</h4>
                    <p className={`text-xs mt-1 ${themeTextMuted}`}>
                      Đang đo đạc tổng lượng mực TAC, kiểm tra gamut FOGRA39 và phân tích dải tương phản
                    </p>
                  </div>
                </div>
              ) : report ? (
                <>
                  {/* TOP BANNER: SCORE & AI SUMMARY */}
                  <div className={`rounded-2xl p-4 sm:p-5 border relative overflow-hidden ${
                    report.score >= 90
                      ? isLightMode ? 'bg-emerald-50/70 border-emerald-200' : 'bg-emerald-950/20 border-emerald-500/30'
                      : report.score >= 75
                      ? isLightMode ? 'bg-blue-50/70 border-blue-200' : 'bg-blue-950/20 border-blue-500/30'
                      : isLightMode ? 'bg-amber-50/70 border-amber-200' : 'bg-amber-950/20 border-amber-500/30'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="relative shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-lg">
                          <div className="text-center leading-none">
                            <span className="text-2xl font-black">{report.score}</span>
                            <span className="text-[10px] block opacity-80 font-semibold">/100</span>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${report.ratingColor}`}>
                              {report.rating}
                            </span>
                            <span className={`text-[11px] ${themeTextMuted}`}>Đo lúc {report.timestamp}</span>
                          </div>
                          <h4 className="font-bold text-sm sm:text-base mt-1">Đánh giá Tiêu chuẩn Kỹ thuật In ấn</h4>
                        </div>
                      </div>

                      <button
                        onClick={() => onApplyRecommendations(report.aiRecommendations.actionableSettings)}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition active:scale-95 cursor-pointer shrink-0"
                      >
                        <Zap size={15} className="text-amber-300 animate-bounce" />
                        <span>Tự động Áp dụng Cân chỉnh AI</span>
                      </button>
                    </div>

                    <div className={`mt-3.5 pt-3.5 border-t ${isLightMode ? 'border-slate-200/80' : 'border-slate-700/50'}`}>
                      <p className="leading-relaxed italic text-xs font-medium">
                        "{report.aiSummaryText}"
                      </p>
                    </div>
                  </div>

                  {/* HEATMAP QUICK TOGGLE BAR */}
                  <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2.5 ${themeCardBg}`}>
                    <div className="flex items-center gap-2">
                      <Flame size={15} className="text-amber-500" />
                      <span className="font-semibold text-xs">Chế độ Xem Bản đồ Nhiệt Lỗi (Heatmap Overlay):</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => onToggleHeatmap('none')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                          activeHeatmapMode === 'none'
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : isLightMode ? 'bg-white border-slate-300 text-slate-700' : 'bg-slate-900 border-slate-700 text-slate-300'
                        }`}
                      >
                        Tắt Heatmap
                      </button>
                      <button
                        onClick={() => onToggleHeatmap('tac')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition flex items-center gap-1 ${
                          activeHeatmapMode === 'tac'
                            ? 'bg-rose-600 text-white border-rose-600'
                            : isLightMode ? 'bg-white border-slate-300 text-rose-600' : 'bg-slate-900 border-slate-700 text-rose-400'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                        Vùng quá mực TAC (&gt;300%)
                      </button>
                      <button
                        onClick={() => onToggleHeatmap('gamut')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition flex items-center gap-1 ${
                          activeHeatmapMode === 'gamut'
                            ? 'bg-cyan-600 text-white border-cyan-600'
                            : isLightMode ? 'bg-white border-slate-300 text-cyan-600' : 'bg-slate-900 border-slate-700 text-cyan-400'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                        Vùng lệch dải CMYK
                      </button>
                      <button
                        onClick={() => onToggleHeatmap('tone')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition flex items-center gap-1 ${
                          activeHeatmapMode === 'tone'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : isLightMode ? 'bg-white border-slate-300 text-amber-600' : 'bg-slate-900 border-slate-700 text-amber-400'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                        Cháy sáng / Bệt tối
                      </button>
                    </div>
                  </div>

                  {/* 4 CORE PREPRESS METRICS TILES */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* 1. TAC */}
                    <div className={`p-4 rounded-xl border flex flex-col justify-between ${themeCardBg}`}>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Droplets size={16} className={report.tac.status === 'danger' ? 'text-rose-500' : report.tac.status === 'warning' ? 'text-amber-500' : 'text-emerald-500'} />
                            <span className="font-bold text-xs">Tổng Độ Phủ Mực (TAC)</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            report.tac.status === 'danger'
                              ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                              : report.tac.status === 'warning'
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                          }`}>
                            Đỉnh: {report.tac.max}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-700/30 h-2.5 rounded-full overflow-hidden flex mb-2">
                          <div
                            style={{ width: `${Math.min(100, (report.tac.max / 400) * 100)}%` }}
                            className={`h-full transition-all ${
                              report.tac.max > 320 ? 'bg-rose-500' : report.tac.max > 300 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                        </div>
                        <p className={`text-[11px] leading-relaxed ${themeTextMuted}`}>
                          {report.tac.message}
                        </p>
                      </div>
                      <div className={`mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] ${themeTextMuted} ${
                        isLightMode ? 'border-slate-200' : 'border-slate-700/60'
                      }`}>
                        <span>Bình quân: <strong>{report.tac.average}%</strong></span>
                        <span>Vượt 300%: <strong className={report.tac.over300Percent > 0 ? 'text-amber-500' : ''}>{report.tac.over300Percent}%</strong> diện tích</span>
                      </div>
                    </div>

                    {/* 2. GAMUT WARNING */}
                    <div className={`p-4 rounded-xl border flex flex-col justify-between ${themeCardBg}`}>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Layers size={16} className={report.gamut.status === 'danger' ? 'text-rose-500' : report.gamut.status === 'warning' ? 'text-amber-500' : 'text-emerald-500'} />
                            <span className="font-bold text-xs">Dải Màu In Ấn (CMYK Gamut)</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            report.gamut.status === 'danger'
                              ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                              : report.gamut.status === 'warning'
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                          }`}>
                            {report.gamut.outOfGamutPercent > 0 ? `Lệch ${report.gamut.outOfGamutPercent}%` : 'Trong dải an toàn'}
                          </span>
                        </div>
                        <p className={`text-[11px] leading-relaxed mb-2 ${themeTextMuted}`}>
                          {report.gamut.message}
                        </p>
                        {report.gamut.affectedTones.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {report.gamut.affectedTones.map((tone, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 text-[10px] font-medium">
                                {tone}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className={`mt-3 pt-2.5 border-t text-[11px] ${themeTextMuted} ${
                        isLightMode ? 'border-slate-200' : 'border-slate-700/60'
                      }`}>
                        Chuẩn so sánh: <strong>ISO Coated v2 / FOGRA39</strong>
                      </div>
                    </div>

                    {/* 3. COLOR BALANCE */}
                    <div className={`p-4 rounded-xl border flex flex-col justify-between ${themeCardBg}`}>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Sliders size={16} className="text-purple-400" />
                            <span className="font-bold text-xs">Cân Bằng Xám & Sắc Độ (Cast)</span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                            {report.balance.detectedCast === 'neutral' ? 'Chuẩn Neutral' : 'Có độ lệch'}
                          </span>
                        </div>
                        <p className={`text-[11px] leading-relaxed ${themeTextMuted}`}>
                          {report.balance.castDescription}
                        </p>
                      </div>
                      <div className={`mt-3 pt-2.5 border-t text-[11px] flex justify-between ${themeTextMuted} ${
                        isLightMode ? 'border-slate-200' : 'border-slate-700/60'
                      }`}>
                        <span>Độ lệch quang học: <strong>Δ {report.balance.deviationScore}</strong></span>
                        <span>Điểm xám: <strong>{report.balance.detectedCast === 'neutral' ? 'Cân bằng' : 'Cần bù trừ'}</strong></span>
                      </div>
                    </div>

                    {/* 4. DYNAMIC RANGE */}
                    <div className={`p-4 rounded-xl border flex flex-col justify-between ${themeCardBg}`}>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Gauge size={16} className={report.tone.dynamicRangeStatus === 'clipped' ? 'text-amber-500' : 'text-emerald-500'} />
                            <span className="font-bold text-xs">Dải Sắc Độ & Clipping</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            report.tone.dynamicRangeStatus === 'clipped'
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                          }`}>
                            {report.tone.dynamicRangeStatus === 'clipped' ? 'Clipping' : 'Hài hòa'}
                          </span>
                        </div>
                        <p className={`text-[11px] leading-relaxed ${themeTextMuted}`}>
                          {report.tone.message}
                        </p>
                      </div>
                      <div className={`mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] ${themeTextMuted} ${
                        isLightMode ? 'border-slate-200' : 'border-slate-700/60'
                      }`}>
                        <span>Bệt tối: <strong className={report.tone.blackCrushPercent > 5 ? 'text-amber-500' : ''}>{report.tone.blackCrushPercent}%</strong></span>
                        <span>Cháy sáng: <strong className={report.tone.highlightBlowoutPercent > 5 ? 'text-amber-500' : ''}>{report.tone.highlightBlowoutPercent}%</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* AI RECOMMENDATIONS LIST */}
                  <div className={`p-4 rounded-xl border ${themeCardInner}`}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <Wand2 size={16} className="text-indigo-500" />
                      <h5 className="font-bold text-xs">{report.aiRecommendations.title}</h5>
                    </div>
                    <ul className="space-y-1.5">
                      {report.aiRecommendations.details.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-[11px]">
                          <span className="text-indigo-500 font-bold">•</span>
                          <span className={themeTextMuted}>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-slate-500">
                  Chưa có dữ liệu kiểm tra. Nhấn "Quét lại" để bắt đầu.
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className={`px-5 py-3 border-t flex flex-wrap items-center justify-between gap-3 ${
          isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] flex items-center gap-1.5 ${themeTextMuted}`}>
              <Sparkles size={12} className="text-emerald-500" />
              <span>Được hỗ trợ bởi OpenAI ChatGPT Vision (gpt-4o-mini).</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                isLightMode
                  ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
            >
              Đóng
            </button>

            {activeTab === 'compare' && comparisonReport && (
              <button
                onClick={handleApplyComparison}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition active:scale-95"
              >
                <Check size={14} />
                <span>Áp dụng bù trừ vào Color Studio</span>
              </button>
            )}

            {activeTab === 'inspect' && report && (
              <button
                onClick={() => onApplyRecommendations(report.aiRecommendations.actionableSettings)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition active:scale-95"
              >
                <Check size={14} />
                <span>Áp dụng thông số tối ưu AI</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ================= OPENAI API KEY SETTINGS MODAL ================= */}
      {apiKeyModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl space-y-4 ${themeModalBg}`}>
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <Key size={16} className="text-amber-400" />
                <span>Cấu hình OpenAI API Token</span>
              </h4>
              <button
                onClick={() => setApiKeyModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-500/20 text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            <p className={`text-xs leading-relaxed ${themeTextMuted}`}>
              Token dùng để gọi ChatGPT Vision API (`gpt-4o-mini`) phân tích hình ảnh bản in và so sánh màu:
            </p>

            <div>
              <input
                type="text"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="sk-proj-..."
                className={`w-full px-3 py-2 rounded-xl border text-xs font-mono select-all ${
                  isLightMode
                    ? 'bg-slate-50 border-slate-300 text-slate-800'
                    : 'bg-slate-950 border-slate-700 text-slate-200'
                }`}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-emerald-500 font-medium">
                {apiKeySavedToast ? 'Đã lưu token thành công!' : ''}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setApiKeyModalOpen(false)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                    isLightMode ? 'border-slate-300' : 'border-slate-700'
                  }`}
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveApiKey}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow"
                >
                  Lưu Token
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
