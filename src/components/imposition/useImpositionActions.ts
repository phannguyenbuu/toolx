import React, { useState } from 'react';
import { ImpositionConfig, ShapeTabItem, PageItem, DataMode } from './types';
import { LayoutPlan } from '../../utils/layoutSolver';
import { VectorMaskResult } from '../VectorMaskEditorModal';
import { RenderSuccessInfo } from './modals/ImpositionRenderSuccessModal';
import { safeToastSuccess, safeToastError } from './impositionHelpers';
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
  const [renderStatusText, setRenderStatusText] = useState('Đang render PDF...');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPreviewPages, setAiPreviewPages] = useState<PageItem[]>([]);
  const [aiResult, setAiResult] = useState<any>(null);
  const [uploadProgress, setUploadProgress] = useState({ show: false, current: 0, total: 0, percent: 0 });
  const [skipThumbnails, setSkipThumbnails] = useState(false);

  const handleSourceImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      const newPages: PageItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (isPdfFile(file)) {
          const pages = await extractPdfPages(file);
          pages.forEach((page, pIdx) => {
            newPages.push({
              id: `pdf-${Date.now()}-${i}-${pIdx}`,
              file,
              fileIndex: i,
              pageIndex: page.pageIndex,
              thumb: page.thumbUrl,
              originalThumb: page.dataUrl,
              baseThumb: page.dataUrl,
              name: page.name,
              w: page.widthMm || config.itemW,
              h: page.heightMm || config.itemH,
              rotation: 0
            });
          });
        } else {
          const url = URL.createObjectURL(file);
          const thumb = await createClientThumbnail(file, 320);
          const dims = await new Promise<{ w: number; h: number }>((resolve) => {
            const img = new Image();
            img.onload = async () => {
              const d = await calculateStandardImageDimensionsMm(img.naturalWidth, img.naturalHeight, file);
              resolve(d);
            };
            img.onerror = () => resolve({ w: config.itemW, h: config.itemH });
            img.src = url;
          });
          newPages.push({
            id: `img-${Date.now()}-${i}`,
            name: file.name,
            file,
            url,
            thumb: thumb || url,
            originalThumb: url,
            baseThumb: url,
            w: dims.w,
            h: dims.h,
            rotation: 0
          });
        }
      }

      if (newPages.length > 0) {
        if (!activeTab?.sourceImage) {
          updateActiveTabProp({
            sourceImage: newPages[0],
            itemW: newPages[0].w || config.itemW,
            itemH: newPages[0].h || config.itemH
          });
          setConfig(c => ({ ...c, itemW: newPages[0].w || c.itemW, itemH: newPages[0].h || c.itemH }));
        }
        setAllPages(prev => [...prev, ...newPages]);
        safeToastSuccess(`Đã thêm ${newPages.length} ảnh nguồn vào job`);
      }
    } catch (err: any) {
      safeToastError(`Lỗi nạp file: ${err.message}`);
    } finally {
      e.target.value = '';
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
            file: f,
            fileIndex: i,
            pageIndex: page.pageIndex,
            thumb: page.thumbUrl,
            originalThumb: page.dataUrl,
            baseThumb: page.dataUrl,
            name: page.name,
            w: page.widthMm,
            h: page.heightMm,
            rotation: 0
          }));
          loadedPages.push(...pdfItems);
        } else {
          const url = URL.createObjectURL(f);
          const thumb = skipThumbnails ? url : await createClientThumbnail(f, 320);
          loadedPages.push({
            id: `page-${Date.now()}-${i}`,
            file: f,
            name: f.name,
            url,
            thumb: thumb || url,
            originalThumb: url,
            baseThumb: url,
            w: config.itemW,
            h: config.itemH,
            rotation: 0
          });
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
    setRenderStatusText('Đang khởi tạo kết xuất...');
    try {
      if (selectedRenderEngine === 'goagent' && goAgentInfo?.detected) {
        await exportGoAgentPdf({
          config, currentPlan, allPages, shapeTabs, activeTab, isMultiShape,
          totalSheets, effectiveDataMode: dataMode, standardQty, xUpQty,
          selectedPresetId, apiStatus, goAgentPort: GOAGENT_DEFAULT_PORT,
          onProgress: (p) => {
            setProgress(p);
            if (p < 40) setRenderStatusText('Đang chuẩn bị layout GoAgent...');
            else if (p < 90) setRenderStatusText('Đang kết xuất PDF RIP Prepress...');
            else setRenderStatusText('Đang tải file về máy...');
          },
          onSuccess: (info) => {
            setRenderSuccessModal(info);
          }
        });
      } else {
        await exportLocalPdf({
          config, currentPlan, allPages, shapeTabs, activeTab, isMultiShape,
          totalSheets, effectiveDataMode: dataMode, standardQty, xUpQty,
          customSvgData, vectorMaskResult, backgroundColor, apiStatus,
          onProgress: (p) => {
            setProgress(p);
            if (p < 40) setRenderStatusText('Đang xử lý layout & vector...');
            else if (p < 90) setRenderStatusText('Đang kết xuất PDF...');
            else setRenderStatusText('Đang tải file về máy...');
          },
          onSuccess: (info) => {
            setRenderSuccessModal(info);
          }
        });
      }
    } catch (err: any) {
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
    renderStatusText,
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
