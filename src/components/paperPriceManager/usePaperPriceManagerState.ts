import { useState, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Paper } from '../../utils/calculatorTypes';
import { usePrintConfig } from '../../contexts/PrintConfigContext';
import {
  Supplier,
  MySupplierProfile,
  PaperManagerConfig,
  PaperActiveTab,
  PaperSortCol
} from './types';
import {
  loadSuppliers,
  saveSuppliers,
  loadConfig,
  saveConfig,
  loadProfile,
  saveProfile
} from './storage';

export function usePaperPriceManagerState() {
  const { paperDatabase, setPaperDatabase } = usePrintConfig();
  const [activeTab, setActiveTab] = useState<PaperActiveTab>('prices');

  // --- Tab 1: Bảng giá giấy ---
  const [filterType, setFilterType] = useState('all');
  const [sortCol, setSortCol] = useState<PaperSortCol>('type');
  const [sortAsc, setSortAsc] = useState(true);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Paper>>({});
  const [showImport, setShowImport] = useState(false);
  const [showAddPaper, setShowAddPaper] = useState(false);
  const [addForm, setAddForm] = useState<Partial<Paper>>({
    type: 'Couche',
    gsm: 200,
    size: '650x860',
    price: 3000
  });
  const [importMode, setImportMode] = useState<'file' | 'sheet'>('file');
  const [sheetUrl, setSheetUrl] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  // --- Tab 2: Nhà cung cấp ---
  const [suppliers, setSuppliers] = useState<Supplier[]>(loadSuppliers);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [supplierInput, setSupplierInput] = useState('');
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // --- Tab 3: Cấu hình ---
  const [managerConfig, setManagerConfig] = useState<PaperManagerConfig>(loadConfig);
  const [myProfile, setMyProfile] = useState<MySupplierProfile>(loadProfile);

  const paperTypes = useMemo(
    () => Array.from(new Set(paperDatabase.map((p) => p.type))),
    [paperDatabase]
  );

  const persistSuppliers = useCallback((s: Supplier[]) => {
    setSuppliers(s);
    saveSuppliers(s);
  }, []);

  const updateConfig = useCallback((c: PaperManagerConfig) => {
    setManagerConfig(c);
    saveConfig(c);
  }, []);

  const updateProfile = useCallback((p: MySupplierProfile) => {
    setMyProfile(p);
    saveProfile(p);
  }, []);

  // Filtered + sorted papers
  const displayPapers = useMemo(() => {
    let papers = paperDatabase.map((p, i) => ({ ...p, _idx: i }));
    if (filterType !== 'all') papers = papers.filter((p) => p.type === filterType);
    papers.sort((a, b) => {
      let cmp = 0;
      if (sortCol === 'type') cmp = a.type.localeCompare(b.type) || a.gsm - b.gsm;
      else if (sortCol === 'gsm') cmp = a.gsm - b.gsm;
      else if (sortCol === 'size') cmp = a.size.localeCompare(b.size);
      else cmp = a.price - b.price;
      return sortAsc ? cmp : -cmp;
    });
    return papers;
  }, [paperDatabase, filterType, sortCol, sortAsc]);

  const handleSort = (col: PaperSortCol) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  const saveEdit = (idx: number) => {
    if (!editForm.type || !editForm.gsm || !editForm.price) return;
    const sizeStr = editForm.size || '650x860';
    const [w, h] = sizeStr.split('x').map(Number);
    const updated = [...paperDatabase];
    updated[idx] = {
      ...updated[idx],
      ...editForm,
      width: w || 650,
      height: h || 860,
      size: sizeStr
    } as Paper;
    setPaperDatabase(updated);
    setEditingRow(null);
    setEditForm({});
  };

  const addPaper = () => {
    const f = addForm;
    if (!f.type || !f.gsm || !f.price) return;
    const sizeStr = f.size || '650x860';
    const [w, h] = sizeStr.split('x').map(Number);
    const p: Paper = {
      type: f.type,
      gsm: Number(f.gsm),
      size: sizeStr,
      width: w || 650,
      height: h || 860,
      price: Number(f.price)
    };
    setPaperDatabase([...paperDatabase, p]);
    setShowAddPaper(false);
    setAddForm({ type: 'Couche', gsm: 200, size: '650x860', price: 3000 });
  };

  const deletePaper = (idx: number) => {
    if (window.confirm('Xóa giấy này?')) {
      setPaperDatabase(paperDatabase.filter((_, i) => i !== idx));
    }
  };

  // Import from Excel
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (data.length < 2) return;
        const papers: Paper[] = [];
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row[0]) continue;
          const sizeStr = String(row[1] || '650x860');
          const [w, h] = sizeStr.split('x').map(Number);
          papers.push({
            type: String(row[0]),
            gsm: Number(row[2]) || 0,
            size: sizeStr,
            width: w || 650,
            height: h || 860,
            price: Number(row[3]) || 0
          });
        }
        if (papers.length > 0) {
          setPaperDatabase(papers);
          setShowImport(false);
          alert(`Đã import ${papers.length} loại giấy`);
        }
      } catch {
        alert('Lỗi đọc file');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleSheetImport = async () => {
    if (!sheetUrl) return;
    setImportLoading(true);
    try {
      let csvUrl = sheetUrl;
      if (csvUrl.includes('/edit')) csvUrl = csvUrl.replace(/\/edit.*$/, '/export?format=csv');
      else {
        const m = csvUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (m) csvUrl = `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv`;
      }
      const resp = await fetch(csvUrl);
      if (!resp.ok) throw new Error('Không tải được');
      const text = await resp.text();
      const rows = text.split('\n').map((r) => r.split(',').map((c) => c.trim().replace(/^"|"$/g, '')));
      if (rows.length < 2) throw new Error('Sheet trống');
      const papers: Paper[] = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r[0]) continue;
        const sizeStr = String(r[1] || '650x860');
        const [w, h] = sizeStr.split('x').map(Number);
        papers.push({
          type: String(r[0]),
          gsm: Number(r[2]) || 0,
          size: sizeStr,
          width: w || 650,
          height: h || 860,
          price: Number(r[3]) || 0
        });
      }
      if (papers.length > 0) {
        setPaperDatabase(papers);
        setShowImport(false);
        setSheetUrl('');
        alert(`Đã import ${papers.length} loại giấy`);
      } else {
        throw new Error('Không tìm thấy dữ liệu');
      }
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setImportLoading(false);
    }
  };

  // --- Supplier functions ---
  const addSupplier = () => {
    const input = supplierInput.trim();
    if (!input) {
      alert('Nhập email hoặc mã định danh của nhà cung cấp');
      return;
    }
    const isEmail = input.includes('@');
    if (suppliers.some((s) => (isEmail ? s.email === input : s.code === input))) {
      alert('NCC này đã được thêm');
      return;
    }
    const s: Supplier = {
      id: Date.now().toString(),
      email: isEmail ? input : '',
      code: isEmail ? '' : input,
      name: isEmail ? input.split('@')[0] : input,
      phone: '',
      address: '',
      enabled: true,
      lastSync: null,
      papers: []
    };
    persistSuppliers([...suppliers, s]);
    setSupplierInput('');
    setShowAddSupplier(false);
  };

  const updateSupplier = (id: string, updates: Partial<Supplier>) => {
    persistSuppliers(suppliers.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const deleteSupplier = (id: string) => {
    if (window.confirm('Xóa nhà cung cấp này?')) {
      persistSuppliers(suppliers.filter((s) => s.id !== id));
    }
  };

  const syncSupplier = async (id: string) => {
    const supplier = suppliers.find((s) => s.id === id);
    if (!supplier) return;
    setSyncingId(id);
    try {
      const identifier = supplier.email || supplier.code;
      const resp = await fetch(`/api/suppliers/${encodeURIComponent(identifier)}/papers`);
      if (!resp.ok) throw new Error(`Không thể đồng bộ (${resp.status})`);
      const data = await resp.json();
      const papers: Paper[] = (data.papers || [])
        .map((p: any) => ({
          type: String(p.type || ''),
          gsm: Number(p.gsm) || 0,
          size: String(p.size || '650x860'),
          width: Number(p.width) || 650,
          height: Number(p.height) || 860,
          price: Number(p.price) || 0
        }))
        .filter((p: Paper) => p.type && p.gsm > 0 && p.price > 0);
      const updated = suppliers.map((s) =>
        s.id === id
          ? {
              ...s,
              papers,
              lastSync: new Date(),
              name: data.name || s.name,
              phone: data.phone || s.phone,
              address: data.address || s.address
            }
          : s
      );
      persistSuppliers(updated);
      alert(`Đã đồng bộ ${papers.length} loại giấy từ ${supplier.name || supplier.email}`);
    } catch (err: any) {
      alert(`Lỗi đồng bộ: ${err.message}`);
    } finally {
      setSyncingId(null);
    }
  };

  return {
    paperDatabase,
    setPaperDatabase,
    activeTab,
    setActiveTab,
    filterType,
    setFilterType,
    sortCol,
    sortAsc,
    handleSort,
    displayPapers,
    paperTypes,
    editingRow,
    setEditingRow,
    editForm,
    setEditForm,
    saveEdit,
    deletePaper,
    showAddPaper,
    setShowAddPaper,
    addForm,
    setAddForm,
    addPaper,
    showImport,
    setShowImport,
    importMode,
    setImportMode,
    sheetUrl,
    setSheetUrl,
    importLoading,
    handleFileImport,
    handleSheetImport,
    suppliers,
    showAddSupplier,
    setShowAddSupplier,
    supplierInput,
    setSupplierInput,
    syncingId,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    syncSupplier,
    persistSuppliers,
    managerConfig,
    updateConfig,
    myProfile,
    updateProfile
  };
}
