import React, { useRef, useState, useEffect, useMemo } from 'react';
import { LayoutGrid, Loader2 } from 'lucide-react';
import { LayoutPlan } from '../../../utils/layoutSolver';
import { ImpositionConfig, PreviewImages } from '../types';

interface ImpositionPreviewAreaProps {
  config: ImpositionConfig;
  currentPlan: LayoutPlan | null;
  previewImages: PreviewImages | null;
  isLoadingPreview: boolean;
  getBR: (scale: number) => string;
  getClipPath: (isFlipped?: boolean) => string;
}

export const ImpositionPreviewArea: React.FC<ImpositionPreviewAreaProps> = ({
  config,
  currentPlan,
  previewImages,
  isLoadingPreview,
  getBR,
  getClipPath
}) => {
  const containerRef = useRef<HTMLElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 600, h: 500 });

  // Measure container size
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ w: rect.width - 48, h: rect.height - 48 });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const scale = useMemo(() => {
    const scaleW = containerSize.w / config.pageW;
    const scaleH = containerSize.h / config.pageH;
    return Math.min(scaleW, scaleH, 3) * 0.95;
  }, [config.pageW, config.pageH, containerSize]);

  // Crop marks path: L-shaped at 4 corners of PAGE
  const cropPath = () => {
    if (!config.useCrop) return '';
    const { cropLen: l, cropDist: d, pageW: pw, pageH: ph } = config;
    const p: string[] = [];
    // Top-left
    p.push(`M ${d},${d} L ${d + l},${d}`, `M ${d},${d} L ${d},${d + l}`);
    // Top-right
    p.push(`M ${pw - d - l},${d} L ${pw - d},${d}`, `M ${pw - d},${d} L ${pw - d},${d + l}`);
    // Bottom-left
    p.push(`M ${d},${ph - d} L ${d + l},${ph - d}`, `M ${d},${ph - d - l} L ${d},${ph - d}`);
    // Bottom-right
    p.push(`M ${pw - d - l},${ph - d} L ${pw - d},${ph - d}`, `M ${pw - d},${ph - d - l} L ${pw - d},${ph - d}`);
    return p.join(' ');
  };

  const getPreserveAspectRatio = () => {
    switch (config.fitMode) {
      case 'stretch':
        return 'none';
      case 'fill':
        return 'xMidYMid slice';
      case 'fit':
      case 'actual':
        return 'xMidYMid meet';
      default:
        return 'xMidYMid slice';
    }
  };

  const objectFitValue =
    config.fitMode === 'stretch'
      ? 'fill'
      : config.fitMode === 'fill'
      ? 'cover'
      : config.fitMode === 'fit'
      ? 'contain'
      : 'none';

  return (
    <main
      ref={containerRef}
      className="flex-1 flex items-center justify-center p-4 overflow-hidden min-w-0 bg-gray-100"
    >
      {currentPlan ? (
        <div
          className="bg-white shadow-2xl rounded-lg relative"
          style={{ width: config.pageW * scale, height: config.pageH * scale }}
        >
          {/* Print area border with 30% gap in corners */}
          <svg
            className="absolute pointer-events-none"
            style={{
              left: ((config.pageW - config.printW) / 2) * scale,
              top: ((config.pageH - config.printH) / 2) * scale,
              width: config.printW * scale,
              height: config.printH * scale
            }}
          >
            {(() => {
              const w = config.printW * scale;
              const h = config.printH * scale;
              const gap = 0.3;
              const startPct = gap;
              const endPct = 1 - gap;
              return (
                <>
                  <line x1={w * startPct} y1={0} x2={w * endPct} y2={0} stroke="#fda4af" strokeWidth="1" strokeDasharray="4,2" />
                  <line x1={w * startPct} y1={h} x2={w * endPct} y2={h} stroke="#fda4af" strokeWidth="1" strokeDasharray="4,2" />
                  <line x1={0} y1={h * startPct} x2={0} y2={h * endPct} stroke="#fda4af" strokeWidth="1" strokeDasharray="4,2" />
                  <line x1={w} y1={h * startPct} x2={w} y2={h * endPct} stroke="#fda4af" strokeWidth="1" strokeDasharray="4,2" />
                </>
              );
            })()}
          </svg>

          {/* Render Items */}
          {currentPlan.items.map((it, i) => {
            const effectiveItemH = config.shape === 'circle' ? config.itemW : config.itemH;
            const isSpecialShape = ['trapezoid', 'triangle', 'hexagon'].includes(config.shape);
            const actualW = it.rot && !isSpecialShape ? effectiveItemH : config.itemW;
            const actualH = it.rot && !isSpecialShape ? config.itemW : effectiveItemH;

            const previewSrc = previewImages
              ? `data:image/png;base64,${
                  it.rot && !isSpecialShape
                    ? previewImages.landscape
                    : previewImages.portrait
                }`
              : null;

            const imgTransform = isSpecialShape && it.rot ? 'rotate(180deg)' : 'none';

            // Special shapes
            if (isSpecialShape) {
              const w = actualW * scale;
              const h = actualH * scale;
              const r =
                config.cornerRadius > 0
                  ? Math.min(config.cornerRadius * scale, w / 4, h / 4)
                  : 0;

              const roundedPath = (points: [number, number][]) => {
                if (r <= 0 || points.length < 3) {
                  return 'M ' + points.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L ') + ' Z';
                }
                let d = '';
                for (let j = 0; j < points.length; j++) {
                  const p0 = points[(j - 1 + points.length) % points.length];
                  const p1 = points[j];
                  const p2 = points[(j + 1) % points.length];

                  const v1 = [p0[0] - p1[0], p0[1] - p1[1]];
                  const v2 = [p2[0] - p1[0], p2[1] - p1[1]];
                  const len1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1]);
                  const len2 = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1]);
                  const actualR = Math.min(r, len1 / 2, len2 / 2);

                  const start = [p1[0] + (v1[0] / len1) * actualR, p1[1] + (v1[1] / len1) * actualR];
                  const end = [p1[0] + (v2[0] / len2) * actualR, p1[1] + (v2[1] / len2) * actualR];

                  if (j === 0) d = `M ${start[0].toFixed(1)},${start[1].toFixed(1)}`;
                  else d += ` L ${start[0].toFixed(1)},${start[1].toFixed(1)}`;
                  d += ` Q ${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${end[0].toFixed(1)},${end[1].toFixed(1)}`;
                }
                return d + ' Z';
              };

              let points: [number, number][] = [];
              if (config.shape === 'trapezoid') {
                const offset = w * 0.15;
                points = [[offset, 0], [w - offset, 0], [w, h], [0, h]];
              } else if (config.shape === 'triangle') {
                points = [[w / 2, 0], [w, h], [0, h]];
              } else if (config.shape === 'hexagon') {
                const y25 = h * 0.25;
                const y75 = h * 0.75;
                points = [[w / 2, 0], [w, y25], [w, y75], [w / 2, h], [0, y75], [0, y25]];
              }

              const pathD = roundedPath(points);
              const clipId = `cp-${i}-${Date.now()}`;

              return (
                <svg
                  key={i}
                  className="absolute"
                  style={{
                    left: it.x * scale,
                    top: it.y * scale,
                    width: w,
                    height: h,
                    overflow: 'visible',
                    transform: it.rot ? 'rotate(180deg)' : 'none'
                  }}
                >
                  <defs>
                    <clipPath id={clipId}>
                      <path d={pathD} />
                    </clipPath>
                  </defs>
                  {previewSrc ? (
                    <image
                      href={previewSrc}
                      width={w}
                      height={h}
                      clipPath={`url(#${clipId})`}
                      preserveAspectRatio={getPreserveAspectRatio()}
                    />
                  ) : (
                    <path d={pathD} fill="rgba(139,92,246,0.15)" />
                  )}
                  <path d={pathD} fill="none" stroke="#a78bfa" strokeWidth="1" shapeRendering="geometricPrecision" />
                  {!previewSrc && (
                    <text
                      x={w / 2}
                      y={h / 2 + 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="10"
                      fontWeight="500"
                      fill="#7c3aed"
                      transform={it.rot ? `rotate(180 ${w / 2} ${h / 2})` : undefined}
                    >
                      {i + 1}
                    </text>
                  )}
                </svg>
              );
            }

            // Normal shapes (rect / oval / circle)
            const clipPathStyle = getClipPath(it.rot && isSpecialShape);
            const borderRadius = getBR(scale);
            const containerW = actualW * scale;
            const containerH = actualH * scale;

            return (
              <div
                key={i}
                className="absolute"
                style={{
                  left: it.x * scale,
                  top: it.y * scale,
                  width: containerW,
                  height: containerH,
                  borderRadius,
                  border: '1px solid #a78bfa',
                  clipPath: clipPathStyle !== 'none' ? clipPathStyle : undefined,
                  backgroundColor: previewSrc ? 'transparent' : 'rgba(139,92,246,0.15)',
                  overflow: 'hidden'
                }}
              >
                {previewSrc ? (
                  <img
                    src={previewSrc}
                    alt=""
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: `${containerW}px`,
                      height: `${containerH}px`,
                      minWidth: `${containerW}px`,
                      minHeight: `${containerH}px`,
                      maxWidth: 'none',
                      maxHeight: 'none',
                      objectFit: objectFitValue,
                      borderRadius,
                      transform: imgTransform,
                      transformOrigin: 'center center'
                    }}
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center">
                    {isLoadingPreview ? (
                      <Loader2 size={12} className="animate-spin text-violet-400" />
                    ) : (
                      <span className="text-[9px] text-violet-500 font-medium">{i + 1}</span>
                    )}
                  </span>
                )}
              </div>
            );
          })}

          {/* Crop marks overlay */}
          {config.useCrop && (
            <svg
              className="absolute inset-0 pointer-events-none"
              width="100%"
              height="100%"
              viewBox={`0 0 ${config.pageW} ${config.pageH}`}
              preserveAspectRatio="none"
            >
              <path
                fill="none"
                stroke={config.cropColor}
                strokeWidth={config.cropThick}
                d={cropPath()}
              />
            </svg>
          )}
        </div>
      ) : (
        <div className="text-gray-400 text-center">
          <LayoutGrid size={48} className="mx-auto mb-3 opacity-40" />
          <p className="text-base">Không có phương án phù hợp</p>
        </div>
      )}
    </main>
  );
};
