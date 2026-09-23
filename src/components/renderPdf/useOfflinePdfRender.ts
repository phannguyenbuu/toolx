import { useState, useRef, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { jsPDF } from 'jspdf';
import { OfflinePageMeta } from './types';
import { RenderColorProfile } from '../../types/renderProfile';
import { applyColorAdjustments, isDefaultColorSettings } from '../../utils/colorAdjustment';

// Cấu hình PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

export interface UseOfflinePdfRenderProps {
  activeProfile?: RenderColorProfile;
  offlineModalOpen?: boolean;
  initialFile?: File | null;
}

export function useOfflinePdfRender(props: UseOfflinePdfRenderProps | File | null = {}) {
  const isPropsObj = Boolean(props && !(props instanceof File));
  const activeProfile = isPropsObj && 'activeProfile' in (props as any) ? (props as UseOfflinePdfRenderProps).activeProfile : undefined;
  const offlineModalOpen = Boolean(isPropsObj && 'offlineModalOpen' in (props as any) ? (props as UseOfflinePdfRenderProps).offlineModalOpen : false);
  const initialFile = props instanceof File ? props : (isPropsObj && 'initialFile' in (props as any) ? (props as UseOfflinePdfRenderProps).initialFile : null);
  const [offlineFileName, setOfflineFileName] = useState<string>('');
  const [offlineFileSize, setOfflineFileSize] = useState<string>('');
  const [offlinePdfDoc, setOfflinePdfDoc] = useState<any>(null);
  const [offlineTotalPages, setOfflineTotalPages] = useState<number>(0);
  const [offlineCurrentPage, setOfflineCurrentPage] = useState<number>(1);
  const [offlinePagesMeta, setOfflinePagesMeta] = useState<OfflinePageMeta[]>([]);
  const [offlineDpi, setOfflineDpi] = useState<72 | 150 | 300 | 600>(300);
  const [offlineZoom, setOfflineZoom] = useState<number>(1.0);
  const [offlineColorMode, setOfflineColorMode] = useState<'rgb' | 'cmyk-sim' | 'grayscale'>('rgb');
  const [offlineFormat, setOfflineFormat] = useState<'png' | 'jpeg'>('png');
  const [offlineJpegQuality, setOfflineJpegQuality] = useState<number>(90);
  const [offlineTransparentBg, setOfflineTransparentBg] = useState<boolean>(false);
  const [offlineIsRendering, setOfflineIsRendering] = useState<boolean>(false);
  const [isExportingAllPages, setIsExportingAllPages] = useState<boolean>(false);
  const [exportProgressText, setExportProgressText] = useState<string>('');

  const offlineCanvasRef = useRef<HTMLCanvasElement>(null);
  const offlineRenderTaskRef = useRef<any>(null);
  const offlineFileInputRef = useRef<HTMLInputElement>(null);

  const getOfflineScale = useCallback((targetDpi: 72 | 150 | 300 | 600) => {
    return targetDpi / 72;
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTimestampSuffix = (): string => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  };

  const rasterImageToPdfBytes = async (file: File): Promise<Uint8Array> => {
    const imgUrl = URL.createObjectURL(file);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Không thể đọc dữ liệu hình ảnh.'));
        img.src = imgUrl;
      });

      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Không thể khởi tạo Canvas 2D context');
      ctx.drawImage(img, 0, 0);

      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (!blob) throw new Error('Không thể tạo dữ liệu PNG từ ảnh');
      const pngBytes = await blob.arrayBuffer();

      const pdfDoc = await PDFDocument.create();
      const embeddedImage = await pdfDoc.embedPng(pngBytes);
      const page = pdfDoc.addPage([width, height]);
      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width,
        height
      });

      return await pdfDoc.save();
    } finally {
      URL.revokeObjectURL(imgUrl);
    }
  };

  const processOfflineFile = async (file: File) => {
    try {
      setOfflineIsRendering(true);
      setOfflineFileName(file.name);
      setOfflineFileSize(formatBytes(file.size));

      let dataForPdf: Uint8Array | ArrayBuffer;
      const isRaster = /\.(png|jpe?g|webp|bmp|tiff?|gif|avif)$/i.test(file.name);
      if (isRaster) {
        dataForPdf = await rasterImageToPdfBytes(file);
      } else {
        dataForPdf = await file.arrayBuffer();
      }

      const loadingTask = pdfjsLib.getDocument({ data: dataForPdf });
      const doc = await loadingTask.promise;

      setOfflinePdfDoc(doc);
      setOfflineTotalPages(doc.numPages);
      setOfflineCurrentPage(1);

      const metaList: OfflinePageMeta[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale: 1.0 });
        const widthPt = vp.width;
        const heightPt = vp.height;
        const widthMm = Math.round(((widthPt * 25.4) / 72) * 10) / 10;
        const heightMm = Math.round(((heightPt * 25.4) / 72) * 10) / 10;

        const thumbVp = page.getViewport({ scale: 0.2 });
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = thumbVp.width;
        thumbCanvas.height = thumbVp.height;
        const thumbCtx = thumbCanvas.getContext('2d');
        let thumbUrl = '';
        if (thumbCtx) {
          await page.render({ canvasContext: thumbCtx, viewport: thumbVp }).promise;
          if (activeProfile?.colorFilterEnabled && activeProfile?.colorSettings && !isDefaultColorSettings(activeProfile.colorSettings)) {
            const tData = thumbCtx.getImageData(0, 0, thumbCanvas.width, thumbCanvas.height);
            applyColorAdjustments(tData, thumbCtx, activeProfile.colorSettings);
          }
          thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.6);
        }

        metaList.push({
          pageNumber: i,
          widthPt,
          heightPt,
          widthMm,
          heightMm,
          thumbnailUrl: thumbUrl
        });
      }

      setOfflinePagesMeta(metaList);
    } catch (err: any) {
      toast.error('Không thể đọc file PDF: ' + err.message);
    } finally {
      setOfflineIsRendering(false);
      if (offlineFileInputRef.current) offlineFileInputRef.current.value = '';
    }
  };

  const handleOfflineFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processOfflineFile(file);
    }
  };

  useEffect(() => {
    if (initialFile && offlineModalOpen && !offlinePdfDoc) {
      void processOfflineFile(initialFile);
    }
  }, [initialFile, offlineModalOpen, offlinePdfDoc]);

  const renderOfflineCurrentPage = useCallback(async () => {
    if (!offlinePdfDoc || !offlineCanvasRef.current) return;

    if (offlineRenderTaskRef.current) {
      try {
        offlineRenderTaskRef.current.cancel();
      } catch (e) {}
    }

    try {
      setOfflineIsRendering(true);
      const page = await offlinePdfDoc.getPage(offlineCurrentPage);
      const scale = getOfflineScale(offlineDpi) * offlineZoom;
      const viewport = page.getViewport({ scale });

      const canvas = offlineCanvasRef.current;
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (!offlineTransparentBg) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      const task = page.render({
        canvasContext: ctx,
        viewport,
        background: offlineTransparentBg ? 'transparent' : '#ffffff'
      });
      offlineRenderTaskRef.current = task;
      await task.promise;

      if (offlineColorMode === 'grayscale') {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        }
        ctx.putImageData(imgData, 0, 0);
      } else if (offlineColorMode === 'cmyk-sim') {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, data[i] * 0.96);
          data[i + 1] = Math.min(255, data[i + 1] * 0.94);
          data[i + 2] = Math.min(255, data[i + 2] * 0.92);
        }
        ctx.putImageData(imgData, 0, 0);
      }

      if (activeProfile?.colorFilterEnabled && activeProfile?.colorSettings && !isDefaultColorSettings(activeProfile.colorSettings)) {
        const renderImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        applyColorAdjustments(renderImgData, ctx, activeProfile.colorSettings);
      }
    } catch (err: any) {
      if (err.name !== 'RenderingCancelledException') {
        console.warn('Lỗi render:', err);
      }
    } finally {
      setOfflineIsRendering(false);
    }
  }, [offlinePdfDoc, offlineCurrentPage, offlineDpi, offlineZoom, offlineColorMode, offlineTransparentBg, getOfflineScale, activeProfile]);

  useEffect(() => {
    if (offlineModalOpen) {
      renderOfflineCurrentPage();
    }
  }, [offlineModalOpen, renderOfflineCurrentPage]);

  const handleExportAllPagesCalibrated = async () => {
    if (!offlinePdfDoc) {
      toast.error('Vui lòng tải lên file PDF trước khi xuất.');
      return;
    }

    setIsExportingAllPages(true);
    try {
      const numPages = offlinePdfDoc.numPages;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      for (let i = 1; i <= numPages; i++) {
        setExportProgressText(`Đang kết xuất & cân màu trang ${i}/${numPages}...`);
        const page = await offlinePdfDoc.getPage(i);
        const scale = getOfflineScale(offlineDpi);
        const vp = page.getViewport({ scale });

        const offCanvas = document.createElement('canvas');
        offCanvas.width = Math.round(vp.width);
        offCanvas.height = Math.round(vp.height);
        const offCtx = offCanvas.getContext('2d');
        if (!offCtx) continue;

        if (!offlineTransparentBg) {
          offCtx.fillStyle = '#ffffff';
          offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);
        }

        await page.render({
          canvasContext: offCtx,
          viewport: vp,
          background: offlineTransparentBg ? 'transparent' : '#ffffff'
        }).promise;

        if (activeProfile?.colorFilterEnabled && activeProfile?.colorSettings && !isDefaultColorSettings(activeProfile.colorSettings)) {
          const srcData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
          applyColorAdjustments(srcData, offCtx, activeProfile.colorSettings);
        }

        const imgDataUrl = offCanvas.toDataURL('image/jpeg', 0.95);
        const pageMeta = offlinePagesMeta[i - 1];
        const widthMm = pageMeta ? pageMeta.widthMm : 210;
        const heightMm = pageMeta ? pageMeta.heightMm : 297;
        const orientation = widthMm > heightMm ? 'landscape' : 'portrait';

        if (i === 1) {
          pdf.deletePage(1);
          pdf.addPage([widthMm, heightMm], orientation);
        } else {
          pdf.addPage([widthMm, heightMm], orientation);
        }

        pdf.addImage(imgDataUrl, 'JPEG', 0, 0, widthMm, heightMm, undefined, 'FAST');
      }

      const baseName = offlineFileName.replace(/\.[^/.]+$/, '');
      const cleanProfile = (activeProfile?.name || 'Default').replace(/[^a-zA-Z0-9_-]/g, '_');
      const timestamp = getTimestampSuffix();
      pdf.save(`${baseName}_can_mau_${cleanProfile}_${timestamp}.pdf`);
      toast.success(`Đã xuất thành công toàn bộ ${numPages} trang đã cân màu theo Profile "${activeProfile?.name || 'Mặc định'}"!`);
    } catch (err: any) {
      console.error('Lỗi xuất PDF toàn bộ trang:', err);
      toast.error('Không thể xuất PDF: ' + err.message);
    } finally {
      setIsExportingAllPages(false);
      setExportProgressText('');
    }
  };

  const handleOfflineDownloadSingle = () => {
    if (!offlineCanvasRef.current) return;
    const canvas = offlineCanvasRef.current;
    const mimeType = offlineFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
    const dataUrl = canvas.toDataURL(mimeType, offlineJpegQuality / 100);

    const a = document.createElement('a');
    const baseName = offlineFileName.replace(/\.[^/.]+$/, '');
    const timestamp = getTimestampSuffix();
    a.download = `${baseName}_trang_${offlineCurrentPage}_${offlineDpi}dpi_${timestamp}.${offlineFormat}`;
    a.href = dataUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return {
    offlineFileName,
    offlineFileSize,
    offlinePdfDoc,
    offlineTotalPages,
    offlineCurrentPage,
    setOfflineCurrentPage,
    offlinePagesMeta,
    offlineDpi,
    setOfflineDpi,
    offlineZoom,
    setOfflineZoom,
    offlineColorMode,
    setOfflineColorMode,
    offlineFormat,
    setOfflineFormat,
    offlineJpegQuality,
    setOfflineJpegQuality,
    offlineTransparentBg,
    setOfflineTransparentBg,
    offlineIsRendering,
    isExportingAllPages,
    exportProgressText,
    offlineCanvasRef,
    offlineFileInputRef,
    processOfflineFile,
    handleOfflineFileUpload,
    renderOfflineCurrentPage,
    handleExportAllPagesCalibrated,
    handleOfflineDownloadSingle
  };
}
