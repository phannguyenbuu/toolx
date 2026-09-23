import { useState, useEffect, useCallback } from 'react';
import {
  ImpositionConfig,
  ShapeTabItem,
  PageItem,
  DataMode,
  ImpositionStyle,
  ImpositionHistoryItem
} from './types';
import { VectorMaskResult } from '../VectorMaskEditorModal';
import { safeToastSuccess } from './impositionHelpers';

export interface UseImpositionHistoryParams {
  config: ImpositionConfig;
  setConfig: React.Dispatch<React.SetStateAction<ImpositionConfig>>;
  currentPlanIndex: number;
  setCurrentPlanIndex: (idx: number) => void;
  shapeTabs: ShapeTabItem[];
  setShapeTabs: (tabs: ShapeTabItem[]) => void;
  setActiveTabId: (id: string) => void;
  allPages: PageItem[];
  setAllPages: (pages: PageItem[]) => void;
  dataMode: DataMode;
  setDataMode: (dm: DataMode) => void;
  dataModeEnabled: boolean;
  setDataModeEnabled: (v: boolean) => void;
  impositionStyle: ImpositionStyle;
  setImpositionStyle: (s: ImpositionStyle) => void;
  impositionStyleEnabled: boolean;
  setImpositionStyleEnabled: (v: boolean) => void;
  xUpQty: number;
  setXUpQty: (q: number) => void;
  standardQty: number;
  setStandardQty: (q: number) => void;
  customScale: number;
  setCustomScale: (s: number) => void;
  customSvgData: string;
  setCustomSvgData: (svg: string) => void;
  backgroundColor: string;
  setBackgroundColor: (c: string) => void;
  vectorMaskResult: VectorMaskResult | null;
  setVectorMaskResult: (vm: VectorMaskResult | null) => void;
}

export function useImpositionHistory(params: UseImpositionHistoryParams) {
  const {
    config,
    setConfig,
    setCurrentPlanIndex,
    shapeTabs,
    setShapeTabs,
    setActiveTabId,
    allPages,
    setAllPages,
    dataMode,
    setDataMode,
    dataModeEnabled,
    setDataModeEnabled,
    impositionStyle,
    setImpositionStyle,
    impositionStyleEnabled,
    setImpositionStyleEnabled,
    xUpQty,
    setXUpQty,
    standardQty,
    setStandardQty,
    customScale,
    setCustomScale,
    customSvgData,
    setCustomSvgData,
    backgroundColor,
    setBackgroundColor,
    setVectorMaskResult
  } = params;

  const [impositionHistory, setImpositionHistory] = useState<ImpositionHistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem('toolx_imposition_history');
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {}
    return [];
  });

  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string>('');
  const [isUnsavedWarningModalOpen, setIsUnsavedWarningModalOpen] = useState(false);
  const [pendingHistoryToLoad, setPendingHistoryToLoad] = useState<ImpositionHistoryItem | null>(null);

  const getCurrentProjectSnapshot = useCallback(() => {
    return JSON.stringify({
      config,
      shapeTabs: shapeTabs.map(t => ({
        id: t.id,
        name: t.name,
        enabled: t.enabled,
        shape: t.shape,
        itemW: t.itemW,
        itemH: t.itemH,
        quantity: t.quantity,
        color: t.color,
        customSvgData: t.customSvgData,
        cornerRadius: t.cornerRadius
      })),
      allPagesCount: allPages.length,
      dataMode,
      dataModeEnabled,
      impositionStyle,
      impositionStyleEnabled,
      xUpQty,
      standardQty,
      customScale,
      backgroundColor
    });
  }, [config, shapeTabs, allPages.length, dataMode, dataModeEnabled, impositionStyle, impositionStyleEnabled, xUpQty, standardQty, customScale, backgroundColor]);

  useEffect(() => {
    setLastSavedSnapshot(getCurrentProjectSnapshot());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveHistoryItem = useCallback((item: ImpositionHistoryItem) => {
    setImpositionHistory((prev) => {
      const filtered = prev.filter(x => x.id !== item.id);
      const next = [item, ...filtered].slice(0, 30);

      const trySave = (items: ImpositionHistoryItem[]): boolean => {
        try {
          localStorage.setItem('toolx_imposition_history', JSON.stringify(items));
          return true;
        } catch {
          return false;
        }
      };

      if (!trySave(next)) {
        const lightItems: ImpositionHistoryItem[] = next.map(it => ({
          ...it,
          allPagesSnapshot: it.allPagesSnapshot?.map(p => ({ ...p, originalThumb: undefined })),
          shapeTabsSnapshot: it.shapeTabsSnapshot?.map(t => ({
            ...t,
            sourceImage: t.sourceImage ? { ...t.sourceImage, originalThumb: undefined } : null
          }))
        }));
        if (!trySave(lightItems)) {
          const compact = lightItems.slice(0, 10);
          if (!trySave(compact)) {
            const minimal = compact.slice(0, 5).map(it => ({
              ...it,
              thumbnail: '',
              allPagesSnapshot: it.allPagesSnapshot?.map(p => ({ ...p, thumb: '', originalThumb: undefined })),
              shapeTabsSnapshot: it.shapeTabsSnapshot?.map(t => ({ ...t, sourceImage: null }))
            }));
            trySave(minimal);
          }
        }
      }

      return next;
    });
  }, []);

  const deleteHistoryItem = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setImpositionHistory((prev) => {
      const next = prev.filter(x => x.id !== id);
      try {
        localStorage.setItem('toolx_imposition_history', JSON.stringify(next));
      } catch (err) {}
      return next;
    });
    safeToastSuccess('Đã xóa mục lịch sử');
  }, []);

  const clearHistory = useCallback(() => {
    setImpositionHistory([]);
    try {
      localStorage.removeItem('toolx_imposition_history');
    } catch (err) {}
    safeToastSuccess('Đã xóa toàn bộ lịch sử');
  }, []);

  const applyHistoryItem = useCallback((item: ImpositionHistoryItem) => {
    if (item.configSnapshot) {
      setConfig(prev => ({
        ...prev,
        ...item.configSnapshot
      }));
    }
    if (item.currentPlanIndexSnapshot !== undefined && typeof item.currentPlanIndexSnapshot === 'number') {
      setCurrentPlanIndex(item.currentPlanIndexSnapshot);
    }
    if (item.shapeTabsSnapshot && Array.isArray(item.shapeTabsSnapshot) && item.shapeTabsSnapshot.length > 0) {
      setShapeTabs(item.shapeTabsSnapshot);
      setActiveTabId(item.shapeTabsSnapshot[0]?.id || 'tab-a');
    }
    if (item.allPagesSnapshot && Array.isArray(item.allPagesSnapshot)) {
      setAllPages(item.allPagesSnapshot);
    }
    if (item.dataModeSnapshot !== undefined) {
      const dm = item.dataModeSnapshot;
      const num = typeof dm === 'string' ? parseInt(dm, 10) : Number(dm);
      setDataMode((isNaN(num) ? 1 : num) as DataMode);
    }
    if (item.dataModeEnabledSnapshot !== undefined) {
      setDataModeEnabled(item.dataModeEnabledSnapshot);
    }
    if (item.impositionStyleSnapshot) {
      setImpositionStyle(item.impositionStyleSnapshot);
    }
    if (item.impositionStyleEnabledSnapshot !== undefined) {
      setImpositionStyleEnabled(item.impositionStyleEnabledSnapshot);
    }
    if (item.xUpQtySnapshot !== undefined) {
      setXUpQty(item.xUpQtySnapshot);
    }
    if (item.standardQtySnapshot !== undefined) {
      setStandardQty(item.standardQtySnapshot);
    }
    if (item.customScaleSnapshot !== undefined) {
      setCustomScale(item.customScaleSnapshot);
    }
    if (item.customSvgDataSnapshot !== undefined) {
      setCustomSvgData(item.customSvgDataSnapshot);
    }
    if (item.backgroundColorSnapshot) {
      setBackgroundColor(item.backgroundColorSnapshot);
    }
    if (item.vectorMaskResultSnapshot !== undefined) {
      setVectorMaskResult(item.vectorMaskResultSnapshot);
    }

    const newSnapshot = JSON.stringify({
      config: { ...config, ...(item.configSnapshot || {}) },
      shapeTabs: (item.shapeTabsSnapshot || shapeTabs).map(t => ({
        id: t.id,
        name: t.name,
        enabled: t.enabled,
        shape: t.shape,
        itemW: t.itemW,
        itemH: t.itemH,
        quantity: t.quantity,
        color: t.color,
        customSvgData: t.customSvgData,
        cornerRadius: t.cornerRadius
      })),
      allPagesCount: (item.allPagesSnapshot || allPages).length,
      dataMode: item.dataModeSnapshot ?? dataMode,
      dataModeEnabled: item.dataModeEnabledSnapshot ?? dataModeEnabled,
      impositionStyle: item.impositionStyleSnapshot ?? impositionStyle,
      impositionStyleEnabled: item.impositionStyleEnabledSnapshot ?? impositionStyleEnabled,
      xUpQty: item.xUpQtySnapshot ?? xUpQty,
      standardQty: item.standardQtySnapshot ?? standardQty,
      customScale: item.customScaleSnapshot ?? customScale,
      backgroundColor: item.backgroundColorSnapshot ?? backgroundColor
    });
    setLastSavedSnapshot(newSnapshot);

    safeToastSuccess(`Đã nạp thành công lịch sử: "${item.title}"`);
  }, [config, shapeTabs, allPages, dataMode, dataModeEnabled, impositionStyle, impositionStyleEnabled, xUpQty, standardQty, customScale, backgroundColor, setConfig, setCurrentPlanIndex, setShapeTabs, setActiveTabId, setAllPages, setDataMode, setDataModeEnabled, setImpositionStyle, setImpositionStyleEnabled, setXUpQty, setStandardQty, setCustomScale, setCustomSvgData, setBackgroundColor, setVectorMaskResult]);

  const handleRequestRestoreHistory = useCallback((item: ImpositionHistoryItem) => {
    const current = getCurrentProjectSnapshot();
    const isDirty = lastSavedSnapshot !== '' && current !== lastSavedSnapshot;

    if (isDirty) {
      setPendingHistoryToLoad(item);
      setIsUnsavedWarningModalOpen(true);
    } else {
      applyHistoryItem(item);
    }
  }, [getCurrentProjectSnapshot, lastSavedSnapshot, applyHistoryItem]);

  const confirmRestoreHistory = useCallback(() => {
    if (pendingHistoryToLoad) {
      applyHistoryItem(pendingHistoryToLoad);
      setPendingHistoryToLoad(null);
    }
    setIsUnsavedWarningModalOpen(false);
  }, [pendingHistoryToLoad, applyHistoryItem]);

  return {
    impositionHistory,
    saveHistoryItem,
    deleteHistoryItem,
    clearHistory,
    applyHistoryItem,
    handleRequestRestoreHistory,
    isUnsavedWarningModalOpen,
    setIsUnsavedWarningModalOpen,
    pendingHistoryToLoad,
    setPendingHistoryToLoad,
    confirmRestoreHistory,
    updateSavedSnapshot: () => setLastSavedSnapshot(getCurrentProjectSnapshot())
  };
}
