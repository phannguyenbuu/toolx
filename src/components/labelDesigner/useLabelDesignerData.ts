import { useState, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { SheetRow, parseCSV } from './types';

export function useLabelDesignerData() {
  const [dataHeaders, setDataHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<SheetRow[]>([]);
  const [currentRowIndex, setCurrentRowIndex] = useState(0);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [gotoRowInput, setGotoRowInput] = useState('');
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);

  const currentRow = useMemo(() => dataRows[currentRowIndex] || {}, [dataRows, currentRowIndex]);

  const replaceVariables = useCallback(
    (text: string): string => {
      if (!text) return '';
      return text.replace(/\{([^}]+)\}/g, (_, key) => currentRow[key] || `{${key}}`);
    },
    [currentRow]
  );

  const handleDataFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        const { headers, rows } = parseCSV(text);
        setDataHeaders(headers);
        setDataRows(rows);
        setCurrentRowIndex(0);
      } else {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<SheetRow>(sheet, { defval: '' });
        if (json.length > 0) {
          setDataHeaders(Object.keys(json[0]));
          setDataRows(
            json.map(row => {
              const newRow: SheetRow = {};
              Object.entries(row).forEach(([k, v]) => {
                newRow[k] = String(v);
              });
              return newRow;
            })
          );
          setCurrentRowIndex(0);
        }
      }
    } catch (err: any) {
      console.error('File parse error:', err);
      alert('Lỗi đọc tệp dữ liệu: ' + err.message);
    } finally {
      e.target.value = '';
    }
  };

  const updateDataCell = (rowIdx: number, header: string, value: string) => {
    setDataRows(prev => prev.map((row, i) => (i === rowIdx ? { ...row, [header]: value } : row)));
  };

  const addDataRow = () => {
    const newRow: SheetRow = {};
    dataHeaders.forEach(h => (newRow[h] = ''));
    setDataRows(prev => [...prev, newRow]);
  };

  const deleteDataRow = (idx: number) => {
    setDataRows(prev => prev.filter((_, i) => i !== idx));
    if (currentRowIndex >= dataRows.length - 1) {
      setCurrentRowIndex(Math.max(0, dataRows.length - 2));
    }
  };

  const addDataColumn = () => {
    const newCol = `Col_${dataHeaders.length + 1}`;
    setDataHeaders(prev => [...prev, newCol]);
    setDataRows(prev => prev.map(row => ({ ...row, [newCol]: '' })));
  };

  const handleGoogleSheetImport = async () => {
    if (!(googleSheetUrl || '').trim()) return;
    setIsLoadingSheet(true);
    try {
      let sheetId = '';
      const match = googleSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        sheetId = match[1];
      } else {
        throw new Error('URL Google Sheets không hợp lệ');
      }
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error('Không thể tải Google Sheet. Kiểm tra quyền chia sẻ công khai.');
      }
      const text = await response.text();
      const { headers, rows } = parseCSV(text);
      if (headers.length > 0) {
        setDataHeaders(headers);
        setDataRows(rows);
        setCurrentRowIndex(0);
        setGoogleSheetUrl('');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Google Sheets import error:', errorMessage);
      alert('Lỗi: ' + errorMessage);
    } finally {
      setIsLoadingSheet(false);
    }
  };

  const handleExportCSV = () => {
    if (dataHeaders.length === 0 || dataRows.length === 0) return;
    const csvContent = [
      dataHeaders.join(','),
      ...dataRows.map(row => dataHeaders.map(h => `"${(row[h] || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data_export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGotoRow = () => {
    const rowNum = parseInt(gotoRowInput, 10);
    if (!isNaN(rowNum) && rowNum >= 1 && rowNum <= dataRows.length) {
      setCurrentRowIndex(rowNum - 1);
      setGotoRowInput('');
    }
  };

  return {
    dataHeaders,
    setDataHeaders,
    dataRows,
    setDataRows,
    currentRowIndex,
    setCurrentRowIndex,
    currentRow,
    googleSheetUrl,
    setGoogleSheetUrl,
    isLoadingSheet,
    gotoRowInput,
    setGotoRowInput,
    isDataModalOpen,
    setIsDataModalOpen,
    replaceVariables,
    handleDataFileUpload,
    updateDataCell,
    addDataRow,
    deleteDataRow,
    addDataColumn,
    handleGoogleSheetImport,
    handleExportCSV,
    handleGotoRow
  };
}
