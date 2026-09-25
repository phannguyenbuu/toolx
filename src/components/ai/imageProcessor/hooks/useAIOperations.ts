import { useState, useCallback } from 'react';
import { BoundingBox, ColorMode } from '../types';
import { applyColorEffectToImageData } from '../helpers/colorFilters';

const API_BASE = '/api';

interface UseAIOperationsParams {
  image: string | null;
  setImage: (img: string | null) => void;
  imageFile: File | null;
  setImageFile: (file: File | null) => void;
  imageRef: React.MutableRefObject<HTMLImageElement | null>;
  imageDimensions: { width: number; height: number } | null;
  setImageDimensions: (dims: { width: number; height: number } | null) => void;
  boxes: BoundingBox[];
  setBoxes: React.Dispatch<React.SetStateAction<BoundingBox[]>>;
  fitToScreen: () => void;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  error: string | null;
  setError: (err: string | null) => void;
  success: string | null;
  setSuccess: (msg: string | null) => void;
  showResultActions: boolean;
  setShowResultActions: (val: boolean) => void;
}

export function useAIOperations({
  image,
  setImage,
  imageFile,
  setImageFile,
  imageRef,
  imageDimensions,
  setImageDimensions,
  boxes,
  setBoxes,
  fitToScreen,
  setZoom,
  fileInputRef,
  error,
  setError,
  success,
  setSuccess,
  showResultActions,
  setShowResultActions
}: UseAIOperationsParams) {
  const [isProcessing, setIsProcessing] = useState(false);

  // Outpaint state
  const [outpaintTop, setOutpaintTop] = useState(0);
  const [outpaintBottom, setOutpaintBottom] = useState(0);
  const [outpaintLeft, setOutpaintLeft] = useState(0);
  const [outpaintRight, setOutpaintRight] = useState(0);

  // Upscale state
  const [upscaleFactor, setUpscaleFactor] = useState<2 | 4>(2);

  // Color conversion state
  const [colorMode, setColorMode] = useState<ColorMode>('grayscale');
  const [colorIntensity, setColorIntensity] = useState(100);

  // Inpaint
  const processInpaint = useCallback(async () => {
    if (!imageFile || boxes.length === 0) {
      setError('Vui lòng tải ảnh và vẽ ít nhất 1 vùng cần xử lý');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', imageFile);

      const boxesData = boxes.map((b) => [b.x, b.y, b.x + b.width, b.y + b.height]);
      formData.append('boxes', JSON.stringify(boxesData));
      formData.append('expand', '2');

      const res = await fetch(`${API_BASE}/inpaint`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Xử lý thất bại');
      }

      const blob = await res.blob();
      const resultUrl = URL.createObjectURL(blob);
      setImage(resultUrl);
      setBoxes([]);
      setSuccess('Xử lý thành công! Ảnh đã được cập nhật.');
      setShowResultActions(true);
      setTimeout(() => fitToScreen(), 200);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi xử lý ảnh');
    } finally {
      setIsProcessing(false);
    }
  }, [imageFile, boxes, setImage, setBoxes, fitToScreen, setError, setSuccess, setShowResultActions]);

  // Outpaint
  const processOutpaint = useCallback(async () => {
    if (!imageFile || !imageDimensions) {
      setError('Vui lòng tải ảnh trước');
      return;
    }

    const totalExpand = outpaintTop + outpaintBottom + outpaintLeft + outpaintRight;
    if (totalExpand === 0) {
      setError('Vui lòng chọn ít nhất 1 hướng mở rộng');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      const newWidth = imageDimensions.width + outpaintLeft + outpaintRight;
      const newHeight = imageDimensions.height + outpaintTop + outpaintBottom;

      canvas.width = newWidth;
      canvas.height = newHeight;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, newWidth, newHeight);

      const img = imageRef.current!;
      ctx.drawImage(img, outpaintLeft, outpaintTop);

      const outpaintBoxes: [number, number, number, number][] = [];

      if (outpaintTop > 0) {
        outpaintBoxes.push([0, 0, newWidth, outpaintTop + 10]);
      }
      if (outpaintBottom > 0) {
        outpaintBoxes.push([0, newHeight - outpaintBottom - 10, newWidth, newHeight]);
      }
      if (outpaintLeft > 0) {
        outpaintBoxes.push([0, 0, outpaintLeft + 10, newHeight]);
      }
      if (outpaintRight > 0) {
        outpaintBoxes.push([newWidth - outpaintRight - 10, 0, newWidth, newHeight]);
      }

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95);
      });

      const formData = new FormData();
      formData.append('file', blob, 'expanded.jpg');
      formData.append('boxes', JSON.stringify(outpaintBoxes));
      formData.append('expand', '5');

      const res = await fetch(`${API_BASE}/inpaint`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Xử lý thất bại');
      }

      const resultBlob = await res.blob();
      const resultUrl = URL.createObjectURL(resultBlob);

      setImage(resultUrl);
      setImageFile(new File([resultBlob], 'outpainted.jpg', { type: 'image/jpeg' }));

      setOutpaintTop(0);
      setOutpaintBottom(0);
      setOutpaintLeft(0);
      setOutpaintRight(0);

      setSuccess('Mở rộng ảnh thành công!');
      setShowResultActions(true);
      setTimeout(() => fitToScreen(), 200);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi mở rộng ảnh');
    } finally {
      setIsProcessing(false);
    }
  }, [
    imageFile,
    imageDimensions,
    outpaintTop,
    outpaintBottom,
    outpaintLeft,
    outpaintRight,
    imageRef,
    setImage,
    setImageFile,
    fitToScreen,
    setError,
    setSuccess,
    setShowResultActions
  ]);

  // Remove background
  const processRemoveBg = useCallback(async () => {
    if (!image || !imageRef.current) {
      setError('Vui lòng tải ảnh trước');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = imageRef.current;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const brightness = (r + g + b) / 3;
        const isWhitish = brightness > 240 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20;

        if (isWhitish) {
          data[i + 3] = 0;
        }
      }

      ctx.putImageData(imageData, 0, 0);

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png');
      });

      const resultUrl = URL.createObjectURL(blob);
      setImage(resultUrl);
      setImageFile(new File([blob], 'removed-bg.png', { type: 'image/png' }));
      setSuccess('Đã xóa nền ảnh! (Chế độ đơn giản - xóa nền trắng)');
      setShowResultActions(true);
      setTimeout(() => fitToScreen(), 200);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi xóa nền');
    } finally {
      setIsProcessing(false);
    }
  }, [image, imageRef, setImage, setImageFile, fitToScreen, setError, setSuccess, setShowResultActions]);

  // Upscale
  const processUpscale = useCallback(async () => {
    if (!image || !imageRef.current || !imageDimensions) {
      setError('Vui lòng tải ảnh trước');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = imageRef.current;

      const newWidth = imageDimensions.width * upscaleFactor;
      const newHeight = imageDimensions.height * upscaleFactor;

      canvas.width = newWidth;
      canvas.height = newHeight;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95);
      });

      const resultUrl = URL.createObjectURL(blob);
      setImage(resultUrl);
      setImageFile(new File([blob], `upscaled-${upscaleFactor}x.jpg`, { type: 'image/jpeg' }));
      setSuccess(`Đã nâng cấp ảnh lên ${upscaleFactor}x! (${newWidth}×${newHeight}px)`);
      setShowResultActions(true);
      setTimeout(() => fitToScreen(), 200);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi nâng cấp ảnh');
    } finally {
      setIsProcessing(false);
    }
  }, [
    image,
    imageRef,
    imageDimensions,
    upscaleFactor,
    setImage,
    setImageFile,
    fitToScreen,
    setError,
    setSuccess,
    setShowResultActions
  ]);

  // Color Convert
  const processColorConvert = useCallback(async () => {
    if (!image || !imageRef.current) {
      setError('Vui lòng tải ảnh trước');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = imageRef.current;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      applyColorEffectToImageData(imageData.data, colorMode, colorIntensity);

      ctx.putImageData(imageData, 0, 0);

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95);
      });

      const resultUrl = URL.createObjectURL(blob);
      setImage(resultUrl);
      setImageFile(new File([blob], `color-${colorMode}.jpg`, { type: 'image/jpeg' }));
      setSuccess(`Đã áp dụng hiệu ứng ${colorMode}!`);
      setShowResultActions(true);
      setTimeout(() => fitToScreen(), 200);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi chuyển đổi màu');
    } finally {
      setIsProcessing(false);
    }
  }, [
    image,
    imageRef,
    colorMode,
    colorIntensity,
    setImage,
    setImageFile,
    fitToScreen,
    setError,
    setSuccess,
    setShowResultActions
  ]);

  // Download
  const downloadResult = useCallback(() => {
    if (!image) return;

    const link = document.createElement('a');
    link.href = image;
    link.download = `ai-processed-${Date.now()}.jpg`;
    link.click();
  }, [image]);

  // Full reset
  const fullReset = useCallback(() => {
    setImage(null);
    setImageFile(null);
    setBoxes([]);
    setSuccess(null);
    setError(null);
    setShowResultActions(false);
    setImageDimensions(null);
    setZoom(1);
    setOutpaintTop(0);
    setOutpaintBottom(0);
    setOutpaintLeft(0);
    setOutpaintRight(0);
    setUpscaleFactor(2);
    setColorMode('grayscale');
    setColorIntensity(100);
    imageRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [
    setImage,
    setImageFile,
    setBoxes,
    setImageDimensions,
    setZoom,
    imageRef,
    fileInputRef,
    setError,
    setSuccess,
    setShowResultActions
  ]);

  return {
    isProcessing,
    error,
    setError,
    success,
    setSuccess,
    showResultActions,
    setShowResultActions,
    outpaintTop,
    setOutpaintTop,
    outpaintBottom,
    setOutpaintBottom,
    outpaintLeft,
    setOutpaintLeft,
    outpaintRight,
    setOutpaintRight,
    upscaleFactor,
    setUpscaleFactor,
    colorMode,
    setColorMode,
    colorIntensity,
    setColorIntensity,
    processInpaint,
    processOutpaint,
    processRemoveBg,
    processUpscale,
    processColorConvert,
    downloadResult,
    fullReset
  };
}
