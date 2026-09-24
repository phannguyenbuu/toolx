/* eslint-disable */
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { fileService } from '../services/fileService';
import {
  ElementData,
  PageConfig,
  SheetRow,
  UploadedImage,
  BankInfo,
  InteractionMode,
  AlignMode,
  SidebarTab,
  DataTab,
  generateId,
  pxToMm,
  mmToPx,
  parseCSV,
  processGoogleSheetUrl,
} from './types';

export function useAppEditorState() {
  // Page & View State
  const [pageConfig, setPageConfig] = useState<PageConfig>({ format: 'A5', orientation: 'landscape', width: 210, height: 148 });
  const [zoom, setZoom] = useState(1);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isCssFullScreen, setIsCssFullScreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMarqueeMode, setIsMarqueeMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null); 
  const [showRobot, setShowRobot] = useState(false);

  // App Data State
  const [elements, setElements] = useState<ElementData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Marquee Selection State
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number } | null>(null);
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  
  // History State
  const [history, setHistory] = useState<ElementData[][]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const isUndoRedoAction = useRef(false);

  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [dataRows, setDataRows] = useState<SheetRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [currentRowIndex, setCurrentRowIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);
  const [isSavingToFileManager, setIsSavingToFileManager] = useState(false);
  const [isSaveProjectDialogOpen, setIsSaveProjectDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [existingProjects, setExistingProjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [customFonts, setCustomFonts] = useState<string[]>([]);
  const [systemFonts, setSystemFonts] = useState<string[]>([]);
  const [fontSearch, setFontSearch] = useState<string>('');
  const [isFontPickerOpen, setIsFontPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>('properties');
  
  // Media & Modals
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [dataModalTab, setDataModalTab] = useState<DataTab>('table'); 
  const [isImageManagerOpen, setIsImageManagerOpen] = useState(false);
  const [isNumberingModalOpen, setIsNumberingModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<UploadedImage | null>(null);
  const [accountTab, setAccountTab] = useState<string>('overview');
  
  // Bank QR State
  const [bankList, setBankList] = useState<BankInfo[]>([]);
  const [bankSearch, setBankSearch] = useState<string>('');

  // Customer Preview State
  const [showCustomerView, setShowCustomerView] = useState(false);
  const [customerSettings, setCustomerSettings] = useState({ active: true, pin: '', allowEdit: false });
  const [customerNotes, setCustomerNotes] = useState<Record<number, string>>({});
  const [isCustomerConfigOpen, setIsCustomerConfigOpen] = useState(false);

  // Menu View State
  const [menuId, setMenuId] = useState<string | null>(null);

  // Interaction Refs
  const [mode, setMode] = useState<InteractionMode>('IDLE');
  const [alignMode, setAlignMode] = useState<AlignMode>('page'); 
  const dragStartRef = useRef<{ x: number; y: number; initialX: number; initialY: number; initialW: number; initialH: number } | null>(null);
  const resizeDirectionRef = useRef<string>('');
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const isManipulatingRef = useRef(false);

  // Load bank list from VietQR API
  useEffect(() => {
    const loadBanks = async () => {
      try {
        const response = await fetch('https://api.vietqr.io/v2/banks');
        if (response.ok) {
          const data = await response.json();
          if (data.data) {
            setBankList(data.data);
          }
        }
      } catch (e) {
        console.log('Không thể load danh sách ngân hàng');
      }
    };
    loadBanks();
  }, []);

  // Check for Preview Mode URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('preview')) {
      setShowCustomerView(true);
      setCustomerSettings(s => ({ ...s, active: true }));
    }
  }, []);

  // Check for Menu URL
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/menu/')) {
      const id = path.split('/')[2];
      if (id) {
        setMenuId(id);
      }
    }
  }, []);

  // History Management
  const saveHistory = useCallback((newElements: ElementData[]) => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }
    setHistory(prev => {
      const newHistory = prev.slice(0, historyStep + 1);
      return [...newHistory, newElements];
    });
    setHistoryStep(prev => prev + 1);
  }, [historyStep]);

  // Initial Load
  useEffect(() => {
    if (history.length === 0) {
      const initialElements: ElementData[] = [{
        id: 'demo-text', type: 'text', x: 20, y: 20, width: 100, height: 30,
        content: '{HoTen}',
        style: { fontSize: '24px', fontWeight: 'bold', color: '#333333', backgroundColor: 'transparent', zIndex: 1, border: 'none' },
        textFitMode: 'actual', textAlignH: 'center', textAlignV: 'center', textWrap: false, borderRadius: '0%',
        isLocked: false, isPrintVisible: true, rotate: 0
      }];
      setElements(initialElements);
      setHistory([initialElements]);
      setHistoryStep(0);
      setHeaders(["HoTen", "MaSo", "ChucVu", "MaAnh"]);
      setDataRows([
        { HoTen: "Nguyễn Văn A", MaSo: "NV001", ChucVu: "Giám Đốc", MaAnh: "1" },
        { HoTen: "Trần Thị B", MaSo: "NV002", ChucVu: "Kế Toán", MaAnh: "2" },
      ]);
      setSelectedId('demo-text');
    }
  }, []); 

  const handleUndo = () => {
    if (historyStep > 0) {
      isUndoRedoAction.current = true;
      const prevStep = historyStep - 1;
      setElements(history[prevStep]);
      setHistoryStep(prevStep);
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      isUndoRedoAction.current = true;
      const nextStep = historyStep + 1;
      setElements(history[nextStep]);
      setHistoryStep(nextStep);
    }
  };

  const currentRowData = useMemo(() => dataRows.length > 0 ? dataRows[currentRowIndex] : null, [dataRows, currentRowIndex]);

  const resolveContent = (content: string, specificRow?: SheetRow) => {
    const data = specificRow || currentRowData;
    if (!data) return content;
    return content.replace(/{([^{}]+)}/g, (_, key) => data[key] || _);
  };

  const resolveImageSrc = (el: ElementData, specificRow?: SheetRow) => {
    if (el.type === 'image') return el.src || '';
    const val = resolveContent(el.content || '', specificRow).trim();
    if (!val) return '';
    const target = el.dataType === 'number' ? parseInt(val, 10).toString() : val.toLowerCase();
    const img = uploadedImages.find(u => {
      const uName = el.dataType === 'number' ? parseInt(u.name, 10).toString() : u.name.toLowerCase();
      return uName === target;
    });
    return img ? img.src : (val.startsWith('http') ? val : '');
  };

  // Open save project dialog
  const openSaveProjectDialog = async () => {
    try {
      const files = await fileService.getFiles('PROJECT');
      setExistingProjects(files.map(f => ({ id: f.id, name: f.originalName })));
      setProjectName('');
      setSelectedProjectId(null);
      setIsSaveProjectDialogOpen(true);
    } catch (err) {
      console.error(err);
      setExistingProjects([]);
      setIsSaveProjectDialogOpen(true);
    }
  };

  // Save project to File Manager (as JSON)
  const saveProjectToFileManager = async () => {
    if (!(projectName || '').trim() && !selectedProjectId) {
      alert('Vui lòng nhập tên dự án hoặc chọn dự án để lưu đè');
      return;
    }

    setIsSavingToFileManager(true);
    try {
      const projectData = {
        elements,
        pageConfig,
        dataRows,
        headers,
        uploadedImages: uploadedImages.map(img => ({ name: img.name, src: img.src })),
        savedAt: new Date().toISOString()
      };

      const fileName = selectedProjectId 
        ? existingProjects.find(p => p.id === selectedProjectId)?.name || `project_${Date.now()}.json`
        : (projectName.endsWith('.json') ? projectName : `${projectName}.json`);

      const jsonBlob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
      const projectFile = new globalThis.File([jsonBlob], fileName, { type: 'application/json' });
      
      if (selectedProjectId) {
        try {
          await fileService.deleteFile(selectedProjectId);
        } catch (e) {
          // Ignore delete error
        }
      }
      
      await fileService.uploadFile(projectFile, 'PROJECT');
      alert('Đã lưu dự án vào Quản lý tệp!');
      setIsSaveProjectDialogOpen(false);
    } catch (err: any) {
      console.error(err);
      alert('Lỗi lưu dự án: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSavingToFileManager(false);
    }
  };

  // Handle file import from File Manager (for project JSON)
  const handleFileFromManager = async (file: File) => {
    if (file.name.endsWith('.json')) {
      try {
        const text = await file.text();
        const projectData = JSON.parse(text);
        
        if (projectData.elements) setElements(projectData.elements);
        if (projectData.pageConfig) setPageConfig(projectData.pageConfig);
        if (projectData.dataRows) setDataRows(projectData.dataRows);
        if (projectData.headers) setHeaders(projectData.headers);
        if (projectData.uploadedImages) setUploadedImages(projectData.uploadedImages);
        
        alert('Đã mở dự án thành công!');
      } catch (err) {
        console.error(err);
        alert('Lỗi đọc file dự án');
      }
    } else {
      alert('Vui lòng chọn file dự án (.json)');
    }
  };

  return {
    pageConfig, setPageConfig,
    zoom, setZoom,
    isFullScreen, setIsFullScreen,
    isCssFullScreen, setIsCssFullScreen,
    isSidebarOpen, setIsSidebarOpen,
    isMarqueeMode, setIsMarqueeMode,
    containerRef,
    showRobot, setShowRobot,

    elements, setElements,
    selectedId, setSelectedId,
    selectedIds, setSelectedIds,

    dataRows, setDataRows,
    headers, setHeaders,
    currentRowIndex, setCurrentRowIndex,
    isLoading, setIsLoading,

    isFilePickerOpen, setIsFilePickerOpen,
    isSavingToFileManager, setIsSavingToFileManager,
    isSaveProjectDialogOpen, setIsSaveProjectDialogOpen,
    projectName, setProjectName,
    existingProjects, setExistingProjects,
    selectedProjectId, setSelectedProjectId,

    accountTab, setAccountTab,
    uploadedImages, setUploadedImages,
    isDataModalOpen, setIsDataModalOpen,
    dataModalTab, setDataModalTab,
    isImageManagerOpen, setIsImageManagerOpen,
    isNumberingModalOpen, setIsNumberingModalOpen,

    showCustomerView, setShowCustomerView,
    customerSettings, setCustomerSettings,
    customerNotes, setCustomerNotes,
    isCustomerConfigOpen, setIsCustomerConfigOpen,
    menuId, setMenuId,

    resolveContent,
    resolveImageSrc,
    openSaveProjectDialog,
    saveProjectToFileManager,
    handleFileFromManager,
    handleUndo,
    handleRedo,
    saveHistory,
  };
}
