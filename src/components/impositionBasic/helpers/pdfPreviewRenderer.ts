import * as pdfjsLib from 'pdfjs-dist';
import { ImpositionConfig, ManualRotateType, PreviewImages } from '../types';
import { API_BASE, PDF_WORKER_SRC } from '../constants';

// Set worker path for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;

/**
 * Validates that an uploaded PDF file has exactly 1 page.
 */
export async function validatePdfPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  return pdf.numPages;
}

/**
 * Calls backend server to render portrait and landscape preview images for the imposition item.
 */
export async function fetchRenderPreview(
  uploadedFile: File,
  config: ImpositionConfig,
  manualRotate: ManualRotateType
): Promise<PreviewImages> {
  const fd = new FormData();
  fd.append('file', uploadedFile);

  const effectiveItemH = config.shape === 'circle' ? config.itemW : config.itemH;
  fd.append('itemW', String(config.itemW));
  fd.append('itemH', String(effectiveItemH));
  fd.append('fitMode', config.fitMode);
  fd.append('shape', config.shape);
  fd.append('manualRotate', manualRotate);

  fd.append('useAdvancedColor', config.useAdvancedColor ? '1' : '0');
  if (config.useAdvancedColor) {
    fd.append('sourceIcc', config.sourceIcc);
    fd.append('icc1', config.icc1);
    fd.append('iccOutput', config.iccOutput);
  }

  const res = await fetch(API_BASE + '/render-preview', {
    method: 'POST',
    body: fd
  });

  const data = await res.json();
  if (res.ok) {
    return {
      portrait: data.portrait,
      landscape: data.landscape
    };
  }

  throw new Error(data.error || 'Lỗi tải preview');
}
