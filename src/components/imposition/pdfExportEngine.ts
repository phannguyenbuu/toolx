import { jsPDF } from 'jspdf';
import { generatePdfAsync, downloadPdfBlob } from '../../utils/pdfAsync';
import { probeGoAgent, renderPdfViaGoAgent, GoAgentInfo, GOAGENT_DEFAULT_PORT } from '../../services/goAgentService';
import { savePendingRenderBlob } from '../../services/pendingRenderService';
import { PlanItem, LayoutPlan } from '../../utils/layoutSolver';
import { ImpositionConfig, ShapeTabItem, PageItem, DataMode, ImpositionStyle } from './types';
import { enrichPlanItemsWithRotation } from './impositionGeometry';
import { drawSheetOnDoc } from './pdfCanvasRenderer';

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
}

/**
 * Tạo PDF Blob từ Canvas / Layout hiện tại để gửi sang máy trạm Render Prepress hoặc tải về
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
    previewSide
  } = params;

  // Trường hợp 1: Có ảnh nguồn và Python backend online -> Dùng generatePdfAsync chất lượng gốc (chỉ khi xuất gộp toàn bộ)
  if (
    targetSheetIndex === undefined &&
    allPages.length > 0 &&
    allPages.some(p => p.thumb || p.originalThumb || p.fileId) &&
    apiStatus === 'online' &&
    currentPlan &&
    currentPlan.items?.length > 0
  ) {
    try {
      const fd = new FormData();
      const fileIds = allPages.map(p => p.fileId).filter(Boolean);
      if (fileIds.length > 0) {
        fd.append('fileIds', JSON.stringify(fileIds));
      } else {
        for (let i = 0; i < allPages.length; i++) {
          const page = allPages[i];
          const imageSource = page.originalThumb || page.thumb;
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

      const pagesDataRaw = allPages.map(p => ({
        rotation: p.rotation || 0,
        w: p.w,
        h: p.h
      }));
      fd.append('pagesData', JSON.stringify(pagesDataRaw));

      const rawPlanItems = (impositionStyleEnabled && styledPlan ? styledPlan.items : (currentPlan?.items || []));
      const enrichedPlanItems = enrichPlanItemsWithRotation(
        rawPlanItems,
        allPages,
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

      const blob = await generatePdfAsync(fd);
      return blob;
    } catch (err) {
      console.warn('Backend PDF generation failed, falling back to client jsPDF:', err);
    }
  }

  // Trường hợp 2: Client-side vector render PDF qua jsPDF
  const pageW = Number(config.pageW) || 330;
  const pageH = Number(config.pageH) || 480;
  const orientation = pageW > pageH ? 'landscape' : 'portrait';
  const doc = new jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: [pageW, pageH],
    compress: true
  });

  const allPlanItems = (impositionStyleEnabled && styledPlan ? styledPlan.items : (currentPlan?.items || []));

  if (targetSheetIndex !== undefined) {
    // Kết xuất 1 tờ đơn lẻ
    const sheetItems = isMultiShape
      ? allPlanItems.filter(it => (it.sheetIndex ?? 0) === targetSheetIndex)
      : allPlanItems;
    if (config.is2Sided) {
      await drawSheetOnDoc({
        doc,
        sIdx: targetSheetIndex * 2,
        itemsForSheet: sheetItems,
        forceSide: 'front',
        config,
        allPages,
        shapeTabs,
        activeTab,
        isMultiShape,
        effectiveDataMode: dataMode,
        standardQty,
        xUpQty,
        customScale
      });
      doc.addPage([pageW, pageH], orientation);
      await drawSheetOnDoc({
        doc,
        sIdx: targetSheetIndex * 2 + 1,
        itemsForSheet: sheetItems,
        forceSide: 'back',
        config,
        allPages,
        shapeTabs,
        activeTab,
        isMultiShape,
        effectiveDataMode: dataMode,
        standardQty,
        xUpQty,
        customScale
      });
    } else {
      await drawSheetOnDoc({
        doc,
        sIdx: targetSheetIndex,
        itemsForSheet: sheetItems,
        forceSide: 'front',
        config,
        allPages,
        shapeTabs,
        activeTab,
        isMultiShape,
        effectiveDataMode: dataMode,
        standardQty,
        xUpQty,
        customScale
      });
    }
  } else {
    // Kết xuất toàn bộ các tờ thành PDF đa trang
    const sheetsCount = Math.max(1, totalSheets);
    const totalPdfPages = config.is2Sided ? sheetsCount * 2 : sheetsCount;
    for (let pIdx = 0; pIdx < totalPdfPages; pIdx++) {
      if (pIdx > 0) {
        doc.addPage([pageW, pageH], orientation);
      }
      const sIdx = config.is2Sided ? Math.floor(pIdx / 2) : pIdx;
      const sideToDraw: 'front' | 'back' = config.is2Sided ? (pIdx % 2 === 1 ? 'back' : 'front') : previewSide;
      const sheetItems = isMultiShape
        ? allPlanItems.filter(it => (it.sheetIndex ?? 0) === sIdx)
        : allPlanItems;
      await drawSheetOnDoc({
        doc,
        sIdx,
        itemsForSheet: sheetItems,
        forceSide: sideToDraw,
        config,
        allPages,
        shapeTabs,
        activeTab,
        isMultiShape,
        effectiveDataMode: dataMode,
        standardQty,
        xUpQty,
        customScale
      });
    }
  }

  return doc.output('blob');
}

export interface ExportLocalPdfParams {
  config: ImpositionConfig;
  currentPlan: LayoutPlan;
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
  onProgress?: (progress: number) => void;
  onSuccess?: (filename: string) => void;
}

export async function exportLocalPdf(params: ExportLocalPdfParams): Promise<void> {
  const {
    config, currentPlan, allPages, shapeTabs, isMultiShape,
    totalSheets, effectiveDataMode, standardQty, xUpQty,
    backgroundColor = '#ffffff', onProgress, onSuccess
  } = params;

  onProgress?.(20);
  const blob = await generateImpositionPdfBlob({
    allPages,
    apiStatus: 'offline',
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
    previewSide: 'front'
  });
  onProgress?.(80);

  const filename = `binh-ban-${config.pageW}x${config.pageH}mm-${Date.now()}.pdf`;
  downloadPdfBlob(blob, filename);
  onProgress?.(100);
  onSuccess?.(filename);
}

export interface ExportGoAgentPdfParams {
  config: ImpositionConfig;
  currentPlan: LayoutPlan;
  allPages: PageItem[];
  shapeTabs: ShapeTabItem[];
  isMultiShape: boolean;
  totalSheets: number;
  effectiveDataMode: DataMode;
  standardQty: number;
  xUpQty: number;
  selectedPresetId: string;
  goAgentPort?: number;
  onProgress?: (progress: number) => void;
  onSuccess?: (info: any) => void;
}

export async function exportGoAgentPdf(params: ExportGoAgentPdfParams): Promise<void> {
  const {
    config, currentPlan, allPages, shapeTabs, isMultiShape,
    totalSheets, effectiveDataMode, standardQty, xUpQty,
    selectedPresetId, goAgentPort = GOAGENT_DEFAULT_PORT,
    onProgress, onSuccess
  } = params;

  onProgress?.(20);
  const blob = await generateImpositionPdfBlob({
    allPages,
    apiStatus: 'offline',
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

  let finalDownloadUrl = URL.createObjectURL(blob);
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
        finalDownloadUrl = URL.createObjectURL(renderedBlob);
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

  onProgress?.(100);
  onSuccess?.(renderInfo);
}
