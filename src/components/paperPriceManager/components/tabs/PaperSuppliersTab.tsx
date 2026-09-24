import React from 'react';
import {
  Building2,
  Plus,
  Mail,
  Phone,
  MapPin,
  Clock,
  RefreshCw,
  Edit2,
  Trash2
} from 'lucide-react';
import { Supplier } from '../../types';

interface PaperSuppliersTabProps {
  suppliers: Supplier[];
  showAddSupplier: boolean;
  setShowAddSupplier: (show: boolean) => void;
  supplierInput: string;
  setSupplierInput: (val: string) => void;
  syncingId: string | null;
  addSupplier: () => void;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  syncSupplier: (id: string) => Promise<void>;
}

export const PaperSuppliersTab: React.FC<PaperSuppliersTabProps> = ({
  suppliers,
  showAddSupplier,
  setShowAddSupplier,
  supplierInput,
  setSupplierInput,
  syncingId,
  addSupplier,
  updateSupplier,
  deleteSupplier,
  syncSupplier
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
          <Building2 size={20} /> Nhà Cung Cấp ({suppliers.length})
        </h2>
        <button
          onClick={() => setShowAddSupplier(!showAddSupplier)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-1 cursor-pointer"
        >
          <Plus size={14} /> Thêm NCC
        </button>
      </div>

      {/* Add Supplier - chỉ cần email */}
      {showAddSupplier && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
          <h3 className="font-bold text-indigo-800 mb-3">Thêm Nhà Cung Cấp</h3>
          <p className="text-xs text-slate-500 mb-3">
            Nhập <b>email</b> tài khoản hoặc <b>mã định danh</b> của nhà cung cấp. Giá giấy sẽ được đồng bộ tự động.
          </p>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Mail
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                className="w-full p-2.5 pl-9 border rounded-lg text-sm"
                placeholder="email@ncc.com hoặc mã định danh (VD: NCC-001)"
                value={supplierInput}
                onChange={(e) => setSupplierInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSupplier()}
              />
            </div>
            <button
              onClick={addSupplier}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 cursor-pointer"
            >
              Thêm
            </button>
            <button
              onClick={() => {
                setShowAddSupplier(false);
                setSupplierInput('');
              }}
              className="px-3 py-2.5 border rounded-lg text-sm text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Supplier List */}
      {suppliers.length === 0 ? (
        <div className="bg-white p-12 rounded-xl text-center border">
          <Building2 size={48} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-slate-500 font-medium">Chưa có nhà cung cấp nào</h3>
          <p className="text-sm text-slate-400 mt-1">
            Thêm email tài khoản NCC để đồng bộ giá giấy tự động.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {suppliers.map((s) => (
            <div key={s.id} className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg text-slate-800">{s.name}</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        s.papers.length > 0
                          ? 'bg-green-100 text-green-600'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {s.papers.length > 0 ? `${s.papers.length} loại giấy` : 'Chưa đồng bộ'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-indigo-600 mb-2">
                    <Mail size={12} /> {s.email || <span className="font-mono">Mã: {s.code}</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    {s.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={10} /> {s.phone}
                      </span>
                    )}
                    {s.address && (
                      <span className="flex items-center gap-1">
                        <MapPin size={10} /> {s.address}
                      </span>
                    )}
                  </div>
                  {s.lastSync && (
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <Clock size={9} /> Đồng bộ lần cuối: {new Date(s.lastSync).toLocaleString('vi-VN')}
                    </p>
                  )}
                  {/* Paper types preview */}
                  {s.papers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {Array.from(new Set(s.papers.map((p) => p.type))).map((type) => (
                        <span
                          key={type}
                          className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-medium"
                        >
                          {type} ({s.papers.filter((p) => p.type === type).length})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => syncSupplier(s.id)}
                    disabled={syncingId === s.id}
                    className="bg-cyan-600 text-white px-3 py-2 rounded text-sm font-bold hover:bg-cyan-700 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={14} className={syncingId === s.id ? 'animate-spin' : ''} />
                    {syncingId === s.id ? 'Đang sync...' : 'Đồng bộ'}
                  </button>
                  <button
                    onClick={() => {
                      const name = prompt('Tên hiển thị:', s.name);
                      if (name) updateSupplier(s.id, { name });
                    }}
                    className="text-slate-400 hover:text-slate-600 p-2 rounded border hover:bg-slate-50 cursor-pointer"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => deleteSupplier(s.id)}
                    className="text-red-400 hover:text-red-600 p-2 rounded border hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {/* Sync All */}
          {suppliers.length > 1 && (
            <button
              onClick={async () => {
                for (const s of suppliers) await syncSupplier(s.id);
              }}
              className="w-full py-3 border-2 border-dashed border-cyan-300 rounded-xl text-cyan-600 font-bold hover:bg-cyan-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw size={14} /> Đồng bộ tất cả NCC
            </button>
          )}
        </div>
      )}
    </div>
  );
};
