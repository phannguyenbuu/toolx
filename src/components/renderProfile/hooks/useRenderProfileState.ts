import { useState, useEffect, useRef } from 'react';
import {
  RenderColorProfile,
  AdvancedRenderSettings,
  ColorAdjustSettings,
  CurveChannelType,
  PrintMatchComparisonReport
} from '../types';
import {
  getProfiles,
  saveProfile,
  duplicateProfile,
  deleteProfile,
  setDefaultProfile,
  exportProfilesToJson,
  importProfilesFromJson
} from '../../../services/renderProfileService';
import {
  comparePrintWithPCUsingChatGPT,
  imageFileToOptimizedBase64,
  getOpenAIKey
} from '../../../utils/aiColorInspection';

interface UseRenderProfileStateProps {
  isOpen: boolean;
  activeProfile: RenderColorProfile;
  onSelectProfile: (profile: RenderColorProfile) => void;
  onSaveProfile: (profile: RenderColorProfile) => void;
  onApplyToAllPages?: (profile: RenderColorProfile) => void;
}

export function useRenderProfileState({
  isOpen,
  activeProfile,
  onSelectProfile,
  onSaveProfile,
  onApplyToAllPages
}: UseRenderProfileStateProps) {
  // Navigation tabs: 'render' hoặc 'color'
  const [activeTab, setActiveTab] = useState<'render' | 'color'>('render');
  // Danh sách toàn bộ Profiles
  const [profilesList, setProfilesList] = useState<RenderColorProfile[]>([]);
  // Profile đang chỉnh sửa trong modal
  const [editingProfile, setEditingProfile] = useState<RenderColorProfile>({ ...activeProfile });
  // Sub-tabs trong Cấu hình Color: 'auto' | 'manual' | 'curves'
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  // Load profiles on open
  useEffect(() => {
    if (isOpen) {
      const list = getProfiles();
      setProfilesList(list);
      const current = list.find((p) => p.id === activeProfile.id) || activeProfile;
      setEditingProfile({ ...current });
      setAiReport(null);
      setAiError(null);
      setPrintedPhotoBase64(null);
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
      setEditingProfile({ ...found });
      onSelectProfile(found);
      showToast(`Đã chuyển sang profile: "${found.name}"`);
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
    showToast(enabled ? 'Đã BẬT bộ lọc màu cho Profile này' : 'Đã TẮT bộ lọc màu (Xuất màu gốc)');
  };

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
        { x: 64, y: 78 },
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
  const handleRunAICalibration = async (previewCanvas: HTMLCanvasElement | null) => {
    if (!previewCanvas) {
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
      const report = await comparePrintWithPCUsingChatGPT(previewCanvas, printedPhotoBase64, editingProfile.colorSettings);
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

  return {
    activeTab,
    setActiveTab,
    profilesList,
    editingProfile,
    setEditingProfile,
    colorSubTab,
    setColorSubTab,
    curveChannel,
    setCurveChannel,
    printedPhotoBase64,
    setPrintedPhotoBase64,
    isComparingAI,
    aiReport,
    aiError,
    apiKeyModalOpen,
    setApiKeyModalOpen,
    apiKeyInput,
    setApiKeyInput,
    showOriginal,
    setShowOriginal,
    toastMessage,
    fileInputRef,
    jsonInputRef,
    showToast,
    handleSwitchProfile,
    updateRenderSetting,
    updateColorSetting,
    toggleColorFilter,
    applyQuickCastCorrection,
    handleFileUpload,
    handleRunAICalibration,
    handleApplyToAllPages,
    handleSaveCurrentProfile,
    handleDuplicate,
    handleSetDefault,
    handleDelete,
    handleExportJson,
    handleImportJson
  };
}
