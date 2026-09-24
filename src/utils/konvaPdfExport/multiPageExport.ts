import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { generateQRCodeDataUrl, generateBarcodeDataUrl } from '../qrBarcodeGenerator';
import { MM_TO_PT, MultiPageExportOptions, hexToRgb } from './types';
import { loadDefaultVietnameseFont, loadFontBytes } from './fontManager';
import { fetchVietQRImage } from './imageHelpers';

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
