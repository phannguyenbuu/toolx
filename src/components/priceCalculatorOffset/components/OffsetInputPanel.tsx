import React from 'react';
import {
  FileText,
  Zap,
  Plus,
  XCircle
} from 'lucide-react';
import {
  InputState,
  CustomPaper,
  FinishingItem,
  Machine,
  Suggestion,
  ConfigState
} from '../types';
import { formatVND } from '../helpers';
import { OffsetPaperSelection } from './OffsetPaperSelection';

interface OffsetInputPanelProps {
  inputs: InputState;
  setInputs: React.Dispatch<React.SetStateAction<InputState>>;
  localInputs: { width: string; height: string; quantity: string };
  handleNumChange: (field: keyof InputState, value: string) => void;
  isCustomPaper: boolean;
  setIsCustomPaper: (val: boolean) => void;
  customPaper: CustomPaper;
  setCustomPaper: React.Dispatch<React.SetStateAction<CustomPaper>>;
  paperTypes: string[];
  availableGSMs: number[];
  machines: Machine[];
  config: ConfigState;
  extraFinishings: FinishingItem[];
  setExtraFinishings: React.Dispatch<React.SetStateAction<FinishingItem[]>>;
  isCalculatingSuggestion: boolean;
  suggestion: Suggestion | null;
}

export const OffsetInputPanel: React.FC<OffsetInputPanelProps> = ({
  inputs,
  setInputs,
  localInputs,
  handleNumChange,
  isCustomPaper,
  setIsCustomPaper,
  customPaper,
  setCustomPaper,
  paperTypes,
  availableGSMs,
  machines,
  config,
  extraFinishings,
  setExtraFinishings,
  isCalculatingSuggestion,
  suggestion
}) => {
  const handleAddFinishing = () => {
    const defaultType = 'Bế Demi';
    const defaultFinishing = config.defaultFinishings.find((f) => f.type === defaultType);
    setExtraFinishings([
      ...extraFinishings,
      {
        id: Date.now(),
        type: defaultType,
        name: '',
        unit: defaultFinishing?.unit || 'bộ',
        overrideVal: '',
        price: defaultFinishing?.defaultPrice?.toString() || ''
      }
    ]);
  };

  const updateFinishing = (id: number, field: string, value: string) => {
    setExtraFinishings(
      extraFinishings.map((item) => {
        if (item.id !== id) return item;
        if (field === 'type') {
          const defaultFinishing = config.defaultFinishings.find((f) => f.type === value);
          return {
            ...item,
            type: value,
            unit: defaultFinishing?.unit || item.unit,
            price: defaultFinishing?.defaultPrice?.toString() || item.price
          };
        }
        return { ...item, [field]: value };
      })
    );
  };

  const removeFinishing = (id: number) => {
    setExtraFinishings(extraFinishings.filter((item) => item.id !== id));
  };

  return (
    <div className="lg:col-span-4 space-y-4">
      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
          <h2 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
            <FileText size={16} className="text-indigo-600" /> Thông Số Sản Phẩm
          </h2>
        </div>

        <div className="p-4 space-y-4">
          {/* Dimensions & Quantity */}
          <div>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Rộng (mm)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={localInputs.width}
                  onChange={(e) => handleNumChange('width', e.target.value)}
                  className="w-full p-2 border rounded font-mono font-bold text-slate-700 bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Cao (mm)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={localInputs.height}
                  onChange={(e) => handleNumChange('height', e.target.value)}
                  className="w-full p-2 border rounded font-mono font-bold text-slate-700 bg-white"
                />
              </div>
            </div>

            <div className="mb-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Số Lượng (con)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={localInputs.quantity}
                onChange={(e) => handleNumChange('quantity', e.target.value)}
                className="w-full p-2 border rounded font-mono font-bold text-slate-700 bg-white"
              />
            </div>

            {/* Bleed option */}
            <div className="flex items-center justify-between p-2 bg-slate-50 rounded border mb-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inputs.useBleed}
                  onChange={(e) => setInputs({ ...inputs, useBleed: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Tràn lề (Bleed)
              </label>
              {inputs.useBleed && (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={inputs.bleedMargin}
                    onChange={(e) => setInputs({ ...inputs, bleedMargin: e.target.value })}
                    className="w-12 p-1 border rounded text-xs text-center font-bold"
                  />
                  <span className="text-[10px] text-slate-400">mm/cạnh</span>
                </div>
              )}
            </div>

            {/* Quick sizes */}
            <div className="flex gap-1 flex-wrap">
              {[
                { name: 'A3', w: '297', h: '420' },
                { name: 'A4', w: '210', h: '297' },
                { name: 'A5', w: '148', h: '210' },
                { name: 'Card', w: '90', h: '54' }
              ].map((s) => (
                <button
                  type="button"
                  key={s.name}
                  onClick={() => {
                    handleNumChange('width', s.w);
                    handleNumChange('height', s.h);
                  }}
                  className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded text-slate-600"
                >
                  {s.name}
                </button>
              ))}
            </div>

            {/* Suggestions */}
            {isCalculatingSuggestion ? (
              <div className="mt-2 bg-yellow-50 border border-yellow-200 p-2 rounded text-xs text-yellow-700 flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                <span>Đang tìm gợi ý tối ưu...</span>
              </div>
            ) : (
              suggestion && (
                <div className="mt-2 bg-green-50 border border-green-200 p-2 rounded text-xs text-green-800 flex items-start gap-2">
                  <Zap size={14} className="mt-0.5 text-green-600 shrink-0" />
                  <div>
                    <span className="font-bold">💡 Gợi ý:</span> Giảm còn{' '}
                    <b>
                      {suggestion.w}x{suggestion.h}mm
                    </b>{' '}
                    tiết kiệm <b className="text-green-700">{formatVND(suggestion.diff)}</b>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Paper Selection */}
          <OffsetPaperSelection
            isCustomPaper={isCustomPaper}
            setIsCustomPaper={setIsCustomPaper}
            inputs={inputs}
            setInputs={setInputs}
            customPaper={customPaper}
            setCustomPaper={setCustomPaper}
            paperTypes={paperTypes}
            availableGSMs={availableGSMs}
          />

          {/* Machine & Colors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Số màu in
              </label>
              <select
                value={inputs.printColors}
                onChange={(e) => setInputs({ ...inputs, printColors: e.target.value })}
                className="w-full p-2 border rounded bg-white text-sm"
              >
                <option value="auto">Auto</option>
                <option value="1">1 màu</option>
                <option value="2">2 màu</option>
                <option value="4">4 màu</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Chọn Máy
              </label>
              <select
                value={inputs.selectedMachine}
                onChange={(e) => setInputs({ ...inputs, selectedMachine: e.target.value })}
                className="w-full p-2 border rounded bg-white text-sm"
              >
                <option value="auto">⚡ Auto</option>
                {machines
                  .filter((m) => m.maxColors >= (parseInt(inputs.printColors) || 0))
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Print Sides */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
              Chế độ in
            </label>
            <div className="flex bg-slate-100 p-1 rounded">
              <button
                type="button"
                onClick={() => setInputs({ ...inputs, printSides: 1 })}
                className={`flex-1 py-2 text-xs font-bold rounded ${
                  inputs.printSides === 1 ? 'bg-white shadow text-slate-800' : 'text-slate-500'
                }`}
              >
                1 Mặt
              </button>
              <button
                type="button"
                onClick={() => setInputs({ ...inputs, printSides: 2 })}
                className={`flex-1 py-2 text-xs font-bold rounded ${
                  inputs.printSides === 2 ? 'bg-white shadow text-slate-800' : 'text-slate-500'
                }`}
              >
                2 Mặt
              </button>
            </div>
          </div>

          {/* Lamination */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
              Cán màng ({formatVND(config.laminationPrice)}/m²)
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded">
              {(['none', '1side', '2side'] as const).map((opt) => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => setInputs({ ...inputs, lamination: opt })}
                  className={`py-2 text-[10px] font-bold rounded ${
                    inputs.lamination === opt
                      ? 'bg-white shadow text-slate-800'
                      : 'text-slate-500'
                  }`}
                >
                  {opt === 'none' ? 'Không' : opt === '1side' ? '1 Mặt' : '2 Mặt'}
                </button>
              ))}
            </div>
          </div>

          {/* Extra Finishings */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">
                Gia công thêm
              </label>
              <button
                type="button"
                onClick={handleAddFinishing}
                className="text-xs text-indigo-600 font-bold flex items-center gap-1 hover:underline"
              >
                <Plus size={12} /> Thêm
              </button>
            </div>
            <div className="space-y-2">
              {extraFinishings.map((item) => (
                <div key={item.id} className="p-2 border rounded bg-slate-50 text-xs relative">
                  <div className="grid grid-cols-2 gap-2 mb-1">
                    <select
                      className="w-full p-1 border rounded bg-white text-xs font-medium"
                      value={item.type}
                      onChange={(e) => updateFinishing(item.id, 'type', e.target.value)}
                    >
                      {config.defaultFinishings.map((df) => (
                        <option key={df.type} value={df.type}>
                          {df.type}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Ghi chú"
                      value={item.name}
                      onChange={(e) => updateFinishing(item.id, 'name', e.target.value)}
                      className="w-full p-1 border rounded bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="w-full p-1 border rounded bg-white"
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
                    type="button"
                    onClick={() => removeFinishing(item.id)}
                    className="absolute top-1 right-1 text-slate-300 hover:text-red-500"
                  >
                    <XCircle size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
