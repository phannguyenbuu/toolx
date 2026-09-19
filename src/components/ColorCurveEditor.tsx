import React, { useRef, useEffect, useState, useCallback } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { CurvePoint, generateCurveLUT } from '../utils/colorAdjustment';

export type CurveChannelType = 'rgb' | 'red' | 'green' | 'blue';

interface ColorCurveEditorProps {
  channel: CurveChannelType;
  points: CurvePoint[];
  onChange: (points: CurvePoint[]) => void;
  onChannelChange: (channel: CurveChannelType) => void;
  isLightMode?: boolean;
}

export const ColorCurveEditor: React.FC<ColorCurveEditorProps> = ({
  channel,
  points,
  onChange,
  onChannelChange,
  isLightMode = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Chọn màu hiển thị đường cong theo kênh
  const getChannelColor = useCallback((ch: CurveChannelType) => {
    switch (ch) {
      case 'red':
        return '#ef4444';
      case 'green':
        return '#22c55e';
      case 'blue':
        return '#3b82f6';
      case 'rgb':
      default:
        return isLightMode ? '#0f172a' : '#f8fafc';
    }
  }, [isLightMode]);

  // Vẽ biểu đồ Curves lên Canvas
  const drawCurve = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 256;
    const height = 256;

    // Reset background
    ctx.clearRect(0, 0, width, height);

    // Nền canvas
    ctx.fillStyle = isLightMode ? '#f8fafc' : '#020617';
    ctx.fillRect(0, 0, width, height);

    // Lưới tọa độ 4x4 (Grid lines tại 25%, 50%, 75%)
    ctx.strokeStyle = isLightMode ? '#e2e8f0' : '#1e293b';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    for (let i = 1; i <= 3; i++) {
      const pos = i * 64;
      // Dọc
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, height);
      ctx.stroke();

      // Ngang
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(width, pos);
      ctx.stroke();
    }

    // Đường chéo tham chiếu 45 độ (Linear reference)
    ctx.strokeStyle = isLightMode ? '#cbd5e1' : '#334155';
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(width, 0);
    ctx.stroke();

    ctx.setLineDash([]); // Tắt nét đứt

    // Tính toán LUT và vẽ đường cong
    const lut = generateCurveLUT(points);
    const strokeColor = getChannelColor(channel);

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let x = 0; x < 256; x++) {
      const y = height - lut[x];
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Vẽ các điểm neo (Control Points)
    points.forEach((pt, idx) => {
      const cx = pt.x;
      const cy = height - pt.y;
      const isSelected = idx === selectedIndex;

      // Vòng tròn điểm neo
      ctx.beginPath();
      ctx.arc(cx, cy, isSelected ? 5.5 : 4, 0, Math.PI * 2);

      if (isSelected) {
        ctx.fillStyle = strokeColor;
        ctx.fill();
        ctx.strokeStyle = isLightMode ? '#ffffff' : '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.fillStyle = isLightMode ? '#ffffff' : '#0f172a';
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }, [points, channel, selectedIndex, isLightMode, getChannelColor]);

  useEffect(() => {
    drawCurve();
  }, [drawCurve]);

  // Chuyển đổi tọa độ chuột sang [0..255]
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = 256 / rect.width;
    const scaleY = 256 / rect.height;
    const mouseX = Math.round((e.clientX - rect.left) * scaleX);
    const mouseY = Math.round((e.clientY - rect.top) * scaleY);
    return {
      x: Math.max(0, Math.min(255, mouseX)),
      y: Math.max(0, Math.min(255, 256 - mouseY)) // Lật trục Y vì đồ họa màn hình đi từ trên xuống
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    const clickRadius = 10;

    // Tìm xem có nhấp trúng điểm neo hiện có không
    let foundIdx: number | null = null;
    points.forEach((pt, idx) => {
      const dist = Math.hypot(pt.x - coords.x, pt.y - coords.y);
      if (dist <= clickRadius) {
        foundIdx = idx;
      }
    });

    if (foundIdx !== null) {
      setSelectedIndex(foundIdx);
      setIsDragging(true);
    } else {
      // Thêm điểm neo mới
      const newPoints = [...points, { x: coords.x, y: coords.y }].sort((a, b) => a.x - b.x);
      const newIdx = newPoints.findIndex((p) => p.x === coords.x && p.y === coords.y);
      setSelectedIndex(newIdx >= 0 ? newIdx : null);
      setIsDragging(true);
      onChange(newPoints);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || selectedIndex === null) return;
    const coords = getCanvasCoords(e);

    const updated = [...points];
    const isFirst = selectedIndex === 0;
    const isLast = selectedIndex === updated.length - 1;

    let newX = coords.x;
    const newY = coords.y;

    if (isFirst) {
      newX = 0; // Cố định điểm đầu ở x = 0
    } else if (isLast) {
      newX = 255; // Cố định điểm cuối ở x = 255
    } else {
      // Giới hạn x giữa hai điểm lân cận
      const prevX = updated[selectedIndex - 1].x;
      const nextX = updated[selectedIndex + 1].x;
      newX = Math.max(prevX + 2, Math.min(nextX - 2, newX));
    }

    updated[selectedIndex] = { x: newX, y: newY };
    onChange(updated);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Xóa điểm neo được chọn (trừ điểm đầu và cuối)
  const handleDeleteSelected = () => {
    if (selectedIndex === null) return;
    if (selectedIndex === 0 || selectedIndex === points.length - 1) {
      return;
    }
    const updated = points.filter((_, idx) => idx !== selectedIndex);
    setSelectedIndex(null);
    onChange(updated);
  };

  // Đặt lại kênh hiện tại về đường chéo tuyến tính
  const handleResetCurrentChannel = () => {
    setSelectedIndex(null);
    onChange([
      { x: 0, y: 0 },
      { x: 255, y: 255 }
    ]);
  };

  const selectedPoint = selectedIndex !== null ? points[selectedIndex] : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Channel Switcher Tabs */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-1 bg-slate-950/40 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => onChannelChange('rgb')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition ${
              channel === 'rgb'
                ? isLightMode
                  ? 'bg-slate-900 text-white shadow'
                  : 'bg-white text-slate-900 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            RGB
          </button>
          <button
            type="button"
            onClick={() => onChannelChange('red')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition ${
              channel === 'red' ? 'bg-rose-600 text-white shadow' : 'text-rose-400 hover:text-rose-300'
            }`}
          >
            Đỏ (R)
          </button>
          <button
            type="button"
            onClick={() => onChannelChange('green')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition ${
              channel === 'green' ? 'bg-emerald-600 text-white shadow' : 'text-emerald-400 hover:text-emerald-300'
            }`}
          >
            Lục (G)
          </button>
          <button
            type="button"
            onClick={() => onChannelChange('blue')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition ${
              channel === 'blue' ? 'bg-blue-600 text-white shadow' : 'text-blue-400 hover:text-blue-300'
            }`}
          >
            Lam (B)
          </button>
        </div>

        <div className="flex items-center gap-1">
          {selectedIndex !== null && selectedIndex > 0 && selectedIndex < points.length - 1 && (
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition"
              title="Xóa điểm neo này"
            >
              <Trash2 size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={handleResetCurrentChannel}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            title="Khôi phục đường thẳng"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Interactive 256x256 Canvas */}
      <div className="flex justify-center">
        <div
          className={`relative rounded-xl overflow-hidden border shadow-inner ${
            isLightMode ? 'border-slate-300 bg-slate-100' : 'border-slate-800 bg-slate-950'
          }`}
          style={{ width: '256px', height: '256px' }}
        >
          <canvas
            ref={canvasRef}
            width={256}
            height={256}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDeleteSelected}
            className="cursor-crosshair block"
          />
        </div>
      </div>

      {/* Point coordinates info */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
        <span>Bấm vào đồ thị để thêm điểm neo, kéo để uốn cong</span>
        {selectedPoint ? (
          <span className="font-mono text-indigo-400 font-semibold">
            In: {selectedPoint.x} | Out: {selectedPoint.y}
          </span>
        ) : (
          <span>Tổng: {points.length} điểm</span>
        )}
      </div>
    </div>
  );
};

export default ColorCurveEditor;
