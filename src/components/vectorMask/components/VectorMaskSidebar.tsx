import React from 'react';
import { Sliders, Sparkles, Layers } from 'lucide-react';
import { VectorKnot, ToolMode, PreviewMode, ActiveSidebarTab } from '../types';
import { ToolsTab } from './sidebar/ToolsTab';
import { PresetsTab } from './sidebar/PresetsTab';
import { SettingsTab } from './sidebar/SettingsTab';

interface VectorMaskSidebarProps {
  activeTab: ActiveSidebarTab;
  setActiveTab: (tab: ActiveSidebarTab) => void;
  activeTool: ToolMode;
  setActiveTool: (tool: ToolMode) => void;
  knots: VectorKnot[];
  setKnots: React.Dispatch<React.SetStateAction<VectorKnot[]>>;
  selectedKnotId: string | null;
  setSelectedKnotId: (id: string | null) => void;
  maskW: number;
  maskH: number;
  pushHistory: (newKnots: VectorKnot[]) => void;
  handleFlip: (axis: 'h' | 'v') => void;
  handleRotate: (deg: number) => void;
  handleCenterAlign: () => void;
  handleOffsetMargin: (offset_mm: number) => void;
  handleDeleteSelectedKnot: () => void;
  handleExportSvg: () => void;
  currentImageUrl: string | null;
  showBgImage: boolean;
  setShowBgImage: (val: boolean) => void;
  bgImageOpacity: number;
  setBgImageOpacity: (val: number) => void;
  dieLineColor: string;
  setDieLineColor: (color: string) => void;
  previewMode: PreviewMode;
  setPreviewMode: (mode: PreviewMode) => void;
  showGrid: boolean;
  setShowGrid: (val: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  imgFileInputRef: React.RefObject<HTMLInputElement | null>;
}

export const VectorMaskSidebar: React.FC<VectorMaskSidebarProps> = ({
  activeTab,
  setActiveTab,
  activeTool,
  setActiveTool,
  knots,
  setKnots,
  selectedKnotId,
  setSelectedKnotId,
  maskW,
  maskH,
  pushHistory,
  handleFlip,
  handleRotate,
  handleCenterAlign,
  handleOffsetMargin,
  handleDeleteSelectedKnot,
  handleExportSvg,
  currentImageUrl,
  showBgImage,
  setShowBgImage,
  bgImageOpacity,
  setBgImageOpacity,
  dieLineColor,
  setDieLineColor,
  previewMode,
  setPreviewMode,
  showGrid,
  setShowGrid,
  fileInputRef,
  imgFileInputRef
}) => {
  return (
    <div className="w-80 bg-slate-50 border-l border-slate-200 flex flex-col overflow-y-auto flex-shrink-0">
      {/* Tabs */}
      <div className="grid grid-cols-3 p-1.5 bg-slate-100/90 border-b border-slate-200 gap-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('tools')}
          className={`py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'tools'
              ? 'bg-white text-violet-700 shadow-xs font-bold border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Sliders size={13} />
          <span>Công cụ</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={`py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'presets'
              ? 'bg-white text-violet-700 shadow-xs font-bold border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Sparkles size={13} />
          <span>Mẫu khuôn</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'settings'
              ? 'bg-white text-violet-700 shadow-xs font-bold border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Layers size={13} />
          <span>Hiển thị</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'tools' && (
        <ToolsTab
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          knots={knots}
          selectedKnotId={selectedKnotId}
          handleFlip={handleFlip}
          handleRotate={handleRotate}
          handleCenterAlign={handleCenterAlign}
          handleOffsetMargin={handleOffsetMargin}
          handleDeleteSelectedKnot={handleDeleteSelectedKnot}
          handleExportSvg={handleExportSvg}
          fileInputRef={fileInputRef}
        />
      )}

      {activeTab === 'presets' && (
        <PresetsTab
          maskW={maskW}
          maskH={maskH}
          setKnots={setKnots}
          setSelectedKnotId={setSelectedKnotId}
          pushHistory={pushHistory}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsTab
          currentImageUrl={currentImageUrl}
          showBgImage={showBgImage}
          setShowBgImage={setShowBgImage}
          bgImageOpacity={bgImageOpacity}
          setBgImageOpacity={setBgImageOpacity}
          dieLineColor={dieLineColor}
          setDieLineColor={setDieLineColor}
          previewMode={previewMode}
          setPreviewMode={setPreviewMode}
          showGrid={showGrid}
          setShowGrid={setShowGrid}
          imgFileInputRef={imgFileInputRef}
        />
      )}
    </div>
  );
};
