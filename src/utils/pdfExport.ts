/**
 * PDF Export Utility
 * Export HTML to PDF using html2pdf.js
 */

import html2pdf from 'html2pdf.js';

export interface PDFExportOptions {
  filename?: string;
  margin?: number | [number, number, number, number];
  format?: 'a4' | 'letter' | 'legal';
  orientation?: 'portrait' | 'landscape';
  quality?: number;
}

/**
 * Export element to PDF
 */
export const exportToPDF = async (
  elementId: string,
  options: PDFExportOptions = {}
): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  const {
    filename = 'document.pdf',
    margin = 8,
    format = 'a4',
    orientation = 'portrait',
    quality = 0.98,
  } = options;

  const opt = {
    margin,
    filename,
    image: { type: 'jpeg' as const, quality },
    html2canvas: { 
      scale: 2, 
      useCORS: true,
      logging: false,
    },
    jsPDF: { 
      unit: 'mm', 
      format, 
      orientation,
    },
  };

  try {
    await html2pdf().set(opt).from(element).save();
  } catch (error) {
    console.error('PDF export failed:', error);
    throw new Error('Không thể xuất PDF. Vui lòng thử lại.');
  }
};

export default exportToPDF;
