import React from 'react';
import { Cog, Settings, Trash2, Plus, XCircle, Save } from 'lucide-react';
import { Machine } from '../../../utils/calculatorTypes';
import { DigitalConfig } from '../../../contexts/PrintConfigContext';
import { formatVND } from '../helpers';

interface DigitalMachinesConfigProps {
  machines: Machine[];
  digitalConfig: DigitalConfig;
  editingMachineId: string | null;
  machineForm: {
    name: string;
    maxWidth: string;
    maxHeight: string;
    baseQty: string;
    clickPrice: string;
    clickTable: { maxLength: string; clicks: string }[];
  };
  setMachineForm: React.Dispatch<React.SetStateAction<any>>;
  handleEditMachine: (m: Machine) => void;
  handleDeleteMachine: (id: string) => void;
  resetMachineForm: () => void;
  handleSaveMachine: () => void;
  addClickRow: () => void;
  removeClickRow: (idx: number) => void;
  updateClickRow: (idx: number, field: string, value: string) => void;
}

export const DigitalMachinesConfig: React.FC<DigitalMachinesConfigProps> = ({
  machines,
  digitalConfig,
  editingMachineId,
  machineForm,
  setMachineForm,
  handleEditMachine,
  handleDeleteMachine,
  resetMachineForm,
  handleSaveMachine,
  addClickRow,
  removeClickRow,
  updateClickRow
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <Cog size={18} /> Máy In Digital
        </h2>
        <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
          {machines.length} máy
        </span>
      </div>
      <div className="divide-y divide-slate-100">
        {machines.map((m) => (
          <div
            key={m.id}
            className={`p-4 ${
              editingMachineId === m.id ? 'bg-cyan-50 ring-2 ring-cyan-300' : 'hover:bg-slate-50'
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-bold text-slate-800">{m.name}</h4>
                <div className="flex gap-3 mt-1 text-xs text-slate-500">
                  <span>Khổ: {m.maxWidth}×{m.maxHeight}mm</span>
                  <span>Click: {formatVND(m.clickPrice ?? digitalConfig.clickPrice)}</span>
                  <span>{(m.clickTable ?? digitalConfig.clickTable).length} mức click</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEditMachine(m)}
                  className={`p-1.5 rounded cursor-pointer ${
                    editingMachineId === m.id
                      ? 'bg-cyan-600 text-white'
                      : 'text-cyan-500 hover:bg-cyan-100'
                  }`}
                >
                  <Settings size={14} />
                </button>
                <button
                  onClick={() => handleDeleteMachine(m.id)}
                  className="text-red-400 hover:text-red-600 p-1.5 cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {machines.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            <Cog size={32} className="mx-auto mb-2 opacity-30" />
            <p>Chưa có máy in nào</p>
          </div>
        )}
      </div>

      {/* Machine Form */}
      <div className="bg-slate-50 p-5 border-t">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
            {editingMachineId ? (
              <>
                <Settings size={14} /> Sửa Máy
              </>
            ) : (
              <>
                <Plus size={14} /> Thêm Máy Mới
              </>
            )}
          </h3>
          {editingMachineId && (
            <button
              onClick={resetMachineForm}
              className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Hủy
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div className="col-span-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
              Tên Máy
            </label>
            <input
              type="text"
              className="w-full p-2 border rounded text-sm bg-white"
              placeholder="VD: Máy Digital 33x48"
              value={machineForm.name}
              onChange={(e) => setMachineForm({ ...machineForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
              Rộng max (mm)
            </label>
            <input
              type="number"
              className="w-full p-2 border rounded text-sm bg-white"
              value={machineForm.maxWidth}
              onChange={(e) => setMachineForm({ ...machineForm, maxWidth: e.target.value })}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
              Cao max (mm)
            </label>
            <input
              type="number"
              className="w-full p-2 border rounded text-sm bg-white"
              value={machineForm.maxHeight}
              onChange={(e) => setMachineForm({ ...machineForm, maxHeight: e.target.value })}
            />
          </div>
        </div>

        {/* Click Config */}
        <div className="bg-white rounded border p-3 mb-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Giá 1 Click (VND)
              </label>
              <input
                type="number"
                className="w-full p-2 border rounded font-mono font-bold text-sm text-cyan-700 bg-white"
                value={machineForm.clickPrice}
                onChange={(e) => setMachineForm({ ...machineForm, clickPrice: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase">
              Bảng số click theo chiều dài
            </label>
            <button
              onClick={addClickRow}
              className="text-[10px] bg-cyan-50 text-cyan-600 px-2 py-1 rounded font-bold hover:bg-cyan-100 cursor-pointer"
            >
              + Thêm mức
            </button>
          </div>
          {machineForm.clickTable.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">
              Chưa có mức click. Mặc định = 1 click/tờ.
            </p>
          ) : (
            <div className="space-y-1">
              {machineForm.clickTable.map((row, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-slate-400 w-8">≤</span>
                    <input
                      type="number"
                      className="w-full p-1.5 border rounded text-sm font-mono bg-white"
                      placeholder="mm"
                      value={row.maxLength}
                      onChange={(e) => updateClickRow(idx, 'maxLength', e.target.value)}
                    />
                    <span className="text-[9px] text-slate-400">mm</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      className="w-full p-1.5 border rounded text-sm font-mono bg-white"
                      placeholder="clicks"
                      value={row.clicks}
                      onChange={(e) => updateClickRow(idx, 'clicks', e.target.value)}
                    />
                    <span className="text-[9px] text-slate-400">click</span>
                  </div>
                  <button
                    onClick={() => removeClickRow(idx)}
                    className="p-1 text-red-400 hover:text-red-600 cursor-pointer"
                  >
                    <XCircle size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          {editingMachineId && (
            <button
              onClick={resetMachineForm}
              className="px-4 py-2 border rounded text-sm text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Hủy
            </button>
          )}
          <button
            onClick={handleSaveMachine}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-5 rounded shadow text-sm flex items-center gap-2 cursor-pointer"
          >
            <Save size={14} /> {editingMachineId ? 'Cập nhật' : 'Thêm máy'}
          </button>
        </div>
      </div>
    </div>
  );
};
