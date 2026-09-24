import React from 'react';
import {
  Printer,
  Trash2,
  Plus,
  XCircle,
  Save,
  Upload,
  Database
} from 'lucide-react';
import { Machine } from '../types';
import { formatVND } from '../helpers';

interface OffsetMachinesConfigProps {
  machines: Machine[];
  editingMachineId: string | null;
  machineForm: {
    name: string;
    maxWidth: string;
    maxHeight: string;
    baseQty: string;
    maxColors: string;
    colorPricing: { colors: string; basePrice: string; excessPrice: string }[];
  };
  setMachineForm: React.Dispatch<
    React.SetStateAction<{
      name: string;
      maxWidth: string;
      maxHeight: string;
      baseQty: string;
      maxColors: string;
      colorPricing: { colors: string; basePrice: string; excessPrice: string }[];
    }>
  >;
  onEditMachine: (m: Machine) => void;
  onDeleteMachine: (id: string) => void;
  onSaveMachine: () => void;
  onResetMachineForm: () => void;
  onAddColorPricing: () => void;
  onRemoveColorPricing: (idx: number) => void;
  onUpdateColorPricing: (idx: number, field: string, value: string) => void;
  onOpenPaperImport: () => void;
}

export const OffsetMachinesConfig: React.FC<OffsetMachinesConfigProps> = ({
  machines,
  editingMachineId,
  machineForm,
  setMachineForm,
  onEditMachine,
  onDeleteMachine,
  onSaveMachine,
  onResetMachineForm,
  onAddColorPricing,
  onRemoveColorPricing,
  onUpdateColorPricing,
  onOpenPaperImport
}) => {
  return (
    <div className="bg-white rounded-xl shadow-md border overflow-hidden">
      <div className="p-5 border-b bg-slate-50 flex items-center justify-between">
        <h2 className="font-bold text-slate-700 flex items-center gap-2">
          <Database size={18} className="text-indigo-600" /> Quản Lý Máy In Offset
        </h2>
        <button
          type="button"
          onClick={onOpenPaperImport}
          className="text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded font-bold flex items-center gap-1.5 transition cursor-pointer"
        >
          <Upload size={14} /> Nhập Giá Giấy
        </button>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* List of machines */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Danh sách máy in</h3>
          <div className="space-y-3">
            {machines.map((m) => (
              <div
                key={m.id}
                className={`p-4 rounded-lg border transition ${
                  editingMachineId === m.id
                    ? 'border-indigo-500 bg-indigo-50/30'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-slate-800">{m.name}</h4>
                    <p className="text-xs text-slate-500">
                      Khổ tối đa: {m.maxWidth} x {m.maxHeight} mm | Số màu tối đa: {m.maxColors} màu
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => onEditMachine(m)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 p-1 font-bold cursor-pointer"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteMachine(m.id)}
                      className="text-xs text-red-500 hover:text-red-700 p-1 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Color pricing badges */}
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Bảng giá in theo số màu:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {m.colorPricing && m.colorPricing.length > 0 ? (
                      m.colorPricing.map((cp, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200"
                        >
                          <b>{cp.colors} màu:</b> {formatVND(cp.basePrice)}
                          {cp.excessPrice > 0 ? ` + ${formatVND(cp.excessPrice)}/lượt` : ''}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Chưa thiết lập</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Machine edit/create form */}
        <div className="bg-slate-50 p-5 rounded-lg border">
          <h3 className="text-xs font-bold text-slate-700 uppercase mb-4 flex items-center gap-1.5">
            <Printer size={15} />
            {editingMachineId ? 'Chỉnh sửa thông số máy in' : 'Thêm máy in offset mới'}
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Tên máy in
              </label>
              <input
                type="text"
                placeholder="VD: Heidelberg Speedmaster CD 102"
                className="w-full p-2 border rounded text-sm bg-white font-medium"
                value={machineForm.name}
                onChange={(e) => setMachineForm({ ...machineForm, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Khổ rộng max (mm)
                </label>
                <input
                  type="number"
                  placeholder="VD: 720"
                  className="w-full p-2 border rounded text-sm bg-white font-mono"
                  value={machineForm.maxWidth}
                  onChange={(e) => setMachineForm({ ...machineForm, maxWidth: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Khổ cao max (mm)
                </label>
                <input
                  type="number"
                  placeholder="VD: 1020"
                  className="w-full p-2 border rounded text-sm bg-white font-mono"
                  value={machineForm.maxHeight}
                  onChange={(e) => setMachineForm({ ...machineForm, maxHeight: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  SL cơ sở (tờ)
                </label>
                <input
                  type="number"
                  className="w-full p-2 border rounded text-sm bg-white font-mono"
                  value={machineForm.baseQty}
                  onChange={(e) => setMachineForm({ ...machineForm, baseQty: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Số màu tối đa
                </label>
                <input
                  type="number"
                  className="w-full p-2 border rounded text-sm bg-white font-mono"
                  value={machineForm.maxColors}
                  onChange={(e) => setMachineForm({ ...machineForm, maxColors: e.target.value })}
                />
              </div>
            </div>

            {/* Dynamic Color Pricing */}
            <div className="pt-2">
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">
                  Bảng giá theo số màu
                </label>
                <button
                  type="button"
                  onClick={onAddColorPricing}
                  className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded font-bold hover:bg-indigo-200 flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={12} /> Thêm mức giá
                </button>
              </div>

              {machineForm.colorPricing.length === 0 ? (
                <div className="p-4 border-2 border-dashed border-slate-200 rounded text-center text-slate-400 text-sm">
                  Chưa có mức giá nào. Nhấn &quot;Thêm mức giá&quot; để bắt đầu.
                </div>
              ) : (
                <div className="space-y-2">
                  {machineForm.colorPricing.map((cp, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-3 rounded border">
                      <div className="w-20">
                        <label className="text-[9px] text-slate-400 block">Số màu</label>
                        <input
                          type="number"
                          min="1"
                          className="w-full p-1.5 border rounded text-sm font-bold text-center"
                          value={cp.colors}
                          onChange={(e) => onUpdateColorPricing(idx, 'colors', e.target.value)}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[9px] text-slate-400 block">
                          Giá base (1000 lượt đầu)
                        </label>
                        <input
                          type="number"
                          placeholder="VD: 500000"
                          className="w-full p-1.5 border rounded text-sm"
                          value={cp.basePrice}
                          onChange={(e) => onUpdateColorPricing(idx, 'basePrice', e.target.value)}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[9px] text-slate-400 block">
                          Giá vượt (mỗi lượt)
                        </label>
                        <input
                          type="number"
                          placeholder="VD: 100"
                          className="w-full p-1.5 border rounded text-sm"
                          value={cp.excessPrice}
                          onChange={(e) => onUpdateColorPricing(idx, 'excessPrice', e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveColorPricing(idx)}
                        className="text-red-400 hover:text-red-600 p-1 mt-4 cursor-pointer"
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3">
              {editingMachineId && (
                <button
                  type="button"
                  onClick={onResetMachineForm}
                  className="px-4 py-2 border rounded text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
              )}
              <button
                type="button"
                onClick={onSaveMachine}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded shadow flex items-center gap-2 cursor-pointer"
              >
                <Save size={16} /> {editingMachineId ? 'Cập nhật' : 'Thêm máy'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
