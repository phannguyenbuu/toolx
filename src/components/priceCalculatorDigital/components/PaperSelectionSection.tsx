import React from 'react';
import { Database } from 'lucide-react';
import { InputState, CustomPaper } from '../../../utils/calculatorTypes';

interface PaperSelectionSectionProps {
  inputs: InputState;
  setInputs: React.Dispatch<React.SetStateAction<InputState>>;
  isCustomPaper: boolean;
  setIsCustomPaper: (val: boolean) => void;
  customPaper: CustomPaper;
  setCustomPaper: React.Dispatch<React.SetStateAction<CustomPaper>>;
  paperTypes: string[];
  availableGSMs: number[];
}

export const PaperSelectionSection: React.FC<PaperSelectionSectionProps> = ({
  inputs,
  setInputs,
  isCustomPaper,
  setIsCustomPaper,
  customPaper,
  setCustomPaper,
  paperTypes,
  availableGSMs
}) => {
  return (
    <div className="bg-slate-50 p-3 rounded border space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database size={14} />
          <span className="text-[10px] font-bold text-slate-500 uppercase">Giấy In</span>
        </div>
        <div className="flex bg-white rounded border overflow-hidden">
          <button
            onClick={() => setIsCustomPaper(false)}
            className={`px-2 py-1 text-[10px] font-bold cursor-pointer transition ${
              !isCustomPaper ? 'bg-cyan-100 text-cyan-700' : 'text-slate-500'
            }`}
          >
            Chuẩn
          </button>
          <button
            onClick={() => setIsCustomPaper(true)}
            className={`px-2 py-1 text-[10px] font-bold cursor-pointer transition ${
              isCustomPaper ? 'bg-cyan-100 text-cyan-700' : 'text-slate-500'
            }`}
          >
            Tùy chỉnh
          </button>
        </div>
      </div>

      {!isCustomPaper ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Loại Giấy</label>
            <select
              value={inputs.selectedPaperType}
              onChange={(e) => setInputs({ ...inputs, selectedPaperType: e.target.value })}
              className="w-full p-2 border rounded bg-white text-sm cursor-pointer"
            >
              {paperTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Định Lượng</label>
            <select
              value={inputs.selectedGSM}
              onChange={(e) => setInputs({ ...inputs, selectedGSM: parseInt(e.target.value) })}
              className="w-full p-2 border rounded bg-white text-sm cursor-pointer"
            >
              {availableGSMs.map((g) => (
                <option key={g} value={g}>
                  {g} gsm
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Tên giấy"
            className="w-full p-2 border rounded bg-white text-sm"
            value={customPaper.name}
            onChange={(e) => setCustomPaper({ ...customPaper, name: e.target.value })}
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              placeholder="Rộng"
              className="w-full p-2 border rounded bg-white text-sm"
              value={customPaper.width}
              onChange={(e) => setCustomPaper({ ...customPaper, width: e.target.value })}
            />
            <input
              type="number"
              placeholder="Cao"
              className="w-full p-2 border rounded bg-white text-sm"
              value={customPaper.height}
              onChange={(e) => setCustomPaper({ ...customPaper, height: e.target.value })}
            />
            <input
              type="number"
              placeholder="GSM"
              className="w-full p-2 border rounded bg-white text-sm"
              value={customPaper.gsm}
              onChange={(e) => setCustomPaper({ ...customPaper, gsm: e.target.value })}
            />
          </div>
          <input
            type="number"
            placeholder="Giá/tờ (VND)"
            className="w-full p-2 border rounded bg-white text-sm font-bold"
            value={customPaper.price}
            onChange={(e) => setCustomPaper({ ...customPaper, price: e.target.value })}
          />
        </div>
      )}
    </div>
  );
};
