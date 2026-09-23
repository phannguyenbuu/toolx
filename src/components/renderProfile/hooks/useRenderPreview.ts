import { useRef, useCallback, useEffect } from 'react';
import { ColorAdjustSettings } from '../types';
import { applyColorAdjustments, isDefaultColorSettings } from '../../../utils/colorAdjustment';

interface UseRenderPreviewProps {
  sampleCanvas?: HTMLCanvasElement | null;
  showOriginal: boolean;
  colorFilterEnabled: boolean;
  colorSettings: ColorAdjustSettings;
}

export function useRenderPreview({
  sampleCanvas,
  showOriginal,
  colorFilterEnabled,
  colorSettings
}: UseRenderPreviewProps) {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const renderPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 400;
    const h = 280;
    canvas.width = w;
    canvas.height = h;

    if (sampleCanvas) {
      // Dùng trang hiện tại đang mở trong ToolX
      ctx.drawImage(sampleCanvas, 0, 0, w, h);
    } else {
      // Vẽ ảnh mẫu thử nghiệm chuẩn Prepress CMYK Color Target
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, w, h);

      // Thanh dải màu CMYK
      const barH = 36;
      const colors = ['#00a8e8', '#e6007e', '#ffed00', '#1a1a1a', '#e11d48', '#10b981', '#6366f1'];
      const barW = w / colors.length;
      colors.forEach((col, idx) => {
        ctx.fillStyle = col;
        ctx.fillRect(idx * barW, 20, barW, barH);
      });

      // Gradient chuyển tiếp độ xám (Gray ramp)
      const grad = ctx.createLinearGradient(20, 0, w - 20, 0);
      grad.addColorStop(0, '#000000');
      grad.addColorStop(0.5, '#808080');
      grad.addColorStop(1, '#ffffff');
      ctx.fillStyle = grad;
      ctx.fillRect(20, 70, w - 40, 30);

      // Chữ mẫu sắc nét
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('ToolX Print Color Calibrator Test', 24, 130);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('Độ phủ mực: 300% CMYK Coated • Japan Color 2001', 24, 150);

      // Khối tông da chân dung (Skin tone)
      ctx.fillStyle = '#f4c29e';
      ctx.fillRect(24, 170, 70, 70);
      ctx.fillStyle = '#d99879';
      ctx.fillRect(104, 170, 70, 70);

      // Khối bóng đổ chi tiết sâu (Deep shadow 95%)
      ctx.fillStyle = '#1e1b18';
      ctx.fillRect(184, 170, 70, 70);
      ctx.fillStyle = '#0f0e0d';
      ctx.fillRect(264, 170, 70, 70);
    }

    // Nếu không so sánh gốc và bộ lọc màu đang bật, áp dụng filter
    if (!showOriginal && colorFilterEnabled && !isDefaultColorSettings(colorSettings)) {
      const srcData = ctx.getImageData(0, 0, w, h);
      applyColorAdjustments(srcData, ctx, colorSettings);
    }
  }, [sampleCanvas, showOriginal, colorFilterEnabled, colorSettings]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  return {
    previewCanvasRef,
    renderPreview
  };
}
