import { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PageConfig, mmToPx } from '../types';

export function useCanvasBackground(
  pageConfig: PageConfig,
  setPageConfig: React.Dispatch<React.SetStateAction<PageConfig>>
) {
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (pageConfig.backgroundSrc) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => setBackgroundImage(img);
      img.src = pageConfig.backgroundSrc;
    } else {
      setBackgroundImage(null);
    }
  }, [pageConfig.backgroundSrc]);

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');
        if (context) {
          await page.render({ canvasContext: context, viewport }).promise;
          const src = canvas.toDataURL('image/png');
          setPageConfig(prev => ({ ...prev, backgroundSrc: src, backgroundFit: prev.backgroundFit || 'cover' }));
        }
      } catch (err) {
        console.error('PDF load error:', err);
        alert('Không thể đọc file PDF');
      }
    } else {
      const reader = new FileReader();
      reader.onload = ev => {
        const src = ev.target?.result as string;
        setPageConfig(prev => ({ ...prev, backgroundSrc: src, backgroundFit: prev.backgroundFit || 'cover' }));
      };
      reader.readAsDataURL(file);
    }
  };

  const getBackgroundImageProps = useCallback(() => {
    if (!backgroundImage) return null;
    const pageW = mmToPx(pageConfig.width);
    const pageH = mmToPx(pageConfig.height);
    const imgW = backgroundImage.width;
    const imgH = backgroundImage.height;
    const fit = pageConfig.backgroundFit || 'cover';

    let width = pageW,
      height = pageH,
      x = 0,
      y = 0;

    if (fit === 'stretch' || fit === 'fill') {
      width = pageW;
      height = pageH;
    } else if (fit === 'contain') {
      const scale = Math.min(pageW / imgW, pageH / imgH);
      width = imgW * scale;
      height = imgH * scale;
      x = (pageW - width) / 2;
      y = (pageH - height) / 2;
    } else if (fit === 'cover') {
      const scale = Math.max(pageW / imgW, pageH / imgH);
      width = imgW * scale;
      height = imgH * scale;
      x = (pageW - width) / 2;
      y = (pageH - height) / 2;
    }

    return { x, y, width, height };
  }, [backgroundImage, pageConfig.width, pageConfig.height, pageConfig.backgroundFit]);

  return {
    backgroundInputRef,
    backgroundImage,
    handleBackgroundUpload,
    getBackgroundImageProps
  };
}
