import { BackgroundConfig } from './types';

export async function fetchVietQRImage(url: string): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.arrayBuffer();
  } catch (err) {
    console.error('Failed to fetch VietQR image:', err);
    return null;
  }
}

export async function drawBackground(
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
