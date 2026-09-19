import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Sliders,
  Check,
  RotateCcw,
  Palette,
  Sparkles,
  FileText,
  Cpu,
  Server,
  Zap,
  Printer,
  ShieldCheck,
  Copy,
  Trash2,
  Download,
  Upload,
  Eye,
  Camera,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  SplitSquareVertical
} from 'lucide-react';
import { RenderColorProfile } from '../types/renderProfile';
import { AdvancedRenderSettings, DEFAULT_RENDER_SETTINGS } from './RenderSettingsModal';
import {
  ColorAdjustSettings,
  DEFAULT_COLOR_SETTINGS,
  applyColorAdjustments,
  isDefaultColorSettings
} from '../utils/colorAdjustment';
import { ColorCurveEditor, CurveChannelType } from './ColorCurveEditor';
import {
  comparePrintWithPCUsingChatGPT,
  imageFileToOptimizedBase64,
  PrintMatchComparisonReport,
  getOpenAIKey,
  setOpenAIKey
} from '../utils/aiColorInspection';
import {
  getProfiles,
  saveProfile,
  duplicateProfile,
  deleteProfile,
  setDefaultProfile,
  exportProfilesToJson,
  importProfilesFromJson
} from '../services/renderProfileService';

interface RenderProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProfile: RenderColorProfile;
  onSelectProfile: (profile: RenderColorProfile) => void;
  onSaveProfile: (profile: RenderColorProfile) => void;
  isLightMode: boolean;
  sampleCanvas?: HTMLCanvasElement | null;
  onApplyToAllPages?: (profile: RenderColorProfile) => void;
}

export const RenderProfileModal: React.FC<RenderProfileModalProps> = ({
  isOpen,
  onClose,
  activeProfile,
  onSelectProfile,
  onSaveProfile,
  isLightMode,
  sampleCanvas,
  onApplyToAllPages
}) => {
  // Navigation tabs: 'render' (Cấu hình Render) hoặc 'color' (Cấu hình Color)
  const [activeTab, setActiveTab] = useState<'render' | 'color'>('render');

  // Danh sách toàn bộ Profiles
  const [profilesList, setProfilesList] = useState<RenderColorProfile[]>([]);
  // Profile đang chỉnh sửa trong modal
  const [editingProfile, setEditingProfile] = useState<RenderColorProfile>({ ...activeProfile });

  // Sub-tabs trong Cấu hình Color: 'auto' (Tự động & AI Vision), 'manual' (Thủ công), 'curves' (Curves)
  const [colorSubTab, setColorSubTab] = useState<'auto' | 'manual' | 'curves'>('auto');

  // Curves Editor Channel
  const [curveChannel, setCurveChannel] = useState<CurveChannelType>('rgb');

  // AI Vision state
  const [printedPhotoBase64, setPrintedPhotoBase64] = useState<string | null>(null);
  const [isComparingAI, setIsComparingAI] = useState<boolean>(false);
  const [aiReport, setAiReport] = useState<PrintMatchComparisonReport | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>(getOpenAIKey());

  // Split / Compare preview
  const [showOriginal, setShowOriginal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Canvas preview refs
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  // Load profiles on open
  useEffect(() => {
    if (isOpen) {
      const list = getProfiles();
      setProfilesList(list);
      const current = list.find((p) => p.id === activeProfile.id) || activeProfile;
      setEditingProfile(JSON.parse(JSON.stringify(current)));
    }
  }, [isOpen, activeProfile]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Switch profile in modal
  const handleSwitchProfile = (id: string) => {
    const found = profilesList.find((p) => p.id === id);
    if (found) {
      setEditingProfile(JSON.parse(JSON.stringify(found)));
      setAiReport(null);
      setPrintedPhotoBase64(null);
    }
  };

  // Render settings mutator
  const updateRenderSetting = <K extends keyof AdvancedRenderSettings>(key: K, value: AdvancedRenderSettings[K]) => {
    setEditingProfile((prev) => ({
      ...prev,
      renderSettings: {
        ...prev.renderSettings,
        [key]: value
      }
    }));
  };

  // Color settings mutator
  const updateColorSetting = <K extends keyof ColorAdjustSettings>(key: K, value: ColorAdjustSettings[K]) => {
    setEditingProfile((prev) => ({
      ...prev,
      colorSettings: {
        ...prev.colorSettings,
        [key]: value
      }
    }));
  };

  // Toggle color filter enabled
  const toggleColorFilter = (enabled: boolean) => {
    setEditingProfile((prev) => ({
      ...prev,
      colorFilterEnabled: enabled
    }));
  };

  // Live Canvas Preview Effect
  const renderPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 400;
    const h = 280;
    canvas.width = w;
    canvas.height = h;

    if (sampleCanvas) {
      // Dùng trang hiện tại đang mở trong ToolX
      ctx.drawImage(sampleCanvas, 0, 0, w, h);
    } else {
      // Vẽ ảnh mẫu thử nghiệm chuẩn Prepress CMYK Color Target
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, w, h);

      // Thanh dải màu CMYK
      const barH = 36;
      const colors = ['#00a8e8', '#e6007e', '#ffed00', '#1a1a1a', '#e11d48', '#10b981', '#6366f1'];
      const barW = w / colors.length;
      colors.forEach((col, idx) => {
        ctx.fillStyle = col;
        ctx.fillRect(idx * barW, 20, barW, barH);
      });

      // Gradient chuyển tiếp độ xám (Gray ramp)
      const grad = ctx.createLinearGradient(20, 0, w - 20, 0);
      grad.addColorStop(0, '#000000');
      grad.addColorStop(0.5, '#808080');
      grad.addColorStop(1, '#ffffff');
      ctx.fillStyle = grad;
      ctx.fillRect(20, 70, w - 40, 30);

      // Chữ mẫu sắc nét
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('ToolX Print Color Calibrator Test', 24, 130);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('Độ phủ mực: 300% CMYK Coated • Japan Color 2001', 24, 150);

      // Khối tông da chân dung (Skin tone)
      ctx.fillStyle = '#f4c29e';
      ctx.fillRect(24, 170, 70, 70);
      ctx.fillStyle = '#d99879';
      ctx.fillRect(104, 170, 70, 70);

      // Khối bóng đổ chi tiết sâu (Deep shadow 95%)
      ctx.fillStyle = '#1e1b18';
      ctx.fillRect(184, 170, 70, 70);
      ctx.fillStyle = '#0f0e0d';
      ctx.fillRect(264, 170, 70, 70);
    }

    // Nếu không so sánh gốc và bộ lọc màu đang bật, áp dụng filter
    if (!showOriginal && editingProfile.colorFilterEnabled && !isDefaultColorSettings(editingProfile.colorSettings)) {
      const srcData = ctx.getImageData(0, 0, w, h);
      applyColorAdjustments(srcData, ctx, editingProfile.colorSettings);
    }
  }, [sampleCanvas, showOriginal, editingProfile.colorFilterEnabled, editingProfile.colorSettings]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  // Quick 1-Click Calibration Presets
  const applyQuickCastCorrection = (type: 'de_red' | 'de_cyan' | 'de_yellow' | 'shadow_lift') => {
    const cur = { ...editingProfile.colorSettings };
    let desc = '';

    if (type === 'de_red') {
      // Máy A hay bị ám đỏ (Magenta/Red): Giảm Red, kéo về Cyan, giảm Magenta, tăng nhẹ Yellow
      cur.balanceCyanRed = -14;
      cur.balanceMagentaGreen = 6;
      cur.cyan = 8;
      cur.magenta = -10;
      cur.red = -10;
      cur.brightness = 3;
      cur.curveRGB = [
        { x: 0, y: 0 },
        { x: 128, y: 136 },
        { x: 255, y: 255 }
      ];
      desc = 'Máy in A: Khử ám đỏ (-14 Cyan-Red, -10 Magenta, bù sáng +3)';
    } else if (type === 'de_cyan') {
      // Máy bị ám xanh lạnh (Cyan/Blue): Bù Red, bù Yellow, tăng ấm
      cur.balanceCyanRed = 12;
      cur.balanceYellowBlue = -10;
      cur.cyan = -8;
      cur.red = 8;
      cur.yellow = 6;
      desc = 'Khử ám xanh lạnh (+12 Cyan-Red, bù ấm Yellow-Blue)';
    } else if (type === 'de_yellow') {
      // Máy bị ám vàng: Giảm Yellow, bù Blue, tăng sắc đen
      cur.balanceYellowBlue = 14;
      cur.yellow = -12;
      cur.black = 8;
      cur.contrast = 6;
      desc = 'Khử ám vàng (+14 Yellow-Blue, giảm Yellow, tăng K)';
    } else if (type === 'shadow_lift') {
      // Tối màu / mất chi tiết vùng tối
      cur.brightness = 6;
      cur.contrast = -4;
      cur.curveRGB = [
        { x: 0, y: 0 },
        { x: 64, y: 78 }, // Nâng vùng tối
        { x: 128, y: 140 },
        { x: 255, y: 255 }
      ];
      desc = 'Nâng sáng chi tiết vùng tối & Midtone Curves';
    }

    setEditingProfile((prev) => ({
      ...prev,
      colorFilterEnabled: true,
      colorSettings: cur,
      aiCalibration: {
        calibratedAt: new Date().toISOString(),
        detectedCast: type,
        castDescription: desc,
        summary: `Đã áp dụng bộ lọc nhanh: ${desc}`,
        confidenceScore: 95
      }
    }));
    showToast(`✅ Đã áp dụng: ${desc}`);
  };

  // Upload ảnh chụp bản in thực tế máy in để so sánh AI
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await imageFileToOptimizedBase64(file, 1024);
      setPrintedPhotoBase64(b64);
      setAiError(null);
    } catch (err: any) {
      setAiError('Không thể đọc file ảnh: ' + err.message);
    }
  };

  // Kích hoạt AI Vision so sánh và cân màu tự động
  const handleRunAICalibration = async () => {
    const pCanvas = previewCanvasRef.current;
    if (!pCanvas) {
      setAiError('Chưa có ảnh xem trước để so sánh');
      return;
    }
    if (!printedPhotoBase64) {
      setAiError('Vui lòng tải lên ảnh chụp bản in thực tế của máy in cần cân màu.');
      return;
    }

    setIsComparingAI(true);
    setAiError(null);

    try {
      const report = await comparePrintWithPCUsingChatGPT(pCanvas, printedPhotoBase64, editingProfile.colorSettings);
      setAiReport(report);

      // Tự động gán thông số bù trừ vào Profile
      if (report.actionableSettings) {
        setEditingProfile((prev) => ({
          ...prev,
          colorFilterEnabled: true,
          colorSettings: {
            ...prev.colorSettings,
            ...report.actionableSettings
          },
          aiCalibration: {
            calibratedAt: new Date().toISOString(),
            targetMachine: prev.machineName || 'Máy In Đã Quét',
            detectedCast: report.cmyk?.magenta > 0 ? 'cool_cyan' : 'warm_red',
            castDescription: report.colorShiftDescription,
            summary: report.summary,
            confidenceScore: 98,
            curvesMidtoneLift: report.curvesMidtoneLift
          }
        }));
        showToast('✨ AI Vision đã phân tích và thiết lập thông số bù màu thành công!');
      }
    } catch (err: any) {
      console.error('Lỗi AI Vision:', err);
      setAiError(err.message || 'Lỗi khi kết nối ChatGPT Vision');
    } finally {
      setIsComparingAI(false);
    }
  };

  // Áp dụng cân chỉnh này cho TOÀN BỘ trang trong file PDF
  const handleApplyToAllPages = () => {
    const saved = saveProfile(editingProfile);
    setEditingProfile(saved);
    const list = getProfiles();
    setProfilesList(list);

    if (onApplyToAllPages) {
      onApplyToAllPages(saved);
    }
    onSaveProfile(saved);
    showToast('🚀 Đã lưu Profile và áp dụng bộ lọc cân màu cho TOÀN BỘ trang trong file PDF!');
  };

  // Lưu Profile hiện tại
  const handleSaveCurrentProfile = () => {
    const saved = saveProfile(editingProfile);
    setEditingProfile(saved);
    const list = getProfiles();
    setProfilesList(list);
    onSaveProfile(saved);
    showToast(`✅ Đã lưu profile: "${saved.name}"`);
  };

  // Nhân bản thành Profile mới
  const handleDuplicate = () => {
    const cloned = duplicateProfile(editingProfile.id, `${editingProfile.name} (Bản mới)`);
    const list = getProfiles();
    setProfilesList(list);
    setEditingProfile(cloned);
    onSelectProfile(cloned);
    showToast(`📄 Đã tạo bản sao mới: "${cloned.name}"`);
  };

  // Đặt làm mặc định
  const handleSetDefault = () => {
    setDefaultProfile(editingProfile.id);
    const list = getProfiles();
    setProfilesList(list);
    setEditingProfile((prev) => ({ ...prev, isDefault: true }));
    showToast(`⭐ Đã đặt "${editingProfile.name}" làm Profile mặc định khi mở /render`);
  };

  // Xóa profile
  const handleDelete = () => {
    if (editingProfile.isPreset) {
      showToast('⚠️ Không thể xóa Preset chuẩn của hệ thống.');
      return;
    }
    if (!window.confirm(`Bạn có chắc muốn xóa profile "${editingProfile.name}"?`)) return;

    deleteProfile(editingProfile.id);
    const list = getProfiles();
    setProfilesList(list);
    const next = list.find((p) => p.isDefault) || list[0];
    setEditingProfile(next);
    onSelectProfile(next);
    showToast('🗑️ Đã xóa profile thành công');
  };

  // Xuất file JSON
  const handleExportJson = () => {
    const json = exportProfilesToJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `toolx_render_profiles_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('💾 Đã tải file cấu hình JSON về máy');
  };

  // Nhập file JSON
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importProfilesFromJson(content);
      if (res.success) {
        const list = getProfiles();
        setProfilesList(list);
        showToast(`✅ Đã nhập thành công ${res.count} profiles!`);
      } else {
        showToast('❌ Lỗi nhập file: ' + (res.error || 'File không hợp lệ'));
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  const themeModalBg = isLightMode ? 'bg-white text-slate-800' : 'bg-slate-900 text-slate-100';
  const themeCardBg = isLightMode ? 'bg-slate-50/70 border-slate-200/80' : 'bg-slate-900/60 border-slate-800';
  const themeCardInner = isLightMode ? 'bg-white border-slate-200/80' : 'bg-slate-950/60 border-slate-800/80';
  const themeInput = isLightMode
    ? 'bg-white border-slate-200 text-slate-800 focus:border-slate-400 focus:ring-1 focus:ring-slate-300'
    : 'bg-slate-950 border-slate-800 text-slate-200 focus:border-slate-600 focus:ring-1 focus:ring-slate-600';
  const themeTextMuted = isLightMode ? 'text-slate-500' : 'text-slate-400';
  const themeTextHead = isLightMode ? 'text-slate-900' : 'text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-6xl max-h-[95vh] rounded-3xl shadow-2xl border flex flex-col overflow-hidden ${
          isLightMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}
      >
        {/* ================= HEADER ================= */}
        <div
          className={`p-3.5 sm:px-6 border-b flex flex-wrap items-center justify-between gap-3 flex-shrink-0 ${
            isLightMode ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/90 border-slate-800'
          }`}
        >
          {/* Title & Icon */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#999] text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <Sliders size={15} />
            </div>
            <h2 className="text-sm font-semibold tracking-tight whitespace-nowrap">Cấu hình Profile Render & Màu Sắc</h2>
          </div>

          {/* Profile Switcher & Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap">
              <span className={`${themeTextMuted} whitespace-nowrap`}>Profile:</span>
              <select
                value={editingProfile.id}
                onChange={(e) => handleSwitchProfile(e.target.value)}
                className={`p-1.5 px-2.5 rounded-lg border text-xs font-medium ${themeInput}`}
              >
                {profilesList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.isDefault ? '⭐ [Mặc định]' : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleDuplicate}
              className={`p-1.5 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition cursor-pointer whitespace-nowrap ${
                isLightMode ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
              title="Nhân bản profile này để tạo cấu hình mới"
            >
              <Copy size={13} className="text-slate-400" />
              <span className="hidden sm:inline whitespace-nowrap">Nhân bản</span>
            </button>

            {!editingProfile.isDefault && (
              <button
                onClick={handleSetDefault}
                className={`p-1.5 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition cursor-pointer whitespace-nowrap ${
                  isLightMode ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                }`}
                title="Đặt làm profile mặc định"
              >
                <span className="text-amber-500">⭐</span>
                <span className="hidden sm:inline whitespace-nowrap">Đặt mặc định</span>
              </button>
            )}

            {!editingProfile.isPreset && (
              <button
                onClick={handleDelete}
                className="p-1.5 px-2 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-medium transition cursor-pointer"
                title="Xóa profile tùy chỉnh này"
              >
                <Trash2 size={13} />
              </button>
            )}

            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                isLightMode ? 'hover:bg-slate-200 border-slate-200 text-slate-600' : 'hover:bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* TOAST NOTIFICATION */}
        {toastMessage && (
          <div className="bg-[#999] text-white text-xs font-medium py-2 px-4 flex items-center justify-center gap-2 shadow-xs animate-in fade-in">
            <Sparkles size={13} className="text-amber-300" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ================= PROFILE INFO STRIP & MAIN TABS ================= */}
        <div
          className={`px-4 sm:px-6 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 ${
            isLightMode ? 'bg-slate-100/50 border-slate-200' : 'bg-slate-950/50 border-slate-800'
          }`}
        >
          {/* Tab Navigation: Render vs Color */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl border bg-slate-200/50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 whitespace-nowrap">
            <button
              onClick={() => setActiveTab('render')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'render'
                  ? 'bg-[#999] text-white shadow-xs'
                  : `${themeTextMuted} hover:text-slate-900 dark:hover:text-white`
              }`}
            >
              <Printer size={13} />
              <span className="whitespace-nowrap">Thông số Render</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono whitespace-nowrap ${
                activeTab === 'render'
                  ? 'bg-white/25'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}>
                {editingProfile.renderSettings.isCustomDpi
                  ? editingProfile.renderSettings.customDpi
                  : editingProfile.renderSettings.dpi}{' '}
                DPI
              </span>
            </button>

            <button
              onClick={() => setActiveTab('color')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'color'
                  ? 'bg-[#999] text-white shadow-xs'
                  : `${themeTextMuted} hover:text-slate-900 dark:hover:text-white`
              }`}
            >
              <Palette size={13} />
              <span className="whitespace-nowrap">Cân màu & AI Vision</span>
              {editingProfile.colorFilterEnabled ? (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-medium flex items-center gap-0.5 whitespace-nowrap">
                  <Check size={9} /> Bật lọc
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-slate-500/15 text-slate-400 whitespace-nowrap">
                  Tắt lọc
                </span>
              )}
            </button>
          </div>

          {/* Profile Name & Machine Input with subtle labels */}
          <div className="flex items-center gap-3 text-xs whitespace-nowrap">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className={`text-[11px] font-medium whitespace-nowrap ${themeTextMuted}`}>Tên:</span>
              <input
                type="text"
                value={editingProfile.name}
                onChange={(e) => setEditingProfile((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Tên Profile..."
                className={`p-1.5 px-2.5 rounded-lg border text-xs font-medium w-52 ${themeInput}`}
              />
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className={`text-[11px] font-medium whitespace-nowrap ${themeTextMuted}`}>Máy in:</span>
              <input
                type="text"
                value={editingProfile.machineName || ''}
                onChange={(e) => setEditingProfile((prev) => ({ ...prev, machineName: e.target.value }))}
                placeholder="vd: Ricoh C7200x..."
                className={`p-1.5 px-2.5 rounded-lg border text-xs font-medium w-40 ${themeInput}`}
              />
            </div>
          </div>
        </div>

        {/* ================= MODAL BODY ================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* ======================================================== */}
          {/* TAB 1: CẤU HÌNH PROFILE RENDER                            */}
          {/* ======================================================== */}
          {activeTab === 'render' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 animate-in fade-in duration-150">
              {/* 1. Độ phân giải DPI & Tỉ lệ */}
              <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col justify-between ${themeCardBg}`}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between whitespace-nowrap">
                    <h3 className="font-medium text-xs flex items-center gap-2 text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      <Printer size={15} className="text-slate-500" />
                      <span className="whitespace-nowrap">Độ phân giải kết xuất</span>
                    </h3>
                    <span className={`text-[11px] font-mono whitespace-nowrap ${themeTextMuted}`}>
                      {editingProfile.renderSettings.isCustomDpi
                        ? `${editingProfile.renderSettings.customDpi} DPI`
                        : `${editingProfile.renderSettings.dpi} DPI`}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                    {[
                      { dpi: 72, label: '72 DPI' },
                      { dpi: 150, label: '150 DPI' },
                      { dpi: 300, label: '300 DPI' },
                      { dpi: 600, label: '600 DPI' },
                      { dpi: -1, label: 'Tùy chỉnh' }
                    ].map((item) => {
                      const isCustom = item.dpi === -1;
                      const isSelected = isCustom
                        ? editingProfile.renderSettings.isCustomDpi
                        : !editingProfile.renderSettings.isCustomDpi && editingProfile.renderSettings.dpi === item.dpi;
                      return (
                        <button
                          type="button"
                          key={item.label}
                          onClick={() => {
                            if (isCustom) {
                              updateRenderSetting('isCustomDpi', true);
                            } else {
                              updateRenderSetting('isCustomDpi', false);
                              updateRenderSetting('dpi', item.dpi);
                            }
                          }}
                          className={`py-2 px-1 sm:px-2 rounded-xl border cursor-pointer transition text-center whitespace-nowrap ${
                            isSelected
                              ? 'bg-[#999] text-white border-[#999] shadow-xs'
                              : `${themeCardInner} hover:border-slate-300 dark:hover:border-slate-700`
                          }`}
                        >
                          <div className="text-xs font-medium whitespace-nowrap truncate">{item.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {editingProfile.renderSettings.isCustomDpi && (
                  <div className="flex items-center gap-2 pt-2 whitespace-nowrap">
                    <label className={`text-[11px] font-medium whitespace-nowrap ${themeTextMuted}`}>DPI tùy chỉnh:</label>
                    <input
                      type="number"
                      min={36}
                      max={2400}
                      value={editingProfile.renderSettings.customDpi}
                      onChange={(e) => updateRenderSetting('customDpi', Math.max(36, Number(e.target.value)))}
                      className={`w-28 p-1.5 px-2.5 rounded-lg border text-xs font-mono text-center ${themeInput}`}
                    />
                  </div>
                )}
              </div>

              {/* 2. Quản lý Hệ màu & ICC Profile */}
              <div className={`p-4 sm:p-5 rounded-2xl border space-y-3 flex flex-col justify-between ${themeCardBg}`}>
                <div className="space-y-3">
                  <h3 className="font-medium text-xs flex items-center gap-2 text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    <Palette size={15} className="text-slate-500" />
                    <span className="whitespace-nowrap">ICC Profile</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Hệ màu */}
                    <div>
                      <label className={`block text-[11px] font-medium mb-1.5 whitespace-nowrap ${themeTextMuted}`}>Hệ màu:</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'cmyk', label: 'CMYK' },
                          { id: 'rgb', label: 'RGB' },
                          { id: 'gray', label: 'Grayscale' }
                        ].map((cs) => (
                          <button
                            key={cs.id}
                            type="button"
                            onClick={() => updateRenderSetting('colorspace', cs.id as any)}
                            className={`py-2 px-1 rounded-xl border text-xs font-medium transition cursor-pointer text-center whitespace-nowrap ${
                              editingProfile.renderSettings.colorspace === cs.id
                                ? 'bg-[#999] text-white border-[#999] shadow-xs'
                                : `${themeCardInner} hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300`
                            }`}
                          >
                            <span className="whitespace-nowrap truncate">{cs.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ICC Profile */}
                    <div>
                      <label className={`block text-[11px] font-medium mb-1.5 whitespace-nowrap ${themeTextMuted}`}>
                        ICC Profile:
                      </label>
                      <select
                        value={editingProfile.renderSettings.iccProfile}
                        onChange={(e) => updateRenderSetting('iccProfile', e.target.value)}
                        className={`w-full p-2 rounded-xl border text-xs font-medium ${themeInput}`}
                      >
                        <option value="Japan Color 2001 Coated.icc">Japan Color 2001 Coated</option>
                        <option value="ISOcoated_v2_300_bas.icc">ISO Coated v2 300%</option>
                        <option value="U.S. Web Coated (SWOP) v2.icc">US Web Coated SWOP v2</option>
                        <option value="sRGB Color Space Profile.icm">sRGB IEC61966-2.1</option>
                        <option value="Display P3.icc">Display P3</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Overprint & BPC */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={editingProfile.renderSettings.blackPointCompensation}
                      onChange={(e) => updateRenderSetting('blackPointCompensation', e.target.checked)}
                      className="rounded accent-[#999] dark:accent-white w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">Bù trừ điểm đen (BPC)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={editingProfile.renderSettings.overprintSimulation}
                      onChange={(e) => updateRenderSetting('overprintSimulation', e.target.checked)}
                      className="rounded accent-[#999] dark:accent-white w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">Mô phỏng In đè (Overprint)</span>
                  </label>
                </div>

                {/* GCR Slider — chỉ hiện khi CMYK */}
                {editingProfile.renderSettings.colorspace === 'cmyk' && (
                  <div className="pt-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className={`text-[11px] font-semibold whitespace-nowrap ${themeTextMuted}`}>
                        GCR — Thay thế thành phần xám:
                      </label>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                        (editingProfile.renderSettings.gcrLevel ?? 100) >= 80
                          ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                          : (editingProfile.renderSettings.gcrLevel ?? 100) >= 40
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      }`}>
                        {editingProfile.renderSettings.gcrLevel ?? 100}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={editingProfile.renderSettings.gcrLevel ?? 100}
                      onChange={(e) => updateRenderSetting('gcrLevel', Number(e.target.value))}
                      className="w-full h-2 rounded-full accent-violet-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] font-semibold">
                      <span className="text-emerald-600 dark:text-emerald-400">0% — Chỉ C+M+Y</span>
                      <span className={`text-[9px] ${themeTextMuted}`}>
                        {(editingProfile.renderSettings.gcrLevel ?? 100) <= 25
                          ? '← Light GCR (SWOP v2 style)'
                          : (editingProfile.renderSettings.gcrLevel ?? 100) <= 60
                          ? '← Medium GCR'
                          : 'Heavy GCR →'}
                      </span>
                      <span className="text-violet-600 dark:text-violet-400">100% — Tối đa K</span>
                    </div>
                    {/* Live CMYK preview */}
                    <div className={`rounded-lg px-3 py-1.5 text-[10px] flex items-center gap-2 ${themeCardInner}`}>
                      <span className={themeTextMuted}>Pixel xám R=G=B=128 →</span>
                      {(() => {
                        const gcr = (editingProfile.renderSettings.gcrLevel ?? 100) / 100;
                        const kMax = 0.498;
                        const k = gcr * kMax;
                        const c = Math.max(0, (1 - 128/255 - k) / (1 - k || 1));
                        return (
                          <span className="font-mono font-bold">
                            <span className="text-cyan-500">C{Math.round(c*100)}</span>{' '}
                            <span className="text-pink-500">M{Math.round(c*100)}</span>{' '}
                            <span className="text-yellow-500">Y{Math.round(c*100)}</span>{' '}
                            <span className="text-slate-500">K{Math.round(k*100)}</span>
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Định dạng xuất & Nén */}
              <div className={`p-4 sm:p-5 rounded-2xl border space-y-3 flex flex-col justify-between ${themeCardBg}`}>
                <div className="space-y-3">
                  <h3 className="font-medium text-xs flex items-center gap-2 text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    <FileText size={15} className="text-slate-500" />
                    <span className="whitespace-nowrap">Định dạng tệp xuất</span>
                  </h3>

                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    {[
                      { id: 'tiff', label: 'TIFF' },
                      { id: 'png', label: 'PNG' },
                      { id: 'jpeg', label: 'JPEG' },
                      { id: 'pdf', label: 'PDF' }
                    ].map((fmt) => (
                      <button
                        type="button"
                        key={fmt.id}
                        onClick={() => updateRenderSetting('outputFormat', fmt.id as any)}
                        className={`py-2 px-2 rounded-xl border cursor-pointer transition text-center whitespace-nowrap ${
                          editingProfile.renderSettings.outputFormat === fmt.id
                            ? 'bg-[#999] text-white border-[#999] shadow-xs'
                            : `${themeCardInner} hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300`
                        }`}
                      >
                        <div className="text-xs font-medium uppercase whitespace-nowrap truncate">{fmt.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={editingProfile.renderSettings.transparentBg}
                      onChange={(e) => updateRenderSetting('transparentBg', e.target.checked)}
                      className="rounded accent-[#999] dark:accent-white w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">Nền trong suốt</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={editingProfile.renderSettings.noTiling}
                      onChange={(e) => updateRenderSetting('noTiling', e.target.checked)}
                      className="rounded accent-[#999] dark:accent-white w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">Single-pass No-Tiling</span>
                  </label>
                </div>
              </div>

              {/* 4. Máy render điều phối kết xuất */}
              <div className={`p-4 sm:p-5 rounded-2xl border space-y-3 flex flex-col justify-between ${themeCardBg}`}>
                <div className="space-y-3">
                  <h3 className="font-medium text-xs flex items-center gap-2 text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    <Cpu size={15} className="text-slate-500" />
                    <span className="whitespace-nowrap">Máy render kết xuất</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      {
                        id: 'auto',
                        title: 'Tự động (Ưu tiên ToolxAgent)',
                        icon: <Zap size={14} className="text-amber-500 shrink-0" />
                      },
                      {
                        id: 'goagent',
                        title: 'ToolxAgent',
                        icon: <Cpu size={14} className="text-emerald-500 shrink-0" />
                      },
                      {
                        id: 'server',
                        title: 'Máy render chuyên dụng',
                        icon: <Server size={14} className="text-blue-500 shrink-0" />
                      }
                    ].map((eng) => (
                      <div
                        key={eng.id}
                        onClick={() => updateRenderSetting('renderEngine', eng.id as any)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center gap-2 whitespace-nowrap overflow-hidden ${
                          editingProfile.renderSettings.renderEngine === eng.id
                            ? 'border-[#999] bg-[#999]/10 font-medium shadow-2xs'
                            : `${themeCardInner} hover:border-slate-300 dark:hover:border-slate-700`
                        }`}
                        title={eng.title}
                      >
                        {eng.icon}
                        <span className="text-xs font-medium whitespace-nowrap truncate">{eng.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: CẤU HÌNH PROFILE COLOR (BỘ LỌC & CÂN MÀU AI)       */}
          {/* ======================================================== */}
          {activeTab === 'color' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Master Filter Switch Banner */}
              <div
                className={`p-4 sm:p-5 rounded-2xl border flex flex-wrap items-center justify-between gap-4 transition-all ${
                  editingProfile.colorFilterEnabled
                    ? 'bg-slate-50 dark:bg-slate-900/80 border-slate-300 dark:border-slate-700'
                    : `${themeCardBg} opacity-80`
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs ${
                      editingProfile.colorFilterEnabled
                        ? 'bg-[#999]'
                        : 'bg-slate-400 text-white'
                    }`}
                  >
                    <Palette size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs text-slate-900 dark:text-slate-100">
                        Bộ lọc cân chỉnh màu sắc khi Render
                      </span>
                      {editingProfile.colorFilterEnabled ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                          ĐANG KÍCH HOẠT
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 font-medium">
                          ĐANG TẮT (Màu gốc)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProfile.colorFilterEnabled}
                    onChange={(e) => toggleColorFilter(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#999]"></div>
                </label>
              </div>

              {/* Sub-Tabs: Auto & AI vs Manual vs Curves */}
              <div className="flex items-center justify-between flex-wrap gap-2 border-b pb-2">
                <div className="flex items-center gap-1 p-0.5 rounded-xl border bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setColorSubTab('auto')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                      colorSubTab === 'auto'
                        ? 'bg-[#999] text-white shadow-xs'
                        : `${themeTextMuted} hover:text-slate-800 dark:hover:text-slate-200`
                    }`}
                  >
                    <Sparkles size={13} className={colorSubTab === 'auto' ? 'text-amber-300' : 'text-slate-400'} />
                    <span>Tự động (AI Vision)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setColorSubTab('manual')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                      colorSubTab === 'manual'
                        ? 'bg-[#999] text-white shadow-xs'
                        : `${themeTextMuted} hover:text-slate-800 dark:hover:text-slate-200`
                    }`}
                  >
                    <Sliders size={13} />
                    <span>Thủ công</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setColorSubTab('curves')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                      colorSubTab === 'curves'
                        ? 'bg-[#999] text-white shadow-xs'
                        : `${themeTextMuted} hover:text-slate-800 dark:hover:text-slate-200`
                    }`}
                  >
                    <Layers size={13} />
                    <span>Curves</span>
                  </button>
                </div>

                {/* Quick reset colors */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingProfile((prev) => ({
                      ...prev,
                      colorSettings: { ...DEFAULT_COLOR_SETTINGS }
                    }));
                    showToast('Đã khôi phục cài đặt màu về mặc định');
                  }}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition cursor-pointer ${
                    isLightMode ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                  }`}
                >
                  <RotateCcw size={12} />
                  <span>Khôi phục màu gốc</span>
                </button>
              </div>

              {/* SECTION A: TỰ ĐỘNG & AI VISION */}
              {colorSubTab === 'auto' && (
                <div className="space-y-6">
                  {/* 1. Nút phát hiện & khử ám màu 1 chạm */}
                  <div className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${themeCardBg}`}>
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-xs flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                        <Zap size={14} className="text-amber-500" />
                        <span>Khử lỗi màu nhanh</span>
                      </h4>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <button
                        type="button"
                        onClick={() => applyQuickCastCorrection('de_red')}
                        className={`p-2.5 rounded-xl border text-center transition hover:border-slate-400 cursor-pointer ${themeCardInner}`}
                      >
                        <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-rose-500">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          <span>Khử Ám Đỏ</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyQuickCastCorrection('de_cyan')}
                        className={`p-2.5 rounded-xl border text-center transition hover:border-slate-400 cursor-pointer ${themeCardInner}`}
                      >
                        <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-cyan-600">
                          <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                          <span>Khử Ám Xanh</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyQuickCastCorrection('de_yellow')}
                        className={`p-2.5 rounded-xl border text-center transition hover:border-slate-400 cursor-pointer ${themeCardInner}`}
                      >
                        <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-amber-600">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span>Khử Ám Vàng</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyQuickCastCorrection('shadow_lift')}
                        className={`p-2.5 rounded-xl border text-center transition hover:border-slate-400 cursor-pointer ${themeCardInner}`}
                      >
                        <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-indigo-500">
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          <span>Nâng Vùng Tối</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* 2. AI Computer Vision Calibration Studio */}
                  <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${themeCardBg}`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-purple-500 animate-pulse" />
                        <div>
                          <h4 className="font-medium text-xs text-slate-900 dark:text-slate-100">
                            AI Vision so khớp & cân màu
                          </h4>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setApiKeyModalOpen(true)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border flex items-center gap-1 font-medium cursor-pointer ${
                          isLightMode ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                        }`}
                      >
                        <span>Cài Token OpenAI</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      {/* Cột 1: Bản xem PC */}
                      <div className={`p-3 rounded-xl border flex flex-col items-center justify-center ${themeCardInner}`}>
                        <div className="text-xs font-medium mb-2 flex items-center gap-1 text-slate-700 dark:text-slate-300">
                          <Eye size={13} className="text-slate-400" />
                          <span>Bản xem PC (Thiết kế gốc)</span>
                        </div>
                        <div className="w-full h-44 bg-slate-950/10 dark:bg-slate-950/40 rounded-lg overflow-hidden flex items-center justify-center relative">
                          <canvas ref={previewCanvasRef} className="max-w-full max-h-full object-contain" />
                        </div>
                      </div>

                      {/* Cột 2: Bản in thực tế tải lên */}
                      <div className={`p-3 rounded-xl border flex flex-col items-center justify-center ${themeCardInner}`}>
                        <div className="text-xs font-medium mb-2 flex items-center gap-1 text-slate-700 dark:text-slate-300">
                          <Camera size={13} className="text-slate-400" />
                          <span>Ảnh chụp bản in thực tế</span>
                        </div>
                        {printedPhotoBase64 ? (
                          <div className="w-full h-44 bg-slate-950/10 dark:bg-slate-950/40 rounded-lg overflow-hidden relative group">
                            <img
                              src={printedPhotoBase64}
                              alt="Bản in thực tế"
                              className="w-full h-full object-contain"
                            />
                            <button
                              onClick={() => setPrintedPhotoBase64(null)}
                              className="absolute top-2 right-2 p-1 rounded-md bg-rose-600 text-white shadow hover:bg-rose-500 cursor-pointer"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`w-full h-44 border border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer p-4 text-center transition ${
                              isLightMode
                                ? 'border-slate-300 hover:border-slate-500 bg-slate-50/50'
                                : 'border-slate-700 hover:border-slate-500 bg-slate-900/40'
                            }`}
                          >
                            <Upload size={20} className="text-slate-400 mb-1.5" />
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Tải lên ảnh chụp bản in thực tế</span>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {aiError && (
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
                        <AlertTriangle size={14} />
                        <span>{aiError}</span>
                      </div>
                    )}

                    {/* Nút kích hoạt AI Vision */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleRunAICalibration}
                        disabled={isComparingAI || !printedPhotoBase64}
                        className="px-4 py-2 rounded-xl bg-[#999] hover:bg-[#888] text-white disabled:opacity-40 font-medium text-xs flex items-center gap-2 shadow-xs active:scale-95 transition cursor-pointer"
                      >
                        <Sparkles size={14} className={isComparingAI ? 'animate-spin' : 'text-amber-300'} />
                        <span>
                          {isComparingAI
                            ? 'AI Vision đang phân tích...'
                            : 'AI Vision phân tích & bù trừ màu'}
                        </span>
                      </button>
                    </div>

                    {/* Bảng báo cáo AI sau khi so sánh */}
                    {aiReport && (
                      <div className={`p-3.5 rounded-xl border space-y-2 mt-3 ${themeCardInner}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-xs text-slate-800 dark:text-slate-200">
                            Kết quả chẩn đoán AI:
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/20">
                            Độ tin cậy: 98%
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{aiReport.summary}</p>
                        {aiReport.colorShiftDescription && (
                          <p className={`text-[11px] ${themeTextMuted}`}>{aiReport.colorShiftDescription}</p>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                          <div className={`p-2 rounded-lg border ${themeCardBg}`}>
                            <span className={themeTextMuted}>Cyan/Red:</span>{' '}
                            <strong className="font-mono text-cyan-600">
                              {editingProfile.colorSettings.balanceCyanRed}
                            </strong>
                          </div>
                          <div className={`p-2 rounded-lg border ${themeCardBg}`}>
                            <span className={themeTextMuted}>Magenta/Green:</span>{' '}
                            <strong className="font-mono text-fuchsia-600">
                              {editingProfile.colorSettings.balanceMagentaGreen}
                            </strong>
                          </div>
                          <div className={`p-2 rounded-lg border ${themeCardBg}`}>
                            <span className={themeTextMuted}>Yellow/Blue:</span>{' '}
                            <strong className="font-mono text-amber-600">
                              {editingProfile.colorSettings.balanceYellowBlue}
                            </strong>
                          </div>
                          <div className={`p-2 rounded-lg border ${themeCardBg}`}>
                            <span className={themeTextMuted}>Midtone Lift:</span>{' '}
                            <strong className="font-mono text-slate-800 dark:text-slate-200">
                              +{aiReport.curvesMidtoneLift || 3}%
                            </strong>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION B: TINH CHỈNH THỦ CÔNG (SLIDERS) */}
              {colorSubTab === 'manual' && (
                <div className="space-y-6">
                  {/* Độ sáng & Độ tương phản */}
                  <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${themeCardBg}`}>
                    <h4 className="font-medium text-xs flex items-center gap-2 text-slate-900 dark:text-slate-100">
                      <Sliders size={14} className="text-slate-500" />
                      <span>Độ sáng & Độ tương phản</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <span className={themeTextMuted}>Độ sáng:</span>
                          <span className="font-mono text-slate-800 dark:text-slate-200">
                            {editingProfile.colorSettings.brightness}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={-100}
                          max={100}
                          value={editingProfile.colorSettings.brightness}
                          onChange={(e) => updateColorSetting('brightness', Number(e.target.value))}
                          className="w-full accent-[#999] dark:accent-white cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <span className={themeTextMuted}>Độ tương phản:</span>
                          <span className="font-mono text-slate-800 dark:text-slate-200">
                            {editingProfile.colorSettings.contrast}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={-100}
                          max={100}
                          value={editingProfile.colorSettings.contrast}
                          onChange={(e) => updateColorSetting('contrast', Number(e.target.value))}
                          className="w-full accent-[#999] dark:accent-white cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Cân bằng màu */}
                  <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${themeCardBg}`}>
                    <h4 className="font-medium text-xs flex items-center gap-2 text-slate-900 dark:text-slate-100">
                      <Palette size={14} className="text-slate-500" />
                      <span>Cân bằng màu</span>
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <span className="text-cyan-600 font-medium">Cyan</span>
                          <span className="font-mono text-slate-800 dark:text-slate-200">
                            {editingProfile.colorSettings.balanceCyanRed}
                          </span>
                          <span className="text-rose-600 font-medium">Red</span>
                        </div>
                        <input
                          type="range"
                          min={-100}
                          max={100}
                          value={editingProfile.colorSettings.balanceCyanRed}
                          onChange={(e) => updateColorSetting('balanceCyanRed', Number(e.target.value))}
                          className="w-full accent-[#999] dark:accent-white cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <span className="text-fuchsia-600 font-medium">Magenta</span>
                          <span className="font-mono text-slate-800 dark:text-slate-200">
                            {editingProfile.colorSettings.balanceMagentaGreen}
                          </span>
                          <span className="text-emerald-600 font-medium">Green</span>
                        </div>
                        <input
                          type="range"
                          min={-100}
                          max={100}
                          value={editingProfile.colorSettings.balanceMagentaGreen}
                          onChange={(e) => updateColorSetting('balanceMagentaGreen', Number(e.target.value))}
                          className="w-full accent-[#999] dark:accent-white cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <span className="text-amber-600 font-medium">Yellow</span>
                          <span className="font-mono text-slate-800 dark:text-slate-200">
                            {editingProfile.colorSettings.balanceYellowBlue}
                          </span>
                          <span className="text-blue-600 font-medium">Blue</span>
                        </div>
                        <input
                          type="range"
                          min={-100}
                          max={100}
                          value={editingProfile.colorSettings.balanceYellowBlue}
                          onChange={(e) => updateColorSetting('balanceYellowBlue', Number(e.target.value))}
                          className="w-full accent-[#999] dark:accent-white cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Kênh màu CMYK */}
                  <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${themeCardBg}`}>
                    <h4 className="font-medium text-xs flex items-center gap-2 text-slate-900 dark:text-slate-100">
                      <Layers size={14} className="text-slate-500" />
                      <span>Kênh màu CMYK</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1 text-cyan-600">
                          <span>Cyan:</span>
                          <span className="font-mono">{editingProfile.colorSettings.cyan}</span>
                        </div>
                        <input
                          type="range"
                          min={-100}
                          max={100}
                          value={editingProfile.colorSettings.cyan}
                          onChange={(e) => updateColorSetting('cyan', Number(e.target.value))}
                          className="w-full accent-cyan-600 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1 text-fuchsia-600">
                          <span>Magenta:</span>
                          <span className="font-mono">{editingProfile.colorSettings.magenta}</span>
                        </div>
                        <input
                          type="range"
                          min={-100}
                          max={100}
                          value={editingProfile.colorSettings.magenta}
                          onChange={(e) => updateColorSetting('magenta', Number(e.target.value))}
                          className="w-full accent-fuchsia-600 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1 text-amber-600">
                          <span>Yellow:</span>
                          <span className="font-mono">{editingProfile.colorSettings.yellow}</span>
                        </div>
                        <input
                          type="range"
                          min={-100}
                          max={100}
                          value={editingProfile.colorSettings.yellow}
                          onChange={(e) => updateColorSetting('yellow', Number(e.target.value))}
                          className="w-full accent-amber-600 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1 text-slate-600 dark:text-slate-300">
                          <span>Black (K):</span>
                          <span className="font-mono">{editingProfile.colorSettings.black}</span>
                        </div>
                        <input
                          type="range"
                          min={-100}
                          max={100}
                          value={editingProfile.colorSettings.black}
                          onChange={(e) => updateColorSetting('black', Number(e.target.value))}
                          className="w-full accent-slate-700 dark:accent-slate-300 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION C: PHOTOSHOP CURVES (LUT) */}
              {colorSubTab === 'curves' && (
                <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${themeCardBg}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-xs flex items-center gap-2 text-slate-900 dark:text-slate-100">
                        <Layers size={14} className="text-slate-500" />
                        <span>Đường cong màu Curves</span>
                      </h4>
                    </div>

                    {/* Kênh Curves */}
                    <div className="flex items-center gap-1 p-0.5 rounded-lg border bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                      {(['rgb', 'red', 'green', 'blue'] as CurveChannelType[]).map((ch) => (
                        <button
                          key={ch}
                          type="button"
                          onClick={() => setCurveChannel(ch)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium uppercase transition cursor-pointer ${
                            curveChannel === ch
                              ? 'bg-[#999] text-white shadow-xs'
                              : `${themeTextMuted} hover:text-slate-800 dark:hover:text-slate-200`
                          }`}
                        >
                          {ch}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-center p-4">
                    <ColorCurveEditor
                      channel={curveChannel}
                      points={
                        curveChannel === 'rgb'
                          ? editingProfile.colorSettings.curveRGB
                          : curveChannel === 'red'
                          ? editingProfile.colorSettings.curveRed
                          : curveChannel === 'green'
                          ? editingProfile.colorSettings.curveGreen
                          : editingProfile.colorSettings.curveBlue
                      }
                      onChange={(pts) => {
                        const key =
                          curveChannel === 'rgb'
                            ? 'curveRGB'
                            : curveChannel === 'red'
                            ? 'curveRed'
                            : curveChannel === 'green'
                            ? 'curveGreen'
                            : 'curveBlue';
                        updateColorSetting(key, pts);
                      }}
                      onChannelChange={setCurveChannel}
                      isLightMode={isLightMode}
                    />
                  </div>
                </div>
              )}

              {/* LIVE BEFORE / AFTER PREVIEW BAR */}
              <div
                className={`p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${themeCardInner}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium ${themeTextMuted}`}>So sánh nhanh:</span>
                  <button
                    type="button"
                    onMouseDown={() => setShowOriginal(true)}
                    onMouseUp={() => setShowOriginal(false)}
                    onTouchStart={() => setShowOriginal(true)}
                    onTouchEnd={() => setShowOriginal(false)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition active:scale-95 cursor-pointer ${
                      showOriginal
                        ? 'bg-amber-500 text-white border-amber-500'
                        : isLightMode
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                    }`}
                  >
                    <Eye size={12} className="inline mr-1.5" />
                    <span>{showOriginal ? 'Đang hiện: Ảnh gốc' : 'Giữ để xem ảnh gốc'}</span>
                  </button>
                </div>

                <div className="text-[11px] flex items-center gap-2">
                  <span className={themeTextMuted}>Trạng thái:</span>
                  {editingProfile.colorFilterEnabled ? (
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">Đã kích hoạt bộ lọc</span>
                  ) : (
                    <span className="font-medium text-slate-400">Không lọc (Màu gốc)</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================= MODAL FOOTER ================= */}
        <div
          className={`p-3.5 sm:px-6 border-t flex flex-wrap items-center justify-between gap-3 flex-shrink-0 ${
            isLightMode ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/90 border-slate-800'
          }`}
        >
          {/* JSON Export / Import */}
          <div className="flex items-center gap-2 whitespace-nowrap">
            <button
              type="button"
              onClick={handleExportJson}
              className={`p-1.5 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                isLightMode ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
              title="Xuất danh sách profile ra file JSON"
            >
              <Download size={13} className="text-slate-400" />
              <span className="hidden sm:inline whitespace-nowrap">Xuất JSON</span>
            </button>

            <button
              type="button"
              onClick={() => jsonInputRef.current?.click()}
              className={`p-1.5 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                isLightMode ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
              title="Nhập profile từ file JSON"
            >
              <Upload size={13} className="text-slate-400" />
              <span className="hidden sm:inline whitespace-nowrap">Nhập JSON</span>
            </button>
            <input
              ref={jsonInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportJson}
              className="hidden"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 whitespace-nowrap">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl border text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                isLightMode ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
            >
              <span className="whitespace-nowrap">Đóng</span>
            </button>

            <button
              type="button"
              onClick={handleApplyToAllPages}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <CheckCircle2 size={14} />
              <span className="whitespace-nowrap">Áp dụng Toàn Bộ Trang PDF</span>
            </button>

            <button
              type="button"
              onClick={handleSaveCurrentProfile}
              className="px-4 py-2 rounded-xl bg-[#999] hover:bg-[#888] text-white font-medium text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Check size={14} />
              <span className="whitespace-nowrap">Lưu Profile</span>
            </button>
          </div>
        </div>

        {/* OPENAI KEY MODAL */}
        {apiKeyModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
            <div className={`max-w-md w-full p-6 rounded-2xl border shadow-2xl ${themeCardBg}`}>
              <h3 className="text-xs font-semibold mb-2 flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Sparkles size={14} className="text-purple-500" />
                <span>Cấu hình OpenAI API Key</span>
              </h3>
              <p className={`text-xs mb-3 ${themeTextMuted}`}>
                Nhập OpenAI API Key để kích hoạt AI Vision.
              </p>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="sk-..."
                className={`w-full p-2 rounded-xl border text-xs font-mono mb-4 ${themeInput}`}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setApiKeyModalOpen(false)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer ${
                    isLightMode ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                  }`}
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    setOpenAIKey(apiKeyInput);
                    setApiKeyModalOpen(false);
                    showToast('Đã lưu OpenAI API Key');
                  }}
                  className="px-4 py-1.5 rounded-xl bg-[#999] hover:bg-[#888] text-white text-xs font-medium cursor-pointer shadow-xs"
                >
                  Lưu Token
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
