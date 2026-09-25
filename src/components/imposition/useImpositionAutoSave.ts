import { useEffect, useState, useCallback, useRef } from 'react';
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
import {
  saveWorkspaceToIndexedDB,
  loadWorkspaceFromIndexedDB,
  clearWorkspaceFromIndexedDB
} from './impositionStorageIndexedDB';

export interface UseImpositionAutoSaveParams {
  config: ImpositionConfig;
  setConfig?: React.Dispatch<React.SetStateAction<ImpositionConfig>>;
  currentPlanIndex: number;
  setCurrentPlanIndex?: (idx: number) => void;
  shapeTabs: ShapeTabItem[];
  setShapeTabs?: React.Dispatch<React.SetStateAction<ShapeTabItem[]>>;
  activeTabId: string;
  setActiveTabId?: (id: string) => void;
  allPages: PageItem[];
  setAllPages?: React.Dispatch<React.SetStateAction<PageItem[]>>;
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
    setConfig,
    currentPlanIndex,
    setCurrentPlanIndex,
    shapeTabs,
    setShapeTabs,
    activeTabId,
    setActiveTabId,
    allPages,
    setAllPages,
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
  const isRestoredRef = useRef(false);

  // 1. Tự động phục hồi toàn bộ dữ liệu (shapeTabs, allPages, config) từ IndexedDB khi mở / refresh trang
  useEffect(() => {
    let isCancelled = false;
    loadWorkspaceFromIndexedDB().then((saved) => {
      if (isCancelled || !saved) return;
      if (saved.shapeTabs && saved.shapeTabs.length > 0 && setShapeTabs) {
        setShapeTabs((current) => {
          // Kiểm tra nếu hiện tại đang chỉ có 1 tab rỗng mặc định
          const isInitialDefault = current.length === 1 && !current[0].sourceImage;
          if (isInitialDefault) {
            isRestoredRef.current = true;
            if (setAllPages && saved.allPages && saved.allPages.length > 0) {
              setAllPages(saved.allPages);
            }
            if (setConfig && saved.config) {
              setConfig(saved.config);
            }
            if (setActiveTabId && saved.activeTabId) {
              setActiveTabId(saved.activeTabId);
            }
            if (setCurrentPlanIndex && typeof saved.currentPlanIndex === 'number') {
              setCurrentPlanIndex(saved.currentPlanIndex);
            }
            return saved.shapeTabs;
          }
          return current;
        });
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [setShapeTabs, setAllPages, setConfig, setActiveTabId, setCurrentPlanIndex]);

  // 2. Lưu thủ công vào FileManager / Session
  const saveToFileManager = useCallback(async (isSilent?: boolean | React.MouseEvent): Promise<boolean> => {
    setIsSaving(true);
    try {
      // Lưu đầy đủ cả ảnh vào IndexedDB
      await saveWorkspaceToIndexedDB({
        shapeTabs,
        allPages,
        config,
        activeTabId,
        currentPlanIndex,
      });

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
      try {
        localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(stateToSave));
      } catch (e) {}

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

  // 3. Tự động lưu bền vững vào IndexedDB khi có bất kỳ thay đổi nào
  useEffect(() => {
    const isOnlyDefaultEmpty = shapeTabs.length === 1 && !shapeTabs[0].sourceImage && shapeTabs[0].name === 'A';
    // Không ghi đè nếu chưa nạp xong và chỉ là tab rỗng mặc định
    if (isOnlyDefaultEmpty && !isRestoredRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      // Lưu IndexedDB (bền vững, dung lượng lớn, giữ nguyên toàn bộ hình ảnh & page items)
      saveWorkspaceToIndexedDB({
        shapeTabs,
        allPages,
        config,
        activeTabId,
        currentPlanIndex,
      });

      // Lưu dự phòng sang localStorage (bản rút gọn)
      try {
        const lightAllPages = allPages.map(p => ({ ...p, originalThumb: undefined }));
        const lightShapeTabs = shapeTabs.map(t => ({
          ...t,
          sourceImage: t.sourceImage ? { ...t.sourceImage, originalThumb: undefined } : null
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
        localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(stateToSave));
      } catch (quotaErr) {
        // Quota exceeded cho localStorage được bỏ qua an toàn vì đã lưu đầy đủ trong IndexedDB
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

  // 4. Xóa lưu trữ phiên làm việc khi người dùng bấm "Làm mới"
  const clearAutoSave = useCallback(async () => {
    try {
      await clearWorkspaceFromIndexedDB();
      localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
    } catch (e) {
      console.warn('[AutoSave] Lỗi khi dọn dẹp lưu trữ:', e);
    }
  }, []);

  return { isSaving, lastSavedTime, saveToFileManager, clearAutoSave };
}
