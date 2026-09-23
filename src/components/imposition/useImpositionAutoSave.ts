import { useEffect, useState, useCallback } from 'react';
import {
  ImpositionConfig,
  ShapeTabItem,
  PageItem,
  DataMode,
  ImpositionStyle,
  AUTOSAVE_STORAGE_KEY
} from './types';
import { VectorMaskResult } from '../VectorMaskEditorModal';
import { safeToastSuccess, safeToastError } from './impositionHelpers';

export interface UseImpositionAutoSaveParams {
  config: ImpositionConfig;
  currentPlanIndex: number;
  shapeTabs: ShapeTabItem[];
  activeTabId: string;
  allPages: PageItem[];
  dataMode: DataMode;
  impositionStyle: ImpositionStyle;
  dataModeEnabled: boolean;
  impositionStyleEnabled: boolean;
  xUpQty: number;
  standardQty: number;
  customScale: number;
  customSvgData: string;
  backgroundColor: string;
  vectorMaskResult: VectorMaskResult | null;
}

export function useImpositionAutoSave(params: UseImpositionAutoSaveParams) {
  const {
    config,
    currentPlanIndex,
    shapeTabs,
    activeTabId,
    allPages,
    dataMode,
    impositionStyle,
    dataModeEnabled,
    impositionStyleEnabled,
    xUpQty,
    standardQty,
    customScale,
    customSvgData,
    backgroundColor,
    vectorMaskResult,
  } = params;

  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  const saveToFileManager = useCallback(async (isSilent?: boolean | React.MouseEvent): Promise<boolean> => {
    setIsSaving(true);
    try {
      const stateToSave = {
        config,
        currentPlanIndex,
        shapeTabs,
        activeTabId,
        allPages,
        dataMode,
        impositionStyle,
        dataModeEnabled,
        impositionStyleEnabled,
        xUpQty,
        standardQty,
        customScale,
        customSvgData,
        backgroundColor,
        vectorMaskResult,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(stateToSave));
      setLastSavedTime(new Date().toLocaleTimeString('vi-VN'));
      if (isSilent !== true) {
        safeToastSuccess('Đã lưu tệp vào phiên làm việc thành công');
      }
      return true;
    } catch (e: any) {
      safeToastError('Lỗi lưu tệp: ' + e.message);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [
    config, currentPlanIndex, shapeTabs, activeTabId, allPages,
    dataMode, impositionStyle, dataModeEnabled, impositionStyleEnabled,
    xUpQty, standardQty, customScale, customSvgData, backgroundColor, vectorMaskResult
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const lightAllPages = allPages.map(p => ({
          ...p,
          originalThumb: undefined
        }));
        const lightShapeTabs = shapeTabs.map(t => ({
          ...t,
          sourceImage: t.sourceImage ? {
            ...t.sourceImage,
            originalThumb: undefined
          } : null
        }));
        const stateToSave = {
          config,
          currentPlanIndex,
          shapeTabs: lightShapeTabs,
          activeTabId,
          allPages: lightAllPages,
          dataMode,
          impositionStyle,
          dataModeEnabled,
          impositionStyleEnabled,
          xUpQty,
          standardQty,
          customScale,
          customSvgData,
          backgroundColor,
          vectorMaskResult,
        };

        try {
          localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (quotaErr) {
          // Tier 1 Fallback: Quota exceeded, gọt bỏ cả thumb chỉ giữ thông số
          try {
            const minimalAllPages = allPages.map(p => ({
              ...p,
              thumb: '',
              originalThumb: undefined
            }));
            const minimalShapeTabs = shapeTabs.map(t => ({
              ...t,
              sourceImage: null
            }));
            const minimalState = {
              ...stateToSave,
              allPages: minimalAllPages,
              shapeTabs: minimalShapeTabs,
            };
            localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(minimalState));
          } catch (quotaErr2) {}
        }
      } catch (err) {
        console.warn('[AutoSave] Failed to save state to localStorage:', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [
    config,
    currentPlanIndex,
    shapeTabs,
    activeTabId,
    allPages,
    dataMode,
    impositionStyle,
    dataModeEnabled,
    impositionStyleEnabled,
    xUpQty,
    standardQty,
    customScale,
    customSvgData,
    backgroundColor,
    vectorMaskResult,
  ]);

  return { isSaving, lastSavedTime, saveToFileManager };
}

