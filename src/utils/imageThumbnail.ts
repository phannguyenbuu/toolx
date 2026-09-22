/**
 * Utility to generate fast, lightweight client-side thumbnails.
 * Downscales images to max bounding box (default: 320px) and compresses as JPEG (quality ~0.75).
 * Generates ~15KB - 25KB data URLs to keep DOM/Canvas rendering at 60 FPS even with 99+ slots.
 */

export async function createClientThumbnail(
  source: string | HTMLImageElement | HTMLCanvasElement | Blob | File,
  maxDim: number = 320,
  quality: number = 0.75
): Promise<string> {
  if (!source) return '';

  // If source is already a canvas
  if (source instanceof HTMLCanvasElement) {
    return resizeCanvasToThumbnail(source, maxDim, quality);
  }

  // If source is a Blob or File
  if (source instanceof Blob) {
    return new Promise<string>((resolve) => {
      const objectUrl = URL.createObjectURL(source);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(resizeImageToThumbnail(img, maxDim, quality));
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve('');
      };
      img.src = objectUrl;
    });
  }

  // If source is an HTMLImageElement
  if (source instanceof HTMLImageElement) {
    if (source.complete && source.naturalWidth > 0) {
      return resizeImageToThumbnail(source, maxDim, quality);
    }
    return new Promise<string>((resolve) => {
      const onLoad = () => {
        source.removeEventListener('load', onLoad);
        resolve(resizeImageToThumbnail(source, maxDim, quality));
      };
      source.addEventListener('load', onLoad);
    });
  }

  // If source is a data URL or image URL string
  if (typeof source === 'string') {
    if (!source.startsWith('data:') && !source.startsWith('http') && !source.startsWith('blob:')) {
      return source;
    }

    return new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        resolve(resizeImageToThumbnail(img, maxDim, quality));
      };
      img.onerror = () => {
        // Fallback to original string if image failed to load
        resolve(source);
      };
      img.src = source;
    });
  }

  return '';
}

function resizeImageToThumbnail(img: HTMLImageElement, maxDim: number, quality: number): string {
  const nw = img.naturalWidth || img.width || maxDim;
  const nh = img.naturalHeight || img.height || maxDim;

  const scale = Math.min(1, maxDim / Math.max(nw, nh));
  const tw = Math.max(1, Math.round(nw * scale));
  const th = Math.max(1, Math.round(nh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d');
  if (!ctx) return img.src;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, tw, th);

  try {
    return canvas.toDataURL('image/jpeg', quality);
  } catch (e) {
    return img.src;
  }
}

function resizeCanvasToThumbnail(srcCanvas: HTMLCanvasElement, maxDim: number, quality: number): string {
  const nw = srcCanvas.width;
  const nh = srcCanvas.height;

  const scale = Math.min(1, maxDim / Math.max(nw, nh));
  const tw = Math.max(1, Math.round(nw * scale));
  const th = Math.max(1, Math.round(nh * scale));

  if (tw === nw && th === nh) {
    try {
      return srcCanvas.toDataURL('image/jpeg', quality);
    } catch {
      return '';
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(srcCanvas, 0, 0, tw, th);

  try {
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return '';
  }
}
