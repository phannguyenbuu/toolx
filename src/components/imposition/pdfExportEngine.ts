import { generatePdfAsync, downloadPdfBlob } from '../../utils/pdfAsync';
import { probeGoAgent, renderPdfViaGoAgent, GoAgentInfo, GOAGENT_DEFAULT_PORT } from '../../services/goAgentService';
import { savePendingRenderBlob } from '../../services/pendingRenderService';
import { PlanItem, LayoutPlan } from '../../utils/layoutSolver';
import { ImpositionConfig, ShapeTabItem, PageItem, DataMode, ImpositionStyle } from './types';
import { enrichPlanItemsWithRotation } from './impositionGeometry';
import { RenderSuccessInfo } from './modals/ImpositionRenderSuccessModal';

export { probeGoAgent, renderPdfViaGoAgent, downloadPdfBlob, savePendingRenderBlob, GOAGENT_DEFAULT_PORT };
export type { GoAgentInfo };

export interface GeneratePdfBlobParams {
  targetSheetIndex?: number;
  allPages: PageItem[];
  apiStatus: 'checking' | 'online' | 'offline';
  currentPlan: LayoutPlan | null;
  styledPlan?: LayoutPlan | null;
  config: ImpositionConfig;
  customScale: number;
  backgroundColor: string;
  dataMode: DataMode;
  impositionStyle: ImpositionStyle;
  impositionStyleEnabled: boolean;
  xUpQty: number;
  standardQty: number;
  totalSheets: number;
  shapeTabs: ShapeTabItem[];
  activeTab?: ShapeTabItem;
  isMultiShape: boolean;
  previewSide: 'front' | 'back';
  onProgress?: (progress: number, message: string) => void;
}

/**
 * Tạo PDF Blob từ layout hiện tại — luôn gọi Python backend.
 * Throw lỗi nếu backend offline hoặc không có ảnh nguồn.
 */
export async function generateImpositionPdfBlob(params: GeneratePdfBlobParams): Promise<Blob> {
  const {
    targetSheetIndex,
    allPages,
    apiStatus,
    currentPlan,
    styledPlan,
    config,
    customScale,
    backgroundColor,
    dataMode,
    impositionStyle,
    impositionStyleEnabled,
    xUpQty,
    standardQty,
    totalSheets,
    shapeTabs,
    activeTab,
    isMultiShape,
  } = params;

  // Kiểm tra backend online
  if (apiStatus !== 'online') {
    throw new Error('Backend Python offline — không thể xuất PDF. Vui lòng kiểm tra kết nối máy chủ.');
  }

  if (!currentPlan || !currentPlan.items?.length) {
    throw new Error('Chưa có layout — vui lòng tính toán layout trước khi xuất PDF.');
  }

  // Thu thập tất cả ảnh nguồn từ allPages hoặc từ các layer tabs
  const effectivePages: PageItem[] = [...allPages];
  if (effectivePages.length === 0) {
    if (activeTab?.sourceImage) {
      effectivePages.push(activeTab.sourceImage);
    }
    if (shapeTabs && shapeTabs.length > 0) {
      shapeTabs.forEach(tab => {
        if (tab.sourceImage && !effectivePages.some(p => (p.id && p.id === tab.sourceImage?.id) || p.thumb === tab.sourceImage?.thumb)) {
          effectivePages.push(tab.sourceImage);
        }
      });
    }
  }

  if (effectivePages.length === 0) {
    throw new Error('Chưa có tệp ảnh nào — vui lòng chọn ảnh cho layer hoặc import tệp trước khi xuất PDF.');
  }

  // Build FormData
  const fd = new FormData();

  // Đính kèm ảnh nguồn: ưu tiên fileIds (server đã lưu), fallback fetch blob
  const fileIds = effectivePages.map(p => p.fileId).filter(Boolean);
  if (fileIds.length > 0 && fileIds.length === effectivePages.length) {
    fd.append('fileIds', JSON.stringify(fileIds));
  } else {
    for (let i = 0; i < effectivePages.length; i++) {
      const page = effectivePages[i];
      const imageSource = page.originalThumb || page.thumb || page.url;
      if (!imageSource) continue;
      const response = await fetch(imageSource);
      const blob = await response.blob();
      const isPng = imageSource.startsWith('data:image/png') || blob.type === 'image/png';
      const ext = isPng ? 'png' : 'jpg';
      const mimeType = isPng ? 'image/png' : 'image/jpeg';
      const file = new File([blob], `page_${i}.${ext}`, { type: mimeType });
      fd.append('files', file);
    }
  }

  const pagesDataRaw = effectivePages.map(p => ({
    rotation: p.rotation || 0,
    w: p.w,
    h: p.h
  }));
  fd.append('pagesData', JSON.stringify(pagesDataRaw));

  const rawPlanItems = (impositionStyleEnabled && styledPlan ? styledPlan.items : (currentPlan?.items || []));
  const enrichedPlanItems = enrichPlanItemsWithRotation(
    rawPlanItems,
    effectivePages,
    config,
    isMultiShape,
    shapeTabs,
    dataMode,
    standardQty,
    xUpQty
  );
  fd.append('planData', JSON.stringify(enrichedPlanItems));
  fd.append('pageW', String(config.pageW)); fd.append('pageH', String(config.pageH));
  fd.append('itemW', String(config.itemW)); fd.append('itemH', String(config.itemH));
  const effectiveFitMode = (customScale !== 100) ? 'actual' : config.fitMode;
  fd.append('dpi', String(config.dpi)); fd.append('fitMode', effectiveFitMode);
  fd.append('customScale', String(customScale)); fd.append('backgroundColor', backgroundColor);
  fd.append('colorMode', config.colorMode); fd.append('useCrop', config.useCrop ? '1' : '0');
  fd.append('cropLen', String(config.cropLen)); fd.append('cropDist', String(config.cropDist));
  fd.append('cropThick', String(config.cropThick)); fd.append('cropColor', config.cropColor);
  fd.append('totalOrder', String(config.totalOrder));
  fd.append('processMode', config.processMode); fd.append('autoRotate', config.autoRotate ? '1' : '0');
  fd.append('shape', config.shape);
  fd.append('cutBleed', String(config.cutBleed || 0));
  fd.append('cornerRadius', String(config.cornerRadius || 0));
  fd.append('twoSideMode', config.twoSideMode || 'same');
  fd.append('marginTop', String(config.marginTop || 0));
  fd.append('marginBot', String(config.marginBot || 0));
  fd.append('marginLeft', String(config.marginLeft || 0));
  fd.append('marginRight', String(config.marginRight || 0));
  fd.append('impositionStyle', impositionStyleEnabled ? impositionStyle : 'sheetwise');
  fd.append('usePageCrop', config.usePageCrop ? '1' : '0');
  fd.append('pageCropLen', String(config.pageCropLen));
  fd.append('pageCropDist', String(config.pageCropDist));
  fd.append('pageCropThick', String(config.pageCropThick));
  fd.append('pageCropColor', config.pageCropColor);
  fd.append('useColorBar', config.useColorBar ? '1' : '0');
  fd.append('colorBarPosition', config.colorBarPosition);
  fd.append('colorBarPadding', String(config.colorBarPadding));
  fd.append('is2Sided', config.is2Sided ? '1' : '0');
  fd.append('rot180Front', config.rot180Front ? '1' : '0');
  fd.append('rot180Back', config.rot180Back ? '1' : '0');
  fd.append('dataMode', String(dataMode));
  fd.append('xUpQty', String(xUpQty));
  fd.append('standardQty', String(standardQty));
  fd.append('totalSheets', String(totalSheets));

  // Nếu xuất 1 tờ đơn lẻ — truyền targetSheetIndex
  if (targetSheetIndex !== undefined) {
    fd.append('targetSheetIndex', String(targetSheetIndex));
  }

  return generatePdfAsync(fd, {
    onProgress: params.onProgress
  });
}

export interface ExportLocalPdfParams {
  config: ImpositionConfig;
  currentPlan: LayoutPlan | null;
  allPages: PageItem[];
  shapeTabs: ShapeTabItem[];
  isMultiShape: boolean;
  totalSheets: number;
  effectiveDataMode: DataMode;
  standardQty: number;
  xUpQty: number;
  customSvgData?: string;
  vectorMaskResult?: any;
  backgroundColor?: string;
  apiStatus: 'checking' | 'online' | 'offline';
  onProgress?: (progress: number) => void;
  onSuccess?: (info: RenderSuccessInfo) => void;
}

export async function exportLocalPdf(params: ExportLocalPdfParams): Promise<void> {
  const {
    config, currentPlan, allPages, shapeTabs, isMultiShape,
    totalSheets, effectiveDataMode, standardQty, xUpQty,
    backgroundColor = '#ffffff', apiStatus, onProgress, onSuccess
  } = params;

  const startTime = Date.now();
  onProgress?.(10);
  const blob = await generateImpositionPdfBlob({
    allPages,
    apiStatus,
    currentPlan,
    config,
    customScale: 100,
    backgroundColor,
    dataMode: effectiveDataMode,
    impositionStyle: 'sheetwise',
    impositionStyleEnabled: false,
    xUpQty,
    standardQty,
    totalSheets,
    shapeTabs,
    isMultiShape,
    previewSide: 'front',
    onProgress: (p) => onProgress?.(p)
  });
  onProgress?.(95);

  const filename = `binh-ban-${config.pageW}x${config.pageH}mm-${Date.now()}.pdf`;
  downloadPdfBlob(blob, filename);
  onProgress?.(100);

  const downloadUrl = URL.createObjectURL(blob);
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);
  const previewUrl = allPages[0]?.thumb || '';

  const renderInfo: RenderSuccessInfo = {
    downloadUrl,
    filename,
    previewUrl,
    dpi: config.dpi || 300,
    colorspace: (config.colorMode || 'cmyk').toUpperCase(),
    engineName: 'Python Backend',
    totalPages: totalSheets || 1,
    duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`
  };

  onSuccess?.(renderInfo);
}

export interface ExportGoAgentPdfParams {
  config: ImpositionConfig;
  currentPlan: LayoutPlan | null;
  allPages: PageItem[];
  shapeTabs: ShapeTabItem[];
  isMultiShape: boolean;
  totalSheets: number;
  effectiveDataMode: DataMode;
  standardQty: number;
  xUpQty: number;
  selectedPresetId: string;
  apiStatus: 'checking' | 'online' | 'offline';
  goAgentPort?: number;
  onProgress?: (progress: number) => void;
  onSuccess?: (info: any) => void;
}

export async function exportGoAgentPdf(params: ExportGoAgentPdfParams): Promise<void> {
  const {
    config, currentPlan, allPages, shapeTabs, isMultiShape,
    totalSheets, effectiveDataMode, standardQty, xUpQty,
    selectedPresetId, apiStatus, goAgentPort = GOAGENT_DEFAULT_PORT,
    onProgress, onSuccess
  } = params;

  // Lấy blob PDF từ backend (không dùng jsPDF)
  onProgress?.(20);
  const blob = await generateImpositionPdfBlob({
    allPages,
    apiStatus,
    currentPlan,
    config,
    customScale: 100,
    backgroundColor: '#ffffff',
    dataMode: effectiveDataMode,
    impositionStyle: 'sheetwise',
    impositionStyleEnabled: false,
    xUpQty,
    standardQty,
    totalSheets,
    shapeTabs,
    isMultiShape,
    previewSide: 'front'
  });
  onProgress?.(50);

  const filename = `binh-ban-${config.pageW}x${config.pageH}mm-${Date.now()}.pdf`;
  const pdfFile = new File([blob], filename, { type: 'application/pdf' });

  const res = await renderPdfViaGoAgent(pdfFile, {
    dpi: config.dpi || 300,
    colorspace: config.colorMode === 'cmyk' ? 'cmyk' : 'rgb',
    maxPages: 50,
    port: goAgentPort,
    pageRange: 'all'
  });
  onProgress?.(90);

  // Tạo download URL từ backend blob — cleanup sau 60s
  let finalDownloadUrl = URL.createObjectURL(blob);
  setTimeout(() => URL.revokeObjectURL(finalDownloadUrl), 60_000);
  let previewUrl = allPages[0]?.thumb || '';

  if (res && res.ok && res.pages && res.pages.length > 0) {
    previewUrl = res.pages[0].preview_b64 || previewUrl;
    if (res.pdf_b64) {
      try {
        const base64Clean = res.pdf_b64.replace(/^data:application\/pdf;base64,/, '');
        const byteChars = atob(base64Clean);
        const byteNumbers = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const renderedBlob = new Blob([byteNumbers], { type: 'application/pdf' });
        const renderedUrl = URL.createObjectURL(renderedBlob);
        setTimeout(() => URL.revokeObjectURL(renderedUrl), 60_000);
        finalDownloadUrl = renderedUrl;
      } catch {
        finalDownloadUrl = res.pdf_b64;
      }
    }
  }

  const renderInfo = {
    id: `render_${Date.now()}`,
    filename,
    previewUrl,
    downloadUrl: finalDownloadUrl,
    createdAt: new Date().toLocaleTimeString('vi-VN'),
    duration: res?.duration_ms ? `${(res.duration_ms / 1000).toFixed(2)}s` : '1.2s',
    dpi: config.dpi || 300,
    colorspace: (config.colorMode || 'cmyk').toUpperCase(),
    totalPages: res?.total_pages || totalSheets || 1,
    engineName: 'GoAgent PC (128GB RAM)',
    presetName: selectedPresetId || 'Prepress Chuẩn'
  };

  // Tự động tải file xuống máy
  try {
    const a = document.createElement('a');
    a.href = finalDownloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    console.error('[GoAgent] Lỗi trigger tải file:', e);
  }

  onProgress?.(100);
  onSuccess?.(renderInfo);
}
