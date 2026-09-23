import React from 'react';
import { Plus, XCircle } from 'lucide-react';
import { FinishingItem } from '../../../utils/calculatorTypes';
import { FINISHING_TYPES } from '../helpers';

interface ExtraFinishingsInputProps {
  extraFinishings: FinishingItem[];
  handleAddFinishing: () => void;
  updateFinishing: (id: number, field: string, value: string) => void;
  removeFinishing: (id: number) => void;
}

export const ExtraFinishingsInput: React.FC<ExtraFinishingsInputProps> = ({
  extraFinishings,
  handleAddFinishing,
  updateFinishing,
  removeFinishing
}) => {
  return (
    <div className="border-t pt-4">
      <div className="flex justify-between items-center mb-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
          <Plus size={10} /> Gia công khác
        </label>
        <button
          onClick={handleAddFinishing}
          className="text-[10px] bg-green-50 text-green-600 px-2 py-1 rounded font-bold hover:bg-green-100 cursor-pointer"
        >
          + Thêm
        </button>
      </div>
      <div className="space-y-3">
        {extraFinishings.map((item) => (
          <div key={item.id} className="bg-slate-50 p-2 rounded border relative">
            <div className="flex gap-2 mb-2">
              <select
                className="w-1/3 p-1 text-xs border rounded bg-white cursor-pointer"
                value={item.type}
                onChange={(e) => updateFinishing(item.id, 'type', e.target.value)}
              >
                {FINISHING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Mô tả"
                className="w-2/3 p-1 text-xs border rounded bg-white"
                value={item.name}
                onChange={(e) => updateFinishing(item.id, 'name', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <input
                type="number"
                placeholder="SL"
                value={item.overrideVal}
                onChange={(e) => updateFinishing(item.id, 'overrideVal', e.target.value)}
                className="w-full p-1 border rounded bg-white"
              />
              <select
                className="w-full p-1 border rounded bg-white cursor-pointer"
                value={item.unit}
                onChange={(e) => updateFinishing(item.id, 'unit', e.target.value)}
              >
                <option value="m²">m²</option>
                <option value="bộ">bộ</option>
                <option value="cái">cái</option>
                <option value="lượt">lượt</option>
              </select>
              <input
                type="number"
                placeholder="Đơn giá"
                value={item.price}
                onChange={(e) => updateFinishing(item.id, 'price', e.target.value)}
                className="w-full p-1 border rounded bg-white"
              />
            </div>
            <button
              onClick={() => removeFinishing(item.id)}
              className="absolute top-1 right-1 text-slate-300 hover:text-red-500 cursor-pointer"
            >
              <XCircle size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
