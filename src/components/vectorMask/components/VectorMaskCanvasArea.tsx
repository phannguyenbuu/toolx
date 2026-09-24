import React from 'react';
import { MousePointer, Plus, Trash2 } from 'lucide-react';
import { VectorKnot, ToolMode, PreviewMode } from '../types';

interface VectorMaskCanvasAreaProps {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  activeTool: ToolMode;
  candidatePoint: { x: number; y: number; index: number } | null;
  showGrid: boolean;
  scale: number;
  pan: { x: number; y: number };
  maskW: number;
  maskH: number;
  currentImageUrl: string | null;
  showBgImage: boolean;
  bgImageOpacity: number;
  previewMode: PreviewMode;
  pathData: string;
  dieLineColor: string;
  dieLineWidth: number;
  knots: VectorKnot[];
  selectedKnotId: string | null;
  hoveredKnotId: string | null;
  setHoveredKnotId: (id: string | null) => void;
  handleWheel: (e: React.WheelEvent) => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  handleKnotMouseDown: (e: React.MouseEvent, knotId: string) => void;
}

export const VectorMaskCanvasArea: React.FC<VectorMaskCanvasAreaProps> = ({
  viewportRef,
  activeTool,
  candidatePoint,
  showGrid,
  scale,
  pan,
  maskW,
  maskH,
  currentImageUrl,
  showBgImage,
  bgImageOpacity,
  previewMode,
  pathData,
  dieLineColor,
  dieLineWidth,
  knots,
  selectedKnotId,
  hoveredKnotId,
  setHoveredKnotId,
  handleWheel,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleKnotMouseDown
}) => {
  return (
    <div
      ref={viewportRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={`flex-1 relative bg-slate-100 overflow-hidden cursor-${
        activeTool === 'pan' ? 'grab' : candidatePoint ? 'copy' : 'default'
      } select-none`}
      style={{
        backgroundImage: showGrid
          ? 'radial-gradient(circle, rgba(148, 163, 184, 0.45) 1px, transparent 1px)'
          : 'none',
        backgroundSize: `${scale * 10}px ${scale * 10}px`
      }}
    >
      {/* SVG Interactive Canvas */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ overflow: 'visible' }}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
          {/* Background Bounding Box */}
          <rect
            x={0}
            y={0}
            width={maskW}
            height={maskH}
            fill="rgba(255, 255, 255, 0.95)"
            stroke="rgba(148, 163, 184, 0.6)"
            strokeWidth={0.6 / scale}
            strokeDasharray={`${3 / scale}, ${3 / scale}`}
          />

          {/* Background Image Reference */}
          {currentImageUrl && showBgImage && previewMode !== 'cut_preview' && (
            <image
              href={currentImageUrl}
              xlinkHref={currentImageUrl}
              x={0}
              y={0}
              width={maskW}
              height={maskH}
              preserveAspectRatio="xMidYMid slice"
              opacity={bgImageOpacity}
            />
          )}

          {/* Mask Overlay Mode Backdrop */}
          {previewMode === 'mask_overlay' && (
            <path
              d={`M -1000 -1000 L ${maskW + 1000} -1000 L ${maskW + 1000} ${maskH + 1000} L -1000 ${maskH + 1000} Z ${pathData}`}
              fill="rgba(15, 23, 42, 0.6)"
              fillRule="evenodd"
            />
          )}

          {/* Cut Preview Mode */}
          {previewMode === 'cut_preview' && currentImageUrl && (
            <g>
              <defs>
                <clipPath id="editor-cut-preview-clip">
                  <path d={pathData} />
                </clipPath>
              </defs>
              <image
                href={currentImageUrl}
                xlinkHref={currentImageUrl}
                x={0}
                y={0}
                width={maskW}
                height={maskH}
                preserveAspectRatio="xMidYMid slice"
                clipPath="url(#editor-cut-preview-clip)"
              />
            </g>
          )}

          {/* Vector Shape Fill / Stroke */}
          <path
            d={pathData}
            fill={previewMode === 'cut_preview' ? 'none' : 'rgba(139, 92, 246, 0.12)'}
            stroke={dieLineColor}
            strokeWidth={dieLineWidth / scale}
            className="pointer-events-auto cursor-move"
          />

          {/* Candidate point on hover */}
          {candidatePoint && (
            <g>
              <circle
                cx={candidatePoint.x}
                cy={candidatePoint.y}
                r={4.5 / scale}
                fill="#10B981"
                stroke="#FFFFFF"
                strokeWidth={1.5 / scale}
              />
              <text
                x={candidatePoint.x + 6 / scale}
                y={candidatePoint.y - 6 / scale}
                fill="#059669"
                fontSize={9 / scale}
                fontWeight="bold"
              >
                + Thêm điểm
              </text>
            </g>
          )}

          {/* Interactive Knots */}
          {knots.map((k, idx) => {
            const isSelected = k.id === selectedKnotId;
            const isHovered = k.id === hoveredKnotId;

            return (
              <g
                key={k.id}
                className="pointer-events-auto cursor-pointer"
                onMouseDown={(e) => handleKnotMouseDown(e, k.id)}
                onMouseEnter={() => setHoveredKnotId(k.id)}
                onMouseLeave={() => setHoveredKnotId(null)}
              >
                {/* Outer touch target */}
                <circle cx={k.x} cy={k.y} r={8 / scale} fill="transparent" />

                {/* Selection Glow */}
                {isSelected && (
                  <circle
                    cx={k.x}
                    cy={k.y}
                    r={7 / scale}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth={2 / scale}
                  />
                )}

                {/* Knot Point Dot */}
                <circle
                  cx={k.x}
                  cy={k.y}
                  r={4 / scale}
                  fill={isSelected ? '#F59E0B' : isHovered ? '#10B981' : '#FFFFFF'}
                  stroke={isSelected ? '#92400E' : isHovered ? '#065F46' : '#6366F1'}
                  strokeWidth={1.2 / scale}
                />

                {/* Index / Label badge */}
                {isSelected && (
                  <g>
                    <rect
                      x={k.x + 5 / scale}
                      y={k.y - 14 / scale}
                      width={32 / scale}
                      height={12 / scale}
                      rx={3 / scale}
                      fill="rgba(255, 255, 255, 0.95)"
                      stroke="#F59E0B"
                      strokeWidth={0.6 / scale}
                    />
                    <text
                      x={k.x + 8 / scale}
                      y={k.y - 5 / scale}
                      fill="#92400E"
                      fontSize={7 / scale}
                      fontWeight="bold"
                    >
                      #{idx + 1}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Bottom floating instruction bar */}
      <div className="absolute bottom-3 left-4 bg-white/95 border border-slate-200/90 backdrop-blur-md rounded-xl px-3.5 py-1.5 flex items-center gap-4 text-[11px] text-slate-600 shadow-lg">
        <span className="flex items-center gap-1.5 font-medium">
          <MousePointer size={13} className="text-violet-600" />
          Kéo điểm neo để di chuyển
        </span>
        <span className="text-slate-300">•</span>
        <span className="flex items-center gap-1.5 font-medium">
          <Plus size={13} className="text-emerald-600" />
          Rê vào cạnh để thêm điểm
        </span>
        <span className="text-slate-300">•</span>
        <span className="flex items-center gap-1.5 font-medium">
          <Trash2 size={13} className="text-rose-500" />
          Chọn điểm + bấm Delete để xóa
        </span>
        <span className="text-slate-300">•</span>
        <span className="text-slate-500">
          Cuộn chuột để Zoom • Giữ Space/chuột giữa để Pan
        </span>
      </div>
    </div>
  );
};
