import React from 'react';
import {
  Upload,
  RefreshCw,
  Plus,
  ArrowUpDown,
  Check,
  X,
  Edit2,
  Trash2
} from 'lucide-react';
import { Paper } from '../../../../utils/calculatorTypes';
import { PaperSortCol, formatVND } from '../../types';
import { AddPaperModal } from '../modals/AddPaperModal';
import { ImportPaperModal } from '../modals/ImportPaperModal';

interface PaperPricesTabProps {
  paperDatabase: Paper[];
  paperTypes: string[];
  filterType: string;
  setFilterType: (val: string) => void;
  displayPapers: (Paper & { _idx: number })[];
  sortCol: PaperSortCol;
  handleSort: (col: PaperSortCol) => void;
  editingRow: number | null;
  setEditingRow: (row: number | null) => void;
  editForm: Partial<Paper>;
  setEditForm: React.Dispatch<React.SetStateAction<Partial<Paper>>>;
  saveEdit: (idx: number) => void;
  deletePaper: (idx: number) => void;
  onReset: () => void;
  showAddPaper: boolean;
  setShowAddPaper: (show: boolean) => void;
  addForm: Partial<Paper>;
  setAddForm: React.Dispatch<React.SetStateAction<Partial<Paper>>>;
  addPaper: () => void;
  showImport: boolean;
  setShowImport: (show: boolean) => void;
  importMode: 'file' | 'sheet';
  setImportMode: (mode: 'file' | 'sheet') => void;
  sheetUrl: string;
  setSheetUrl: (url: string) => void;
  importLoading: boolean;
  handleFileImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSheetImport: () => void;
}

export const PaperPricesTab: React.FC<PaperPricesTabProps> = ({
  paperDatabase,
  paperTypes,
  filterType,
  setFilterType,
  displayPapers,
  sortCol,
  handleSort,
  editingRow,
  setEditingRow,
  editForm,
  setEditForm,
  saveEdit,
  deletePaper,
  onReset,
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
  handleSheetImport
}) => {
  const SortIcon = ({ col }: { col: PaperSortCol }) => (
    <ArrowUpDown
      size={10}
      className={`inline ml-1 ${sortCol === col ? 'text-cyan-600' : 'text-slate-300'}`}
    />
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border rounded px-3 py-2 text-sm bg-white"
        >
          <option value="all">Tất cả loại ({paperDatabase.length})</option>
          {paperTypes.map((t) => (
            <option key={t} value={t}>
              {t} ({paperDatabase.filter((p) => p.type === t).length})
            </option>
          ))}
        </select>
        <div className="flex-1" />
        <button
          onClick={() => setShowImport(true)}
          className="bg-blue-600 text-white px-3 py-2 rounded text-sm font-bold hover:bg-blue-700 flex items-center gap-1 cursor-pointer"
        >
          <Upload size={14} /> Import
        </button>
        <button
          onClick={() => setShowAddPaper(true)}
          className="bg-green-600 text-white px-3 py-2 rounded text-sm font-bold hover:bg-green-700 flex items-center gap-1 cursor-pointer"
        >
          <Plus size={14} /> Thêm Giấy
        </button>
        <button
          onClick={onReset}
          className="text-red-400 hover:text-red-600 px-2 py-2 rounded border text-sm flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw size={12} /> Reset
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="max-h-[calc(100vh-280px)] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th
                  className="text-left p-3 cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('type')}
                >
                  Loại giấy <SortIcon col="type" />
                </th>
                <th
                  className="text-left p-3 cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('size')}
                >
                  Khổ <SortIcon col="size" />
                </th>
                <th
                  className="text-right p-3 cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('gsm')}
                >
                  GSM <SortIcon col="gsm" />
                </th>
                <th
                  className="text-right p-3 cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('price')}
                >
                  Giá/tờ <SortIcon col="price" />
                </th>
                <th className="p-3 w-24 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {displayPapers.map((p) => {
                const idx = p._idx;
                const isEditing = editingRow === idx;
                return (
                  <tr key={idx} className="hover:bg-slate-50">
                    {isEditing ? (
                      <>
                        <td className="p-2">
                          <input
                            className="w-full p-1.5 border rounded text-sm"
                            value={editForm.type || ''}
                            onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            className="w-full p-1.5 border rounded text-sm"
                            placeholder="650x860"
                            value={editForm.size || ''}
                            onChange={(e) => setEditForm({ ...editForm, size: e.target.value })}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            className="w-full p-1.5 border rounded text-sm text-right"
                            value={editForm.gsm || ''}
                            onChange={(e) =>
                              setEditForm({ ...editForm, gsm: Number(e.target.value) })
                            }
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            className="w-full p-1.5 border rounded text-sm text-right"
                            value={editForm.price || ''}
                            onChange={(e) =>
                              setEditForm({ ...editForm, price: Number(e.target.value) })
                            }
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => saveEdit(idx)}
                            className="text-green-600 hover:bg-green-50 p-1 rounded cursor-pointer"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingRow(null);
                              setEditForm({});
                            }}
                            className="text-slate-400 hover:bg-slate-100 p-1 rounded ml-1 cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 font-medium text-slate-800">{p.type}</td>
                        <td className="p-3 text-slate-600 font-mono">{p.size}</td>
                        <td className="p-3 text-right text-slate-600">{p.gsm}gsm</td>
                        <td className="p-3 text-right font-mono font-bold text-cyan-700">
                          {formatVND(p.price)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => {
                              setEditingRow(idx);
                              setEditForm(p);
                            }}
                            className="text-blue-500 hover:bg-blue-50 p-1 rounded cursor-pointer"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => deletePaper(idx)}
                            className="text-red-400 hover:bg-red-50 p-1 rounded ml-1 cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Paper Dialog */}
      <AddPaperModal
        show={showAddPaper}
        onClose={() => setShowAddPaper(false)}
        addForm={addForm}
        setAddForm={setAddForm}
        paperTypes={paperTypes}
        onAdd={addPaper}
      />

      {/* Import Dialog */}
      <ImportPaperModal
        show={showImport}
        onClose={() => setShowImport(false)}
        importMode={importMode}
        setImportMode={setImportMode}
        sheetUrl={sheetUrl}
        setSheetUrl={setSheetUrl}
        importLoading={importLoading}
        onFileImport={handleFileImport}
        onSheetImport={handleSheetImport}
      />
    </div>
  );
};
