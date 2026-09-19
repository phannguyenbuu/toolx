import { PDFDocument, rgb, StandardFonts, degrees, pushGraphicsState, popGraphicsState, concatTransformationMatrix, rotateDegrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { generateQRCodeDataUrl, generateBarcodeDataUrl } from './qrBarcodeGenerator';

const MM_TO_PT = 2.83465;

// Konva-specific element interface (not related to API data)
export interface KonvaElement {
  id: string;
  type: 'text' | 'box' | 'qr' | 'barcode' | 'image' | 'img-data';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  src?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  rotate?: number;
  textAlignH?: string;
  textAlignV?: string;
  zIndex?: number;
  qrTemplate?: 'custom' | 'vietqr';
  vietQRImageUrl?: string;
}

// PDF export-specific interfaces (not related to API data)
interface BackgroundConfig {
  src: string;
  fit: 'fill' | 'contain' | 'cover' | 'stretch';
}

interface ExportOptions {
  pageWidthMm: number;
  pageHeightMm: number;
  elements: KonvaElement[];
  fontBytes?: Map<string, ArrayBuffer>;
  background?: BackgroundConfig;
}

interface MultiPageExportOptions {
  pageWidthMm: number;
  pageHeightMm: number;
  pages: KonvaElement[][];
  fontBytes?: Map<string, ArrayBuffer>;
  background?: BackgroundConfig;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    };
  }
  return { r: 0, g: 0, b: 0 };
}

const SYSTEM_FONTS = [
  'Tahoma', 'Arial', 'Verdana', 'Georgia', 'Times New Roman', 'Courier New',
  'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald',
  'Helvetica', 'sans-serif', 'serif', 'monospace'
];

// Cache fonts.json map: name -> file
let fontFileMap: Map<string, string> | null = null;
async function getFontFileMap(): Promise<Map<string, string>> {
  if (fontFileMap && fontFileMap.size > 0) return fontFileMap;
  try {
    const res = await fetch('/fonts/fonts.json?v=' + Date.now());
    if (res.ok) {
      const data: Array<{name: string; file: string}> = await res.json();
      fontFileMap = new Map(data.map(f => [f.name, f.file]));
    }
  } catch (e) { console.warn('[getFontFileMap] error', e); }
  if (!fontFileMap) fontFileMap = new Map();
  return fontFileMap;
}

async function loadFontBytes(fontFamily: string, isBold?: boolean, isItalic?: boolean): Promise<ArrayBuffer | null> {
  try {
    const cleanFamily = fontFamily.replace(/["']/g, '').trim();

    // Skip system fonts
    if (SYSTEM_FONTS.some(sf => cleanFamily.toLowerCase() === sf.toLowerCase())) {
      return null;
    }

    const map = await getFontFileMap();

    // Try to find exact font file from fonts.json
    const exactFile = map.get(cleanFamily);
    if (exactFile) {
      const res = await fetch(`/fonts/${encodeURIComponent(exactFile)}`);
      if (res.ok) return await res.arrayBuffer();
    }

    // Fallback: try by filename pattern
    let variant = '';
    if (isBold && isItalic) variant = 'BoldItalic';
    else if (isBold) variant = 'Bold';
    else if (isItalic) variant = 'Italic';

    const baseName = cleanFamily.replace(/\s+/g, ' ');
    const urlVariants = [
      variant ? `/fonts/${encodeURIComponent(baseName + variant)}.ttf` : null,
      variant ? `/fonts/${encodeURIComponent(baseName + ' ' + variant)}.ttf` : null,
      `/fonts/${encodeURIComponent(baseName)}.ttf`,
    ].filter(Boolean) as string[];

    for (const url of urlVariants) {
      try {
        const response = await fetch(url);
        if (response.ok) return await response.arrayBuffer();
      } catch (e) {}
    }

    console.warn(`Font "${cleanFamily}" not found in /fonts/`);
  } catch (err) {
    console.warn(`Could not load font ${fontFamily}:`, err);
  }
  return null;
}

async function loadDefaultVietnameseFont(): Promise<ArrayBuffer | null> {
  const defaultFonts = ['UTM Agin', 'UTM Avo', 'Roboto'];
  for (const fontName of defaultFonts) {
    const bytes = await loadFontBytes(fontName);
    if (bytes) return bytes;
  }
  return null;
}

async function drawBackground(
  pdfDoc: any,
  page: any,
  background: BackgroundConfig,
  pageWidthPt: number,
  pageHeightPt: number
): Promise<void> {
  try {
    let imageBytes: ArrayBuffer;
    if (background.src.startsWith('data:')) {
      const base64 = background.src.split(',')[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      imageBytes = bytes.buffer;
    } else {
      const response = await fetch(background.src);
      imageBytes = await response.arrayBuffer();
    }

    let image;
    const bytes = new Uint8Array(imageBytes);
    const isPngHeader = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
    const isJpgHeader = bytes[0] === 0xFF && bytes[1] === 0xD8;

    if (isPngHeader) {
      image = await pdfDoc.embedPng(imageBytes);
    } else if (isJpgHeader) {
      image = await pdfDoc.embedJpg(imageBytes);
    } else {
      try {
        image = await pdfDoc.embedJpg(imageBytes);
      } catch {
        image = await pdfDoc.embedPng(imageBytes);
      }
    }

    const imgWidth = image.width;
    const imgHeight = image.height;
    let drawX = 0;
    let drawY = 0;
    let drawW = pageWidthPt;
    let drawH = pageHeightPt;

    if (background.fit === 'contain') {
      const scale = Math.min(pageWidthPt / imgWidth, pageHeightPt / imgHeight);
      drawW = imgWidth * scale;
      drawH = imgHeight * scale;
      drawX = (pageWidthPt - drawW) / 2;
      drawY = (pageHeightPt - drawH) / 2;
    } else if (background.fit === 'cover') {
      const scale = Math.max(pageWidthPt / imgWidth, pageHeightPt / imgHeight);
      drawW = imgWidth * scale;
      drawH = imgHeight * scale;
      drawX = (pageWidthPt - drawW) / 2;
      drawY = (pageHeightPt - drawH) / 2;
    } else if (background.fit === 'stretch' || background.fit === 'fill') {
      drawW = pageWidthPt;
      drawH = pageHeightPt;
      drawX = 0;
      drawY = 0;
    }

    page.drawImage(image, {
      x: drawX,
      y: drawY,
      width: drawW,
      height: drawH,
    });
    console.log('Background drawn successfully');
  } catch (err) {
    console.error('Failed to draw background:', err);
  }
}

async function fetchVietQRImage(url: string): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.arrayBuffer();
  } catch (err) {
    console.error('Failed to fetch VietQR image:', err);
    return null;
  }
}

export async function exportKonvaToPdf(options: ExportOptions): Promise<Uint8Array> {
  const { pageWidthMm, pageHeightMm, elements, background } = options;
  
  const pageWidthPt = pageWidthMm * MM_TO_PT;
  const pageHeightPt = pageHeightMm * MM_TO_PT;
  
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  
  const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);
  
  // Draw background first
  if (background?.src) {
    await drawBackground(pdfDoc, page, background, pageWidthPt, pageHeightPt);
  }
  
  let defaultFont: any;
  const defaultFontBytes = await loadDefaultVietnameseFont();
  if (defaultFontBytes) {
    try {
      defaultFont = await pdfDoc.embedFont(defaultFontBytes);
    } catch (e) {
      console.warn('Failed to embed default Vietnamese font, falling back to Helvetica');
      defaultFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }
  } else {
    defaultFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  }
  
  const fontCache = new Map<string, any>();
  
  const sortedElements = [...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  
  console.log('PDF Export: Processing', sortedElements.length, 'elements');
  
  for (const el of sortedElements) {
    const xPt = el.x * MM_TO_PT;
    const yPt = pageHeightPt - (el.y + el.height) * MM_TO_PT;
    const wPt = el.width * MM_TO_PT;
    const hPt = el.height * MM_TO_PT;
    
    console.log(`Element ${el.type}: x=${el.x}mm y=${el.y}mm -> xPt=${xPt} yPt=${yPt}`);
    
    if (xPt + wPt < 0 || xPt > pageWidthPt || yPt + hPt < 0 || yPt > pageHeightPt) {
      console.log('  -> Skipped (out of bounds)');
      continue;
    }
    
    if (el.type === 'box') {
      if (el.backgroundColor && el.backgroundColor !== 'transparent') {
        const bgColor = hexToRgb(el.backgroundColor);
        page.drawRectangle({
          x: xPt,
          y: yPt,
          width: wPt,
          height: hPt,
          color: rgb(bgColor.r, bgColor.g, bgColor.b),
          rotate: el.rotate ? degrees(-el.rotate) : undefined
        });
      }
      
      if (el.borderColor && el.borderWidth) {
        const borderColor = hexToRgb(el.borderColor);
        page.drawRectangle({
          x: xPt,
          y: yPt,
          width: wPt,
          height: hPt,
          borderColor: rgb(borderColor.r, borderColor.g, borderColor.b),
          borderWidth: el.borderWidth * MM_TO_PT,
          rotate: el.rotate ? degrees(-el.rotate) : undefined
        });
      }
    }
    
    if (el.type === 'text' && el.content) {
      const fontSize = el.fontSize || 12;
      const fontSizePt = fontSize * 0.75;
      const textColor = hexToRgb(el.color || '#000000');
      const isBold = el.fontWeight === 'bold';
      const isItalic = el.fontStyle === 'italic';
      const isUnderline = el.textDecoration === 'underline';
      
      let font = defaultFont;
      
      if (el.fontFamily) {
        const cacheKey = `${el.fontFamily}-${isBold ? 'b' : ''}-${isItalic ? 'i' : ''}`;
        if (fontCache.has(cacheKey)) {
          font = fontCache.get(cacheKey);
        } else {
          const fontBytes = await loadFontBytes(el.fontFamily, isBold, isItalic);
          if (fontBytes) {
            try {
              const embeddedFont = await pdfDoc.embedFont(fontBytes);
              fontCache.set(cacheKey, embeddedFont);
              font = embeddedFont;
            } catch (e) {
              console.warn(`Failed to embed font ${el.fontFamily}, using default`);
            }
          }
        }
      }
      
      let textX = xPt;
      const textWidth = font.widthOfTextAtSize(el.content, fontSizePt);
      if (el.textAlignH === 'center') {
        textX = xPt + wPt / 2 - textWidth / 2;
      } else if (el.textAlignH === 'right' || el.textAlignH === 'flex-end') {
        textX = xPt + wPt - textWidth;
      }
      
      let textY = yPt + hPt / 2 - fontSizePt / 2;
      if (el.textAlignV === 'top' || el.textAlignV === 'flex-start') {
        textY = yPt + hPt - fontSizePt;
      } else if (el.textAlignV === 'bottom' || el.textAlignV === 'flex-end') {
        textY = yPt;
      }
      
      console.log(`  Drawing text "${el.content}" at (${textX}, ${textY}) with font ${el.fontFamily || 'default'} bold=${isBold} italic=${isItalic} underline=${isUnderline}`);
      page.drawText(el.content, {
        x: textX,
        y: textY,
        size: fontSizePt,
        font,
        color: rgb(textColor.r, textColor.g, textColor.b),
        rotate: el.rotate ? degrees(-el.rotate) : undefined
      });
      
      if (isUnderline) {
        const underlineY = textY - 2;
        page.drawLine({
          start: { x: textX, y: underlineY },
          end: { x: textX + textWidth, y: underlineY },
          thickness: fontSizePt * 0.05,
          color: rgb(textColor.r, textColor.g, textColor.b)
        });
      }
    }
    
    if ((el.type === 'image' || el.type === 'img-data') && el.src) {
      try {
        let imageBytes: ArrayBuffer;
        if (el.src.startsWith('data:')) {
          const base64 = el.src.split(',')[1];
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          imageBytes = bytes.buffer;
        } else {
          const response = await fetch(el.src);
          imageBytes = await response.arrayBuffer();
        }
        
        let image;
        const isPng = el.src.toLowerCase().includes('.png') || el.src.startsWith('data:image/png');
        const isJpg = el.src.toLowerCase().includes('.jpg') || el.src.toLowerCase().includes('.jpeg') || el.src.startsWith('data:image/jpeg');
        
        if (isPng) {
          image = await pdfDoc.embedPng(imageBytes);
        } else if (isJpg) {
          image = await pdfDoc.embedJpg(imageBytes);
        } else {
          const bytes = new Uint8Array(imageBytes);
          const isPngHeader = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
          const isJpgHeader = bytes[0] === 0xFF && bytes[1] === 0xD8;
          
          if (isPngHeader) {
            image = await pdfDoc.embedPng(imageBytes);
          } else if (isJpgHeader) {
            image = await pdfDoc.embedJpg(imageBytes);
          } else {
            try {
              image = await pdfDoc.embedJpg(imageBytes);
            } catch {
              image = await pdfDoc.embedPng(imageBytes);
            }
          }
        }
        
        console.log(`  Drawing image at (${xPt}, ${yPt}) size ${wPt}x${hPt}`);
        page.drawImage(image, {
          x: xPt,
          y: yPt,
          width: wPt,
          height: hPt,
          rotate: el.rotate ? degrees(-el.rotate) : undefined
        });
      } catch (err) {
        console.error('Failed to embed image:', err);
      }
    }
    
    if (el.type === 'qr') {
      try {
        let image;
        
        // Handle VietQR with external image URL
        if (el.qrTemplate === 'vietqr' && el.vietQRImageUrl) {
          console.log(`  Fetching VietQR image from: ${el.vietQRImageUrl}`);
          const vietQRBytes = await fetchVietQRImage(el.vietQRImageUrl);
          if (vietQRBytes) {
            // VietQR API returns PNG images
            image = await pdfDoc.embedPng(vietQRBytes);
          } else {
            // Fallback to generating QR from content
            const qrDataUrl = await generateQRCodeDataUrl(el.content || 'VietQR', Math.round(wPt), Math.round(hPt));
            const base64 = qrDataUrl.split(',')[1];
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            image = await pdfDoc.embedPng(bytes.buffer);
          }
        } else {
          // Standard QR code generation
          const qrDataUrl = await generateQRCodeDataUrl(el.content || '123456', Math.round(wPt), Math.round(hPt));
          const base64 = qrDataUrl.split(',')[1];
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          image = await pdfDoc.embedPng(bytes.buffer);
        }
        
        console.log(`  Drawing QR at (${xPt}, ${yPt})`);
        page.drawImage(image, {
          x: xPt,
          y: yPt,
          width: wPt,
          height: hPt,
          rotate: el.rotate ? degrees(-el.rotate) : undefined
        });
      } catch (err) {
        console.error('Failed to generate QR:', err);
      }
    }
    
    if (el.type === 'barcode') {
      try {
        const barcodeDataUrl = generateBarcodeDataUrl(el.content || '123456', Math.round(wPt), Math.round(hPt));
        const base64 = barcodeDataUrl.split(',')[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const image = await pdfDoc.embedPng(bytes.buffer);
        
        console.log(`  Drawing barcode at (${xPt}, ${yPt})`);
        page.drawImage(image, {
          x: xPt,
          y: yPt,
          width: wPt,
          height: hPt,
          rotate: el.rotate ? degrees(-el.rotate) : undefined
        });
      } catch (err) {
        console.error('Failed to generate barcode:', err);
      }
    }
  }
  
  return await pdfDoc.save();
}

export async function downloadKonvaPdf(
  options: ExportOptions,
  filename: string = 'export.pdf'
): Promise<void> {
  const pdfBytes = await exportKonvaToPdf(options);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportKonvaToPdfMultiPage(options: MultiPageExportOptions): Promise<Uint8Array> {
  const { pageWidthMm, pageHeightMm, pages, background } = options;
  
  if (pages.length === 0) {
    throw new Error('No pages to export');
  }
  
  const pageWidthPt = pageWidthMm * MM_TO_PT;
  const pageHeightPt = pageHeightMm * MM_TO_PT;
  
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  
  let defaultFont: any;
  const defaultFontBytes = await loadDefaultVietnameseFont();
  if (defaultFontBytes) {
    try {
      defaultFont = await pdfDoc.embedFont(defaultFontBytes);
    } catch (e) {
      console.warn('Failed to embed default Vietnamese font, falling back to Helvetica');
      defaultFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }
  } else {
    defaultFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  }
  
  const fontCache = new Map<string, any>();
  const imageCache = new Map<string, any>();
  
  // Pre-embed background image once if exists
  let backgroundImage: any = null;
  let bgDrawConfig: { drawX: number; drawY: number; drawW: number; drawH: number } | null = null;
  if (background?.src) {
    try {
      let imageBytes: ArrayBuffer;
      if (background.src.startsWith('data:')) {
        const base64 = background.src.split(',')[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        imageBytes = bytes.buffer;
      } else {
        const response = await fetch(background.src);
        imageBytes = await response.arrayBuffer();
      }

      const bytes = new Uint8Array(imageBytes);
      const isPngHeader = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
      const isJpgHeader = bytes[0] === 0xFF && bytes[1] === 0xD8;

      if (isPngHeader) {
        backgroundImage = await pdfDoc.embedPng(imageBytes);
      } else if (isJpgHeader) {
        backgroundImage = await pdfDoc.embedJpg(imageBytes);
      } else {
        try {
          backgroundImage = await pdfDoc.embedJpg(imageBytes);
        } catch {
          backgroundImage = await pdfDoc.embedPng(imageBytes);
        }
      }

      const imgWidth = backgroundImage.width;
      const imgHeight = backgroundImage.height;
      let drawX = 0, drawY = 0, drawW = pageWidthPt, drawH = pageHeightPt;

      if (background.fit === 'contain') {
        const scale = Math.min(pageWidthPt / imgWidth, pageHeightPt / imgHeight);
        drawW = imgWidth * scale;
        drawH = imgHeight * scale;
        drawX = (pageWidthPt - drawW) / 2;
        drawY = (pageHeightPt - drawH) / 2;
      } else if (background.fit === 'cover') {
        const scale = Math.max(pageWidthPt / imgWidth, pageHeightPt / imgHeight);
        drawW = imgWidth * scale;
        drawH = imgHeight * scale;
        drawX = (pageWidthPt - drawW) / 2;
        drawY = (pageHeightPt - drawH) / 2;
      }
      bgDrawConfig = { drawX, drawY, drawW, drawH };
      console.log('Background image pre-embedded successfully');
    } catch (err) {
      console.error('Failed to embed background image:', err);
    }
  }
  
  console.log(`PDF Multi-Page Export: Processing ${pages.length} pages`);
  
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const elements = pages[pageIndex];
    const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);
    
    // Draw background on each page
    if (backgroundImage && bgDrawConfig) {
      page.drawImage(backgroundImage, {
        x: bgDrawConfig.drawX,
        y: bgDrawConfig.drawY,
        width: bgDrawConfig.drawW,
        height: bgDrawConfig.drawH,
      });
    }
    
    const sortedElements = [...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    
    console.log(`  Page ${pageIndex + 1}: ${sortedElements.length} elements`);
    
    for (const el of sortedElements) {
      const xPt = el.x * MM_TO_PT;
      const yPt = pageHeightPt - (el.y + el.height) * MM_TO_PT;
      const wPt = el.width * MM_TO_PT;
      const hPt = el.height * MM_TO_PT;
      
      if (xPt + wPt < 0 || xPt > pageWidthPt || yPt + hPt < 0 || yPt > pageHeightPt) {
        continue;
      }
      
      if (el.type === 'box') {
        if (el.backgroundColor && el.backgroundColor !== 'transparent') {
          const bgColor = hexToRgb(el.backgroundColor);
          page.drawRectangle({
            x: xPt,
            y: yPt,
            width: wPt,
            height: hPt,
            color: rgb(bgColor.r, bgColor.g, bgColor.b),
            rotate: el.rotate ? degrees(-el.rotate) : undefined
          });
        }
        
        if (el.borderColor && el.borderWidth) {
          const borderColor = hexToRgb(el.borderColor);
          page.drawRectangle({
            x: xPt,
            y: yPt,
            width: wPt,
            height: hPt,
            borderColor: rgb(borderColor.r, borderColor.g, borderColor.b),
            borderWidth: el.borderWidth * MM_TO_PT,
            rotate: el.rotate ? degrees(-el.rotate) : undefined
          });
        }
      }
      
      if (el.type === 'text' && el.content) {
        const fontSize = el.fontSize || 12;
        const fontSizePt = fontSize * 0.75;
        const textColor = hexToRgb(el.color || '#000000');
        const isBold = el.fontWeight === 'bold';
        const isItalic = el.fontStyle === 'italic';
        const isUnderline = el.textDecoration === 'underline';
        
        let font = defaultFont;
        
        if (el.fontFamily) {
          const cacheKey = `${el.fontFamily}-${isBold ? 'b' : ''}-${isItalic ? 'i' : ''}`;
          if (fontCache.has(cacheKey)) {
            font = fontCache.get(cacheKey);
          } else {
            const fontBytes = await loadFontBytes(el.fontFamily, isBold, isItalic);
            if (fontBytes) {
              try {
                const embeddedFont = await pdfDoc.embedFont(fontBytes);
                fontCache.set(cacheKey, embeddedFont);
                font = embeddedFont;
              } catch (e) {
                console.warn(`Failed to embed font ${el.fontFamily}, using default`);
              }
            }
          }
        }
        
        let textX = xPt;
        const textWidth = font.widthOfTextAtSize(el.content, fontSizePt);
        if (el.textAlignH === 'center') {
          textX = xPt + wPt / 2 - textWidth / 2;
        } else if (el.textAlignH === 'right' || el.textAlignH === 'flex-end') {
          textX = xPt + wPt - textWidth;
        }
        
        let textY = yPt + hPt / 2 - fontSizePt / 2;
        if (el.textAlignV === 'top' || el.textAlignV === 'flex-start') {
          textY = yPt + hPt - fontSizePt;
        } else if (el.textAlignV === 'bottom' || el.textAlignV === 'flex-end') {
          textY = yPt;
        }
        
        page.drawText(el.content, {
          x: textX,
          y: textY,
          size: fontSizePt,
          font,
          color: rgb(textColor.r, textColor.g, textColor.b),
          rotate: el.rotate ? degrees(-el.rotate) : undefined
        });
        
        if (isUnderline) {
          const underlineY = textY - 2;
          page.drawLine({
            start: { x: textX, y: underlineY },
            end: { x: textX + textWidth, y: underlineY },
            thickness: fontSizePt * 0.05,
            color: rgb(textColor.r, textColor.g, textColor.b)
          });
        }
      }
      
      if ((el.type === 'image' || el.type === 'img-data') && el.src) {
        try {
          let image = imageCache.get(el.src);
          
          if (!image) {
            let imageBytes: ArrayBuffer;
            if (el.src.startsWith('data:')) {
              const base64 = el.src.split(',')[1];
              const binary = atob(base64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
              }
              imageBytes = bytes.buffer;
            } else {
              const response = await fetch(el.src);
              imageBytes = await response.arrayBuffer();
            }
            
            const isPng = el.src.toLowerCase().includes('.png') || el.src.startsWith('data:image/png');
            const isJpg = el.src.toLowerCase().includes('.jpg') || el.src.toLowerCase().includes('.jpeg') || el.src.startsWith('data:image/jpeg');
            
            if (isPng) {
              image = await pdfDoc.embedPng(imageBytes);
            } else if (isJpg) {
              image = await pdfDoc.embedJpg(imageBytes);
            } else {
              const bytes = new Uint8Array(imageBytes);
              const isPngHeader = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
              const isJpgHeader = bytes[0] === 0xFF && bytes[1] === 0xD8;
              
              if (isPngHeader) {
                image = await pdfDoc.embedPng(imageBytes);
              } else if (isJpgHeader) {
                image = await pdfDoc.embedJpg(imageBytes);
              } else {
                try {
                  image = await pdfDoc.embedJpg(imageBytes);
                } catch {
                  image = await pdfDoc.embedPng(imageBytes);
                }
              }
            }
            imageCache.set(el.src, image);
          }
          
          page.drawImage(image, {
            x: xPt,
            y: yPt,
            width: wPt,
            height: hPt,
            rotate: el.rotate ? degrees(-el.rotate) : undefined
          });
        } catch (err) {
          console.error('Failed to embed image:', err);
        }
      }
      
      if (el.type === 'qr') {
        try {
          let image;
          
          // Handle VietQR with external image URL
          if (el.qrTemplate === 'vietqr' && el.vietQRImageUrl) {
            const qrCacheKey = `vietqr-${el.vietQRImageUrl}`;
            image = imageCache.get(qrCacheKey);
            
            if (!image) {
              const vietQRBytes = await fetchVietQRImage(el.vietQRImageUrl);
              if (vietQRBytes) {
                image = await pdfDoc.embedPng(vietQRBytes);
                imageCache.set(qrCacheKey, image);
              } else {
                // Fallback
                const qrDataUrl = await generateQRCodeDataUrl(el.content || 'VietQR', Math.round(wPt), Math.round(hPt));
                const base64 = qrDataUrl.split(',')[1];
                const binary = atob(base64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                  bytes[i] = binary.charCodeAt(i);
                }
                image = await pdfDoc.embedPng(bytes.buffer);
              }
            }
          } else {
            // Standard QR code
            const qrCacheKey = `qr-${el.content}-${wPt}-${hPt}`;
            image = imageCache.get(qrCacheKey);
            
            if (!image) {
              const qrDataUrl = await generateQRCodeDataUrl(el.content || '123456', Math.round(wPt), Math.round(hPt));
              const base64 = qrDataUrl.split(',')[1];
              const binary = atob(base64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
              }
              image = await pdfDoc.embedPng(bytes.buffer);
              imageCache.set(qrCacheKey, image);
            }
          }
          
          page.drawImage(image, {
            x: xPt,
            y: yPt,
            width: wPt,
            height: hPt,
            rotate: el.rotate ? degrees(-el.rotate) : undefined
          });
        } catch (err) {
          console.error('Failed to generate QR:', err);
        }
      }
      
      if (el.type === 'barcode') {
        try {
          const barcodeCacheKey = `barcode-${el.content}-${wPt}-${hPt}`;
          let image = imageCache.get(barcodeCacheKey);
          
          if (!image) {
            const barcodeDataUrl = generateBarcodeDataUrl(el.content || '123456', Math.round(wPt), Math.round(hPt));
            const base64 = barcodeDataUrl.split(',')[1];
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            image = await pdfDoc.embedPng(bytes.buffer);
            imageCache.set(barcodeCacheKey, image);
          }
          
          page.drawImage(image, {
            x: xPt,
            y: yPt,
            width: wPt,
            height: hPt,
            rotate: el.rotate ? degrees(-el.rotate) : undefined
          });
        } catch (err) {
          console.error('Failed to generate barcode:', err);
        }
      }
    }
  }
  
  console.log(`PDF Multi-Page Export: Complete, ${pages.length} pages generated`);
  return await pdfDoc.save();
}

export interface SheetExportOptions {
  pageWidthMm: number;
  pageHeightMm: number;
  sheetWidthMm: number;
  sheetHeightMm: number;
  shape: 'rect' | 'circle';
  layoutMode?: string;
  marginTopMm: number;
  marginLeftMm: number;
  gapHMm: number;
  gapVMm: number;
  useCropMark: boolean;
  cropLenMm: number;
  cropDistMm: number;
  cropThickPt: number;
  cropColor: string;
  pageNumber?: 'none' | 'header' | 'footer';
  pages: KonvaElement[][];
  background?: BackgroundConfig;
}

interface PdfLayoutCell {
  x: number; y: number; w: number; h: number; rotate: number;
}

function _pdfGrid(
  sheetW: number, sheetH: number,
  w: number, h: number,
  mT: number, mL: number,
  gH: number, gV: number,
  rot: number
): PdfLayoutCell[] {
  const bw = rot === 90 || rot === 270 ? h : w;
  const bh = rot === 90 || rot === 270 ? w : h;
  const uW = sheetW - mL * 2, uH = sheetH - mT * 2;
  const cols = Math.max(1, Math.floor((uW + gH) / (bw + gH)));
  const rows = Math.max(1, Math.floor((uH + gV) / (bh + gV)));
  const gw = cols * bw + (cols - 1) * gH;
  const gh = rows * bh + (rows - 1) * gV;
  const ox = (sheetW - gw) / 2, oy = (sheetH - gh) / 2;
  const c: PdfLayoutCell[] = [];
  for (let r = 0; r < rows; r++)
    for (let cc = 0; cc < cols; cc++)
      c.push({ x: ox + cc * (bw + gH), y: oy + r * (bh + gV), w, h, rotate: rot });
  return c;
}

function computePdfLayoutCells(
  sheetW: number, sheetH: number,
  itemW: number, itemH: number,
  mT: number, mL: number,
  gH: number, gV: number,
  mode: string, shape: string
): PdfLayoutCell[] {
  const effW = shape === 'circle' ? Math.min(itemW, itemH) : itemW;
  const effH = shape === 'circle' ? Math.min(itemW, itemH) : itemH;
  const uW = sheetW - mL * 2, uH = sheetH - mT * 2;
  const bw90 = effH, bh90 = effW;

  if (mode === 'grid')
    return _pdfGrid(sheetW, sheetH, effW, effH, mT, mL, gH, gV, 0);

  if (mode === 'gridH') {
    const colsN = Math.max(1, Math.floor((uW + gH) / (effW + gH)));
    const colsR = Math.max(1, Math.floor((uW + gH) / (bw90 + gH)));
    const gwN = colsN * effW + (colsN - 1) * gH;
    const gwR = colsR * bw90 + (colsR - 1) * gH;
    // Pass 1: compute total height
    let totalH = 0;
    const rowInfo: { h: number; rot: boolean }[] = [];
    let isRot = false;
    while (true) {
      const rh = !isRot ? effH : bh90;
      if (totalH + (rowInfo.length > 0 ? gV : 0) + rh > uH + 0.01) break;
      totalH += (rowInfo.length > 0 ? gV : 0) + rh;
      rowInfo.push({ h: rh, rot: isRot });
      isRot = !isRot;
    }
    // Pass 2: place centered
    const cells: PdfLayoutCell[] = [];
    let cy = (sheetH - totalH) / 2;
    for (const row of rowInfo) {
      if (!row.rot) {
        const ox = (sheetW - gwN) / 2;
        for (let c = 0; c < colsN; c++)
          cells.push({ x: ox + c * (effW + gH), y: cy, w: effW, h: effH, rotate: 0 });
      } else {
        const ox = (sheetW - gwR) / 2;
        for (let c = 0; c < colsR; c++)
          cells.push({ x: ox + c * (bw90 + gH), y: cy, w: effW, h: effH, rotate: 90 });
      }
      cy += row.h + gV;
    }
    const plain = _pdfGrid(sheetW, sheetH, effW, effH, mT, mL, gH, gV, 0);
    return cells.length > plain.length ? cells : plain;
  }

  if (mode === 'gridV') {
    const rowsN = Math.max(1, Math.floor((uH + gV) / (effH + gV)));
    const rowsR = Math.max(1, Math.floor((uH + gV) / (bh90 + gV)));
    const ghN = rowsN * effH + (rowsN - 1) * gV;
    const ghR = rowsR * bh90 + (rowsR - 1) * gV;
    // Pass 1: compute total width
    let totalW = 0;
    const colInfo: { w: number; rot: boolean }[] = [];
    let isRot = false;
    while (true) {
      const cw = !isRot ? effW : bw90;
      if (totalW + (colInfo.length > 0 ? gH : 0) + cw > uW + 0.01) break;
      totalW += (colInfo.length > 0 ? gH : 0) + cw;
      colInfo.push({ w: cw, rot: isRot });
      isRot = !isRot;
    }
    // Pass 2: place centered
    const cells: PdfLayoutCell[] = [];
    let cx = (sheetW - totalW) / 2;
    for (const col of colInfo) {
      if (!col.rot) {
        const oy = (sheetH - ghN) / 2;
        for (let r = 0; r < rowsN; r++)
          cells.push({ x: cx, y: oy + r * (effH + gV), w: effW, h: effH, rotate: 0 });
      } else {
        const oy = (sheetH - ghR) / 2;
        for (let r = 0; r < rowsR; r++)
          cells.push({ x: cx, y: oy + r * (bh90 + gV), w: effW, h: effH, rotate: 90 });
      }
      cx += col.w + gH;
    }
    const plain = _pdfGrid(sheetW, sheetH, effW, effH, mT, mL, gH, gV, 0);
    return cells.length > plain.length ? cells : plain;
  }

  if (mode === 'brick') {
    const cols = Math.max(1, Math.floor((uW + gH) / (effW + gH)));
    const rows = Math.max(1, Math.floor((uH + gV) / (effH + gV)));
    const gw = cols * effW + (cols - 1) * gH;
    const oy = (sheetH - (rows * effH + (rows - 1) * gV)) / 2;
    const ox = (sheetW - gw) / 2;
    const half = (effW + gH) / 2;
    const cells: PdfLayoutCell[] = [];
    for (let r = 0; r < rows; r++) {
      const shift = r % 2 === 1 ? half : 0;
      for (let c = 0; ; c++) {
        const cx = ox + shift + c * (effW + gH);
        if (cx + effW > sheetW - mL + 0.01) break;
        if (cx < mL - 0.01) continue;
        cells.push({ x: cx, y: oy + r * (effH + gV), w: effW, h: effH, rotate: 0 });
      }
    }
    return cells;
  }

  if (mode === 'rotateAlt') {
    const cols = Math.max(1, Math.floor((uW + gH) / (effW + gH)));
    const rows = Math.max(1, Math.floor((uH + gV) / (effH + gV)));
    const gw = cols * effW + (cols - 1) * gH;
    const gh = rows * effH + (rows - 1) * gV;
    const ox = (sheetW - gw) / 2, oy = (sheetH - gh) / 2;
    const cells: PdfLayoutCell[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        cells.push({ x: ox + c * (effW + gH), y: oy + r * (effH + gV), w: effW, h: effH, rotate: (r + c) % 2 === 1 ? 180 : 0 });
    return cells;
  }

  if (mode === 'nesting') {
    const pairW = effW + gH + bw90;
    const maxBH = Math.max(effH, bh90);
    const pairCols = Math.max(1, Math.floor((uW + gH) / (pairW + gH)));
    const pairRows = Math.max(1, Math.floor((uH + gV) / (maxBH + gV)));
    const gwA = pairCols * pairW + (pairCols - 1) * gH;
    const ghA = pairRows * maxBH + (pairRows - 1) * gV;
    const oxA = (sheetW - gwA) / 2, oyA = (sheetH - ghA) / 2;
    const cellsA: PdfLayoutCell[] = [];
    for (let r = 0; r < pairRows; r++)
      for (let pc = 0; pc < pairCols; pc++) {
        const bx = oxA + pc * (pairW + gH);
        const cy = oyA + r * (maxBH + gV);
        cellsA.push({ x: bx, y: cy + (maxBH - effH) / 2, w: effW, h: effH, rotate: 0 });
        cellsA.push({ x: bx + effW + gH, y: cy + (maxBH - bh90) / 2, w: effW, h: effH, rotate: 90 });
      }
    const plainN = _pdfGrid(sheetW, sheetH, effW, effH, mT, mL, gH, gV, 0);
    const plainR = _pdfGrid(sheetW, sheetH, effW, effH, mT, mL, gH, gV, 90);
    return [cellsA, plainN, plainR].reduce((a, b) => b.length > a.length ? b : a);
  }

  if (mode === 'auto') {
    const modes = ['grid', 'gridH', 'gridV', 'brick', 'rotateAlt', 'nesting'];
    let best: PdfLayoutCell[] = [];
    for (const m of modes) {
      const c = computePdfLayoutCells(sheetW, sheetH, itemW, itemH, mT, mL, gH, gV, m, shape);
      if (c.length > best.length) best = c;
    }
    return best;
  }

  return _pdfGrid(sheetW, sheetH, effW, effH, mT, mL, gH, gV, 0);
}

export async function exportKonvaToSheetPdf(options: SheetExportOptions): Promise<Uint8Array> {
  const {
    pageWidthMm, pageHeightMm, sheetWidthMm, sheetHeightMm,
    shape, layoutMode, marginTopMm, marginLeftMm, gapHMm, gapVMm,
    useCropMark, cropLenMm, cropDistMm, cropThickPt, cropColor,
    pages, background,
  } = options;

  const itemW = shape === 'circle' ? Math.min(pageWidthMm, pageHeightMm) : pageWidthMm;
  const itemH = shape === 'circle' ? Math.min(pageWidthMm, pageHeightMm) : pageHeightMm;

  const layoutCells = computePdfLayoutCells(
    sheetWidthMm, sheetHeightMm, itemW, itemH,
    marginTopMm, marginLeftMm, gapHMm, gapVMm,
    layoutMode || 'grid', shape
  );
  const perSheet = layoutCells.length;

  const sheetWPt = sheetWidthMm * MM_TO_PT;
  const sheetHPt = sheetHeightMm * MM_TO_PT;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // Pre-embed default font
  let defaultFont: any;
  const defaultFontBytes = await loadDefaultVietnameseFont();
  try {
    defaultFont = defaultFontBytes
      ? await pdfDoc.embedFont(defaultFontBytes)
      : await pdfDoc.embedFont(StandardFonts.Helvetica);
  } catch {
    defaultFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  }

  const fontCache = new Map<string, any>();
  const imageCache = new Map<string, any>();

  // Parse crop color
  const cropRgb = hexToRgb(cropColor || '#000000');
  const cropColorRgb = rgb(cropRgb.r, cropRgb.g, cropRgb.b);
  const cropLenPt = cropLenMm * MM_TO_PT;
  const cropDistPt = cropDistMm * MM_TO_PT;

  const numSheets = Math.ceil(pages.length / perSheet);

  for (let s = 0; s < numSheets; s++) {
    const sheetPage = pdfDoc.addPage([sheetWPt, sheetHPt]);

    for (let i = 0; i < perSheet; i++) {
      const pageIdx = s * perSheet + i;
      if (pageIdx >= pages.length) break;

      const cell = layoutCells[i];
      const cellRotation = cell.rotate;
      // cell.w/h = original item size. Bounding box depends on rotation.
      const isRot90 = cellRotation === 90 || cellRotation === 270;
      const bbW = isRot90 ? cell.h : cell.w; // bounding box width
      const bbH = isRot90 ? cell.w : cell.h; // bounding box height

      // Bounding box position on sheet (mm)
      const bboxXMm = cell.x;
      const bboxYMm = cell.y;
      // Center of bounding box in PDF points (PDF y from bottom)
      const centerXPt = (bboxXMm + bbW / 2) * MM_TO_PT;
      const centerYPt = sheetHPt - (bboxYMm + bbH / 2) * MM_TO_PT;
      // Origin for drawing elements: top-left of original item relative to center
      const origWPt = cell.w * MM_TO_PT;
      const origHPt = cell.h * MM_TO_PT;

      // Use pushOperators to save state, translate to center, rotate, then draw at offset
      // Save graphics state, translate to cell center, rotate
      sheetPage.pushOperators(
        pushGraphicsState(),
        concatTransformationMatrix(1, 0, 0, 1, centerXPt, centerYPt),
        rotateDegrees(-cellRotation),
      );

      // Now (0,0) is at center of cell, rotated. Draw elements relative to item origin.
      // Item origin (top-left in screen coords) = (-origW/2, -origH/2) but PDF y is up
      // so bottom-left of item = (-origW/2, -origH/2)
      const itemOx = -origWPt / 2;
      const itemOy = -origHPt / 2;

      // Clip to circle if needed
      if (shape === 'circle') {
        // Draw circle clip path via ellipse approximation (pdf-lib doesn't support clip, draw white outside)
        // Just draw content inside bounding box — circle clipping not supported in pdf-lib without operators
      }

      // Draw background for this cell
      if (background?.src) {
        try {
          let imgBytes: ArrayBuffer;
          if (background.src.startsWith('data:')) {
            const b64 = background.src.split(',')[1];
            const bin = atob(b64);
            const arr = new Uint8Array(bin.length);
            for (let k = 0; k < bin.length; k++) arr[k] = bin.charCodeAt(k);
            imgBytes = arr.buffer;
          } else {
            imgBytes = await (await fetch(background.src)).arrayBuffer();
          }
          const cacheKey = 'bg';
          let bgImg = imageCache.get(cacheKey);
          if (!bgImg) {
            try { bgImg = await pdfDoc.embedPng(imgBytes); } catch { bgImg = await pdfDoc.embedJpg(imgBytes); }
            imageCache.set(cacheKey, bgImg);
          }
          sheetPage.drawImage(bgImg, { x: itemOx, y: itemOy, width: origWPt, height: origHPt });
        } catch { /* skip */ }
      }

      // Draw elements in original (unrotated) coordinate space
      const els = pages[pageIdx];
      for (const el of els) {
        // Element position in original item space → PDF coords relative to item origin
        const xPt = itemOx + el.x * MM_TO_PT;
        const yPt = itemOy + (cell.h - el.y - el.height) * MM_TO_PT;
        const wPt = el.width * MM_TO_PT;
        const hPt = el.height * MM_TO_PT;

        if (el.type === 'box') {
          if (el.backgroundColor && el.backgroundColor !== 'transparent') {
            const c = hexToRgb(el.backgroundColor);
            sheetPage.drawRectangle({ x: xPt, y: yPt, width: wPt, height: hPt, color: rgb(c.r, c.g, c.b) });
          }
          if (el.borderWidth && el.borderColor) {
            const c = hexToRgb(el.borderColor);
            sheetPage.drawRectangle({ x: xPt, y: yPt, width: wPt, height: hPt, borderColor: rgb(c.r, c.g, c.b), borderWidth: el.borderWidth * MM_TO_PT });
          }
        }

        if (el.type === 'text' && el.content) {
          const isBold = el.fontWeight === 'bold';
          const isItalic = el.fontStyle === 'italic';
          let font = defaultFont;
          if (el.fontFamily) {
            const ck = `${el.fontFamily}-${isBold ? 'b' : ''}-${isItalic ? 'i' : ''}`;
            if (fontCache.has(ck)) {
              font = fontCache.get(ck);
            } else {
              const fb = await loadFontBytes(el.fontFamily, isBold, isItalic);
              if (fb) {
                try { const ef = await pdfDoc.embedFont(fb); fontCache.set(ck, ef); font = ef; } catch { /* use default */ }
              }
            }
          }
          const fsPt = (el.fontSize || 12) * 0.75;
          const tc = hexToRgb(el.color || '#000000');
          const tw = font.widthOfTextAtSize(el.content, fsPt);
          let tx = xPt;
          if (el.textAlignH === 'center') tx = xPt + wPt / 2 - tw / 2;
          else if (el.textAlignH === 'right' || el.textAlignH === 'flex-end') tx = xPt + wPt - tw;
          let ty = yPt + hPt / 2 - fsPt / 2;
          if (el.textAlignV === 'top' || el.textAlignV === 'flex-start') ty = yPt + hPt - fsPt;
          else if (el.textAlignV === 'bottom' || el.textAlignV === 'flex-end') ty = yPt;
          sheetPage.drawText(el.content, { x: tx, y: ty, size: fsPt, font, color: rgb(tc.r, tc.g, tc.b) });
        }

        if ((el.type === 'image' || el.type === 'img-data') && el.src) {
          try {
            let imgBytes: ArrayBuffer;
            if (el.src.startsWith('data:')) {
              const b64 = el.src.split(',')[1];
              const bin = atob(b64);
              const arr = new Uint8Array(bin.length);
              for (let k = 0; k < bin.length; k++) arr[k] = bin.charCodeAt(k);
              imgBytes = arr.buffer;
            } else {
              imgBytes = await (await fetch(el.src)).arrayBuffer();
            }
            let img = imageCache.get(el.src);
            if (!img) {
              try { img = await pdfDoc.embedPng(imgBytes); } catch { img = await pdfDoc.embedJpg(imgBytes); }
              imageCache.set(el.src, img);
            }
            sheetPage.drawImage(img, { x: xPt, y: yPt, width: wPt, height: hPt });
          } catch { /* skip */ }
        }
      }

      // Restore graphics state (undo rotation transform)
      sheetPage.pushOperators(popGraphicsState());
    }

    // Draw page crop marks at 4 corners of the SHEET (matches processor.py logic)
    // Lines start at dist from corner, extend len inward
    if (useCropMark) {
      const d = cropDistPt, l = cropLenPt, t = cropThickPt;
      const W = sheetWPt, H = sheetHPt;
      // Top-left
      sheetPage.drawLine({ start: { x: d, y: H - d }, end: { x: d + l, y: H - d }, thickness: t, color: cropColorRgb });
      sheetPage.drawLine({ start: { x: d, y: H - d }, end: { x: d, y: H - d - l }, thickness: t, color: cropColorRgb });
      // Top-right
      sheetPage.drawLine({ start: { x: W - d - l, y: H - d }, end: { x: W - d, y: H - d }, thickness: t, color: cropColorRgb });
      sheetPage.drawLine({ start: { x: W - d, y: H - d }, end: { x: W - d, y: H - d - l }, thickness: t, color: cropColorRgb });
      // Bottom-left
      sheetPage.drawLine({ start: { x: d, y: d }, end: { x: d + l, y: d }, thickness: t, color: cropColorRgb });
      sheetPage.drawLine({ start: { x: d, y: d }, end: { x: d, y: d + l }, thickness: t, color: cropColorRgb });
      // Bottom-right
      sheetPage.drawLine({ start: { x: W - d - l, y: d }, end: { x: W - d, y: d }, thickness: t, color: cropColorRgb });
      sheetPage.drawLine({ start: { x: W - d, y: d }, end: { x: W - d, y: d + l }, thickness: t, color: cropColorRgb });
    }

    // Draw page number
    const pgNum = options.pageNumber || 'none';
    if (pgNum !== 'none') {
      const label = `Trang ${s + 1} / ${numSheets}`;
      const pnFont = defaultFont;
      const pnSize = 7;
      const tw = pnFont.widthOfTextAtSize(label, pnSize);
      const tx = (sheetWPt - tw) / 2;
      const ty = pgNum === 'header' ? sheetHPt - 3 * MM_TO_PT : 2 * MM_TO_PT;
      sheetPage.drawText(label, { x: tx, y: ty, size: pnSize, font: pnFont, color: rgb(0.4, 0.4, 0.4) });
    }
  }

  return await pdfDoc.save();
}
