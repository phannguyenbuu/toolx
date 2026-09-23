import { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  ColorAdjustSettings,
  DEFAULT_COLOR_SETTINGS,
  COLOR_PRESETS,
  applyColorAdjustments
} from '../../utils/colorAdjustment';
import { CurveChannelType } from '../ColorCurveEditor';
import {
  ColorInspectionReport,
  runAIColorInspection,
  generateInspectionHeatmapOverlay
} from '../../utils/aiColorInspection';
import { RenderDocItem } from './types';
import { getFullPreview } from './renderPdfStorage';

function getTimestampSuffix(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export function useColorStudio(apiBase: string) {
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);
  const [previewDocTitle, setPreviewDocTitle] = useState<string>('Bản Render Output');

  const [colorSettings, setColorSettings] = useState<ColorAdjustSettings>({ ...DEFAULT_COLOR_SETTINGS });
  const [colorTab, setColorTab] = useState<'curves' | 'brightness' | 'balance' | 'hsl' | 'cmyk' | 'rgb'>('curves');
  const [curveChannel, setCurveChannel] = useState<CurveChannelType>('rgb');
  const [showCompareOriginal, setShowCompareOriginal] = useState<boolean>(false);
  const [previewZoom, setPreviewZoom] = useState<number>(1.0);
  const [copiedPreviewToast, setCopiedPreviewToast] = useState<boolean>(false);

  const studioCanvasRef = useRef<HTMLCanvasElement>(null);
  const heatmapCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageCacheRef = useRef<HTMLImageElement | null>(null);
  const originalImageDataRef = useRef<ImageData | null>(null);
  const studioScrollAreaRef = useRef<HTMLDivElement>(null);
  const [isStudioLoading, setIsStudioLoading] = useState<boolean>(false);
  const [studioLoadingText, setStudioLoadingText] = useState<string>('Đang giải nén ảnh...');
  const [canvasDims, setCanvasDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const [aiInspectionModalOpen, setAiInspectionModalOpen] = useState<boolean>(false);
  const [aiInspectionReport, setAiInspectionReport] = useState<ColorInspectionReport | null>(null);
  const [isAIAnalyzing, setIsAIAnalyzing] = useState<boolean>(false);
  const [activeHeatmapMode, setActiveHeatmapMode] = useState<'none' | 'tac' | 'gamut' | 'tone'>('none');

  const handleFitStudioZoom = useCallback((imgW?: number, imgH?: number) => {
    const scrollContainer = studioScrollAreaRef.current;
    const w = imgW || canvasDims.width || originalImageCacheRef.current?.naturalWidth || 0;
    const h = imgH || canvasDims.height || originalImageCacheRef.current?.naturalHeight || 0;

    if (!scrollContainer || !w || !h) {
      setPreviewZoom(1.0);
      return;
    }

    const pad = 64;
    const availW = Math.max(100, scrollContainer.clientWidth - pad);
    const availH = Math.max(100, scrollContainer.clientHeight - pad);

    const fitScale = Math.min(availW / w, availH / h, 1.0);
    const roundedZoom = Math.max(0.05, Math.min(1.0, Math.round(fitScale * 100) / 100));
    setPreviewZoom(roundedZoom);
  }, [canvasDims.width, canvasDims.height]);

  const renderStudioCanvas = useCallback(
    (img: HTMLImageElement | null, settings: ColorAdjustSettings, compare: boolean) => {
      const canvas = studioCanvasRef.current;
      if (!canvas || !img) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      let srcData = originalImageDataRef.current;
      if (!srcData || srcData.width !== w || srcData.height !== h) {
        const offscreen = document.createElement('canvas');
        offscreen.width = w;
        offscreen.height = h;
        const offCtx = offscreen.getContext('2d');
        if (!offCtx) return;
        offCtx.drawImage(img, 0, 0);
        srcData = offCtx.getImageData(0, 0, w, h);
        originalImageDataRef.current = srcData;
      }

      if (compare) {
        ctx.putImageData(srcData, 0, 0);
      } else {
        applyColorAdjustments(srcData, ctx, settings);
      }
    },
    []
  );

  useEffect(() => {
    if (previewModalOpen && originalImageCacheRef.current) {
      renderStudioCanvas(originalImageCacheRef.current, colorSettings, showCompareOriginal);
    }
  }, [colorSettings, showCompareOriginal, previewModalOpen, renderStudioCanvas]);

  const handleOpenColorStudio = async (url: string, title?: string, doc?: RenderDocItem) => {
    setPreviewDocTitle(title || 'Bản Render Output');
    setColorSettings({ ...DEFAULT_COLOR_SETTINGS });
    setShowCompareOriginal(false);
    setPreviewModalOpen(true);
    setIsStudioLoading(true);
    setStudioLoadingText('Đang giải nén & nạp ảnh độ phân giải cao...');
    originalImageDataRef.current = null;

    let fullResUrl = url;

    try {
      if (doc) {
        if (doc.id.startsWith('goagent_')) {
          setStudioLoadingText('Đang nạp ảnh gốc từ bộ nhớ IndexedDB...');
          const cachedFull = await getFullPreview(doc.id);
          if (cachedFull) {
            fullResUrl = cachedFull;
          }
        } else {
          fullResUrl = `${apiBase}/storage/previews/${doc.id}.jpg`;
        }
      } else if (url && url.includes('/storage/thumbnails/')) {
        fullResUrl = url.replace('/storage/thumbnails/', '/storage/previews/');
      }
    } catch (e) {
      console.warn('Lỗi phân giải ảnh full-res:', e);
    }

    setStudioLoadingText('Đang giải mã ma trận điểm ảnh canvas...');

    const img = new Image();
    if (fullResUrl.startsWith('http') && typeof window !== 'undefined' && !fullResUrl.includes(window.location.host)) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      setStudioLoadingText('Đang kết xuất không gian màu chuẩn...');
      originalImageCacheRef.current = img;
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      setCanvasDims({ width: w, height: h });

      try {
        const offscreen = document.createElement('canvas');
        offscreen.width = w;
        offscreen.height = h;
        const offCtx = offscreen.getContext('2d');
        if (offCtx) {
          offCtx.drawImage(img, 0, 0);
          originalImageDataRef.current = offCtx.getImageData(0, 0, w, h);
        }
      } catch (err) {
        console.warn('Không thể tạo ImageData bộ đệm:', err);
      }

      renderStudioCanvas(img, DEFAULT_COLOR_SETTINGS, false);

      setTimeout(() => {
        handleFitStudioZoom(w, h);
        setIsStudioLoading(false);
      }, 120);
    };

    img.onerror = () => {
      if (fullResUrl !== url) {
        console.warn('Không tải được ảnh full-res, thử lại với URL gốc:', url);
        setStudioLoadingText('Thử lại với URL xem trước dự phòng...');
        img.src = url;
      } else {
        setIsStudioLoading(false);
        toast.error('Không thể giải nén hoặc tải ảnh xem trước.');
      }
    };

    img.src = fullResUrl;
  };

  const updateSetting = <K extends keyof ColorAdjustSettings>(key: K, value: ColorAdjustSettings[K]) => {
    setColorSettings((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const applyPreset = (preset: (typeof COLOR_PRESETS)[0]) => {
    setColorSettings((prev) => ({
      ...prev,
      ...preset.settings
    }));
  };

  const handleResetColorSettings = () => {
    setColorSettings({ ...DEFAULT_COLOR_SETTINGS });
  };

  const handleDownloadAdjustedImage = () => {
    const canvas = studioCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    const baseName = previewDocTitle.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = getTimestampSuffix();
    a.download = `${baseName}_color_graded_${timestamp}.png`;
    a.href = dataUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyAdjustedImageToClipboard = () => {
    const canvas = studioCanvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopiedPreviewToast(true);
        setTimeout(() => setCopiedPreviewToast(false), 2000);
      }, 'image/png');
    } catch (e) {
      toast.error('Không thể sao chép ảnh vào Clipboard: ' + e);
    }
  };

  const updateHeatmapOverlay = useCallback(() => {
    const studioCanvas = studioCanvasRef.current;
    const heatmapCanvas = heatmapCanvasRef.current;
    if (!studioCanvas || !heatmapCanvas) return;

    if (activeHeatmapMode === 'none') {
      const hCtx = heatmapCanvas.getContext('2d');
      if (hCtx) hCtx.clearRect(0, 0, heatmapCanvas.width, heatmapCanvas.height);
      return;
    }

    heatmapCanvas.width = studioCanvas.width;
    heatmapCanvas.height = studioCanvas.height;
    const overlay = generateInspectionHeatmapOverlay(studioCanvas, activeHeatmapMode);
    const hCtx = heatmapCanvas.getContext('2d');
    if (hCtx) {
      hCtx.clearRect(0, 0, heatmapCanvas.width, heatmapCanvas.height);
      hCtx.drawImage(overlay, 0, 0);
    }
  }, [activeHeatmapMode]);

  useEffect(() => {
    if (previewModalOpen && studioCanvasRef.current) {
      updateHeatmapOverlay();
    }
  }, [activeHeatmapMode, colorSettings, previewModalOpen, updateHeatmapOverlay]);

  const handleRunAIColorCheck = async () => {
    const canvas = studioCanvasRef.current;
    if (!canvas) return;

    setAiInspectionModalOpen(true);
    setIsAIAnalyzing(true);
    try {
      const report = await runAIColorInspection(canvas, colorSettings);
      setAiInspectionReport(report);
    } catch (err) {
      console.error('Lỗi khi kiểm tra màu bằng AI:', err);
    } finally {
      setIsAIAnalyzing(false);
    }
  };

  const handleApplyAIRecommendations = (actionable: Partial<ColorAdjustSettings>) => {
    setColorSettings((prev) => ({
      ...prev,
      ...actionable
    }));
    setTimeout(() => {
      if (studioCanvasRef.current) {
        handleRunAIColorCheck();
      }
    }, 200);
  };

  const handleOpenWithAICheck = (url: string, title?: string, doc?: RenderDocItem) => {
    handleOpenColorStudio(url, title, doc);
    setTimeout(() => {
      handleRunAIColorCheck();
    }, 600);
  };

  return {
    previewModalOpen,
    setPreviewModalOpen,
    previewDocTitle,
    colorSettings,
    setColorSettings,
    colorTab,
    setColorTab,
    curveChannel,
    setCurveChannel,
    showCompareOriginal,
    setShowCompareOriginal,
    previewZoom,
    setPreviewZoom,
    copiedPreviewToast,
    studioCanvasRef,
    heatmapCanvasRef,
    studioScrollAreaRef,
    isStudioLoading,
    studioLoadingText,
    canvasDims,
    aiInspectionModalOpen,
    setAiInspectionModalOpen,
    aiInspectionReport,
    isAIAnalyzing,
    activeHeatmapMode,
    setActiveHeatmapMode,
    handleFitStudioZoom,
    handleOpenColorStudio,
    updateSetting,
    applyPreset,
    handleResetColorSettings,
    handleDownloadAdjustedImage,
    handleCopyAdjustedImageToClipboard,
    handleRunAIColorCheck,
    handleApplyAIRecommendations,
    handleOpenWithAICheck
  };
}
