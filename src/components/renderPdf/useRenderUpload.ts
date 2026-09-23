import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  RenderDocItem,
  RenderNode,
  RenderSuccessModalState,
  SlicingWarningInfo
} from './types';
import { saveFullPreview, createThumbnailBase64 } from './renderPdfStorage';
import { renderPdfViaGoAgent, GoAgentInfo, GOAGENT_DEFAULT_PORT } from '../../services/goAgentService';
import { AdvancedRenderSettings } from '../RenderSettingsModal';
import { RenderColorProfile } from '../../types/renderProfile';
import { getPendingRenderBlob, clearPendingRenderBlob, PendingRenderJobMeta } from '../../services/pendingRenderService';
import { analyzeUploadedFile } from './uploadAnalysis';

export interface UseRenderUploadOptions {
  apiBase: string;
  effectiveEngine: 'goagent' | 'server';
  selectedRenderNodeUid: string;
  renderNodes: RenderNode[];
  goAgentInfo: GoAgentInfo | null;
  advancedSettings: AdvancedRenderSettings;
  setAdvancedSettings: React.Dispatch<React.SetStateAction<AdvancedRenderSettings>>;
  cloudDpi: number;
  setCloudDpi: (dpi: number) => void;
  colorspace: 'cmyk' | 'rgb';
  setColorspace: (cs: 'cmyk' | 'rgb') => void;
  selectedProfile: string;
  useIcc: boolean;
  compression: string;
  convertToPdf: boolean;
  setConvertToPdf: (v: boolean) => void;
  setDpiOptions: (opts: Array<{ value: number; label: string }>) => void;
  activeProfile: RenderColorProfile;
  handleSelectProfileById: (id: string) => void;
  fetchDocuments: (isSilent?: boolean) => Promise<void>;
  setDocuments: React.Dispatch<React.SetStateAction<RenderDocItem[]>>;
  setTotalCount: React.Dispatch<React.SetStateAction<number>>;
  setRenderEngine: (engine: 'auto' | 'goagent' | 'server') => void;
  setSelectedRenderNodeUid: (uid: string) => void;
}

export function useRenderUpload({
  apiBase,
  effectiveEngine,
  selectedRenderNodeUid,
  renderNodes,
  goAgentInfo,
  advancedSettings,
  setAdvancedSettings,
  cloudDpi,
  setCloudDpi,
  colorspace,
  setColorspace,
  selectedProfile,
  useIcc,
  compression,
  convertToPdf,
  setConvertToPdf,
  setDpiOptions,
  activeProfile,
  handleSelectProfileById,
  fetchDocuments,
  setDocuments,
  setTotalCount,
  setRenderEngine,
  setSelectedRenderNodeUid
}: UseRenderUploadOptions) {
  const [cloudFile, setCloudFile] = useState<File | null>(null);
  const [cloudFileName, setCloudFileName] = useState<string>('');
  const [pdfPageDimensions, setPdfPageDimensions] = useState<string>('');
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [localRenderingProgress, setLocalRenderingProgress] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [slicingWarning, setSlicingWarning] = useState<SlicingWarningInfo | null>(null);

  const [renderSuccessModal, setRenderSuccessModal] = useState<RenderSuccessModalState>({
    isOpen: false,
    filename: '',
    totalPages: 1,
    durationSec: '0.0s',
    dpi: 300,
    colorspace: 'CMYK',
    downloadUrl: '',
    previewUrl: '',
    isPdf: false,
    engineName: 'Render Engine'
  });

  const cloudFileInputRef = useRef<HTMLInputElement>(null);
  const clientPreviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const handleCloudSubmitRef = useRef<((e?: React.FormEvent, fileOverride?: File) => Promise<void>) | null>(null);

  const processSelectedFile = async (file: File) => {
    if (!file) return;

    setCloudFile(file);
    setCloudFileName(file.name);
    setUploadError(null);

    try {
      const result = await analyzeUploadedFile(file, clientPreviewCanvasRef.current);
      setPdfPageDimensions(result.dimensions);
      setDpiOptions(result.dpiOptions);
      setCloudDpi(result.recommendedDpi);
      setSlicingWarning(result.slicingWarning);

      if (result.isPdf) {
        setConvertToPdf(true);
        setAdvancedSettings((prev) => ({ ...prev, outputFormat: 'pdf' }));
      }

      if (result.shouldRecommendGcr22) {
        try {
          handleSelectProfileById('preset_gcr_22');
        } catch (selErr) {
          console.warn('Không thể tự động kích hoạt preset_gcr_22:', selErr);
        }
      }
    } catch (err) {
      console.warn('Lỗi phân tích tệp:', err);
    }
  };

  const handleCloudFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await processSelectedFile(file);
    }
  };

  const submitToWorkstationServer = async (fileOverride?: File) => {
    const targetFile = fileOverride || cloudFile;
    if (!targetFile) return;
    try {
      const activeDpi = advancedSettings.isCustomDpi ? advancedSettings.customDpi : cloudDpi;
      const formData = new FormData();
      formData.append('file', targetFile);
      formData.append('dpi', String(activeDpi));
      if (advancedSettings.useIcc || useIcc) {
        formData.append('use_icc', 'on');
        formData.append('colorspace', advancedSettings.colorspace || colorspace);
        formData.append('profile', advancedSettings.iccProfile || selectedProfile);
        formData.append('rendering_intent', advancedSettings.renderingIntent || 'relative_colorimetric');
      }
      formData.append('compression', advancedSettings.compression || compression);
      formData.append('format', advancedSettings.outputFormat || 'tiff');
      formData.append('anti_aliasing', advancedSettings.antiAliasing || 'high');
      formData.append('no_tiling', advancedSettings.noTiling ? 'on' : 'off');
      formData.append('transparent_bg', advancedSettings.transparentBg ? 'on' : 'off');
      formData.append('jpeg_quality', String(advancedSettings.jpegQuality || 95));
      formData.append('gcr_level', String(advancedSettings.gcrLevel ?? 100));
      if (advancedSettings.pageRangeMode === 'first') {
        formData.append('page_range', '1');
      } else if (advancedSettings.pageRangeMode === 'custom' && advancedSettings.customPageRange) {
        formData.append('page_range', advancedSettings.customPageRange);
      }
      if (advancedSettings.outputFormat === 'pdf' || convertToPdf || targetFile.name.toLowerCase().endsWith('.pdf')) {
        formData.append('convert_to_pdf', 'on');
      }
      if (selectedRenderNodeUid && selectedRenderNodeUid !== 'auto') {
        formData.append('render_node_uid', selectedRenderNodeUid);
      }

      const res = await fetch(`${apiBase}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error(`Máy trạm báo lỗi HTTP: ${res.status}`);
      }

      setCloudFile(null);
      setCloudFileName('');
      setPdfPageDimensions('');
      setSlicingWarning(null);
      if (cloudFileInputRef.current) cloudFileInputRef.current.value = '';

      await fetchDocuments();
      const targetNode = renderNodes.find((n) => n.agent_uid === selectedRenderNodeUid);
      const nodeLabel = targetNode
        ? `${targetNode.hostname} • ${targetNode.public_ip || targetNode.local_ip || targetNode.agent_uid}`
        : 'Tự động điều phối';
      toast.success(`Đã thêm tệp vào hàng đợi Máy trạm Server (${nodeLabel}) thành công!`);
    } catch (err: any) {
      console.error('Lỗi tải lên máy trạm:', err);
      setUploadError(err.message || 'Không thể kết nối đến máy trạm render.');
      toast.error(`Lỗi máy trạm server: ${err.message}`);
    }
  };

  const handleCloudSubmit = async (e?: React.FormEvent, fileOverride?: File) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    const targetFile = fileOverride || cloudFile;
    if (!targetFile) {
      toast.error('Vui lòng chọn tệp (PDF, Vector hoặc Hình ảnh) trước khi tải lên.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    // TRƯỜNG HỢP 1: CÓ TOOLXAGENT TRÊN PC -> BƠM CODE EXEC XỬ LÝ TRỰC TIẾP TRÊN MÁY NÀY
    if (effectiveEngine === 'goagent') {
      try {
        setLocalRenderingProgress('Đang bơm code exec vào ToolxAgent...');
        const activeDpi = advancedSettings.isCustomDpi ? advancedSettings.customDpi : cloudDpi;
        const pageRangeParam = advancedSettings.pageRangeMode === 'first'
          ? 'first'
          : (advancedSettings.pageRangeMode === 'custom' && advancedSettings.customPageRange ? advancedSettings.customPageRange : 'all');

        const res = await renderPdfViaGoAgent(targetFile, {
          dpi: activeDpi,
          colorspace: advancedSettings.colorspace || colorspace,
          maxPages: advancedSettings.maxPages || 50,
          port: goAgentInfo?.port || GOAGENT_DEFAULT_PORT,
          transparentBg: advancedSettings.transparentBg || false,
          pageRange: pageRangeParam
        });

        const firstPage = res.pages[0];
        const previewUrl = firstPage?.preview_b64 || '';

        let finalDownloadUrl = previewUrl;
        const isPdfResult = Boolean(res.pdf_b64 || advancedSettings.outputFormat === 'pdf' || convertToPdf || targetFile.name.toLowerCase().endsWith('.pdf'));

        if (res.pdf_b64) {
          try {
            const base64Clean = res.pdf_b64.replace(/^data:application\/pdf;base64,/, '');
            const byteChars = atob(base64Clean);
            const byteNumbers = new Uint8Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) {
              byteNumbers[i] = byteChars.charCodeAt(i);
            }
            const blob = new Blob([byteNumbers], { type: 'application/pdf' });
            finalDownloadUrl = URL.createObjectURL(blob);
          } catch (blobErr) {
            console.warn('Lỗi tạo PDF Blob:', blobErr);
            finalDownloadUrl = res.pdf_b64;
          }
        }

        const currentAgent = goAgentInfo?.agent_uid || 'administrator';
        const currentPc = goAgentInfo?.pc_name || 'Administrator';
        const agentDisplayName = `${currentAgent} (${currentPc})`;

        const newDoc: RenderDocItem = {
          id: `goagent_${Date.now()}`,
          filename: targetFile.name,
          dpi: activeDpi,
          colorspace: (advancedSettings.colorspace || colorspace).toUpperCase(),
          compression: isPdfResult
            ? 'PDF (Vector/Prepress)'
            : (advancedSettings.outputFormat === 'png'
                ? 'PNG (Lossless)'
                : `${(advancedSettings.outputFormat || 'TIFF').toUpperCase()} (${(advancedSettings.compression || 'lzw').toUpperCase()})`),
          created_at: `${new Date().toLocaleTimeString('vi-VN')} (${agentDisplayName})`,
          duration: `${res.duration_ms ? (res.duration_ms / 1000).toFixed(2) + 's' : '0.5s'} (Cục bộ)`,
          status: 'completed',
          preview_url: previewUrl,
          download_url: finalDownloadUrl,
          convert_to_pdf: isPdfResult,
          profile_name: activeProfile.name || 'Mặc định'
        };

        setDocuments((prev) => [newDoc, ...prev]);
        setTotalCount((c) => c + 1);

        try {
          if (previewUrl) {
            await saveFullPreview(newDoc.id, previewUrl);
          }
          const thumbUrl = await createThumbnailBase64(previewUrl, 120);
          const docForStorage: RenderDocItem = {
            ...newDoc,
            thumbnail_url: thumbUrl,
            preview_url: thumbUrl,
            download_url: ''
          };
          const cached: RenderDocItem[] = JSON.parse(localStorage.getItem('goagent_rendered_docs') || '[]');
          const updated = [docForStorage, ...cached.filter((c) => c.id !== docForStorage.id)].slice(0, 30);
          try {
            localStorage.setItem('goagent_rendered_docs', JSON.stringify(updated));
          } catch (quotaErr) {
            console.warn('QuotaExceeded khi lưu goagent_rendered_docs, đang dọn bớt mục cũ...');
            for (const limit of [15, 8, 3, 1]) {
              try {
                localStorage.setItem('goagent_rendered_docs', JSON.stringify(updated.slice(0, limit)));
                break;
              } catch {}
            }
          }
        } catch (e) {
          console.warn('Lỗi lưu goagent_rendered_docs:', e);
        }

        try {
          localStorage.setItem('toolx_last_imposition_render', JSON.stringify({
            id: newDoc.id,
            filename: newDoc.filename,
            previewUrl: previewUrl,
            downloadUrl: finalDownloadUrl,
            createdAt: newDoc.created_at,
            duration: newDoc.duration,
            status: 'completed',
            isPdf: isPdfResult
          }));
        } catch {}

        setCloudFile(null);
        setCloudFileName('');
        setPdfPageDimensions('');
        setSlicingWarning(null);
        if (cloudFileInputRef.current) cloudFileInputRef.current.value = '';

        const durationFormatted = `${res.duration_ms ? (res.duration_ms / 1000).toFixed(1) : '0.5'}s`;

        setRenderSuccessModal({
          isOpen: true,
          filename: targetFile.name,
          totalPages: res.total_pages || 1,
          durationSec: durationFormatted,
          dpi: activeDpi,
          colorspace: (advancedSettings.colorspace || colorspace).toUpperCase(),
          downloadUrl: finalDownloadUrl,
          previewUrl: previewUrl,
          isPdf: isPdfResult,
          engineName: agentDisplayName
        });
      } catch (err: any) {
        console.warn('Lỗi xử lý qua ToolxAgent, tự động chuyển về máy trạm server:', err);
        setLocalRenderingProgress(`ToolxAgent: ${err.message}. Tự động chuyển tiếp máy trạm server...`);
        await submitToWorkstationServer(targetFile);
      } finally {
        setIsUploading(false);
        setLocalRenderingProgress(null);
      }
      return;
    }

    // TRƯỜNG HỢP 2: KHÔNG TÌM THẤY GOAGENT HOẶC DÙNG MOBILE -> MÁY TRẠM SERVER (128GB RAM)
    try {
      await submitToWorkstationServer(targetFile);
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    handleCloudSubmitRef.current = handleCloudSubmit;
  });

  // Tiếp nhận tự động các tác vụ Render được gửi từ phân hệ Bình Trang (/layout)
  useEffect(() => {
    let isCancelled = false;
    const checkPendingRenderJob = async () => {
      try {
        const rawMeta = localStorage.getItem('toolx_pending_render_meta');
        if (!rawMeta) return;
        localStorage.removeItem('toolx_pending_render_meta');
        const meta: PendingRenderJobMeta = JSON.parse(rawMeta);
        const blob = await getPendingRenderBlob(meta.id);
        if (!blob || isCancelled) return;
        await clearPendingRenderBlob(meta.id);

        const file = new File([blob], meta.filename || `Imposition_${Date.now()}.pdf`, { type: 'application/pdf' });

        if (meta.engine) {
          setRenderEngine(meta.engine);
        }
        if (meta.selectedNodeUid) {
          setSelectedRenderNodeUid(meta.selectedNodeUid);
        }
        if (meta.presetSettings) {
          setAdvancedSettings((prev) => ({
            ...prev,
            ...meta.presetSettings
          }));
          if (meta.presetSettings.dpi) setCloudDpi(meta.presetSettings.dpi);
          if (meta.presetSettings.colorspace) setColorspace(meta.presetSettings.colorspace);
        }

        toast.success(`Đã nạp file bình trang từ Layout (${file.name}). Đang bắt đầu render...`);
        await processSelectedFile(file);

        setTimeout(async () => {
          if (!isCancelled) {
            setCloudFile(file);
            setCloudFileName(file.name);
            if (handleCloudSubmitRef.current) {
              await handleCloudSubmitRef.current(undefined, file);
            }
          }
        }, 400);
      } catch (err) {
        console.warn('Lỗi đọc pending render job:', err);
      }
    };
    checkPendingRenderJob();
    return () => {
      isCancelled = true;
    };
  }, []);

  return {
    cloudFile,
    setCloudFile,
    cloudFileName,
    setCloudFileName,
    pdfPageDimensions,
    slicingWarning,
    isDraggingOver,
    isUploading,
    localRenderingProgress,
    uploadError,
    renderSuccessModal,
    setRenderSuccessModal,
    cloudFileInputRef,
    clientPreviewCanvasRef,
    processSelectedFile,
    handleCloudFileSelect,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleCloudSubmit
  };
}
