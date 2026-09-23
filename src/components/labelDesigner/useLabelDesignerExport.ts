import { useState } from 'react';
import Konva from 'konva';
import {
  ElementData,
  PageConfig,
  SheetConfig,
  UploadedImage,
  SheetRow,
  VIETNAM_BANKS
} from './types';
import { loadBrowserFont } from './fontLoader';
import {
  exportKonvaToPdfMultiPage,
  exportKonvaToSheetPdf,
  KonvaElement
} from '../../utils/konvaPdfExport';
import { fileService } from '../../services/fileService';

export function useLabelDesignerExport(
  stageRef: React.RefObject<Konva.Stage | null>,
  elements: ElementData[],
  setElements: React.Dispatch<React.SetStateAction<ElementData[]>>,
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>,
  pageConfig: PageConfig,
  setPageConfig: React.Dispatch<React.SetStateAction<PageConfig>>,
  sheetConfig: SheetConfig,
  setSheetConfig: React.Dispatch<React.SetStateAction<SheetConfig>>,
  dataHeaders: string[],
  setDataHeaders: React.Dispatch<React.SetStateAction<string[]>>,
  dataRows: SheetRow[],
  setDataRows: React.Dispatch<React.SetStateAction<SheetRow[]>>,
  setCurrentRowIndex: React.Dispatch<React.SetStateAction<number>>,
  uploadedImages: UploadedImage[],
  setUploadedImages: React.Dispatch<React.SetStateAction<UploadedImage[]>>,
  saveToHistory: (elements: ElementData[]) => void
) {
  const [isLoading, setIsLoading] = useState(false);

  const handleExportPDF = async () => {
    if (!stageRef.current) return;
    setIsLoading(true);
    try {
      const rowsToExport = dataRows.length > 0 ? dataRows : [{}];

      const pages: KonvaElement[][] = rowsToExport.map(row => {
        const replaceVarsForRow = (text: string): string => {
          if (!text) return '';
          return text.replace(/\{([^}]+)\}/g, (_, key) => row[key] || `{${key}}`);
        };

        return elements.map(el => {
          let imgSrc = el.src;
          if (el.type === 'img-data' && el.content) {
            const value = replaceVarsForRow(el.content);
            let found: UploadedImage | undefined;

            const dataType = el.dataType || 'filename';

            if (dataType === 'number') {
              const idx = parseInt(value, 10) - 1;
              if (!isNaN(idx) && idx >= 0 && idx < uploadedImages.length) {
                found = uploadedImages[idx];
              }
            } else {
              const matchMode = el.matchMode || 'contains';
              const ignoreExt = el.ignoreExtension || false;
              const isBidirectional = el.bidirectional || false;

              found = uploadedImages.find(img => {
                let imgName = img.name;
                let searchValue = value;

                if (ignoreExt) {
                  imgName = imgName.replace(/\.[^.]+$/, '');
                  searchValue = searchValue.replace(/\.[^.]+$/, '');
                }

                const nameLower = imgName.toLowerCase();
                const valueLower = searchValue.toLowerCase();

                if (matchMode === 'exact') return imgName === searchValue;
                if (matchMode === 'startsWith') {
                  if (isBidirectional) {
                    return nameLower.startsWith(valueLower) || valueLower.startsWith(nameLower);
                  }
                  return nameLower.startsWith(valueLower);
                }
                if (matchMode === 'endsWith') {
                  if (isBidirectional) {
                    return nameLower.endsWith(valueLower) || valueLower.endsWith(nameLower);
                  }
                  return nameLower.endsWith(valueLower);
                }
                return nameLower.includes(valueLower);
              });
            }

            if (found) imgSrc = found.src;
          }

          if ((el.dataType || 'filename') === 'url') {
            const urlValue = replaceVarsForRow(el.content);
            if (urlValue && !urlValue.includes('{')) imgSrc = urlValue;
          }

          let vietQRImageUrl: string | undefined;
          if (el.type === 'qr' && el.qrTemplate === 'vietqr' && el.bankCode && el.accountNo) {
            const bank = VIETNAM_BANKS.find(b => b.code === el.bankCode);
            if (bank) {
              const accountNo = replaceVarsForRow(el.accountNo || '');
              const amount = replaceVarsForRow(el.amount || '');
              const memo = replaceVarsForRow(el.memo || '');
              const amountStr = amount ? `&amount=${encodeURIComponent(amount)}` : '';
              const memoStr = memo ? `&addInfo=${encodeURIComponent(memo)}` : '';
              const style = el.vietqrStyle || 'compact';
              vietQRImageUrl = `https://img.vietqr.io/image/${bank.bin}-${accountNo}-${style}.png?accountName=${encodeURIComponent(
                el.accountName || ''
              )}${amountStr}${memoStr}`;
            }
          }

          return {
            id: el.id,
            type: el.type,
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            content: replaceVarsForRow(el.content),
            src: imgSrc,
            fontFamily: el.fontFamily,
            fontSize: el.fontSize,
            fontWeight: el.fontWeight,
            fontStyle: el.fontStyle,
            color: el.color,
            backgroundColor: el.backgroundColor,
            borderColor: el.borderColor,
            borderWidth: el.borderWidth,
            rotate: el.rotate,
            textAlignH: el.textAlignH,
            textAlignV: el.textAlignV,
            qrTemplate: el.qrTemplate,
            vietQRImageUrl
          };
        });
      });

      const usedFonts = Array.from(
        new Set(elements.filter(e => e.type === 'text' && e.fontFamily).map(e => e.fontFamily!))
      );
      await Promise.allSettled(usedFonts.map(f => loadBrowserFont(f)));

      const useSheet = sheetConfig.width > 0 && sheetConfig.height > 0;
      const pdfBytes = useSheet
        ? await exportKonvaToSheetPdf({
            pageWidthMm: pageConfig.width,
            pageHeightMm: pageConfig.height,
            sheetWidthMm: sheetConfig.width,
            sheetHeightMm: sheetConfig.height,
            shape: sheetConfig.shape,
            layoutMode: sheetConfig.layoutMode || 'grid',
            marginTopMm: sheetConfig.marginTop,
            marginLeftMm: sheetConfig.marginLeft,
            gapHMm: sheetConfig.gapH,
            gapVMm: sheetConfig.gapV,
            useCropMark: sheetConfig.useCropMark,
            cropLenMm: sheetConfig.cropLen,
            cropDistMm: sheetConfig.cropDist,
            cropThickPt: sheetConfig.cropThick,
            cropColor: sheetConfig.cropColor,
            pageNumber: sheetConfig.pageNumber || 'none',
            pages,
            background: pageConfig.backgroundSrc
              ? { src: pageConfig.backgroundSrc, fit: pageConfig.backgroundFit || 'cover' }
              : undefined
          })
        : await exportKonvaToPdfMultiPage({
            pageWidthMm: pageConfig.width,
            pageHeightMm: pageConfig.height,
            pages,
            background: pageConfig.backgroundSrc
              ? { src: pageConfig.backgroundSrc, fit: pageConfig.backgroundFit || 'cover' }
              : undefined
          });

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = useSheet
        ? `sheet_${sheetConfig.width}x${sheetConfig.height}mm.pdf`
        : `labels_${dataRows.length || 1}_pages.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Lỗi xuất PDF: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToFileManager = async () => {
    if (!stageRef.current) return;
    setIsLoading(true);
    try {
      const rowsToExport = dataRows.length > 0 ? dataRows : [{}];
      const pages: KonvaElement[][] = rowsToExport.map(row => {
        const replaceVarsForRow = (text: string): string => {
          if (!text) return '';
          return text.replace(/\{([^}]+)\}/g, (_, key) => row[key] || `{${key}}`);
        };
        return elements
          .filter(el => el.isVisible !== false)
          .map(el => ({
            id: el.id,
            type: el.type,
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            content: replaceVarsForRow(el.content || ''),
            fontFamily: el.fontFamily,
            fontSize: el.fontSize,
            fontWeight: el.fontWeight,
            fontStyle: el.fontStyle,
            textDecoration: el.textDecoration,
            color: el.color,
            backgroundColor: el.backgroundColor,
            borderColor: el.borderColor,
            borderWidth: el.borderWidth,
            borderRadius: el.borderRadius,
            textAlignH: el.textAlignH,
            textAlignV: el.textAlignV,
            rotate: el.rotate,
            opacity: el.opacity,
            src: el.src,
            objectFit: el.objectFit,
            stroke: el.stroke,
            strokeWidth: el.strokeWidth
          }));
      });

      const usedFonts = Array.from(
        new Set(elements.filter(e => e.type === 'text' && e.fontFamily).map(e => e.fontFamily!))
      );
      await Promise.allSettled(usedFonts.map(f => loadBrowserFont(f)));

      const useSheet = sheetConfig.width > 0 && sheetConfig.height > 0;
      const pdfBytes = useSheet
        ? await exportKonvaToSheetPdf({
            pageWidthMm: pageConfig.width,
            pageHeightMm: pageConfig.height,
            sheetWidthMm: sheetConfig.width,
            sheetHeightMm: sheetConfig.height,
            shape: sheetConfig.shape,
            layoutMode: sheetConfig.layoutMode || 'grid',
            marginTopMm: sheetConfig.marginTop,
            marginLeftMm: sheetConfig.marginLeft,
            gapHMm: sheetConfig.gapH,
            gapVMm: sheetConfig.gapV,
            useCropMark: sheetConfig.useCropMark,
            cropLenMm: sheetConfig.cropLen,
            cropDistMm: sheetConfig.cropDist,
            cropThickPt: sheetConfig.cropThick,
            cropColor: sheetConfig.cropColor,
            pageNumber: sheetConfig.pageNumber || 'none',
            pages,
            background: pageConfig.backgroundSrc
              ? { src: pageConfig.backgroundSrc, fit: pageConfig.backgroundFit || 'cover' }
              : undefined
          })
        : await exportKonvaToPdfMultiPage({
            pageWidthMm: pageConfig.width,
            pageHeightMm: pageConfig.height,
            pages,
            background: pageConfig.backgroundSrc
              ? { src: pageConfig.backgroundSrc, fit: pageConfig.backgroundFit || 'cover' }
              : undefined
          });

      const fileName = `label_${Date.now()}.pdf`;
      const pdfFile = new File([pdfBytes], fileName, { type: 'application/pdf' });
      await fileService.uploadFile(pdfFile, 'PDF');
      alert('Đã lưu PDF vào Quản lý tệp!');
    } catch (err) {
      console.error('Save to file manager error:', err);
      alert('Lỗi: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setElements([]);
    setSelectedIds([]);
    saveToHistory([]);
  };

  const handleSaveProject = () => {
    const project = {
      elements,
      pageConfig,
      sheetConfig,
      dataHeaders,
      dataRows,
      uploadedImages
    };
    localStorage.setItem('labelDesigner_project', JSON.stringify(project));
    alert('Dự án đã được lưu!');
  };

  const handleLoadProject = () => {
    const raw = localStorage.getItem('labelDesigner_project');
    if (!raw) {
      alert('Không tìm thấy dự án đã lưu.');
      return;
    }
    try {
      const p = JSON.parse(raw);
      if (p.elements) {
        const migratedElements = p.elements.map((el: ElementData) => {
          if (el.type === 'img-data' && !el.dataType) {
            return {
              ...el,
              dataType: 'filename',
              matchMode: el.matchMode || 'contains',
              ignoreExtension: el.ignoreExtension || false,
              bidirectional: el.bidirectional || false
            };
          }
          return el;
        });
        setElements(migratedElements);
        saveToHistory(migratedElements);
      }
      if (p.pageConfig) setPageConfig(p.pageConfig);
      if (p.sheetConfig) setSheetConfig(p.sheetConfig);
      if (p.dataHeaders) setDataHeaders(p.dataHeaders);
      if (p.dataRows) {
        setDataRows(p.dataRows);
        setCurrentRowIndex(0);
      }
      if (p.uploadedImages) setUploadedImages(p.uploadedImages);
      setSelectedIds([]);
    } catch {
      alert('File lưu bị lỗi.');
    }
  };

  return {
    isLoading,
    handleExportPDF,
    handleSaveToFileManager,
    handleReset,
    handleSaveProject,
    handleLoadProject
  };
}
