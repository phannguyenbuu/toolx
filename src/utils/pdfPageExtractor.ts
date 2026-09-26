// Quick win #2: lazy load pdfjs-dist — chỉ tải khi user thực sự mở file PDF
// Trước kia: import * as pdfjsLib from 'pdfjs-dist' → pull 1820KB vào initial bundle
// Sau: động dynamic import, chunk chỉ tải khi cần
import { createClientThumbnail } from './imageThumbnail';

const PDF_WORKER_SRC = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

let pdfjsLib: typeof import('pdfjs-dist') | null = null;

async function getPdfjs() {
  if (pdfjsLib) return pdfjsLib;
  const mod = await import(/* webpackChunkName: "pdfjs" */ 'pdfjs-dist');
  if (typeof window !== 'undefined' && !mod.GlobalWorkerOptions.workerSrc) {
    mod.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
  }
  pdfjsLib = mod;
  return mod;
}

export interface ExtractedPdfPage {
  pageIndex: number; // 1, 2, 3...
  totalPages: number;
  dataUrl: string; // High-resolution data URL (PNG)
  thumbUrl: string; // Lightweight preview thumbnail (~20KB)
  widthMm: number;
  heightMm: number;
  name: string;
}

export function isPdfFile(file: File): boolean {
  if (!file) return false;
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

export interface ExtractPdfOptions {
  fileName?: string;
  startPage?: number; // 1-indexed (mặc định 1)
  maxPages?: number;  // số trang tối đa cần trích xuất (ví dụ 10)
  onProgress?: (current: number, total: number) => void;
}

/**
 * Đọc nhanh thông tin số trang và dung lượng PDF mà không tốn công render hình ảnh
 */
export async function inspectPdfMetadata(
  fileOrBuffer: File | Blob | ArrayBuffer
): Promise<{ numPages: number; sizeBytes: number }> {
  try {
    const lib = await getPdfjs();
    const arrayBuffer = fileOrBuffer instanceof ArrayBuffer
      ? fileOrBuffer
      : await fileOrBuffer.arrayBuffer();

    const loadingTask = lib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const sizeBytes = fileOrBuffer instanceof File || fileOrBuffer instanceof Blob
      ? fileOrBuffer.size
      : arrayBuffer.byteLength;

    return {
      numPages: pdf.numPages,
      sizeBytes,
    };
  } catch (err) {
    console.error('Lỗi khi đọc metadata PDF:', err);
    throw err;
  }
}

/**
 * Extract each page of a PDF file into high-res images and thumbnails.
 * Useful for mapping each PDF page to an individual imposition/design Layer.
 */
export async function extractPdfPages(
  fileOrBuffer: File | Blob | ArrayBuffer,
  optionsOrName?: string | ExtractPdfOptions
): Promise<ExtractedPdfPage[]> {
  try {
    const lib = await getPdfjs();
    const options: ExtractPdfOptions = typeof optionsOrName === 'string'
      ? { fileName: optionsOrName }
      : (optionsOrName || {});

    const arrayBuffer = fileOrBuffer instanceof ArrayBuffer
      ? fileOrBuffer
      : await fileOrBuffer.arrayBuffer();

    const baseName = options.fileName
      ? options.fileName.replace(/\.pdf$/i, '')
      : (fileOrBuffer instanceof File ? fileOrBuffer.name.replace(/\.pdf$/i, '') : 'Tài liệu PDF');

    const loadingTask = lib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;

    const startPage = Math.max(1, Math.min(numPages, options.startPage || 1));
    const maxPages = options.maxPages && options.maxPages > 0 ? options.maxPages : Infinity;
    const endPage = Math.min(numPages, startPage + maxPages - 1);

    const extracted: ExtractedPdfPage[] = [];

    for (let p = startPage; p <= endPage; p++) {
      if (options.onProgress) {
        options.onProgress(p - startPage + 1, endPage - startPage + 1);
      }
      const page = await pdf.getPage(p);

      // Scale 1.0 base viewport to get point dimensions (72 pt = 1 inch = 25.4 mm)
      const baseVp = page.getViewport({ scale: 1.0 });
      const widthMm = Math.max(1, Math.round((baseVp.width * 25.4 / 72) * 10) / 10);
      const heightMm = Math.max(1, Math.round((baseVp.height * 25.4 / 72) * 10) / 10);

      // Render at high resolution (target max ~2000px dimension for sharp print prepress)
      const maxPt = Math.max(baseVp.width, baseVp.height);
      const targetScale = Math.min(2.5, Math.max(1.5, 1800 / Math.max(1, maxPt)));
      const renderVp = page.getViewport({ scale: targetScale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(renderVp.width);
      canvas.height = Math.round(renderVp.height);
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // ALWAYS fill crisp white background so transparent PDF pages never turn black!
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({
          canvasContext: ctx,
          viewport: renderVp,
        }).promise;

        const dataUrl = canvas.toDataURL('image/png');
        const thumbUrl = await createClientThumbnail(canvas, 320, 0.8) || dataUrl;

        extracted.push({
          pageIndex: p,
          totalPages: numPages,
          dataUrl,
          thumbUrl,
          widthMm,
          heightMm,
          name: numPages > 1 ? `${baseName} - Trang ${p}` : baseName,
        });
      }
    }

    return extracted;
  } catch (err) {
    console.error('Lỗi khi trích xuất các trang PDF:', err);
    throw err;
  }
}
