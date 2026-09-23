import * as pdfjsLib from 'pdfjs-dist';
import { SlicingWarningInfo, BASE_DPI_OPTIONS } from './types';

export interface FileAnalysisResult {
  dimensions: string;
  dpiOptions: Array<{ value: number; label: string }>;
  recommendedDpi: number;
  isPdf: boolean;
  slicingWarning: SlicingWarningInfo | null;
  shouldRecommendGcr22: boolean;
}

export async function renderLazyPdfPage1(
  arrayBuffer: ArrayBuffer,
  rawText: string,
  canvas: HTMLCanvasElement | null
): Promise<SlicingWarningInfo | null> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const vp = page.getViewport({ scale: 1.0 });
    const scale = 160 / vp.height;
    const scaledVp = page.getViewport({ scale });

    if (canvas) {
      canvas.height = scaledVp.height;
      canvas.width = scaledVp.width;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport: scaledVp }).promise;
      }
    }

    const cleanText = rawText.replace(/\0/g, '');
    let producerName = '';
    try {
      const meta = await pdf.getMetadata();
      producerName = (meta?.info as any)?.Producer || (meta?.info as any)?.Creator || '';
    } catch {}

    if (!producerName) {
      const matchProd = cleanText.match(/\/Producer\s*\(([^)]+)\)/i) || cleanText.match(/\/Creator\s*\(([^)]+)\)/i);
      if (matchProd) producerName = matchProd[1];
    }

    let imageCount = 0;
    try {
      const opList = await page.getOperatorList();
      if (opList && opList.fnArray) {
        for (let i = 0; i < opList.fnArray.length; i++) {
          const fn = opList.fnArray[i];
          if (
            fn === pdfjsLib.OPS.paintImageXObject ||
            fn === pdfjsLib.OPS.paintInlineImageXObject ||
            fn === pdfjsLib.OPS.paintImageMaskXObject
          ) {
            imageCount++;
          }
        }
      }
    } catch {}

    const hasIndexed = cleanText.includes('/Indexed') || rawText.includes('/Indexed');
    const isVirtualPrinter =
      /printer|print to pdf|foxit|bullzip|cutepdf|acrobat|primopdf|nitro|pdf24|dopdf/i.test(producerName) ||
      /foxit|bullzip|cutepdf|pdfcreator|primopdf/i.test(cleanText);

    const shouldRecommendGcr22 = imageCount >= 2 || isVirtualPrinter || hasIndexed;

    if (shouldRecommendGcr22) {
      return {
        hasSlicing: true,
        stripCount: Math.max(imageCount, 2),
        producer: producerName || 'Máy in ảo (Foxit / PDF Printer)',
        hasIndexed,
        autoSelectedProfile: 'GCR 22%'
      };
    }
    return null;
  } catch (e) {
    console.warn('Client preview render error:', e);
    return null;
  }
}

export async function analyzeUploadedFile(
  file: File,
  canvas: HTMLCanvasElement | null
): Promise<FileAnalysisResult> {
  const isRaster = /\.(png|jpe?g|webp|bmp|tiff?|gif|avif)$/i.test(file.name);

  if (isRaster) {
    const imgUrl = URL.createObjectURL(file);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Không thể đọc tệp hình ảnh.'));
      img.src = imgUrl;
    });

    const w_px = img.naturalWidth || img.width;
    const h_px = img.naturalHeight || img.height;
    const w_mm = Math.round((w_px * 25.4) / 300);
    const h_mm = Math.round((h_px * 25.4) / 300);
    const dimensions = `Kích thước ảnh: ${w_px} × ${h_px} px (~${w_mm} × ${h_mm} mm @ 300 DPI)`;

    const MAX_DIMENSION = 65535;
    const max_dpi_w = Math.floor(MAX_DIMENSION / (w_px / 72));
    const max_dpi_h = Math.floor(MAX_DIMENSION / (h_px / 72));
    const calculatedMaxDpi = Math.min(max_dpi_w, max_dpi_h);

    const allowedOptions = BASE_DPI_OPTIONS.filter((opt) => opt.value < calculatedMaxDpi).map((opt) => ({ ...opt }));
    if (calculatedMaxDpi < 1200) {
      allowedOptions.push({ value: calculatedMaxDpi, label: `${calculatedMaxDpi} DPI (tối đa an toàn)` });
    } else {
      allowedOptions.push({ value: 1200, label: '1200 DPI (tối đa)' });
    }
    if (allowedOptions.length === 0) {
      allowedOptions.push({ value: 72, label: '72 DPI (tối đa an toàn)' });
    }

    if (canvas) {
      const maxPreviewH = 160;
      const scale = maxPreviewH / h_px;
      canvas.width = Math.round(w_px * scale);
      canvas.height = maxPreviewH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
    }
    URL.revokeObjectURL(imgUrl);

    return {
      dimensions,
      dpiOptions: allowedOptions,
      recommendedDpi: 300,
      isPdf: false,
      slicingWarning: null,
      shouldRecommendGcr22: false
    };
  }

  const arrayBuffer = await file.arrayBuffer();
  const decoder = new TextDecoder('utf-8');
  const view = new Uint8Array(arrayBuffer.slice(0, 2 * 1024 * 1024));
  const text = decoder.decode(view);

  let match = text.match(/\/MediaBox\s*\[\s*([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s*\]/);
  if (!match) {
    match = text.match(/\/CropBox\s*\[\s*([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s*\]/);
  }

  let dimensions = 'Kích thước: Vector CAD / Đa trang';
  let allowedOptions = [...BASE_DPI_OPTIONS];
  let recommendedDpi = 300;

  if (match) {
    const x1 = parseFloat(match[1]);
    const y1 = parseFloat(match[2]);
    const x2 = parseFloat(match[3]);
    const y2 = parseFloat(match[4]);

    const w_pts = Math.abs(x2 - x1);
    const h_pts = Math.abs(y2 - y1);
    const w_in = w_pts / 72;
    const h_in = h_pts / 72;
    const w_mm = Math.round(w_in * 25.4);
    const h_mm = Math.round(h_in * 25.4);
    dimensions = `Kích thước trang: ${w_mm} × ${h_mm} mm`;

    const MAX_DIMENSION = 65535;
    const max_dpi_w = Math.floor(MAX_DIMENSION / w_in);
    const max_dpi_h = Math.floor(MAX_DIMENSION / h_in);
    const calculatedMaxDpi = Math.min(max_dpi_w, max_dpi_h);

    allowedOptions = BASE_DPI_OPTIONS.filter((opt) => opt.value < calculatedMaxDpi).map((opt) => ({ ...opt }));
    if (calculatedMaxDpi < 1200) {
      allowedOptions.push({ value: calculatedMaxDpi, label: `${calculatedMaxDpi} DPI (tối đa an toàn)` });
    } else {
      allowedOptions.push({ value: 1200, label: '1200 DPI (tối đa)' });
    }
    if (allowedOptions.length === 0) {
      allowedOptions.push({ value: 72, label: '72 DPI (tối đa an toàn)' });
    }

    const maxAllowed = allowedOptions[allowedOptions.length - 1].value;
    recommendedDpi = maxAllowed < 300 ? maxAllowed : 300;
  }

  let slicingWarning: SlicingWarningInfo | null = null;
  let shouldRecommendGcr22 = false;

  if (file.name.toLowerCase().endsWith('.pdf')) {
    const cleanText = text.replace(/\0/g, '');
    const isVirtualPrinterQuick = /printer|print to pdf|foxit|bullzip|cutepdf|acrobat|primopdf|nitro|pdf24|dopdf/i.test(cleanText);
    const hasIndexedQuick = cleanText.includes('/Indexed') || text.includes('/Indexed');
    if (isVirtualPrinterQuick || hasIndexedQuick) {
      shouldRecommendGcr22 = true;
    }

    slicingWarning = await renderLazyPdfPage1(arrayBuffer, text, canvas);
    if (slicingWarning) {
      shouldRecommendGcr22 = true;
    }
  }

  return {
    dimensions,
    dpiOptions: allowedOptions,
    recommendedDpi,
    isPdf: file.name.toLowerCase().endsWith('.pdf'),
    slicingWarning,
    shouldRecommendGcr22
  };
}
