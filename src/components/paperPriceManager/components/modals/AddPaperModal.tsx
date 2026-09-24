import React from 'react';
import { X, Plus } from 'lucide-react';
import { Paper } from '../../../../utils/calculatorTypes';

interface AddPaperModalProps {
  show: boolean;
  onClose: () => void;
  addForm: Partial<Paper>;
  setAddForm: React.Dispatch<React.SetStateAction<Partial<Paper>>>;
  paperTypes: string[];
  onAdd: () => void;
}

export const AddPaperModal: React.FC<AddPaperModalProps> = ({
  show,
  onClose,
  addForm,
  setAddForm,
  paperTypes,
  onAdd
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Thêm Giấy Mới</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">Loại giấy</label>
            <input
              className="w-full p-2.5 border rounded-lg text-sm"
              placeholder="VD: Couche, Offset, Ivory..."
              value={addForm.type || ''}
              onChange={(e) => setAddForm({ ...addForm, type: e.target.value })}
              list="paper-types"
            />
            <datalist id="paper-types">
              {paperTypes.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Khổ giấy</label>
              <input
                className="w-full p-2.5 border rounded-lg text-sm font-mono"
                placeholder="650x860"
                value={addForm.size || ''}
                onChange={(e) => setAddForm({ ...addForm, size: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Định lượng (GSM)</label>
              <input
                type="number"
                className="w-full p-2.5 border rounded-lg text-sm"
                placeholder="200"
                value={addForm.gsm || ''}
                onChange={(e) => setAddForm({ ...addForm, gsm: Number(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">Giá / tờ (VND)</label>
            <input
              type="number"
              className="w-full p-2.5 border rounded-lg text-sm font-mono font-bold text-cyan-700"
              placeholder="3000"
              value={addForm.price || ''}
              onChange={(e) => setAddForm({ ...addForm, price: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2.5 border rounded-lg text-sm text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={onAdd}
            className="bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-green-700 flex items-center gap-1 cursor-pointer"
          >
            <Plus size={14} /> Thêm
          </button>
        </div>
      </div>
    </div>
  );
};
