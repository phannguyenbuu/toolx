import React, { useState, useRef } from 'react';
import {
  PrintMatchComparisonReport,
  comparePrintWithPCUsingChatGPT,
  imageFileToOptimizedBase64,
  getOpenAIKey,
  setOpenAIKey,
} from '../../../utils/aiColorInspection';
import { ColorAdjustSettings } from '../../../utils/colorAdjustment';
import { InspectionActiveTab } from '../types';

interface UseAIColorInspectionModalStateProps {
  studioCanvas?: HTMLCanvasElement | null;
  currentSettings: ColorAdjustSettings;
  onApplyRecommendations: (settings: Partial<ColorAdjustSettings>) => void;
}

export const useAIColorInspectionModalState = ({
  studioCanvas,
  currentSettings,
  onApplyRecommendations,
}: UseAIColorInspectionModalStateProps) => {
  const [activeTab, setActiveTab] = useState<InspectionActiveTab>('compare');

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

  const handleClearPhoto = () => {
    setPrintedPhotoBase64(null);
    setComparisonReport(null);
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
      const res = await comparePrintWithPCUsingChatGPT(
        studioCanvas,
        printedPhotoBase64,
        currentSettings
      );
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

  return {
    activeTab,
    setActiveTab,
    printedPhotoBase64,
    isComparing,
    comparisonReport,
    compareError,
    appliedToast,
    apiKeyModalOpen,
    setApiKeyModalOpen,
    apiKeyInput,
    setApiKeyInput,
    apiKeySavedToast,
    fileInputRef,
    handleFileUpload,
    handleClearPhoto,
    handleRunCompare,
    handleApplyComparison,
    handleSaveApiKey,
  };
};
