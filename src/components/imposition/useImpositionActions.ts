import React, { useState } from 'react';
import { ImpositionConfig, ShapeTabItem, PageItem, DataMode } from './types';
import { LayoutPlan } from '../../utils/layoutSolver';
import { VectorMaskResult } from '../VectorMaskEditorModal';
import { RenderSuccessInfo } from './modals/ImpositionRenderSuccessModal';
import { safeToastSuccess, safeToastError, safeToastLoading, safeToastDismiss } from './impositionHelpers';
import { exportLocalPdf, exportGoAgentPdf } from './pdfExportEngine';
import { extractPdfPages, isPdfFile } from '../../utils/pdfPageExtractor';
import { createClientThumbnail } from '../../utils/imageThumbnail';
import { calculateStandardImageDimensionsMm } from '../../utils/imageDimensions';
import { GoAgentInfo, GOAGENT_DEFAULT_PORT } from '../../services/goAgentService';

export interface UseImpositionActionsParams {
  config: ImpositionConfig;
  setConfig: React.Dispatch<React.SetStateAction<ImpositionConfig>>;
  activeTab: ShapeTabItem;
  updateActiveTabProp: (props: Partial<ShapeTabItem>) => void;
  allPages: PageItem[];
  setAllPages: React.Dispatch<React.SetStateAction<PageItem[]>>;
  currentPlan: LayoutPlan | null;
  shapeTabs: ShapeTabItem[];
  isMultiShape: boolean;
  totalSheets: number;
  dataMode: DataMode;
  standardQty: number;
  xUpQty: number;
  customSvgData: string;
  vectorMaskResult: VectorMaskResult | null;
  backgroundColor: string;
  selectedRenderEngine: 'auto' | 'goagent' | 'server';
  selectedPresetId: string;
  goAgentInfo: GoAgentInfo | null;
  apiStatus: 'checking' | 'online' | 'offline';
  setShowDownloadModal: (open: boolean) => void;
  setRenderSuccessModal: (info: RenderSuccessInfo | null) => void;
  setIsAiModalOpen: (open: boolean) => void;
  setIsFilePickerOpen: (open: boolean) => void;
  setIsSourceEditorOpen: (open: boolean) => void;
  setIsRenderModalOpen?: (open: boolean) => void;
}

export function useImpositionActions(params: UseImpositionActionsParams) {
  const {
    config,
    setConfig,
    activeTab,
    updateActiveTabProp,
    allPages,
    setAllPages,
    currentPlan,
    shapeTabs,
    isMultiShape,
    totalSheets,
    dataMode,
    standardQty,
    xUpQty,
    customSvgData,
    vectorMaskResult,
    backgroundColor,
    selectedRenderEngine,
    selectedPresetId,
    goAgentInfo,
    apiStatus,
    setShowDownloadModal,
    setRenderSuccessModal,
    setIsAiModalOpen,
    setIsFilePickerOpen,
    setIsSourceEditorOpen,
    setIsRenderModalOpen
  } = params;

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPreviewPages, setAiPreviewPages] = useState<PageItem[]>([]);
  const [aiResult, setAiResult] = useState<any>(null);
  const [uploadProgress, setUploadProgress] = useState({ show: false, current: 0, total: 0, percent: 0 });
  const [skipThumbnails, setSkipThumbnails] = useState(false);

  const handleSourceImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (isPdfFile(file)) {
        const pages = await extractPdfPages(file);
        if (pages.length > 0) {
          const first = pages[0];
          const pageItem: PageItem = {
            fileIndex: 0,
            pageIndex: first.pageIndex,
            thumb: first.thumbUrl,
            originalThumb: first.dataUrl,
            baseThumb: first.thumbUrl,
            name: first.name,
            w: first.widthMm || config.itemW,
            h: first.heightMm || config.itemH,
            rotation: 0
          };
          const finalW = first.widthMm || config.itemW;
          const finalH = first.heightMm || config.itemH;
          updateActiveTabProp({ sourceImage: pageItem, itemW: finalW, itemH: finalH });
          setConfig(c => ({ ...c, itemW: finalW, itemH: finalH }));
          setAllPages(prev => (prev.length === 0 ? [pageItem] : prev));
          safeToastSuccess(`Đã nạp trang PDF: ${file.name}`);
          setIsSourceEditorOpen(true);
        }
      } else {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = async () => {
          const dims = await calculateStandardImageDimensionsMm(img.naturalWidth, img.naturalHeight, file);
          const thumb = await createClientThumbnail(file, 320);
          const pageItem: PageItem = {
            id: `img-${Date.now()}`,
            name: file.name,
            url,
            thumb: thumb || url,
            originalThumb: thumb || url,
            baseThumb: thumb || url,
            w: dims.w,
            h: dims.h,
            rotation: 0
          };
          updateActiveTabProp({ sourceImage: pageItem, itemW: dims.w, itemH: dims.h });
          setConfig(c => ({ ...c, itemW: dims.w, itemH: dims.h }));
          setAllPages(prev => (prev.length === 0 ? [pageItem] : prev));
          safeToastSuccess(`Đã tải ảnh: ${file.name} (${dims.w}x${dims.h}mm)`);
          setIsSourceEditorOpen(true);
        };
        img.src = url;
      }
    } catch (err: any) {
      safeToastError(`Lỗi nạp file: ${err.message}`);
    }
  };

  const handleMultiFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadProgress({ show: true, current: 0, total: files.length, percent: 0 });
    const loadedPages: PageItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        if (isPdfFile(f)) {
          const p = await extractPdfPages(f);
          const pdfItems: PageItem[] = p.map((page, pIdx) => ({
            id: `pdf-${Date.now()}-${i}-${pIdx}`,
            fileIndex: i,
            pageIndex: page.pageIndex,
            thumb: page.thumbUrl,
            originalThumb: page.dataUrl,
            baseThumb: page.thumbUrl,
            name: page.name,
            w: page.widthMm,
            h: page.heightMm,
            rotation: 0
          }));
          loadedPages.push(...pdfItems);
        } else {
          const url = URL.createObjectURL(f);
          const thumb = skipThumbnails ? url : await createClientThumbnail(f, 300);
          loadedPages.push({ id: `page-${Date.now()}-${i}`, name: f.name, url, thumb, w: config.itemW, h: config.itemH, rotation: 0 });
        }
      } catch (err) {
        console.error(err);
      }
      setUploadProgress({ show: true, current: i + 1, total: files.length, percent: Math.round(((i + 1) / files.length) * 100) });
    }
    setAllPages(prev => [...prev, ...loadedPages]);
    setUploadProgress({ show: false, current: 0, total: 0, percent: 0 });
    safeToastSuccess(`Đã nạp ${loadedPages.length} trang vào danh sách`);
  };

  const handleFileFromManager = (file: any) => {
    const pageItem: PageItem = {
      id: `fm-${file.id || Date.now()}`,
      name: file.name,
      url: file.url,
      thumb: file.thumbnail || file.url,
      w: file.width_mm || config.itemW,
      h: file.height_mm || config.itemH,
      rotation: 0
    };
    setAllPages(p => [...p, pageItem]);
    setIsFilePickerOpen(false);
    safeToastSuccess(`Đã import: ${file.name}`);
  };

  const confirmDownloadPDF = async () => {
    if (!currentPlan) return;
    setShowDownloadModal(false);
    setIsRenderModalOpen?.(false);
    setIsGenerating(true);
    setProgress(10);
    const toastId = safeToastLoading('Đang render PDF... (10%)');
    try {
      if (selectedRenderEngine === 'goagent' && goAgentInfo?.detected) {
        await exportGoAgentPdf({
          config, currentPlan, allPages, shapeTabs, isMultiShape,
          totalSheets, effectiveDataMode: dataMode, standardQty, xUpQty,
          selectedPresetId, apiStatus, goAgentPort: GOAGENT_DEFAULT_PORT,
          onProgress: (p) => {
            setProgress(p);
            safeToastLoading(`Đang render PDF... (${p}%)`, toastId);
          },
          onSuccess: (info) => {
            safeToastDismiss(toastId);
            setRenderSuccessModal(info);
          }
        });
      } else {
        await exportLocalPdf({
          config, currentPlan, allPages, shapeTabs, isMultiShape,
          totalSheets, effectiveDataMode: dataMode, standardQty, xUpQty,
          customSvgData, vectorMaskResult, backgroundColor, apiStatus,
          onProgress: (p) => {
            setProgress(p);
            safeToastLoading(`Đang render PDF... (${p}%)`, toastId);
          },
          onSuccess: (info) => {
            safeToastDismiss(toastId);
            setRenderSuccessModal(info);
          }
        });
      }
    } catch (err: any) {
      safeToastDismiss(toastId);
      safeToastError(`Lỗi xuất PDF: ${err.message}`);
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const handleAiArrange = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/arrange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, pages: allPages.map(p => ({ id: p.id, name: p.name })) })
      });
      const data = await res.json();
      setAiResult(data);
      if (data.orderedPages) {
        setAiPreviewPages(data.orderedPages);
      }
    } catch (err: any) {
      safeToastError(`Lỗi AI: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiResult = () => {
    if (aiPreviewPages.length > 0) {
      setAllPages(aiPreviewPages);
      setIsAiModalOpen(false);
      safeToastSuccess('Đã áp dụng kết quả sắp xếp từ AI');
    }
  };

  return {
    isGenerating,
    progress,
    aiPrompt,
    setAiPrompt,
    aiLoading,
    aiPreviewPages,
    aiResult,
    uploadProgress,
    skipThumbnails,
    setSkipThumbnails,
    handleSourceImageSelect,
    handleMultiFileUpload,
    handleFileFromManager,
    confirmDownloadPDF,
    handleAiArrange,
    applyAiResult
  };
}
