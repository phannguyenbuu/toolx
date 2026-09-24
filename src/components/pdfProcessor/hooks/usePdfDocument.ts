import React, { useState, useRef, useCallback, useMemo } from 'react';
import { PageData, FilterType, PdfStats } from '../types';
import { analyzePageColor } from '../helpers/colorAnalyzer';

interface UsePdfDocumentProps {
  scriptsLoaded: boolean;
}

export function usePdfDocument({ scriptsLoaded }: UsePdfDocumentProps) {
  const [pagesData, setPagesData] = useState<PageData[]>([]);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [progress, setProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload
  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !scriptsLoaded) return;

    setIsLoading(true);
    setLoadingText('Đang đọc file PDF...');
    setProgress(0);

    const reader = new FileReader();
    reader.onload = async function() {
      const buffer = this.result as ArrayBuffer;
      setPdfData(buffer.slice(0));

      try {
        const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
        setPdfDoc(doc);

        const newPagesData: PageData[] = [];
        setSelectedIds(new Set());

        for (let i = 1; i <= doc.numPages; i++) {
          setProgress((i / doc.numPages) * 100);
          setLoadingText(`Đang xử lý trang ${i}/${doc.numPages}...`);

          const page = await doc.getPage(i);
          const vp = page.getViewport({ scale: 0.3 });

          const c = document.createElement('canvas');
          c.width = vp.width;
          c.height = vp.height;
          const ctx = c.getContext('2d')!;
          await page.render({ canvasContext: ctx, viewport: vp }).promise;

          const type = analyzePageColor(ctx, vp.width, vp.height, i);

          newPagesData.push({
            idx: i - 1,
            num: i,
            type,
            deleted: false,
            rotation: 0,
            thumb: c.toDataURL(),
            json: null
          });
        }

        setPagesData(newPagesData);
      } catch (err: any) {
        alert('Lỗi đọc file PDF: ' + err.message);
        console.error(err);
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  }, [scriptsLoaded]);

  // Rotate individual page in thumbnail view
  const rotatePageThumb = useCallback((idx: number, direction: 'cw' | 'ccw', e: React.MouseEvent) => {
    e.stopPropagation();
    setPagesData(prev => {
      const newData = [...prev];
      const delta = direction === 'cw' ? 90 : -90;
      newData[idx] = {
        ...newData[idx],
        rotation: (newData[idx].rotation + delta + 360) % 360
      };
      return newData;
    });
  }, []);

  // Filter and selection
  const toggleSelection = useCallback((idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(idx)) newSet.delete(idx);
      else newSet.add(idx);
      return newSet;
    });
  }, []);

  const deleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.size} trang đã chọn không?`)) {
      setPagesData(prev => prev.map(p => selectedIds.has(p.idx) ? { ...p, deleted: true } : p));
      setSelectedIds(new Set());
    }
  }, [selectedIds]);

  const resetDocument = useCallback(() => {
    setPagesData([]);
    setPdfDoc(null);
    setPdfData(null);
    setSelectedIds(new Set());
    setFilterType('all');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Statistics
  const stats: PdfStats = useMemo(() => ({
    color: pagesData.filter(p => !p.deleted && p.type === 'color'),
    bw: pagesData.filter(p => !p.deleted && p.type === 'bw'),
    blank: pagesData.filter(p => !p.deleted && p.type === 'blank')
  }), [pagesData]);

  const filteredPages = useMemo(() => {
    return pagesData.filter(p => !p.deleted && (filterType === 'all' || p.type === filterType));
  }, [pagesData, filterType]);

  return {
    pagesData,
    setPagesData,
    pdfDoc,
    setPdfDoc,
    pdfData,
    setPdfData,
    selectedIds,
    setSelectedIds,
    filterType,
    setFilterType,
    isLoading,
    setIsLoading,
    loadingText,
    setLoadingText,
    progress,
    setProgress,
    fileInputRef,
    handleFile,
    rotatePageThumb,
    toggleSelection,
    deleteSelected,
    resetDocument,
    stats,
    filteredPages
  };
}
