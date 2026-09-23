/**
 * Utility to calculate physical printing dimensions (in mm) from image metadata (DPI, pixels).
 */

export interface StandardImageDimension {
  w: number; // in mm
  h: number; // in mm
  dpi: number;
  source: 'embedded_dpi' | 'standard_300dpi' | 'aspect_snap' | 'pdf_points';
}

/**
 * Common standard print dimensions (width x height in mm) for smart snapping.
 */
const COMMON_PRINT_SIZES: Array<{ w: number; h: number; name: string }> = [
  { w: 90, h: 54, name: 'Card visit chuẩn (90×54)' },
  { w: 54, h: 90, name: 'Card visit đứng (54×90)' },
  { w: 85, h: 55, name: 'Card thẻ nhựa (85×55)' },
  { w: 55, h: 85, name: 'Card thẻ nhựa đứng (55×85)' },
  { w: 90, h: 50, name: 'Card visit (90×50)' },
  { w: 50, h: 90, name: 'Card visit đứng (50×90)' },
  { w: 50, h: 50, name: 'Vuông 50×50' },
  { w: 60, h: 60, name: 'Vuông 60×60' },
  { w: 70, h: 70, name: 'Vuông 70×70' },
  { w: 80, h: 80, name: 'Vuông 80×80' },
  { w: 100, h: 100, name: 'Vuông 100×100' },
  { w: 100, h: 150, name: 'Ảnh 10×15 (A6)' },
  { w: 150, h: 100, name: 'Ảnh 15×10' },
  { w: 148, h: 210, name: 'Khổ A5 (148×210)' },
  { w: 210, h: 148, name: 'Khổ A5 ngang (210×148)' },
  { w: 210, h: 297, name: 'Khổ A4 (210×297)' },
  { w: 297, h: 210, name: 'Khổ A4 ngang (297×210)' },
  { w: 297, h: 420, name: 'Khổ A3 (297×420)' },
  { w: 420, h: 297, name: 'Khổ A3 ngang (420×297)' },
];

/**
 * Extract physical DPI from image file buffer (JFIF or PNG pHYs chunk).
 */
export async function extractImageDpi(fileOrBlob?: Blob | File): Promise<number | null> {
  if (!fileOrBlob) return null;
  try {
    const buffer = await fileOrBlob.slice(0, 65536).arrayBuffer();
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // 1. JPEG JFIF check (starts with 0xFFD8)
    if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
      let offset = 2;
      while (offset < bytes.length - 4) {
        if (bytes[offset] !== 0xFF) break;
        const marker = bytes[offset + 1];
        const length = view.getUint16(offset + 2);

        // APP0 (JFIF)
        if (marker === 0xE0) {
          if (
            bytes[offset + 4] === 0x4A && // J
            bytes[offset + 5] === 0x46 && // F
            bytes[offset + 6] === 0x49 && // I
            bytes[offset + 7] === 0x46 && // F
            bytes[offset + 8] === 0x00
          ) {
            const units = bytes[offset + 11]; // 1 = dots per inch, 2 = dots per cm
            const xDensity = view.getUint16(offset + 12);
            if (xDensity > 0) {
              if (units === 1) return xDensity;
              if (units === 2) return Math.round(xDensity * 2.54);
            }
          }
        }
        if (marker === 0xDA) break; // Start of Scan
        offset += 2 + length;
      }
    }

    // 2. PNG pHYs check (starts with 89 50 4E 47)
    if (
      bytes[0] === 0x89 && bytes[1] === 0x50 &&
      bytes[2] === 0x4E && bytes[3] === 0x47
    ) {
      let offset = 8;
      while (offset < bytes.length - 8) {
        const length = view.getUint32(offset);
        const type = String.fromCharCode(
          bytes[offset + 4], bytes[offset + 5],
          bytes[offset + 6], bytes[offset + 7]
        );
        if (type === 'pHYs') {
          const ppuX = view.getUint32(offset + 8);
          const unit = bytes[offset + 16]; // 1 = meter
          if (unit === 1 && ppuX > 0) {
            return Math.round(ppuX * 0.0254);
          }
        }
        if (type === 'IEND') break;
        offset += 12 + length;
      }
    }
  } catch (err) {
    console.warn('extractImageDpi error:', err);
  }
  return null;
}

/**
 * Calculate the standard physical dimensions in mm from an image element or pixel dimensions.
 */
export async function calculateStandardImageDimensionsMm(
  pixelW: number,
  pixelH: number,
  fileOrBlob?: Blob | File
): Promise<StandardImageDimension> {
  if (pixelW <= 0 || pixelH <= 0) {
    return { w: 100, h: 100, dpi: 300, source: 'standard_300dpi' };
  }

  // 1. Try extracting embedded DPI
  const embeddedDpi = await extractImageDpi(fileOrBlob);
  if (embeddedDpi && embeddedDpi >= 100 && embeddedDpi <= 1200) {
    const rawW = (pixelW * 25.4) / embeddedDpi;
    const rawH = (pixelH * 25.4) / embeddedDpi;

    // Check if close to a standard print size (within 1.5mm)
    for (const size of COMMON_PRINT_SIZES) {
      if (Math.abs(rawW - size.w) <= 1.5 && Math.abs(rawH - size.h) <= 1.5) {
        return { w: size.w, h: size.h, dpi: embeddedDpi, source: 'aspect_snap' };
      }
    }

    const roundedW = Math.round(rawW * 10) / 10;
    const roundedH = Math.round(rawH * 10) / 10;
    return {
      w: Math.abs(roundedW - Math.round(roundedW)) < 0.1 ? Math.round(roundedW) : roundedW,
      h: Math.abs(roundedH - Math.round(roundedH)) < 0.1 ? Math.round(roundedH) : roundedH,
      dpi: embeddedDpi,
      source: 'embedded_dpi',
    };
  }

  // 2. Standard prepress 300 DPI calculation
  const rawW300 = (pixelW * 25.4) / 300;
  const rawH300 = (pixelH * 25.4) / 300;

  // Check if close to a standard print size at 300 DPI (within 2mm)
  for (const size of COMMON_PRINT_SIZES) {
    if (Math.abs(rawW300 - size.w) <= 2.0 && Math.abs(rawH300 - size.h) <= 2.0) {
      return { w: size.w, h: size.h, dpi: 300, source: 'aspect_snap' };
    }
  }

  // Check aspect ratio for standard name card (90x54: ratio 1.6667, or 85x55: ratio 1.545)
  const ratio = pixelW / pixelH;
  if (Math.abs(ratio - 90 / 54) < 0.03) {
    // Highly likely 90x54 name card!
    return { w: 90, h: 54, dpi: Math.round((pixelW * 25.4) / 90), source: 'aspect_snap' };
  }
  if (Math.abs(ratio - 54 / 90) < 0.03) {
    return { w: 54, h: 90, dpi: Math.round((pixelW * 25.4) / 54), source: 'aspect_snap' };
  }
  if (Math.abs(ratio - 85 / 55) < 0.03) {
    return { w: 85, h: 55, dpi: Math.round((pixelW * 25.4) / 85), source: 'aspect_snap' };
  }
  if (Math.abs(ratio - 55 / 85) < 0.03) {
    return { w: 55, h: 85, dpi: Math.round((pixelW * 25.4) / 55), source: 'aspect_snap' };
  }
  if (Math.abs(ratio - 1.0) < 0.01) {
    // Square sticker
    const approx = Math.round(rawW300 / 5) * 5;
    if (approx >= 20 && approx <= 200 && Math.abs(rawW300 - approx) <= 3.0) {
      return { w: approx, h: approx, dpi: 300, source: 'aspect_snap' };
    }
  }

  // Fallback: round to 1 decimal place or nearest integer
  const finalW = Math.round(rawW300 * 10) / 10;
  const finalH = Math.round(rawH300 * 10) / 10;
  return {
    w: Math.abs(finalW - Math.round(finalW)) < 0.1 ? Math.round(finalW) : finalW,
    h: Math.abs(finalH - Math.round(finalH)) < 0.1 ? Math.round(finalH) : finalH,
    dpi: 300,
    source: 'standard_300dpi',
  };
}
