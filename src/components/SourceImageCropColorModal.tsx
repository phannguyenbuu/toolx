import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Check } from 'lucide-react';
import { ColorAdjustSettings, DEFAULT_COLOR_SETTINGS, COLOR_PRESETS } from '../utils/colorAdjustment';
import { extractPdfPages, isPdfFile } from '../utils/pdfPageExtractor';
import { calculateStandardImageDimensionsMm } from '../utils/imageDimensions';
import { safeToastSuccess, safeToastError, removeWhiteBackgroundService } from './imposition/impositionHelpers';
import {
  CropTransform, DEFAULT_CROP_TRANSFORM, CropModalLayerTab, TAB_COLORS,
  SourceImageCropColorModalProps, ColorTabType, RemoveBgSettings, DEFAULT_REMOVE_BG_SETTINGS,
  calculateCropBox, renderLiveCanvas, renderExportCanvas, renderThumbnailCanvas,
  useBleedStudio, saveCropSizeSuggestion,
  CropModalLayerBar, CropModalCanvasViewport, CropModalSidebar,
} from './sourceCropModal';

export type { CropTransform, CropModalLayerTab };
export { DEFAULT_CROP_TRANSFORM, saveCropSizeSuggestion };

export const SourceImageCropColorModal: React.FC<SourceImageCropColorModalProps> = (props) => {
  const {
    isOpen, onClose,
    imageUrl, imageSrc,
    imageName, fileName,
    itemW = 100, itemH = 100, shape = 'rect', quantity = 10,
    cutBleed = 3, initialBleedMm = 3, gap = 0,
    initialColorSettings, initialCropSettings,
    initialBleedBounds = null, originalImageBleedBounds = null,
    shapeTabs, layerTabs, activeTabId, onApply,
  } = props;

  const effectiveImgSrc = imageUrl ?? imageSrc ?? null;
  const effectiveFileName = imageName ?? fileName ?? 'Ảnh nguồn';
  const effectiveTabs = shapeTabs ?? layerTabs ?? [];
  const effectiveBleedBounds = initialBleedBounds ?? originalImageBleedBounds ?? null;
  const effectiveBleedVal = cutBleed ?? initialBleedMm ?? 3;

  const [tabs, setTabs] = useState<CropModalLayerTab[]>(() => effectiveTabs.length ? effectiveTabs : [{
    id: 'tab-1', name: 'A', enabled: true, shape: (shape as any) || 'rect',
    itemW, itemH: shape === 'circle' ? itemW : itemH, quantity, color: TAB_COLORS[0],
  }]);
  const [currentTabId, setCurrentTabId] = useState<string>(() => activeTabId || (effectiveTabs[0]?.id ?? 'tab-1'));

  const [localItemW, setLocalItemW] = useState<number>(itemW);
  const [localItemH, setLocalItemH] = useState<number>(shape === 'circle' ? itemW : itemH);
  const [localShape, setLocalShape] = useState<string>(shape || 'rect');
  const [localQuantity, setLocalQuantity] = useState<number>(quantity);
  const [imageStandardDim, setImageStandardDim] = useState<{ w: number; h: number } | null>(null);

  const [currentImageSrc, setCurrentImageSrc] = useState<string | null>(effectiveImgSrc);
  const [currentFileName, setCurrentFileName] = useState<string>(effectiveFileName);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const [crop, setCrop] = useState<CropTransform>(initialCropSettings || { ...DEFAULT_CROP_TRANSFORM });
  const [showGrid, setShowGrid] = useState(false);
  const [colorSettings, setColorSettings] = useState<ColorAdjustSettings>(initialColorSettings || { ...DEFAULT_COLOR_SETTINGS });
  const [colorTab, setColorTab] = useState<ColorTabType>('bleed');



  const viewportRef = useRef<HTMLDivElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [viewportSize, setViewportSize] = useState({ w: 700, h: 520 });

  const cropBox = useMemo(() => calculateCropBox(viewportSize, localItemW, localItemH, localShape, crop.aspectMode),
    [viewportSize, localItemW, localItemH, localShape, crop.aspectMode]);

  const {
    bleedMode, setBleedMode, bleedMm, setBleedMm, bleedPercent, setBleedPercent,
    effectiveBleedMm, bleedPx, pxPerMm, bleedGapMode, setBleedGapMode,
    bleedStatusMsg, setBleedStatusMsg, isProcessingBleed, originalBackupSrc, setOriginalBackupSrc,
    originalBleedBounds, setOriginalBleedBounds, setOriginalDimensions, originalImageRect,
    applyOffsetBleed, applyAIBleed, handleRestoreOriginal,
  } = useBleedStudio({
    cutBleed: effectiveBleedVal,
    localItemW,
    localItemH,
    localShape,
    imgElement,
    imgLoaded,
    currentImageSrc,
    setCurrentImageSrc,
    cropBox,
    crop,
    initialBleedBounds: effectiveBleedBounds,
    initialBleedPercent: props.initialBleedPercent,
  });

  const initialOriginalSrcRef = useRef<string | null>(null);
  const [removeBgSettings, setRemoveBgSettings] = useState<RemoveBgSettings>(DEFAULT_REMOVE_BG_SETTINGS);
  const [removeBgStatusMsg, setRemoveBgStatusMsg] = useState<string | null>(null);
  const [isRemovingWhite, setIsRemovingWhite] = useState(false);

  const updateRemoveBgSetting = useCallback(<K extends keyof RemoveBgSettings>(key: K, value: RemoveBgSettings[K]) => {
    setRemoveBgSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetRemoveBgSettings = useCallback(() => {
    setRemoveBgSettings(DEFAULT_REMOVE_BG_SETTINGS);
  }, []);

  const handleApplyRemoveBg = useCallback(async () => {
    if (!currentImageSrc) return;
    setIsRemovingWhite(true);
    try {
      if (!originalBackupSrc) {
        setOriginalBackupSrc(currentImageSrc);
      }
      const resultDataUrl = await removeWhiteBackgroundService(currentImageSrc, removeBgSettings);
      setCurrentImageSrc(resultDataUrl);
      setRemoveBgStatusMsg('✓ Đã khử nền trắng theo thông số đã chỉnh');
      safeToastSuccess('Đã khử nền trắng thành công!');
      setTimeout(() => setRemoveBgStatusMsg(null), 3500);
    } catch (err) {
      console.error('Lỗi khử nền trắng trong modal:', err);
      safeToastError('Lỗi khử nền trắng');
    } finally {
      setIsRemovingWhite(false);
    }
  }, [currentImageSrc, originalBackupSrc, removeBgSettings, setOriginalBackupSrc]);

  const handleFullResetOriginal = useCallback(() => {
    const orig = initialOriginalSrcRef.current || originalBackupSrc;
    if (orig) {
      setCurrentImageSrc(orig);
      setOriginalBackupSrc(null);
      setOriginalBleedBounds(null);
      setOriginalDimensions(null);
      setRemoveBgStatusMsg('✓ Đã khôi phục lại ảnh gốc ban đầu');
      safeToastSuccess('Đã khôi phục lại ảnh gốc ban đầu!');
      setTimeout(() => setRemoveBgStatusMsg(null), 3000);
    }
  }, [originalBackupSrc, setOriginalBackupSrc, setOriginalBleedBounds, setOriginalDimensions]);

  const hasOriginalBackup = Boolean(
    (originalBackupSrc && originalBackupSrc !== currentImageSrc) ||
    (initialOriginalSrcRef.current && initialOriginalSrcRef.current !== currentImageSrc)
  );

  useEffect(() => {
    if (!isOpen) return;
    const inputTabs = shapeTabs ?? layerTabs ?? [];
    if (inputTabs.length) {
      setTabs(inputTabs);
      const tab = inputTabs.find(t => t.id === activeTabId) || inputTabs[0];
      setCurrentTabId(tab.id);
      const nw = tab.itemW || 100;
      const nh = tab.shape === 'circle' ? nw : (tab.itemH || 100);
      setLocalItemW(nw); setLocalItemH(nh); setLocalShape(tab.shape || 'rect'); setLocalQuantity(tab.quantity || 10);
      const src = tab.sourceImage;
      const initialImg = src?.originalThumb || src?.thumb || effectiveImgSrc;
      initialOriginalSrcRef.current = initialImg;
      setImageStandardDim(src?.w && src?.h ? { w: src.w, h: src.h } : null);
      setCurrentImageSrc(initialImg);
      setCurrentFileName(src?.name || effectiveFileName);
      setCrop(src?.cropSettings || initialCropSettings || { ...DEFAULT_CROP_TRANSFORM });
      setColorSettings(src?.colorSettings || initialColorSettings || { ...DEFAULT_COLOR_SETTINGS });
    } else {
      const nw = itemW || 100;
      const nh = shape === 'circle' ? nw : (itemH || 100);
      setLocalItemW(nw); setLocalItemH(nh); setLocalShape(shape || 'rect'); setLocalQuantity(quantity || 10);
      initialOriginalSrcRef.current = effectiveImgSrc;
      setCurrentImageSrc(effectiveImgSrc); setCurrentFileName(effectiveFileName);
      setCrop(initialCropSettings || { ...DEFAULT_CROP_TRANSFORM });
      setColorSettings(initialColorSettings || { ...DEFAULT_COLOR_SETTINGS });
    }
    setShowOriginal(false);
    setOriginalBackupSrc(null);
  }, [isOpen]);

  useEffect(() => {
    if (!viewportRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry?.contentRect.width > 0 && entry?.contentRect.height > 0) {
        setViewportSize({ w: Math.round(entry.contentRect.width), h: Math.round(entry.contentRect.height) });
      }
    });
    observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, [isOpen]);

  useEffect(() => {
    if (!currentImageSrc) { setImgElement(null); setImgLoaded(false); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { setImgElement(img); setImgLoaded(true); };
    img.onerror = () => { setImgElement(null); setImgLoaded(false); };
    img.src = currentImageSrc;
  }, [currentImageSrc]);

  useEffect(() => {
    if (!isOpen || !imgElement || !imgLoaded || !previewCanvasRef.current) return;
    renderLiveCanvas({ canvas: previewCanvasRef.current, cropBox, imgElement, crop, colorSettings, showOriginal, viewportSize });
  }, [isOpen, imgElement, imgLoaded, cropBox, crop, colorSettings, showOriginal, viewportSize]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (isPdfFile(file)) {
      try {
        const pages = await extractPdfPages(file, file.name);
        if (!pages.length) return;
        const p1 = pages[0];
        setCurrentImageSrc(p1.dataUrl); setCurrentFileName(p1.name);
        setLocalItemW(p1.widthMm); setLocalItemH(p1.heightMm);
        setImageStandardDim({ w: p1.widthMm, h: p1.heightMm });
        setCrop({ ...DEFAULT_CROP_TRANSFORM });
        if (pages.length > 1) {
          setTabs(pages.map((p, idx) => ({
            id: `tab-pdf-${Date.now()}-${idx}`, name: `${idx + 1}`, enabled: true, shape: 'rect',
            itemW: p.widthMm, itemH: p.heightMm, quantity: 10, useTotalLimit: true,
            color: TAB_COLORS[idx % TAB_COLORS.length],
            sourceImage: {
              fileIndex: idx, pageIndex: p.pageIndex, thumb: p.thumbUrl, originalThumb: p.dataUrl,
              name: p.name, w: p.widthMm, h: p.heightMm, rotation: 0,
              cropSettings: { ...DEFAULT_CROP_TRANSFORM }, colorSettings: { ...DEFAULT_COLOR_SETTINGS }
            }
          })));
          setBleedStatusMsg(`✓ Đã nạp ${pages.length} trang PDF thành ${pages.length} Layer!`);
          setTimeout(() => setBleedStatusMsg(null), 4000);
        }
      } catch (err: any) { alert(`Lỗi PDF: ${err.message || 'Không hợp lệ'}`); }
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const res = ev.target?.result as string;
      if (!res) return;
      setCurrentImageSrc(res); setCurrentFileName(file.name);
      setOriginalBackupSrc(null); setOriginalBleedBounds(null); setOriginalDimensions(null);
      setCrop({ ...DEFAULT_CROP_TRANSFORM });
      const img = new Image();
      img.onload = async () => {
        const std = await calculateStandardImageDimensionsMm(img.naturalWidth || img.width, img.naturalHeight || img.height, file);
        const fw = std.w, fh = localShape === 'circle' ? std.w : std.h;
        setImageStandardDim({ w: fw, h: fh }); setLocalItemW(fw); setLocalItemH(fh);
        setTabs(prev => prev.map(t => t.id === currentTabId ? { ...t, itemW: fw, itemH: fh } : t));
      };
      img.src = res;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, panX: crop.panX, panY: crop.panY };
  };
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setCrop(c => ({ ...c, panX: dragStartRef.current.panX + (e.clientX - dragStartRef.current.x), panY: dragStartRef.current.panY + (e.clientY - dragStartRef.current.y) }));
  }, [isDragging]);
  const handleMouseUp = useCallback(() => setIsDragging(false), []);
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    setCrop(c => ({ ...c, zoom: Math.min(5, Math.max(0.2, Math.round(c.zoom * factor * 100) / 100)) }));
  };

  const handleFitImageAspect = () => {
    if (!imgElement || !imgLoaded) return;
    const nw = imgElement.naturalWidth || imgElement.width, nh = imgElement.naturalHeight || imgElement.height;
    if (nw <= 0 || nh <= 0) return;
    const computedH = Math.max(1, Math.round((localItemW * (nh / nw)) * 10) / 10);
    setLocalItemH(computedH);
    setTabs(prev => prev.map(t => t.id === currentTabId ? { ...t, itemH: computedH } : t));
    setCrop(c => ({ ...c, aspectMode: 'item', panX: 0, panY: 0, zoom: 1 }));
  };

  const handleDimChange = (w: number, h: number) => {
    const rw = Math.max(1, Math.round(w * 10) / 10);
    const rh = localShape === 'circle' ? rw : Math.max(1, Math.round(h * 10) / 10);
    setLocalItemW(rw); setLocalItemH(rh);
    setTabs(prev => prev.map(t => t.id === currentTabId ? { ...t, itemW: rw, itemH: rh } : t));
  };

  const handleShapeChange = (s: string) => {
    setLocalShape(s);
    const newH = s === 'circle' ? localItemW : localItemH;
    if (s === 'circle') setLocalItemH(localItemW);
    setTabs(prev => prev.map(t => t.id === currentTabId ? { ...t, shape: s as any, itemH: newH } : t));
  };

  const handleQuantityChange = (q: number) => {
    const rq = Math.min(99, Math.max(1, Math.round(q)));
    setLocalQuantity(rq);
    setTabs(prev => prev.map(t => t.id === currentTabId ? { ...t, quantity: rq } : t));
  };

  const handleSwitchTab = (targetTabId: string) => {
    if (targetTabId === currentTabId) return;
    const tab = tabs.find(t => t.id === targetTabId);
    if (!tab) return;
    setCurrentTabId(targetTabId);
    const tw = tab.itemW || 100, th = tab.shape === 'circle' ? tw : (tab.itemH || 100);
    setLocalItemW(tw); setLocalItemH(th); setLocalShape(tab.shape || 'rect'); setLocalQuantity(tab.quantity || 10);
    const src = tab.sourceImage;
    setImageStandardDim(src?.w && src?.h ? { w: src.w, h: src.h } : null);
    const initialImg = src?.originalThumb || src?.thumb || null;
    initialOriginalSrcRef.current = initialImg;
    setOriginalBackupSrc(null);
    setCurrentImageSrc(initialImg);
    setCrop(src?.cropSettings || { ...DEFAULT_CROP_TRANSFORM });
    setColorSettings(src?.colorSettings || { ...DEFAULT_COLOR_SETTINGS });
  };

  const handleAddTabInModal = () => {
    const idx = tabs.length;
    const newTab: CropModalLayerTab = {
      id: `tab-${Date.now()}`, name: String.fromCharCode(65 + (idx % 26)), enabled: true,
      shape: 'rect', itemW: localItemW, itemH: localItemH, quantity: 10, color: TAB_COLORS[idx % TAB_COLORS.length],
    };
    setTabs([...tabs, newTab]);
    setCurrentTabId(newTab.id);
  };

  const handleDeleteTabInModal = (tabId: string) => {
    if (tabs.length <= 1) return;
    const rem = tabs.filter(t => t.id !== tabId);
    setTabs(rem);
    if (currentTabId === tabId) handleSwitchTab(rem[0].id);
  };



  const handleApply = () => {
    const previewThumb = renderThumbnailCanvas({
      imgElement, imgLoaded, cropBox, crop, colorSettings, currentImageSrc, bleedBgColor: '#ffffff', maxDim: 320,
    }) || currentImageSrc || '';
    const fullExportDataUrl = renderExportCanvas({
      imgElement, imgLoaded, cropBox, crop, colorSettings, currentImageSrc, bleedBgColor: '#ffffff',
    }) || currentImageSrc || '';

    const currentEffH = localShape === 'circle' ? localItemW : localItemH;
    const isBleedActive = bleedMode !== 'off' && !!originalBleedBounds;
    const finalBleedMm = isBleedActive ? effectiveBleedMm : 0;
    const addedGap = (isBleedActive && bleedGapMode === 'expand_gap') ? Math.round(effectiveBleedMm * 2 * 10) / 10 : 0;
    const finalItemW = (isBleedActive && bleedGapMode === 'shrink_item') ? Math.max(1, Math.round((localItemW - effectiveBleedMm * 2) * 10) / 10) : localItemW;
    const finalItemH = localShape === 'circle' ? finalItemW : ((isBleedActive && bleedGapMode === 'shrink_item') ? Math.max(1, Math.round((localItemH - effectiveBleedMm * 2) * 10) / 10) : currentEffH);

    const finalTabs = tabs.map(t => t.id === currentTabId ? {
      ...t, itemW: finalItemW, itemH: finalItemH, shape: localShape as any, quantity: localQuantity,
      sourceImage: currentImageSrc ? {
        fileIndex: 0, pageIndex: 1, thumb: previewThumb || currentImageSrc,
        originalThumb: fullExportDataUrl || currentImageSrc, name: currentFileName,
        w: finalItemW, h: finalItemH, rotation: 0, cropSettings: crop, colorSettings,
        bleedBounds: originalBleedBounds, bleedPercent: bleedMode !== 'off' ? bleedPercent : 0,
      } : t.sourceImage,
    } : t);

    onApply({
      dataUrl: previewThumb || currentImageSrc || '',
      originalImage: fullExportDataUrl || currentImageSrc || '',
      w_mm: finalItemW, h_mm: finalItemH, colorSettings, cropSettings: crop, filename: currentFileName,
      updatedTabs: finalTabs, activeTabId: currentTabId, bleedBounds: originalBleedBounds,
      bleedPercent: bleedMode !== 'off' ? bleedPercent : 0, bleedMm: finalBleedMm, addedGapMm: addedGap,
    });
    onClose();
  };

  if (!isOpen) return null;
  const currentTab = tabs.find(t => t.id === currentTabId) || tabs[0];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 select-none animate-in fade-in duration-150"
      onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col w-[1180px] max-w-[98vw] h-[92vh] max-h-[840px] overflow-hidden relative">
        <CropModalLayerBar
          tabs={tabs} currentTabId={currentTabId} currentImageSrc={currentImageSrc}
          showOriginal={showOriginal} setShowOriginal={setShowOriginal} bleedStatusMsg={bleedStatusMsg}
          onSwitchTab={handleSwitchTab} onToggleTab={tId => setTabs(prev => prev.map(t => t.id === tId ? { ...t, enabled: !t.enabled } : t))}
          onDeleteTab={handleDeleteTabInModal} onAddTab={handleAddTabInModal}
          onUpdateTab={(tId, updates) => setTabs(prev => prev.map(t => t.id === tId ? { ...t, ...updates } : t))}
          onFileSelect={handleFileChange} onClose={onClose}
        />

        <div className="flex-1 flex min-h-0 overflow-hidden">
          <CropModalCanvasViewport
            viewportRef={viewportRef} previewCanvasRef={previewCanvasRef} currentImageSrc={currentImageSrc}
            currentTabName={currentTab?.name} cropBox={cropBox} crop={crop} setCrop={setCrop}
            viewportSize={viewportSize} localItemW={localItemW} localItemH={localItemH} localShape={localShape}
            imgLoaded={imgLoaded} showGrid={showGrid} setShowGrid={setShowGrid}
            originalImageRect={originalImageRect} originalBleedBounds={originalBleedBounds}
            bleedMode={bleedMode} effectiveBleedMm={effectiveBleedMm} bleedPercent={bleedPercent} bleedPx={bleedPx}
            isDragging={isDragging} handleMouseDown={handleMouseDown} handleWheel={handleWheel}
            handleFitImageAspect={handleFitImageAspect} handleResetCrop={() => setCrop({ ...DEFAULT_CROP_TRANSFORM })}
            handleWidthChange={w => handleDimChange(w, localItemH)} handleHeightChange={h => handleDimChange(localItemW, h)}
            handleDimChange={handleDimChange} onOpenUpload={() => fileInputRef.current?.click()}
            onOpenRemoveBgTab={() => setColorTab('removeBg')}
            onRestoreOriginal={handleFullResetOriginal}
            hasOriginalBackup={hasOriginalBackup}
          />

          <CropModalSidebar
            localShape={localShape} handleShapeChange={handleShapeChange} localQuantity={localQuantity}
            handleQuantityChange={handleQuantityChange} localItemW={localItemW} localItemH={localItemH}
            handleDimChange={handleDimChange} imageStandardDim={imageStandardDim} colorSettings={colorSettings}
            updateSetting={(k, v) => setColorSettings(s => ({ ...s, [k]: v }))}
            applyPreset={p => setColorSettings({ ...DEFAULT_COLOR_SETTINGS, ...p.settings })}
            handleResetColor={() => setColorSettings({ ...DEFAULT_COLOR_SETTINGS })}
            colorTab={colorTab} setColorTab={setColorTab} bleedMode={bleedMode} setBleedMode={setBleedMode}
            bleedMm={bleedMm} setBleedMm={setBleedMm} setBleedPercent={setBleedPercent} effectiveBleedMm={effectiveBleedMm}
            bleedGapMode={bleedGapMode} setBleedGapMode={setBleedGapMode} gap={gap} isProcessingBleed={isProcessingBleed}
            originalBackupSrc={originalBackupSrc} applyOffsetBleed={applyOffsetBleed} applyAIBleed={applyAIBleed}
            handleRestoreOriginal={handleFullResetOriginal}
            removeBgSettings={removeBgSettings}
            updateRemoveBgSetting={updateRemoveBgSetting}
            resetRemoveBgSettings={resetRemoveBgSettings}
            isRemovingWhite={isRemovingWhite}
            hasOriginalBackup={hasOriginalBackup}
            applyRemoveWhiteBg={handleApplyRemoveBg}
            removeBgStatusMsg={removeBgStatusMsg}
          />
        </div>

        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
            <span className="font-medium">Tem đích:</span>
            <span className="font-bold text-slate-700">{localItemW} × {localShape === 'circle' ? localItemW : localItemH} mm</span>
            <span>•</span>
            <span>Layer: <strong className="text-violet-700 font-bold">{currentTab?.name || 'A'}</strong></span>
            <span>•</span>
            <span>Hình dạng: {localShape}</span>
            {localQuantity > 0 && <><span>•</span><span>Số lượng: <strong className="text-emerald-700 font-bold">{localQuantity}</strong> tem</span></>}
          </div>

          <div className="flex items-center gap-2.5">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer">
              Hủy
            </button>
            <button type="button" onClick={handleApply} className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer active:scale-98">
              <Check size={16} />
              <span>Áp dụng vào bình trang</span>
            </button>
          </div>
        </div>

        <input type="file" ref={fileInputRef} accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
      </div>
    </div>
  );
};
