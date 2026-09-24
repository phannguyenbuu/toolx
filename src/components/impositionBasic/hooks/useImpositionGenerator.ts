import React, { useState, useEffect, useCallback } from 'react';
import { generatePdfAsync, downloadPdfBlob } from '../../../utils/pdfAsync';
import { generateCutSVG, LayoutPlan } from '../../../utils/layoutSolver';
import { fileService } from '../../../services/fileService';
import { ImpositionConfig, ManualRotateType, PreviewImages, ApiStatus, IccProfile, ImpositionHistoryItem } from '../types';
import { validatePdfPageCount, fetchRenderPreview } from '../helpers/pdfPreviewRenderer';
import { fetchIccProfiles, checkPythonServiceHealth } from '../helpers/iccProfileService';

interface UseImpositionGeneratorProps {
  config: ImpositionConfig;
  manualRotate: ManualRotateType;
  currentPlan: LayoutPlan | null;
  sheets: number;
  onAddHistoryItem?: (item: ImpositionHistoryItem) => void;
}

export function useImpositionGenerator({
  config,
  manualRotate,
  currentPlan,
  sheets,
  onAddHistoryItem
}: UseImpositionGeneratorProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewImages, setPreviewImages] = useState<PreviewImages | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Advanced Color Management states
  const [iccProfiles, setIccProfiles] = useState<IccProfile[]>([]);
  const [isLoadingIccProfiles, setIsLoadingIccProfiles] = useState(false);

  // Health check
  useEffect(() => {
    const check = async () => {
      const ok = await checkPythonServiceHealth();
      setApiStatus(ok ? 'online' : 'offline');
    };
    check();
    const iv = setInterval(check, 30000);
    return () => clearInterval(iv);
  }, []);

  // Load ICC profiles on component mount
  useEffect(() => {
    if (apiStatus !== 'online') return;

    let isMounted = true;
    setIsLoadingIccProfiles(true);
    fetchIccProfiles()
      .then((profiles) => {
        if (isMounted) setIccProfiles(profiles);
      })
      .catch((err) => {
        console.error('Error loading ICC profiles:', err);
        if (isMounted) setIccProfiles([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingIccProfiles(false);
      });

    return () => {
      isMounted = false;
    };
  }, [apiStatus]);

  // Fetch preview from server when file or config changes
  const fetchPreview = useCallback(async () => {
    if (!uploadedFile || apiStatus !== 'online') return;

    setIsLoadingPreview(true);
    try {
      const images = await fetchRenderPreview(uploadedFile, config, manualRotate);
      setPreviewImages(images);
    } catch (err: any) {
      console.warn('Preview fetch failed:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [uploadedFile, config, manualRotate, apiStatus]);

  // Re-fetch preview when relevant config changes
  useEffect(() => {
    if (uploadedFile) {
      const t = setTimeout(fetchPreview, 300);
      return () => clearTimeout(t);
    }
  }, [fetchPreview, uploadedFile]);

  // Handle local file upload
  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const ext = f.name.toLowerCase().split('.').pop();
    if (!validTypes.includes(f.type) && !['pdf', 'jpg', 'jpeg', 'png'].includes(ext || '')) {
      alert('Loại file không hợp lệ! Chấp nhận: PDF, JPG, PNG');
      e.target.value = '';
      return;
    }

    const maxSize = 200 * 1024 * 1024; // 200MB
    if (f.size > maxSize) {
      alert(`File quá lớn! Kích thước tối đa: 200MB (file hiện tại: ${(f.size / 1024 / 1024).toFixed(1)}MB)`);
      e.target.value = '';
      return;
    }

    if (ext === 'pdf') {
      setIsLoadingPreview(true);
      try {
        const pageCount = await validatePdfPageCount(f);
        if (pageCount > 1) {
          alert(`PDF phải có 1 trang duy nhất!\n(File hiện có ${pageCount} trang)`);
          e.target.value = '';
          setUploadedFile(null);
          setPreviewImages(null);
          setIsLoadingPreview(false);
          return;
        }
      } catch (err: any) {
        alert('Không đọc được file PDF. Vui lòng thử file khác.');
        e.target.value = '';
        setUploadedFile(null);
        setPreviewImages(null);
        setIsLoadingPreview(false);
        return;
      }
      setIsLoadingPreview(false);
    }

    setUploadedFile(f);
    setPreviewImages(null);
  }, []);

  const handleFileFromManager = useCallback((file: File) => {
    setUploadedFile(file);
    setPreviewImages(null);
  }, []);

  // Build FormData for PDF generation
  const buildPdfFormData = useCallback(() => {
    if (!currentPlan || !uploadedFile) return null;

    const fd = new FormData();
    fd.append('file', uploadedFile);
    fd.append('planData', JSON.stringify(currentPlan.items));
    fd.append('pagesData', JSON.stringify([{ rotation: 0, w: 0, h: 0 }]));
    fd.append('pageW', String(config.pageW));
    fd.append('pageH', String(config.pageH));
    fd.append('itemW', String(config.itemW));
    fd.append('itemH', String(config.itemH));
    fd.append('dpi', String(config.dpi));
    fd.append('fitMode', config.fitMode);
    fd.append('colorMode', config.colorMode);
    fd.append('useCrop', config.useCrop ? '1' : '0');
    fd.append('cropLen', String(config.cropLen));
    fd.append('cropDist', String(config.cropDist));
    fd.append('cropThick', String(config.cropThick));
    fd.append('cropColor', config.cropColor);
    fd.append('totalOrder', String(config.totalOrder));
    fd.append('processMode', config.processMode);
    fd.append('autoRotate', config.autoRotate ? '1' : '0');
    fd.append('shape', config.shape);
    fd.append('totalSheets', String(sheets));

    fd.append('useAdvancedColor', config.useAdvancedColor ? '1' : '0');
    if (config.useAdvancedColor) {
      fd.append('sourceIcc', config.sourceIcc);
      fd.append('icc1', config.icc1);
      fd.append('iccOutput', config.iccOutput);
    }

    return fd;
  }, [config, currentPlan, uploadedFile, sheets]);

  // Download SVG
  const dlSVG = useCallback(() => {
    if (!currentPlan) return;
    const effectiveItemH = config.shape === 'circle' ? config.itemW : config.itemH;
    const svg = generateCutSVG(
      currentPlan.items,
      config.pageW,
      config.pageH,
      config.itemW,
      effectiveItemH,
      config.shape,
      config.cutBleed,
      config.cornerRadius
    );
    const b = new Blob([svg], { type: 'image/svg+xml' });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u;
    a.download = 'cut.svg';
    a.click();
    URL.revokeObjectURL(u);
  }, [currentPlan, config]);

  // Download PDF
  const dlPDF = useCallback(async () => {
    if (!uploadedFile || !currentPlan) {
      alert('Vui lòng tải file lên trước!');
      return;
    }
    const fd = buildPdfFormData();
    if (!fd) return;

    setIsGenerating(true);
    setProgress(0);
    try {
      const blob = await generatePdfAsync(fd, {
        onProgress: (p) => setProgress(p),
        onStatusChange: (status) => console.log('PDF status:', status)
      });

      await downloadPdfBlob(blob, 'print.pdf');
      setProgress(100);

      if (onAddHistoryItem) {
        onAddHistoryItem({
          id: String(Date.now()),
          timestamp: Date.now(),
          date: new Date().toLocaleString('vi-VN'),
          title: uploadedFile.name,
          paperW: config.pageW,
          pageH: config.pageH,
          itemW: config.itemW,
          itemH: config.itemH,
          layoutCount: currentPlan.qty,
          totalSheets: sheets,
          processMode: config.processMode,
          colorMode: config.colorMode,
          status: 'completed',
          configSnapshot: { ...config }
        });
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setProgress(0);
      }, 500);
    }
  }, [uploadedFile, currentPlan, buildPdfFormData, config, sheets, onAddHistoryItem]);

  // Save output PDF to File Manager
  const saveToFileManager = useCallback(async () => {
    if (!currentPlan || !uploadedFile || apiStatus !== 'online') return;
    const fd = buildPdfFormData();
    if (!fd) return;

    setIsSaving(true);
    try {
      const blob = await generatePdfAsync(fd, {
        onProgress: (p) => setProgress(p)
      });

      const pdfFile = new File([blob], `imposition_${Date.now()}.pdf`, { type: 'application/pdf' });
      await fileService.uploadFile(pdfFile, 'PDF');
      alert('Đã lưu PDF vào Quản lý tệp!');

      if (onAddHistoryItem) {
        onAddHistoryItem({
          id: String(Date.now()),
          timestamp: Date.now(),
          date: new Date().toLocaleString('vi-VN'),
          title: uploadedFile.name,
          paperW: config.pageW,
          pageH: config.pageH,
          itemW: config.itemW,
          itemH: config.itemH,
          layoutCount: currentPlan.qty,
          totalSheets: sheets,
          processMode: config.processMode,
          colorMode: config.colorMode,
          status: 'completed',
          configSnapshot: { ...config }
        });
      }
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  }, [currentPlan, uploadedFile, apiStatus, buildPdfFormData, config, sheets, onAddHistoryItem]);

  const resetGenerator = useCallback(() => {
    setUploadedFile(null);
    setPreviewImages(null);
    setIsGenerating(false);
    setProgress(0);
  }, []);

  return {
    uploadedFile,
    setUploadedFile,
    previewImages,
    isLoadingPreview,
    apiStatus,
    isGenerating,
    progress,
    isFilePickerOpen,
    setIsFilePickerOpen,
    isSaving,
    iccProfiles,
    isLoadingIccProfiles,
    handleFile,
    handleFileFromManager,
    dlSVG,
    dlPDF,
    saveToFileManager,
    resetGenerator
  };
}
