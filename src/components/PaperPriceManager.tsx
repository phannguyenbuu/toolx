import React, { useState, useMemo, useCallback } from 'react';
import { Paper } from '../utils/calculatorTypes';
import { usePrintConfig, DEFAULT_PAPER_DATABASE } from '../contexts/PrintConfigContext';
import {
  Database, Upload, RefreshCw, X, Trash2, Plus, Edit2, Save, Link,
  FileSpreadsheet, Check, AlertTriangle, ArrowUpDown, Building2, Phone, MapPin, Star, ExternalLink, Settings, Mail, Clock
} from 'lucide-react';
import * as XLSX from 'xlsx';

const formatVND = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

// --- TYPES ---
interface Supplier {
  id: string;
  email: string; // tài khoản NCC trên hệ thống
  code: string; // mã định danh (thay thế email nếu NCC không muốn chia sẻ)
  name: string;
  phone: string;
  address: string;
  enabled: boolean;
  lastSync: Date | null;
  papers: Paper[];
}

interface MySupplierProfile {
  name: string;
  code: string; // mã định danh của mình
  phone: string;
  address: string;
  email: string;
}

interface PaperManagerConfig {
  autoSyncInterval: number;
  notifyPriceChange: boolean;
  autoApplyCheapest: boolean;
}

const STORAGE_KEY = 'txp-suppliers';
const CONFIG_KEY = 'txp-paper-manager-config';
const PROFILE_KEY = 'txp-supplier-profile';
function loadSuppliers(): Supplier[] {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : []; } catch { return []; }
}
function saveSuppliers(s: Supplier[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} }
function loadConfig(): PaperManagerConfig {
  try { const s = localStorage.getItem(CONFIG_KEY); return s ? JSON.parse(s) : { autoSyncInterval: 0, notifyPriceChange: true, autoApplyCheapest: false }; } catch { return { autoSyncInterval: 0, notifyPriceChange: true, autoApplyCheapest: false }; }
}
function saveConfig(c: PaperManagerConfig) { try { localStorage.setItem(CONFIG_KEY, JSON.stringify(c)); } catch {} }
function loadProfile(): MySupplierProfile {
  try { const s = localStorage.getItem(PROFILE_KEY); return s ? JSON.parse(s) : { name: '', code: '', phone: '', address: '', email: '' }; } catch { return { name: '', code: '', phone: '', address: '', email: '' }; }
}
function saveProfile(p: MySupplierProfile) { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch {} }

// --- MAIN COMPONENT ---
export function PaperPriceManager() {
  const { paperDatabase, setPaperDatabase } = usePrintConfig();
  const [activeTab, setActiveTab] = useState<'prices' | 'suppliers' | 'config'>('prices');

  // --- Tab 1: Bảng giá giấy ---
  const [filterType, setFilterType] = useState('all');
  const [sortCol, setSortCol] = useState<'type'|'gsm'|'size'|'price'>('type');
  const [sortAsc, setSortAsc] = useState(true);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Paper>>({});
  const [showImport, setShowImport] = useState(false);
  const [showAddPaper, setShowAddPaper] = useState(false);
  const [addForm, setAddForm] = useState<Partial<Paper>>({ type: 'Couche', gsm: 200, size: '650x860', price: 3000 });
  const [importMode, setImportMode] = useState<'file' | 'sheet'>('file');
  const [sheetUrl, setSheetUrl] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  // --- Tab 2: Nhà cung cấp ---
  const [suppliers, setSuppliers] = useState<Supplier[]>(loadSuppliers);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [supplierInput, setSupplierInput] = useState(''); // email hoặc mã định danh
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // --- Tab 4: Cấu hình ---
  const [managerConfig, setManagerConfig] = useState<PaperManagerConfig>(loadConfig);
  const [myProfile, setMyProfile] = useState<MySupplierProfile>(loadProfile);

  const paperTypes = useMemo(() => Array.from(new Set(paperDatabase.map(p => p.type))), [paperDatabase]);

  const persistSuppliers = useCallback((s: Supplier[]) => { setSuppliers(s); saveSuppliers(s); }, []);
  const updateConfig = useCallback((c: PaperManagerConfig) => { setManagerConfig(c); saveConfig(c); }, []);

  // Filtered + sorted papers
  const displayPapers = useMemo(() => {
    let papers = paperDatabase.map((p, i) => ({ ...p, _idx: i }));
    if (filterType !== 'all') papers = papers.filter(p => p.type === filterType);
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

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  };

  const SortIcon = ({ col }: { col: typeof sortCol }) => (
    <ArrowUpDown size={10} className={`inline ml-1 ${sortCol === col ? 'text-cyan-600' : 'text-slate-300'}`}/>
  );

  const saveEdit = (idx: number) => {
    if (!editForm.type || !editForm.gsm || !editForm.price) return;
    const sizeStr = editForm.size || '650x860';
    const [w, h] = sizeStr.split('x').map(Number);
    const updated = [...paperDatabase];
    updated[idx] = { ...updated[idx], ...editForm, width: w || 650, height: h || 860, size: sizeStr } as Paper;
    setPaperDatabase(updated);
    setEditingRow(null);
    setEditForm({});
  };

  const addPaper = () => {
    const f = addForm;
    if (!f.type || !f.gsm || !f.price) return;
    const sizeStr = f.size || '650x860';
    const [w, h] = sizeStr.split('x').map(Number);
    const p: Paper = { type: f.type, gsm: Number(f.gsm), size: sizeStr, width: w || 650, height: h || 860, price: Number(f.price) };
    setPaperDatabase([...paperDatabase, p]);
    setShowAddPaper(false);
    setAddForm({ type: 'Couche', gsm: 200, size: '650x860', price: 3000 });
  };

  const deletePaper = (idx: number) => {
    if (window.confirm('Xóa giấy này?')) setPaperDatabase(paperDatabase.filter((_, i) => i !== idx));
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
          papers.push({ type: String(row[0]), gsm: Number(row[2]) || 0, size: sizeStr, width: w || 650, height: h || 860, price: Number(row[3]) || 0 });
        }
        if (papers.length > 0) {
          setPaperDatabase(papers);
          setShowImport(false);
          alert(`Đã import ${papers.length} loại giấy`);
        }
      } catch { alert('Lỗi đọc file'); }
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
      else { const m = csvUrl.match(/\/d\/([a-zA-Z0-9-_]+)/); if (m) csvUrl = `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv`; }
      const resp = await fetch(csvUrl);
      if (!resp.ok) throw new Error('Không tải được');
      const text = await resp.text();
      const rows = text.split('\n').map(r => r.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
      if (rows.length < 2) throw new Error('Sheet trống');
      const papers: Paper[] = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i]; if (!r[0]) continue;
        const sizeStr = String(r[1] || '650x860'); const [w, h] = sizeStr.split('x').map(Number);
        papers.push({ type: String(r[0]), gsm: Number(r[2]) || 0, size: sizeStr, width: w || 650, height: h || 860, price: Number(r[3]) || 0 });
      }
      if (papers.length > 0) { setPaperDatabase(papers); setShowImport(false); setSheetUrl(''); alert(`Đã import ${papers.length} loại giấy`); }
      else throw new Error('Không tìm thấy dữ liệu');
    } catch (err: any) { alert(`Lỗi: ${err.message}`); }
    finally { setImportLoading(false); }
  };

  // --- Supplier functions ---
  const addSupplier = () => {
    const input = supplierInput.trim();
    if (!input) { alert('Nhập email hoặc mã định danh của nhà cung cấp'); return; }
    const isEmail = input.includes('@');
    if (suppliers.some(s => isEmail ? s.email === input : s.code === input)) { alert('NCC này đã được thêm'); return; }
    const s: Supplier = {
      id: Date.now().toString(), email: isEmail ? input : '', code: isEmail ? '' : input,
      name: isEmail ? input.split('@')[0] : input,
      phone: '', address: '', enabled: true, lastSync: null, papers: []
    };
    persistSuppliers([...suppliers, s]);
    setSupplierInput('');
    setShowAddSupplier(false);
  };

  const updateSupplier = (id: string, updates: Partial<Supplier>) => {
    persistSuppliers(suppliers.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteSupplier = (id: string) => {
    if (window.confirm('Xóa nhà cung cấp này?')) persistSuppliers(suppliers.filter(s => s.id !== id));
  };

  const syncSupplier = async (id: string) => {
    const supplier = suppliers.find(s => s.id === id);
    if (!supplier) return;
    setSyncingId(id);
    try {
      // Fetch paper prices from supplier's account via API (by email or code)
      const identifier = supplier.email || supplier.code;
      const resp = await fetch(`/api/suppliers/${encodeURIComponent(identifier)}/papers`);
      if (!resp.ok) throw new Error(`Không thể đồng bộ (${resp.status})`);
      const data = await resp.json();
      const papers: Paper[] = (data.papers || []).map((p: any) => ({
        type: String(p.type || ''), gsm: Number(p.gsm) || 0,
        size: String(p.size || '650x860'),
        width: Number(p.width) || 650, height: Number(p.height) || 860,
        price: Number(p.price) || 0
      })).filter((p: Paper) => p.type && p.gsm > 0 && p.price > 0);
      const updated = suppliers.map(s => s.id === id ? {
        ...s, papers, lastSync: new Date(),
        name: data.name || s.name,
        phone: data.phone || s.phone,
        address: data.address || s.address,
      } : s);
      persistSuppliers(updated);
      alert(`Đã đồng bộ ${papers.length} loại giấy từ ${supplier.name || supplier.email}`);
    } catch (err: any) {
      alert(`Lỗi đồng bộ: ${err.message}`);
    } finally { setSyncingId(null); }
  };

  // ============ RENDER ============
  return (
    <div className="h-full bg-slate-100 font-sans text-slate-800 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-indigo-700 text-white p-4 shadow-md shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-2 rounded"><Database size={20}/></div>
            <div><h1 className="text-xl font-bold">Quản Lý Giá Giấy</h1><p className="text-[10px] opacity-80">Sàn giá giấy & Nhà cung cấp</p></div>
          </div>
          <div className="flex bg-indigo-900/50 p-1 rounded-lg">
            {(['prices', 'suppliers', 'config'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 ${activeTab === tab ? 'bg-white text-indigo-800 shadow' : 'text-indigo-200 hover:text-white'}`}>
                {tab === 'prices' && <><Database size={14}/> Bảng Giá</>}
                {tab === 'suppliers' && <><Building2 size={14}/> NCC {suppliers.length > 0 && <span className="bg-indigo-200 text-indigo-700 text-[10px] px-1.5 rounded-full">{suppliers.length}</span>}</>}
                {tab === 'config' && <><Settings size={14}/> Cấu Hình</>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto">


          {/* ===== TAB 1: BẢNG GIÁ ===== */}
          {activeTab === 'prices' && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex flex-wrap gap-3 items-center">
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border rounded px-3 py-2 text-sm bg-white">
                  <option value="all">Tất cả loại ({paperDatabase.length})</option>
                  {paperTypes.map(t => <option key={t} value={t}>{t} ({paperDatabase.filter(p => p.type === t).length})</option>)}
                </select>
                <div className="flex-1"/>
                <button onClick={() => setShowImport(true)} className="bg-blue-600 text-white px-3 py-2 rounded text-sm font-bold hover:bg-blue-700 flex items-center gap-1"><Upload size={14}/> Import</button>
                <button onClick={() => setShowAddPaper(true)} className="bg-green-600 text-white px-3 py-2 rounded text-sm font-bold hover:bg-green-700 flex items-center gap-1"><Plus size={14}/> Thêm Giấy</button>
                <button onClick={() => { if (window.confirm('Reset về mặc định?')) setPaperDatabase(DEFAULT_PAPER_DATABASE); }} className="text-red-400 hover:text-red-600 px-2 py-2 rounded border text-sm flex items-center gap-1"><RefreshCw size={12}/> Reset</button>
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="max-h-[calc(100vh-280px)] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                      <tr>
                        <th className="text-left p-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('type')}>Loại giấy <SortIcon col="type"/></th>
                        <th className="text-left p-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('size')}>Khổ <SortIcon col="size"/></th>
                        <th className="text-right p-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('gsm')}>GSM <SortIcon col="gsm"/></th>
                        <th className="text-right p-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('price')}>Giá/tờ <SortIcon col="price"/></th>
                        <th className="p-3 w-24 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {displayPapers.map(p => {
                        const idx = p._idx;
                        const isEditing = editingRow === idx;
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            {isEditing ? (<>
                              <td className="p-2"><input className="w-full p-1.5 border rounded text-sm" value={editForm.type || ''} onChange={e => setEditForm({...editForm, type: e.target.value})}/></td>
                              <td className="p-2"><input className="w-full p-1.5 border rounded text-sm" placeholder="650x860" value={editForm.size || ''} onChange={e => setEditForm({...editForm, size: e.target.value})}/></td>
                              <td className="p-2"><input type="number" className="w-full p-1.5 border rounded text-sm text-right" value={editForm.gsm || ''} onChange={e => setEditForm({...editForm, gsm: Number(e.target.value)})}/></td>
                              <td className="p-2"><input type="number" className="w-full p-1.5 border rounded text-sm text-right" value={editForm.price || ''} onChange={e => setEditForm({...editForm, price: Number(e.target.value)})}/></td>
                              <td className="p-2 text-center">
                                <button onClick={() => saveEdit(idx)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Check size={14}/></button>
                                <button onClick={() => { setEditingRow(null); setEditForm({}); }} className="text-slate-400 hover:bg-slate-100 p-1 rounded ml-1"><X size={14}/></button>
                              </td>
                            </>) : (<>
                              <td className="p-3 font-medium text-slate-800">{p.type}</td>
                              <td className="p-3 text-slate-600 font-mono">{p.size}</td>
                              <td className="p-3 text-right text-slate-600">{p.gsm}gsm</td>
                              <td className="p-3 text-right font-mono font-bold text-cyan-700">{formatVND(p.price)}</td>
                              <td className="p-3 text-center">
                                <button onClick={() => { setEditingRow(idx); setEditForm(p); }} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Edit2 size={13}/></button>
                                <button onClick={() => deletePaper(idx)} className="text-red-400 hover:bg-red-50 p-1 rounded ml-1"><Trash2 size={13}/></button>
                              </td>
                            </>)}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add Paper Dialog */}
              {showAddPaper && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-lg">Thêm Giấy Mới</h3>
                      <button onClick={() => setShowAddPaper(false)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Loại giấy</label>
                        <input className="w-full p-2.5 border rounded-lg text-sm" placeholder="VD: Couche, Offset, Ivory..." value={addForm.type || ''} onChange={e => setAddForm({...addForm, type: e.target.value})} list="paper-types"/>
                        <datalist id="paper-types">{paperTypes.map(t => <option key={t} value={t}/>)}</datalist>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-500 block mb-1">Khổ giấy</label>
                          <input className="w-full p-2.5 border rounded-lg text-sm font-mono" placeholder="650x860" value={addForm.size || ''} onChange={e => setAddForm({...addForm, size: e.target.value})}/>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 block mb-1">Định lượng (GSM)</label>
                          <input type="number" className="w-full p-2.5 border rounded-lg text-sm" placeholder="200" value={addForm.gsm || ''} onChange={e => setAddForm({...addForm, gsm: Number(e.target.value)})}/>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Giá / tờ (VND)</label>
                        <input type="number" className="w-full p-2.5 border rounded-lg text-sm font-mono font-bold text-cyan-700" placeholder="3000" value={addForm.price || ''} onChange={e => setAddForm({...addForm, price: Number(e.target.value)})}/>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end mt-5">
                      <button onClick={() => setShowAddPaper(false)} className="px-4 py-2.5 border rounded-lg text-sm text-slate-600 hover:bg-slate-100">Hủy</button>
                      <button onClick={addPaper} className="bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-green-700 flex items-center gap-1"><Plus size={14}/> Thêm</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Import Dialog */}
              {showImport && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-lg">Import Bảng Giá Giấy</h3>
                      <button onClick={() => setShowImport(false)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
                    </div>
                    {/* Mode toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                      <button onClick={() => setImportMode('file')} className={`flex-1 py-2 text-sm font-bold rounded-md flex items-center justify-center gap-1 ${importMode === 'file' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}><Upload size={14}/> File Excel/CSV</button>
                      <button onClick={() => setImportMode('sheet')} className={`flex-1 py-2 text-sm font-bold rounded-md flex items-center justify-center gap-1 ${importMode === 'sheet' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}><Link size={14}/> Google Sheet</button>
                    </div>
                    <p className="text-xs text-slate-500 mb-3 bg-slate-50 p-2 rounded">Cần 4 cột theo thứ tự: <b>Loại giấy</b>, <b>Khổ</b> (VD: 650x860), <b>GSM</b>, <b>Giá/tờ</b>. Dòng đầu là tiêu đề.</p>
                    {importMode === 'file' ? (
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                        <Upload size={32} className="mx-auto mb-2 text-slate-400"/>
                        <p className="text-sm text-slate-500 mb-3">Chọn file Excel (.xlsx, .xls) hoặc CSV</p>
                        <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileImport} className="text-sm"/>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <input className="w-full p-2.5 border rounded-lg text-sm" placeholder="https://docs.google.com/spreadsheets/d/..." value={sheetUrl} onChange={e => setSheetUrl(e.target.value)}/>
                        <button onClick={handleSheetImport} disabled={!sheetUrl || importLoading}
                          className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1">
                          {importLoading ? <><RefreshCw size={14} className="animate-spin"/> Đang tải...</> : <><Upload size={14}/> Tải và Import</>}
                        </button>
                      </div>
                    )}
                    <p className="text-[10px] text-red-400 mt-3">⚠️ Dữ liệu mới sẽ thay thế toàn bộ bảng giá hiện tại.</p>
                  </div>
                </div>
              )}
            </div>
          )}


          {/* ===== TAB 2: NHÀ CUNG CẤP ===== */}
          {activeTab === 'suppliers' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Building2 size={20}/> Nhà Cung Cấp ({suppliers.length})</h2>
                <button onClick={() => setShowAddSupplier(!showAddSupplier)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-1"><Plus size={14}/> Thêm NCC</button>
              </div>

              {/* Add Supplier - chỉ cần email */}
              {showAddSupplier && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
                  <h3 className="font-bold text-indigo-800 mb-3">Thêm Nhà Cung Cấp</h3>
                  <p className="text-xs text-slate-500 mb-3">Nhập <b>email</b> tài khoản hoặc <b>mã định danh</b> của nhà cung cấp. Giá giấy sẽ được đồng bộ tự động.</p>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                      <input className="w-full p-2.5 pl-9 border rounded-lg text-sm" placeholder="email@ncc.com hoặc mã định danh (VD: NCC-001)" value={supplierInput} onChange={e => setSupplierInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addSupplier()}/>
                    </div>
                    <button onClick={addSupplier} className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700">Thêm</button>
                    <button onClick={() => { setShowAddSupplier(false); setSupplierInput(''); }} className="px-3 py-2.5 border rounded-lg text-sm text-slate-600 hover:bg-slate-100">Hủy</button>
                  </div>
                </div>
              )}

              {/* Supplier List */}
              {suppliers.length === 0 ? (
                <div className="bg-white p-12 rounded-xl text-center border">
                  <Building2 size={48} className="mx-auto mb-4 text-slate-300"/>
                  <h3 className="text-slate-500 font-medium">Chưa có nhà cung cấp nào</h3>
                  <p className="text-sm text-slate-400 mt-1">Thêm email tài khoản NCC để đồng bộ giá giấy tự động.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {suppliers.map(s => (
                    <div key={s.id} className="bg-white rounded-xl shadow-sm border p-5">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg text-slate-800">{s.name}</h3>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${s.papers.length > 0 ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                              {s.papers.length > 0 ? `${s.papers.length} loại giấy` : 'Chưa đồng bộ'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-indigo-600 mb-2">
                            <Mail size={12}/> {s.email || <span className="font-mono">Mã: {s.code}</span>}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                            {s.phone && <span className="flex items-center gap-1"><Phone size={10}/> {s.phone}</span>}
                            {s.address && <span className="flex items-center gap-1"><MapPin size={10}/> {s.address}</span>}
                          </div>
                          {s.lastSync && <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><Clock size={9}/> Đồng bộ lần cuối: {new Date(s.lastSync).toLocaleString('vi-VN')}</p>}
                          {/* Paper types preview */}
                          {s.papers.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {Array.from(new Set(s.papers.map(p => p.type))).map(type => (
                                <span key={type} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-medium">
                                  {type} ({s.papers.filter(p => p.type === type).length})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-start gap-2">
                          <button onClick={() => syncSupplier(s.id)} disabled={syncingId === s.id}
                            className="bg-cyan-600 text-white px-3 py-2 rounded text-sm font-bold hover:bg-cyan-700 disabled:opacity-50 flex items-center gap-1">
                            <RefreshCw size={14} className={syncingId === s.id ? 'animate-spin' : ''}/> {syncingId === s.id ? 'Đang sync...' : 'Đồng bộ'}
                          </button>
                          <button onClick={() => { const name = prompt('Tên hiển thị:', s.name); if (name) updateSupplier(s.id, { name }); }}
                            className="text-slate-400 hover:text-slate-600 p-2 rounded border hover:bg-slate-50"><Edit2 size={14}/></button>
                          <button onClick={() => deleteSupplier(s.id)} className="text-red-400 hover:text-red-600 p-2 rounded border hover:bg-red-50"><Trash2 size={14}/></button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Sync All */}
                  {suppliers.length > 1 && (
                    <button onClick={async () => { for (const s of suppliers) await syncSupplier(s.id); }}
                      className="w-full py-3 border-2 border-dashed border-cyan-300 rounded-xl text-cyan-600 font-bold hover:bg-cyan-50 flex items-center justify-center gap-2">
                      <RefreshCw size={14}/> Đồng bộ tất cả NCC
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ===== TAB 4: CẤU HÌNH ===== */}
          {activeTab === 'config' && (
            <div className="space-y-4">
              <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Settings size={20}/> Cấu Hình</h2>
              <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">

                {/* My Supplier Profile */}
                <div>
                  <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><Building2 size={16} className="text-indigo-600"/> Thông Tin Nhà Cung Cấp (Của Bạn)</h3>
                  <p className="text-xs text-slate-400 mb-3">Thông tin này hiển thị khi NCC khác thêm bạn vào danh sách. Mã định danh dùng thay email nếu bạn không muốn chia sẻ email.</p>
                  <div className="bg-indigo-50 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tên công ty / Tên hiển thị</label>
                        <input className="w-full p-2.5 border rounded-lg text-sm bg-white" placeholder="VD: Giấy Bình An" value={myProfile.name} onChange={e => { const p = {...myProfile, name: e.target.value}; setMyProfile(p); saveProfile(p); }}/>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Mã định danh <span className="text-indigo-500">(thay thế email)</span></label>
                        <input className="w-full p-2.5 border rounded-lg text-sm bg-white font-mono" placeholder="VD: NCC-BINHAN-001" value={myProfile.code} onChange={e => { const p = {...myProfile, code: e.target.value}; setMyProfile(p); saveProfile(p); }}/>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Email</label>
                        <input type="email" className="w-full p-2.5 border rounded-lg text-sm bg-white" placeholder="email@congty.com" value={myProfile.email} onChange={e => { const p = {...myProfile, email: e.target.value}; setMyProfile(p); saveProfile(p); }}/>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Số điện thoại</label>
                        <input className="w-full p-2.5 border rounded-lg text-sm bg-white" placeholder="0901234567" value={myProfile.phone} onChange={e => { const p = {...myProfile, phone: e.target.value}; setMyProfile(p); saveProfile(p); }}/>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Địa chỉ</label>
                      <input className="w-full p-2.5 border rounded-lg text-sm bg-white" placeholder="Quận, Thành phố" value={myProfile.address} onChange={e => { const p = {...myProfile, address: e.target.value}; setMyProfile(p); saveProfile(p); }}/>
                    </div>
                    {myProfile.code && (
                      <div className="bg-white rounded-lg border border-indigo-200 p-3 flex items-center gap-3">
                        <div className="text-xs text-slate-500">Chia sẻ mã này cho đối tác để họ thêm bạn:</div>
                        <code className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded font-bold text-sm">{myProfile.code}</code>
                      </div>
                    )}
                  </div>
                </div>
                {/* Auto Sync */}
                <div>
                  <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><RefreshCw size={16} className="text-cyan-600"/> Tự Động Đồng Bộ</h3>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-700">Chu kỳ đồng bộ tự động</p>
                        <p className="text-xs text-slate-400">Tự động lấy giá mới từ tất cả NCC theo chu kỳ. 0 = tắt.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="number" min="0" value={managerConfig.autoSyncInterval} onChange={e => updateConfig({...managerConfig, autoSyncInterval: Number(e.target.value) || 0})}
                          className="w-20 p-2 border rounded text-sm text-center font-mono"/>
                        <span className="text-sm text-slate-500">phút</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-700">Thông báo khi giá thay đổi</p>
                        <p className="text-xs text-slate-400">Hiện thông báo khi NCC cập nhật giá mới.</p>
                      </div>
                      <button onClick={() => updateConfig({...managerConfig, notifyPriceChange: !managerConfig.notifyPriceChange})}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold ${managerConfig.notifyPriceChange ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                        {managerConfig.notifyPriceChange ? 'BẬT' : 'TẮT'}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-700">Tự động áp dụng giá rẻ nhất</p>
                        <p className="text-xs text-slate-400">Khi đồng bộ, tự động cập nhật giá rẻ nhất vào bảng tính giá.</p>
                      </div>
                      <button onClick={() => updateConfig({...managerConfig, autoApplyCheapest: !managerConfig.autoApplyCheapest})}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold ${managerConfig.autoApplyCheapest ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                        {managerConfig.autoApplyCheapest ? 'BẬT' : 'TẮT'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Data Management */}
                <div>
                  <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><Database size={16} className="text-indigo-600"/> Quản Lý Dữ Liệu</h3>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                      <div className="bg-white rounded-lg border p-3">
                        <div className="text-2xl font-bold text-slate-700">{paperDatabase.length}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Loại giấy</div>
                      </div>
                      <div className="bg-white rounded-lg border p-3">
                        <div className="text-2xl font-bold text-indigo-600">{suppliers.length}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Nhà cung cấp</div>
                      </div>
                      <div className="bg-white rounded-lg border p-3">
                        <div className="text-2xl font-bold text-cyan-600">{suppliers.reduce((s, sup) => s + sup.papers.length, 0)}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Giá từ NCC</div>
                      </div>
                      <div className="bg-white rounded-lg border p-3">
                        <div className="text-2xl font-bold text-green-600">{paperTypes.length}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Nhóm giấy</div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => { if (window.confirm('Reset bảng giá về mặc định?')) setPaperDatabase(DEFAULT_PAPER_DATABASE); }}
                        className="text-sm text-red-500 hover:bg-red-50 px-3 py-2 rounded border border-red-200 flex items-center gap-1"><RefreshCw size={12}/> Reset bảng giá</button>
                      <button onClick={() => { if (window.confirm('Xóa tất cả NCC?')) persistSuppliers([]); }}
                        className="text-sm text-red-500 hover:bg-red-50 px-3 py-2 rounded border border-red-200 flex items-center gap-1"><Trash2 size={12}/> Xóa tất cả NCC</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default PaperPriceManager;
