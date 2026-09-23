import { useState, useEffect } from 'react';
import { ImpositionConfig, ShapeTabItem, PageItem, DataMode, ImpositionStyle, WorkspaceItem } from './types';
import { VectorMaskResult } from '../VectorMaskEditorModal';
import { workspaceService } from '../../services/workspaceService';

export const PRESET_WORKSPACES: Array<{
  name: string;
  config: ImpositionConfig;
  dataMode: DataMode;
  xUpQty: number;
  standardQty: number;
}> = [
  {
    name: 'Visiting Card',
    config: {
      shape: 'rect', itemW: 90, itemH: 50, padding: 3, cornerRadius: 5,
      pageW: 210, pageH: 297, printW: 190, printH: 277, totalOrder: 1000,
      useCrop: true, cropLen: 5, cropDist: 3, cropThick: 0.25, cropColor: '#000000',
      fitMode: 'fill', colorMode: 'cmyk', dpi: 300, autoRotate: true, processMode: 'vector',
      cutBleed: 3,
      usePrintArea: false, printAreaW: 190, printAreaH: 277,
      marginTop: 10, marginBot: 10, marginLeft: 10, marginRight: 10,
      marginTop2: 10, marginBot2: 10, marginLeft2: 10, marginRight2: 10,
      marginMode: 'safe', useMargin: true,
      alignX: 'center', alignY: 'middle', flowDir: 0,
      usePageCrop: false, pageCropLen: 10, pageCropDist: 10, pageCropThick: 0.5, pageCropColor: '#000000',
      is2Sided: false, rot180Front: false, rot180Back: false, twoSideMode: 'odd-even', useColorBar: false, colorBarPosition: 'bottom', colorBarPadding: 3
    },
    dataMode: 1, xUpQty: 1, standardQty: 1
  },
  {
    name: 'Sticker Circle',
    config: {
      shape: 'circle', itemW: 50, itemH: 50, padding: 2, cornerRadius: 0,
      pageW: 210, pageH: 297, printW: 190, printH: 277, totalOrder: 500,
      useCrop: false, cropLen: 5, cropDist: 3, cropThick: 0.25, cropColor: '#000000',
      fitMode: 'fill', colorMode: 'cmyk', dpi: 300, autoRotate: false, processMode: 'vector',
      cutBleed: 3,
      usePrintArea: false, printAreaW: 190, printAreaH: 277,
      marginTop: 10, marginBot: 10, marginLeft: 10, marginRight: 10,
      marginTop2: 10, marginBot2: 10, marginLeft2: 10, marginRight2: 10,
      marginMode: 'safe', useMargin: true,
      alignX: 'center', alignY: 'middle', flowDir: 0,
      usePageCrop: false, pageCropLen: 10, pageCropDist: 10, pageCropThick: 0.5, pageCropColor: '#000000',
      is2Sided: false, rot180Front: false, rot180Back: false, twoSideMode: 'odd-even', useColorBar: false, colorBarPosition: 'bottom', colorBarPadding: 3
    },
    dataMode: 1, xUpQty: 1, standardQty: 10
  },
  {
    name: 'Label 330x480',
    config: {
      shape: 'rect', itemW: 100, itemH: 60, padding: 5, cornerRadius: 3,
      pageW: 330, pageH: 480, printW: 310, printH: 450, totalOrder: 2000,
      useCrop: true, cropLen: 8, cropDist: 5, cropThick: 0.5, cropColor: '#FF0000',
      fitMode: 'fill', colorMode: 'cmyk', dpi: 300, autoRotate: true, processMode: 'vector',
      cutBleed: 3,
      usePrintArea: false, printAreaW: 310, printAreaH: 450,
      marginTop: 15, marginBot: 15, marginLeft: 10, marginRight: 10,
      marginTop2: 15, marginBot2: 15, marginLeft2: 10, marginRight2: 10,
      marginMode: 'safe', useMargin: true,
      alignX: 'center', alignY: 'middle', flowDir: 0,
      usePageCrop: true, pageCropLen: 15, pageCropDist: 10, pageCropThick: 0.8, pageCropColor: '#000000',
      is2Sided: false, rot180Front: false, rot180Back: false, twoSideMode: 'odd-even', useColorBar: false, colorBarPosition: 'bottom', colorBarPadding: 3
    },
    dataMode: 4, xUpQty: 5, standardQty: 1
  }
];

export interface UseImpositionWorkspaceParams {
  config: ImpositionConfig;
  setConfig: React.Dispatch<React.SetStateAction<ImpositionConfig>>;
  currentPlanIndex: number;
  setCurrentPlanIndex: (idx: number) => void;
  dataMode: DataMode;
  setDataMode: (dm: DataMode) => void;
  dataModeEnabled: boolean;
  setDataModeEnabled: (v: boolean) => void;
  xUpQty: number;
  setXUpQty: (q: number) => void;
  standardQty: number;
  setStandardQty: (q: number) => void;
  shapeTabs: ShapeTabItem[];
  setShapeTabs: (tabs: ShapeTabItem[]) => void;
  setActiveTabId: (id: string) => void;
  allPages: PageItem[];
  setAllPages: (pages: PageItem[]) => void;
  customScale: number;
  setCustomScale: (s: number) => void;
  customSvgData: string;
  setCustomSvgData: (svg: string) => void;
  backgroundColor: string;
  setBackgroundColor: (c: string) => void;
  impositionStyle: ImpositionStyle;
  setImpositionStyle: (s: ImpositionStyle) => void;
  impositionStyleEnabled: boolean;
  setImpositionStyleEnabled: (v: boolean) => void;
  vectorMaskResult: VectorMaskResult | null;
  setVectorMaskResult: (vm: VectorMaskResult | null) => void;
}

export function useImpositionWorkspace(params: UseImpositionWorkspaceParams) {
  const [savedWorkspaces, setSavedWorkspaces] = useState<WorkspaceItem[]>([]);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [localWorkspaceName, setLocalWorkspaceName] = useState('');

  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const apiWorkspaces = await workspaceService.getWorkspaces().catch(() => null);
        if (apiWorkspaces && apiWorkspaces.length > 0) {
          setSavedWorkspaces(apiWorkspaces);
          localStorage.setItem("imposition-workspaces", JSON.stringify(apiWorkspaces));
          return;
        }
      } catch (_) {}

      const saved = localStorage.getItem("imposition-workspaces");
      if (saved) {
        try {
          setSavedWorkspaces(JSON.parse(saved));
        } catch (_) {}
      }
    };

    loadWorkspaces();
  }, []);

  useEffect(() => {
    if (isWorkspaceModalOpen) {
      setLocalWorkspaceName('');
    }
  }, [isWorkspaceModalOpen]);

  const saveWorkspace = async () => {
    if (!localWorkspaceName.trim()) {
      alert("Vui lòng nhập tên workspace!");
      return;
    }

    const workspace: any = {
      name: localWorkspaceName.trim(),
      config: { ...params.config },
      currentPlanIndex: params.currentPlanIndex,
      dataMode: params.dataMode.toString(),
      dataModeEnabled: params.dataModeEnabled,
      xUpQty: params.xUpQty,
      standardQty: params.standardQty,
      shapeTabs: JSON.parse(JSON.stringify(params.shapeTabs)),
      allPages: JSON.parse(JSON.stringify(params.allPages)),
      customScale: params.customScale,
      customSvgData: params.customSvgData,
      backgroundColor: params.backgroundColor,
      impositionStyle: params.impositionStyle,
      impositionStyleEnabled: params.impositionStyleEnabled,
      vectorMaskResult: params.vectorMaskResult
    };

    try {
      const existingWorkspace = savedWorkspaces.find(w => w.name === workspace.name);
      let savedWorkspace: any;

      if (existingWorkspace) {
        savedWorkspace = await workspaceService.updateWorkspace(existingWorkspace.id!, workspace);
      } else {
        savedWorkspace = await workspaceService.saveWorkspace(workspace);
      }

      if (savedWorkspace) {
        const updated = [...savedWorkspaces.filter(w => w.name !== workspace.name), savedWorkspace];
        setSavedWorkspaces(updated);
        try {
          localStorage.setItem("imposition-workspaces", JSON.stringify(updated));
        } catch {
          try {
            const lightWorkspaces = updated.map(ws => ({
              ...ws,
              allPages: (ws as any).allPages?.map((p: any) => ({ ...p, originalThumb: undefined })),
              shapeTabs: (ws as any).shapeTabs?.map((t: any) => ({
                ...t,
                sourceImage: t.sourceImage ? { ...t.sourceImage, originalThumb: undefined } : null
              }))
            }));
            localStorage.setItem("imposition-workspaces", JSON.stringify(lightWorkspaces));
          } catch {}
        }

        setLocalWorkspaceName("");
        setIsWorkspaceModalOpen(false);
        alert(existingWorkspace ? "Đã cập nhật workspace thành công!" : "Đã lưu workspace thành công!");
      } else {
        alert("Lỗi khi lưu workspace. Vui lòng thử lại!");
      }
    } catch (error) {
      console.error("Error saving workspace:", error);
      alert("Lỗi khi lưu workspace. Vui lòng thử lại!");
    }
  };

  const loadWorkspace = (workspace: any) => {
    if (workspace.config) params.setConfig(workspace.config);
    if (workspace.currentPlanIndex !== undefined && typeof workspace.currentPlanIndex === 'number') {
      params.setCurrentPlanIndex(workspace.currentPlanIndex);
    }
    if (workspace.dataMode !== undefined) {
      const dm = workspace.dataMode;
      const num = typeof dm === 'string' ? parseInt(dm, 10) : Number(dm);
      params.setDataMode((isNaN(num) ? 1 : num) as DataMode);
    }
    if (workspace.dataModeEnabled !== undefined) params.setDataModeEnabled(workspace.dataModeEnabled);
    if (workspace.xUpQty !== undefined) params.setXUpQty(workspace.xUpQty);
    if (workspace.standardQty !== undefined) params.setStandardQty(workspace.standardQty);
    if (workspace.shapeTabs && Array.isArray(workspace.shapeTabs) && workspace.shapeTabs.length > 0) {
      params.setShapeTabs(workspace.shapeTabs);
      params.setActiveTabId(workspace.shapeTabs[0]?.id || 'tab-a');
    }
    if (workspace.allPages && Array.isArray(workspace.allPages)) {
      params.setAllPages(workspace.allPages);
    }
    if (workspace.customScale !== undefined) params.setCustomScale(workspace.customScale);
    if (workspace.customSvgData !== undefined) params.setCustomSvgData(workspace.customSvgData);
    if (workspace.backgroundColor !== undefined) params.setBackgroundColor(workspace.backgroundColor);
    if (workspace.impositionStyle !== undefined) params.setImpositionStyle(workspace.impositionStyle);
    if (workspace.impositionStyleEnabled !== undefined) params.setImpositionStyleEnabled(workspace.impositionStyleEnabled);
    if (workspace.vectorMaskResult !== undefined) params.setVectorMaskResult(workspace.vectorMaskResult);
    alert(`Đã tải workspace: ${workspace.name}`);
  };

  const deleteWorkspace = async (name: string) => {
    if (!window.confirm(`Xóa workspace "${name}"?`)) return;

    try {
      const workspaceToDelete = savedWorkspaces.find(w => w.name === name);
      if (!workspaceToDelete) {
        alert("Không tìm thấy workspace!");
        return;
      }

      const success = await workspaceService.deleteWorkspace(workspaceToDelete.id!);
      if (success) {
        const updated = savedWorkspaces.filter(w => w.name !== name);
        setSavedWorkspaces(updated);
        localStorage.setItem("imposition-workspaces", JSON.stringify(updated));
        alert("Đã xóa workspace thành công!");
      } else {
        alert("Lỗi khi xóa workspace. Vui lòng thử lại!");
      }
    } catch (error) {
      console.error("Error deleting workspace:", error);
      alert("Lỗi khi xóa workspace. Vui lòng thử lại!");
    }
  };

  return {
    savedWorkspaces,
    presetWorkspaces: PRESET_WORKSPACES,
    isWorkspaceModalOpen,
    setIsWorkspaceModalOpen,
    localWorkspaceName,
    setLocalWorkspaceName,
    saveWorkspace,
    loadWorkspace,
    deleteWorkspace
  };
}
