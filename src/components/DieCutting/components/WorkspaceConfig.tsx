import React, { useEffect, useRef, useState } from "react";
import { useSelection } from "../stores/selectionStore";
import { useUploadTextureStore } from "../stores/uploadTextureStore";
import BoxDepthSlider from "./BoxDepthSlider";
import BoxSizeSliders from "./BoxSizeSliders";
import KonvaTextureEditor from "../konva/KonvaTextureEditor";
import { apiUrl } from "../constants/api";
import Experience from "../Experience/Experience";
import "./WorkspaceConfig.css";

export const WorkspaceConfig: React.FC = () => {
  const { message } = useSelection();
  const {
    uploadImage,
    backgroundColor,
    setBackgroundColor,
    insideMode,
    setInsideMode,
    is3dBusy,
    editorActions,
  } = useUploadTextureStore();
  const [foldProgress, setFoldProgress] = useState(20);
  const foldMax = 150;
  const [isFoldPlaying, setIsFoldPlaying] = useState(false);
  const foldDirRef = useRef(1);
  const lastTickRef = useRef(0);
  const [isSizeOpen, setIsSizeOpen] = useState(true);
  const [is3dOpen, setIs3dOpen] = useState(true);
  const [is3dExpanded, setIs3dExpanded] = useState(false);
  const [isAdvanceOpen, setIsAdvanceOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  const bgSwatches = [
    "#ffffff", "#f8f9fa", "#f1f3f5", "#e9ecef", "#dee2e6",
    "#ced4da", "#adb5bd", "#6c757d", "#343a40", "#111111",
    "#000000", "#fff3bf", "#ffe8a1", "#ffd43b", "#fcc419",
    "#fab005", "#f08c00", "#e8590c", "#d9480f", "#c92a2a",
    "#fa5252", "#ff6b6b", "#ff8787", "#ffa8a8", "#ffc9c9",
    "#ffe3e3", "#f06595", "#e64980", "#d6336c", "#a61e4d",
    "#7048e8", "#5f3dc4", "#4c6ef5", "#364fc7", "#228be6",
    "#1c7ed6", "#15aabf", "#0c8599", "#12b886", "#0ca678",
    "#40c057", "#2f9e44", "#82c91e", "#74b816", "#94d82d",
    "#d8f5a2",
  ];

  const insideOptions = [
    { label: "Trắng (White)", value: "White", color: "#ffffff" },
    { label: "Bìa Carton", value: "Cardboard", color: "#c79a63" },
  ];

  useEffect(() => {
    if (!isFoldPlaying) return;
    let raf = 0;
    const tick = (t: number) => {
      if (!lastTickRef.current) lastTickRef.current = t;
      const dt = (t - lastTickRef.current) / 1000;
      lastTickRef.current = t;
      const speed = 35; // units per second
      setFoldProgress((prev) => {
        let next = prev + foldDirRef.current * speed * dt;
        if (next >= foldMax) {
          next = foldMax;
          foldDirRef.current = -1;
        } else if (next <= 0) {
          next = 0;
          foldDirRef.current = 1;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      lastTickRef.current = 0;
    };
  }, [isFoldPlaying, foldMax]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setIsColorPickerOpen(false);
      }
    };
    if (isColorPickerOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isColorPickerOpen]);

  return (
    <div className="workspace-diecut">
      {/* Left Sidebar */}
      <div className={`workspace-left ${is3dExpanded ? "is-expanded" : ""}`}>
        {/* Size Settings */}
        <div className={`left-section size ${isSizeOpen ? "is-open" : ""}`}>
          <button
            type="button"
            className="section-toggle"
            onClick={() => setIsSizeOpen((v) => !v)}
          >
            <span>KÍCH THƯỚC HỘP</span>
            <svg className="chevron" viewBox="0 0 10 6" aria-hidden="true">
              <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          <div className="section-body">
            <BoxSizeSliders />
            <BoxDepthSlider />
          </div>
        </div>

        {/* 3D View and Fold Control */}
        <div className={`left-section three-d ${is3dOpen ? "is-open" : ""}`}>
          <button
            type="button"
            className="section-toggle"
            onClick={() => setIs3dOpen((v) => !v)}
          >
            <span>MÔ HÌNH 3D & GẬP HỘP</span>
            <svg className="chevron" viewBox="0 0 10 6" aria-hidden="true">
              <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          <div className="section-body">
            <div className={`right-viewport ${is3dExpanded ? "is-expanded" : ""}`}>
              <button
                type="button"
                className="viewport-toggle"
                onClick={() => setIs3dExpanded((v) => !v)}
                aria-label={is3dExpanded ? "Thu nhỏ 3D" : "Phóng to 3D"}
                title={is3dExpanded ? "Thu nhỏ 3D" : "Phóng to 3D"}
              >
                {is3dExpanded ? "↙" : "↗"}
              </button>
              <div className={`right-viewport-shell ${is3dBusy ? "is-busy" : ""}`}>
                <Experience foldProgress={Math.min(1.5, Math.max(0, foldProgress / 100))} />
              </div>
            </div>

            {/* Fold Timeline Control */}
            <div className="right-fold">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700">Tiến trình gập (Fold)</span>
                <span className="text-xs font-mono font-bold text-indigo-600">
                  {Math.round((foldProgress / foldMax) * 100)}%
                </span>
              </div>
              <div className="fold-row">
                <input
                  type="range"
                  min={0}
                  max={foldMax}
                  step={1}
                  value={foldProgress}
                  onChange={(e) => setFoldProgress(Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="fold-controls">
                  <button
                    type="button"
                    className="fold-btn"
                    onClick={() => setIsFoldPlaying((v) => !v)}
                    aria-label={isFoldPlaying ? "Tạm dừng" : "Phát"}
                    title={isFoldPlaying ? "Tạm dừng" : "Tự động gập/mở"}
                  >
                    {isFoldPlaying ? "❚❚" : "▶"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Advance Message Panel */}
        <div className={`left-section advance ${isAdvanceOpen ? "is-open" : ""}`}>
          <button
            type="button"
            className="section-toggle"
            onClick={() => setIsAdvanceOpen((v) => !v)}
          >
            <span>THÔNG SỐ KỸ THUẬT (LOGS)</span>
            <svg className="chevron" viewBox="0 0 10 6" aria-hidden="true">
              <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          <div className="section-body">
            <textarea
              className="advance-message"
              value={message}
              onDoubleClick={async (e: any) => {
                await navigator.clipboard.writeText(e.target.value);
              }}
              readOnly
            />
          </div>
        </div>
      </div>

      {/* Center 2D Dieline Editor */}
      <div className="workspace-center">
        {/* Top Toolbar */}
        <div className="center-toolbar">
          <div className="toolbar-surface">
            <label className="toolbar-btn toolbar-upload">
              <span>Tải ảnh lên</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadImage(file);
                }}
              />
            </label>

            {/* Unified Color Picker: Background + Inside */}
            <div className="relative inline-flex" ref={colorPickerRef}>
              <button
                type="button"
                className={`toolbar-btn ${isColorPickerOpen ? "border-indigo-500 text-indigo-600 bg-indigo-50/60 shadow-sm" : ""}`}
                onClick={() => setIsColorPickerOpen((v) => !v)}
                title="Tùy chỉnh màu sắc bao bì (Màu nền & Mặt trong)"
              >
                <span>Màu sắc</span>
                <div className="flex items-center gap-1.5 ml-2">
                  <span
                    className="toolbar-swatch"
                    title={`Màu nền ngoài: ${backgroundColor || '#ffffff'}`}
                    style={{ background: backgroundColor || "#ffffff" }}
                  />
                  <span
                    className="toolbar-swatch"
                    title={`Mặt trong: ${insideOptions.find((o) => o.value === insideMode)?.label}`}
                    style={{
                      background:
                        insideOptions.find((o) => o.value === insideMode)?.color || "#ffffff",
                    }}
                  />
                </div>
              </button>

              {isColorPickerOpen && (
                <div className="color-picker-dropdown">
                  {/* Title & Close */}
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                    <span className="text-[12px] font-bold text-slate-800 tracking-wide">
                      MÀU NỀN & MẶT TRONG
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsColorPickerOpen(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-bold leading-none p-1 rounded hover:bg-slate-100 transition-colors"
                      title="Đóng"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Section 1: Background Color */}
                  <div className="mb-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-700">Màu nền ngoài</span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="toolbar-swatch"
                          style={{ background: backgroundColor || "#ffffff" }}
                        />
                        <span className="text-[11px] font-mono text-slate-500 uppercase">
                          {backgroundColor || "#ffffff"}
                        </span>
                      </div>
                    </div>
                    <div className="color-swatches-grid">
                      {bgSwatches.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setBackgroundColor(c)}
                          title={c}
                          className={`toolbar-swatch-btn ${c === backgroundColor ? "is-active" : ""}`}
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Section 2: Inside Material */}
                  <div className="mb-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-700">Mặt trong hộp</span>
                      <span className="text-[11px] font-medium text-slate-500">
                        {insideOptions.find((o) => o.value === insideMode)?.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {insideOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setInsideMode(opt.value)}
                          className={`toolbar-chip justify-center ${opt.value === insideMode ? "is-active" : ""}`}
                        >
                          <span className="toolbar-swatch" style={{ background: opt.color }} />
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Footer with small OK button */}
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Thiết lập thời gian thực</span>
                    <button
                      type="button"
                      onClick={() => setIsColorPickerOpen(false)}
                      className="px-3.5 py-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm transition-all cursor-pointer"
                    >
                      OK
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className="toolbar-btn"
              onClick={() => editorActions?.resetImage?.()}
            >
              Đặt lại ảnh
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => editorActions?.exportCanvasSvg?.()}
            >
              Xuất SVG
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => editorActions?.saveTemplate?.()}
            >
              Lưu mẫu
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => editorActions?.loadTemplate?.()}
            >
              Mở mẫu
            </button>
          </div>
        </div>

        {/* 2D Canvas Editor */}
        <div className="center-canvas">
          <KonvaTextureEditor
            inline
            svgPath={apiUrl("/box-sample/150010.svg")}
          />
        </div>
      </div>
    </div>
  );
};

export default WorkspaceConfig;
