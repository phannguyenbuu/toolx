import { PDFDocument, rgb, StandardFonts, degrees, PDFFont, pushGraphicsState, popGraphicsState, moveTo, lineTo, closePath, clip, endPath } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export interface ImageMapping {
  placeholderId: string;
  originalImageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageIndex: number;
  imageIndexInPage: number;
}

export interface CanvasPdfExportOptions {
  pageWidthMm: number;
  pageHeightMm: number;
  elements: CanvasElement[];
  imageMode: 'original' | 'optimized';
  optimizedDpi?: number;
}

export type TextFitMode = 'actual' | 'fit' | 'stretch' | 'fill';

export interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'img-data' | 'box' | 'qr' | 'barcode';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  content?: string;
  src?: string;
  originalSrc?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  color?: string;
  backgroundColor?: string;
  textAlignH?: 'flex-start' | 'center' | 'flex-end';
  textAlignV?: 'flex-start' | 'center' | 'flex-end';
  borderColor?: string;
  borderWidth?: number;
  textFitMode?: TextFitMode;
}

const MM_TO_PT = 72 / 25.4;

function mmToPt(mm: number): number {
  return mm * MM_TO_PT;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
    };
  }
  return { r: 0, g: 0, b: 0 };
}

function getFontUrl(fontFamily: string, isBold: boolean = false, isItalic: boolean = false): string {
  const baseFontName = fontFamily.replace(/\s+/g, '%20');
  
  if (fontFamily.startsWith('UTM') || fontFamily.startsWith('VNI')) {
    let suffix = '';
    if (isBold && isItalic) suffix = 'Bold_Italic';
    else if (isBold) suffix = 'Bold';
    else if (isItalic) suffix = 'Italic';
    
    if (suffix) {
      const urlName = fontFamily.replace(/\s+/g, '%20');
      return `/fonts/${urlName}${suffix}.ttf`;
    }
    return `/fonts/${baseFontName}.ttf`;
  }
  
  return `/fonts/${baseFontName}.ttf`;
}

const fontCache: Map<string, ArrayBuffer> = new Map();

async function loadFontBytes(fontFamily: string, isBold: boolean = false, isItalic: boolean = false): Promise<ArrayBuffer | null> {
  const url = getFontUrl(fontFamily, isBold, isItalic);
  const cacheKey = `${fontFamily}-${isBold}-${isItalic}`;
  
  if (fontCache.has(cacheKey)) {
    return fontCache.get(cacheKey)!;
  }
  
  try {
    const response = await fetch(url);
    if (response.ok) {
      const bytes = await response.arrayBuffer();
      fontCache.set(cacheKey, bytes);
      return bytes;
    }
    
    if (isBold || isItalic) {
      const baseUrl = getFontUrl(fontFamily, false, false);
      const baseResponse = await fetch(baseUrl);
      if (baseResponse.ok) {
        const bytes = await baseResponse.arrayBuffer();
        fontCache.set(cacheKey, bytes);
        return bytes;
      }
    }
    
    return null;
  } catch (err) {
    console.error(`Failed to load font ${fontFamily}:`, err);
    return null;
  }
}

export async function exportCanvasToPdf(options: CanvasPdfExportOptions): Promise<{
  pdfBytes: Uint8Array;
  imageMappings: ImageMapping[];
}> {
  const { pageWidthMm, pageHeightMm, elements } = options;
  
  const pageWidth = mmToPt(pageWidthMm);
  const pageHeight = mmToPt(pageHeightMm);
  
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  
  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const helveticaBoldOblique = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
  
  const embeddedFonts: Map<string, PDFFont> = new Map();
  
  async function getFont(fontFamily: string, isBold: boolean, isItalic: boolean): Promise<PDFFont> {
    const cacheKey = `${fontFamily}-${isBold}-${isItalic}`;
    
    if (embeddedFonts.has(cacheKey)) {
      return embeddedFonts.get(cacheKey)!;
    }
    
    const fontBytes = await loadFontBytes(fontFamily, isBold, isItalic);
    if (fontBytes) {
      try {
        const font = await pdfDoc.embedFont(fontBytes);
        embeddedFonts.set(cacheKey, font);
        return font;
      } catch (err) {
        console.error(`Failed to embed font ${fontFamily}:`, err);
      }
    }
    
    if (isBold && isItalic) return helveticaBoldOblique;
    if (isBold) return helveticaBold;
    if (isItalic) return helveticaOblique;
    return helveticaFont;
  }
  
  const imageMappings: ImageMapping[] = [];
  let imageIndexInPage = 0;
  const pageIndex = 0;
  
  // Apply clipping mask to page bounds - elements outside will be clipped
  page.pushOperators(
    pushGraphicsState(),
    moveTo(0, 0),
    lineTo(pageWidth, 0),
    lineTo(pageWidth, pageHeight),
    lineTo(0, pageHeight),
    closePath(),
    clip(),
    endPath()
  );
  
  for (const el of elements) {
    // Keep original coordinates - PDF will clip content outside page bounds
    const elX = mmToPt(el.x);
    const elY = pageHeight - mmToPt(el.y) - mmToPt(el.height);
    const elWidth = mmToPt(el.width);
    const elHeight = mmToPt(el.height);
    const rotation = el.rotation || 0;
    
    const centerX = elX + elWidth / 2;
    const centerY = elY + elHeight / 2;
    
    if (el.type === 'text' && el.content) {
      const baseFontSize = el.fontSize || 12;
      const isBold = el.fontWeight === 'bold';
      const isItalic = el.fontStyle === 'italic';
      const fontFamily = el.fontFamily || 'Arial';
      const fitMode = el.textFitMode || 'actual';
      
      const font = await getFont(fontFamily, isBold, isItalic);
      const colorRgb = el.color ? hexToRgb(el.color) : { r: 0, g: 0, b: 0 };
      
      const lines = el.content.split('\n');
      
      let naturalWidth = 0;
      try {
        for (const line of lines) {
          const w = font.widthOfTextAtSize(line, baseFontSize);
          if (w > naturalWidth) naturalWidth = w;
        }
      } catch {
        naturalWidth = el.content.length * baseFontSize * 0.5;
      }
      const lineHeightBase = baseFontSize * 1.2;
      const naturalHeight = lines.length * lineHeightBase;
      
      let scaleX = 1;
      let scaleY = 1;
      let fontSize = baseFontSize;
      
      if (fitMode === 'stretch' && naturalWidth > 0 && naturalHeight > 0) {
        scaleX = elWidth / naturalWidth;
        scaleY = elHeight / naturalHeight;
        fontSize = baseFontSize;
      } else if (fitMode === 'fill' && naturalWidth > 0 && naturalHeight > 0) {
        const scale = Math.max(elWidth / naturalWidth, elHeight / naturalHeight);
        scaleX = scale;
        scaleY = scale;
        fontSize = baseFontSize;
      } else if (fitMode === 'fit' && naturalWidth > 0 && naturalHeight > 0) {
        const scale = Math.min(elWidth / naturalWidth, elHeight / naturalHeight);
        scaleX = scale;
        scaleY = scale;
        fontSize = baseFontSize;
      } else {
        scaleX = 1;
        scaleY = 1;
        fontSize = baseFontSize;
      }
      
      const effectiveFontSize = fontSize * scaleY;
      const lineHeight = effectiveFontSize * 1.2;
      const totalTextHeight = lines.length * lineHeight;
      
      let startY: number;
      if (el.textAlignV === 'flex-start') {
        startY = elY + elHeight - effectiveFontSize;
      } else if (el.textAlignV === 'flex-end') {
        startY = elY + totalTextHeight - lineHeight;
      } else {
        startY = elY + (elHeight + totalTextHeight) / 2 - lineHeight;
      }
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineY = startY - i * lineHeight;
        
        let textWidth = 0;
        try {
          textWidth = font.widthOfTextAtSize(line, effectiveFontSize) * (scaleX / scaleY);
        } catch {
          textWidth = line.length * effectiveFontSize * 0.5 * (scaleX / scaleY);
        }
        
        let textX = elX;
        if (el.textAlignH === 'center') {
          textX = elX + (elWidth - textWidth) / 2;
        } else if (el.textAlignH === 'flex-end') {
          textX = elX + elWidth - textWidth;
        }
        
        try {
          if (rotation !== 0) {
            const rad = (-rotation * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const dx = textX - centerX;
            const dy = lineY - centerY;
            const rotatedX = centerX + dx * cos - dy * sin;
            const rotatedY = centerY + dx * sin + dy * cos;
            
            page.drawText(line, {
              x: rotatedX,
              y: rotatedY,
              size: effectiveFontSize,
              font: font,
              color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
              rotate: degrees(-rotation),
            });
          } else {
            page.drawText(line, {
              x: textX,
              y: lineY,
              size: effectiveFontSize,
              font: font,
              color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
            });
          }
        } catch (err) {
          console.error(`Failed to draw text "${line}":`, err);
        }
      }
    }
    
    if (el.type === 'box') {
      const bgColor = el.backgroundColor ? hexToRgb(el.backgroundColor) : null;
      const borderColorRgb = el.borderColor ? hexToRgb(el.borderColor) : null;
      
      if (bgColor) {
        page.drawRectangle({
          x: elX,
          y: elY,
          width: elWidth,
          height: elHeight,
          color: rgb(bgColor.r, bgColor.g, bgColor.b),
          rotate: rotation !== 0 ? degrees(-rotation) : undefined,
        });
      }
      
      if (borderColorRgb && el.borderWidth) {
        page.drawRectangle({
          x: elX,
          y: elY,
          width: elWidth,
          height: elHeight,
          borderColor: rgb(borderColorRgb.r, borderColorRgb.g, borderColorRgb.b),
          borderWidth: el.borderWidth,
          rotate: rotation !== 0 ? degrees(-rotation) : undefined,
        });
      }
    }
    
    if ((el.type === 'image' || el.type === 'img-data') && el.src) {
      try {
        const imageBytes = await fetch(el.src).then(res => res.arrayBuffer());
        let image;
        
        if (el.src.includes('.png') || el.src.startsWith('data:image/png')) {
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          image = await pdfDoc.embedJpg(imageBytes);
        }
        
        page.drawImage(image, { 
          x: elX,
          y: elY,
          width: elWidth,
          height: elHeight,
          rotate: rotation !== 0 ? degrees(-rotation) : undefined,
        });
        
        if (el.originalSrc) {
          imageMappings.push({
            placeholderId: el.id,
            originalImageUrl: el.originalSrc,
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            pageIndex: pageIndex,
            imageIndexInPage: imageIndexInPage,
          });
        }
        imageIndexInPage++;
      } catch (err) {
        console.error('Failed to embed image:', err);
        page.drawRectangle({
          x: elX,
          y: elY,
          width: elWidth,
          height: elHeight,
          color: rgb(0.9, 0.9, 0.9),
          borderColor: rgb(0.7, 0.7, 0.7),
          borderWidth: 1,
        });
      }
    }
    
    if (el.type === 'qr' || el.type === 'barcode') {
      page.drawRectangle({
        x: elX,
        y: elY,
        width: elWidth,
        height: elHeight,
        color: rgb(0.95, 0.95, 0.95),
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 0.5,
      });
      
      const label = el.type === 'qr' ? 'QR' : 'BARCODE';
      const labelSize = 8;
      const labelWidth = helveticaFont.widthOfTextAtSize(label, labelSize);
      
      page.drawText(label, {
        x: elX + (elWidth - labelWidth) / 2,
        y: elY + (elHeight - labelSize) / 2,
        size: labelSize,
        font: helveticaFont,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
  }
  
  // Restore graphics state after clipping
  page.pushOperators(popGraphicsState());
  
  const pdfBytes = await pdfDoc.save();
  
  return { pdfBytes, imageMappings };
}

export async function replaceImagesInPdf(
  pdfBytes: Uint8Array,
  imageMappings: ImageMapping[],
  mode: 'original' | 'optimized',
  optimizedDpi?: number
): Promise<Blob> {
  const formData = new FormData();
  formData.append('pdf', new Blob([pdfBytes], { type: 'application/pdf' }), 'canvas-output.pdf');
  formData.append('imageMappings', JSON.stringify(imageMappings));
  formData.append('mode', mode);
  if (optimizedDpi) {
    formData.append('dpi', String(optimizedDpi));
  }
  
  const response = await fetch('/api/replace-images', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to replace images: ${error}`);
  }
  
  return response.blob();
}

export async function downloadPdf(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
