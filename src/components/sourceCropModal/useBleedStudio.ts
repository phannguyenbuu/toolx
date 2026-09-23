import { useState, useMemo } from 'react';
import { BleedBounds, BleedMode, BleedGapMode, CropBox, CropTransform } from './types';

interface UseBleedStudioProps {
  cutBleed?: number;
  localItemW: number;
  localItemH: number;
  localShape: string;
  imgElement: HTMLImageElement | null;
  imgLoaded: boolean;
  currentImageSrc: string | null;
  setCurrentImageSrc: (src: string | null) => void;
  cropBox: CropBox;
  crop: CropTransform;
  initialBleedBounds?: BleedBounds | null;
  initialBleedPercent?: number;
}

export function useBleedStudio({
  cutBleed = 3,
  localItemW,
  localItemH,
  localShape,
  imgElement,
  imgLoaded,
  currentImageSrc,
  setCurrentImageSrc,
  cropBox,
  crop,
  initialBleedBounds,
  initialBleedPercent,
}: UseBleedStudioProps) {
  // Bleed Studio state (Off / Offset / AI) - Mặc định và tối thiểu 3mm
  const [bleedMode, setBleedMode] = useState<BleedMode>('ai');
  const [bleedMm, setBleedMm] = useState<number>(() => Math.max(3, cutBleed || 3));
  const [bleedPercent, setBleedPercent] = useState<number>(() => {
    const curW = localItemW || 100;
    return Math.round(((3 * 2) / curW) * 100 * 10) / 10;
  });
  const [bleedBgColor, setBleedBgColor] = useState<string>('#ffffff');
  const [bleedGapMode, setBleedGapMode] = useState<BleedGapMode>('expand_gap');

  const [isProcessingBleed, setIsProcessingBleed] = useState(false);
  const [originalBackupSrc, setOriginalBackupSrc] = useState<string | null>(null);
  const [originalBleedBounds, setOriginalBleedBounds] = useState<BleedBounds | null>(initialBleedBounds || null);
  const [originalDimensions, setOriginalDimensions] = useState<{ w: number; h: number } | null>(null);
  const [bleedStatusMsg, setBleedStatusMsg] = useState<string | null>(null);

  // Bleed / Outpaint pixel size calculation (Mặc định và tối thiểu 3mm)
  const effectiveBleedMm = useMemo(() => {
    if (bleedMode === 'off') return 0;
    return Math.max(3, bleedMm);
  }, [bleedMode, bleedMm]);

  const pxPerMm = useMemo(() => {
    return (cropBox.w && localItemW) ? (cropBox.w / localItemW) : 1;
  }, [cropBox.w, localItemW]);

  const bleedPx = useMemo(() => {
    if (bleedMode === 'off') return 0;
    return Math.round(effectiveBleedMm * pxPerMm);
  }, [bleedMode, effectiveBleedMm, pxPerMm]);

  // Original Image Rectangle in local centered coordinates
  const originalImageRect = useMemo(() => {
    if (!imgElement || !cropBox.w) return null;
    const naturalW = imgElement.naturalWidth || imgElement.width;
    const naturalH = imgElement.naturalHeight || imgElement.height;
    if (!naturalW || !naturalH) return null;

    const imgAspect = naturalW / naturalH;
    const baseW = cropBox.w;
    const baseH = baseW / imgAspect;
    const drawW = baseW * crop.zoom;
    const drawH = baseH * crop.zoom;

    if (originalBleedBounds) {
      const x = -drawW / 2 + drawW * originalBleedBounds.leftRatio;
      const y = -drawH / 2 + drawH * originalBleedBounds.topRatio;
      const w = drawW * (1 - originalBleedBounds.leftRatio - originalBleedBounds.rightRatio);
      const h = drawH * (1 - originalBleedBounds.topRatio - originalBleedBounds.bottomRatio);
      return { x, y, w, h };
    }

    if (bleedMode !== 'off') {
      return {
        x: -drawW / 2,
        y: -drawH / 2,
        w: drawW,
        h: drawH,
      };
    }

    return null;
  }, [imgElement, cropBox.w, crop.zoom, originalBleedBounds, bleedMode]);

  // Create continuous pixel offset outward (Replicate border clamp in 2D canvas)
  const applyOffsetBleed = () => {
    if (!imgElement || !imgLoaded || !currentImageSrc) return;
    if (!originalBackupSrc) {
      setOriginalBackupSrc(currentImageSrc);
    }
    const origW = originalDimensions?.w || imgElement.naturalWidth || imgElement.width;
    const origH = originalDimensions?.h || imgElement.naturalHeight || imgElement.height;
    if (!originalDimensions) {
      setOriginalDimensions({ w: origW, h: origH });
    }
    setIsProcessingBleed(true);

    try {
      const curItemH = (localShape === 'circle' ? localItemW : localItemH) || localItemW;
      const pxPerMmW = localItemW > 0 ? (origW / localItemW) : 11.81;
      const pxPerMmH = curItemH > 0 ? (origH / curItemH) : 11.81;
      const padW = Math.max(2, Math.round(effectiveBleedMm * pxPerMmW));
      const padH = Math.max(2, Math.round(effectiveBleedMm * pxPerMmH));
      const newW = origW + padW * 2;
      const newH = origH + padH * 2;

      const offCanvas = document.createElement('canvas');
      offCanvas.width = newW;
      offCanvas.height = newH;
      const offCtx = offCanvas.getContext('2d');
      if (!offCtx) return;

      offCtx.fillStyle = bleedBgColor || '#ffffff';
      offCtx.fillRect(0, 0, newW, newH);

      // 1. Draw central original image
      offCtx.drawImage(imgElement, padW, padH, origW, origH);

      // 2. Continuous offset: Stretch top edge outward
      offCtx.drawImage(imgElement, 0, 0, origW, 1, padW, 0, origW, padH);

      // 3. Stretch bottom edge outward
      offCtx.drawImage(imgElement, 0, origH - 1, origW, 1, padW, padH + origH, origW, padH);

      // 4. Stretch left edge outward
      offCtx.drawImage(imgElement, 0, 0, 1, origH, 0, padH, padW, origH);

      // 5. Stretch right edge outward
      offCtx.drawImage(imgElement, origW - 1, 0, 1, origH, padW + origW, padH, padW, origH);

      // 6. 4 Corners
      offCtx.drawImage(imgElement, 0, 0, 1, 1, 0, 0, padW, padH);
      offCtx.drawImage(imgElement, origW - 1, 0, 1, 1, padW + origW, 0, padW, padH);
      offCtx.drawImage(imgElement, 0, origH - 1, 1, 1, 0, padH + origH, padW, padH);
      offCtx.drawImage(imgElement, origW - 1, origH - 1, 1, 1, padW + origW, padH + origH, padW, padH);

      const resultDataUrl = offCanvas.toDataURL('image/png');
      setOriginalBleedBounds({
        leftRatio: padW / newW,
        rightRatio: padW / newW,
        topRatio: padH / newH,
        bottomRatio: padH / newH,
      });
      setCurrentImageSrc(resultDataUrl);
      setBleedStatusMsg(`✓ Đã tạo Offset tràn lề +${effectiveBleedMm}mm`);
      setTimeout(() => setBleedStatusMsg(null), 3000);
    } catch (err: any) {
      console.error('Lỗi khi tạo Offset:', err);
    } finally {
      setIsProcessingBleed(false);
    }
  };

  // Run AI Outpainting using backend LaMa model
  const applyAIBleed = async () => {
    if (!imgElement || !currentImageSrc) return;
    const srcToUse = originalBackupSrc || currentImageSrc;
    if (!originalBackupSrc) {
      setOriginalBackupSrc(currentImageSrc);
    }
    const origW = originalDimensions?.w || imgElement.naturalWidth || imgElement.width;
    const origH = originalDimensions?.h || imgElement.naturalHeight || imgElement.height;
    if (!originalDimensions) {
      setOriginalDimensions({ w: origW, h: origH });
    }
    setIsProcessingBleed(true);

    const curItemH = (localShape === 'circle' ? localItemW : localItemH) || localItemW;
    const pxPerMmW = localItemW > 0 ? (origW / localItemW) : 11.81;
    const pxPerMmH = curItemH > 0 ? (origH / curItemH) : 11.81;
    const padW = Math.max(2, Math.round(effectiveBleedMm * pxPerMmW));
    const padH = Math.max(2, Math.round(effectiveBleedMm * pxPerMmH));
    const newW = origW + padW * 2;
    const newH = origH + padH * 2;
    const bounds = {
      leftRatio: padW / newW,
      rightRatio: padW / newW,
      topRatio: padH / newH,
      bottomRatio: padH / newH,
    };

    try {
      const res = await fetch(srcToUse);
      const blob = await res.blob();

      const formData = new FormData();
      formData.append('file', blob, 'source.jpg');
      formData.append('bleed_mm', String(effectiveBleedMm));
      formData.append('percent', ((effectiveBleedMm * 2) / localItemW).toFixed(4));
      formData.append('mode', 'smart_portrait');
      formData.append('format', 'image');

      const apiRes = await fetch('/api/outpaint-bleed', {
        method: 'POST',
        body: formData,
      });

      if (!apiRes.ok) {
        throw new Error(`Outpaint server returned ${apiRes.status}`);
      }

      const outBlob = await apiRes.blob();
      const reader = new FileReader();
      reader.onload = () => {
        const outDataUrl = reader.result as string;
        setOriginalBleedBounds(bounds);
        setCurrentImageSrc(outDataUrl);
        setBleedStatusMsg(`✓ Đã tạo bù xén AI +${effectiveBleedMm}mm`);
        setTimeout(() => setBleedStatusMsg(null), 3000);
      };
      reader.readAsDataURL(outBlob);
    } catch (err) {
      console.warn('AI Outpaint failed, falling back to local offset:', err);
      applyOffsetBleed();
    } finally {
      setIsProcessingBleed(false);
    }
  };

  const handleRestoreOriginal = () => {
    if (originalBackupSrc) {
      setCurrentImageSrc(originalBackupSrc);
      setOriginalBackupSrc(null);
      setOriginalBleedBounds(null);
      setOriginalDimensions(null);
    }
  };

  return {
    bleedMode,
    setBleedMode,
    bleedMm,
    setBleedMm,
    bleedPercent,
    setBleedPercent,
    bleedBgColor,
    setBleedBgColor,
    bleedGapMode,
    setBleedGapMode,
    isProcessingBleed,
    originalBackupSrc,
    setOriginalBackupSrc,
    originalBleedBounds,
    setOriginalBleedBounds,
    originalDimensions,
    setOriginalDimensions,
    bleedStatusMsg,
    setBleedStatusMsg,
    effectiveBleedMm,
    pxPerMm,
    bleedPx,
    originalImageRect,
    applyOffsetBleed,
    applyAIBleed,
    handleRestoreOriginal,
  };
}
