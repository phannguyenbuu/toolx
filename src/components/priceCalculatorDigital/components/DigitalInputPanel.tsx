import React, { useState } from 'react';
import { Settings, Zap, Scissors } from 'lucide-react';
import {
  InputState,
  CustomPaper,
  FinishingItem,
  Paper,
  Machine,
  ConfigState,
  Suggestion
} from '../../../utils/calculatorTypes';
import { DigitalConfig } from '../../../contexts/PrintConfigContext';
import { formatVND } from '../helpers';
import { PaperSelectionSection } from './PaperSelectionSection';
import { ExtraFinishingsInput } from './ExtraFinishingsInput';

interface DigitalInputPanelProps {
  inputs: InputState;
  setInputs: React.Dispatch<React.SetStateAction<InputState>>;
  localInputs: { width: string; height: string; quantity: string };
  handleNumChange: (field: keyof InputState, value: string) => void;
  isCalculatingSuggestion: boolean;
  suggestion: Suggestion | null;
  paperDatabase: Paper[];
  paperTypes: string[];
  availableGSMs: number[];
  isCustomPaper: boolean;
  setIsCustomPaper: (val: boolean) => void;
  customPaper: CustomPaper;
  setCustomPaper: React.Dispatch<React.SetStateAction<CustomPaper>>;
  digitalConfig: DigitalConfig;
  forcePreferred: boolean;
  setForcePreferred: (val: boolean) => void;
  preferredConditionsMet: boolean;
  setPreferredAutoSet: (val: boolean) => void;
  preferredSizeMode: string;
  setPreferredSizeMode: (val: string) => void;
  machines: Machine[];
  config: ConfigState;
  extraFinishings: FinishingItem[];
  handleAddFinishing: () => void;
  updateFinishing: (id: number, field: string, value: string) => void;
  removeFinishing: (id: number) => void;
  digitalOptions: any[];
  finalOptions: any[];
}

export const DigitalInputPanel: React.FC<DigitalInputPanelProps> = ({
  inputs,
  setInputs,
  localInputs,
  handleNumChange,
  isCalculatingSuggestion,
  suggestion,
  paperTypes,
  availableGSMs,
  isCustomPaper,
  setIsCustomPaper,
  customPaper,
  setCustomPaper,
  digitalConfig,
  forcePreferred,
  setForcePreferred,
  preferredConditionsMet,
  setPreferredAutoSet,
  preferredSizeMode,
  setPreferredSizeMode,
  machines,
  config,
  extraFinishings,
  handleAddFinishing,
  updateFinishing,
  removeFinishing,
  digitalOptions,
  finalOptions
}) => {
  const [debugInfo, setDebugInfo] = useState<string>('');

  return (
    <div className="lg:col-span-4 space-y-4">
      <div className="bg-white p-5 rounded-xl shadow-sm border">
        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
          <Settings size={18} /> Thông Số In
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">
              Kích thước (mm) & Số lượng
            </label>
            <div className="flex gap-2 mt-1">
              <div className="flex-1">
                <div className="text-[9px] text-slate-400 mb-0.5">Dài</div>
                <input
                  type="number"
                  value={localInputs.width}
                  onChange={(e) => handleNumChange('width', e.target.value)}
                  className="w-full border rounded p-2 font-mono bg-white"
                  placeholder="Dài"
                />
              </div>
              <div className="flex-1">
                <div className="text-[9px] text-slate-400 mb-0.5">Rộng</div>
                <input
                  type="number"
                  value={localInputs.height}
                  onChange={(e) => handleNumChange('height', e.target.value)}
                  className="w-full border rounded p-2 font-mono bg-white"
                  placeholder="Rộng"
                />
              </div>
              <div className="flex-1">
                <div className="text-[9px] text-slate-400 mb-0.5">Số lượng</div>
                <input
                  type="number"
                  value={localInputs.quantity}
                  onChange={(e) => handleNumChange('quantity', e.target.value)}
                  className="w-full border rounded p-2 font-bold text-cyan-700 bg-white"
                  placeholder="SL"
                />
              </div>
            </div>
          </div>

          <div>
            {isCalculatingSuggestion ? (
              <div className="mt-2 bg-yellow-50 border border-yellow-200 p-2 rounded text-xs text-yellow-700 flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                <span>Đang tìm gợi ý tối ưu...</span>
              </div>
            ) : suggestion ? (
              <div className="mt-2 bg-green-50 border border-green-200 p-2 rounded text-xs text-green-800 flex items-start gap-2">
                <Zap size={14} className="mt-0.5 text-green-600 shrink-0" />
                <div>
                  <span className="font-bold">💡 Gợi ý:</span> Giảm còn <b>{suggestion.w}x{suggestion.h}mm</b>{' '}
                  tiết kiệm <b className="text-green-700">{formatVND(suggestion.diff)}</b>
                </div>
              </div>
            ) : null}
          </div>

          {/* Paper Selection (Standard vs Custom) */}
          <PaperSelectionSection
            inputs={inputs}
            setInputs={setInputs}
            isCustomPaper={isCustomPaper}
            setIsCustomPaper={setIsCustomPaper}
            customPaper={customPaper}
            setCustomPaper={setCustomPaper}
            paperTypes={paperTypes}
            availableGSMs={availableGSMs}
          />

          {/* Giấy cắt sẵn */}
          {digitalConfig.preferredPapers.length > 0 && (
            <div className="bg-orange-50 p-3 rounded border border-orange-200 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={forcePreferred}
                  onChange={(e) => {
                    setForcePreferred(e.target.checked);
                    setPreferredAutoSet(false);
                  }}
                  className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                />
                <span className="text-xs font-bold text-orange-700">✂️ Giấy cắt sẵn</span>
              </label>
              {!forcePreferred && preferredConditionsMet && (
                <p className="text-[10px] text-orange-600 bg-orange-100 px-2 py-1 rounded">
                  💡 Đơn hàng nhỏ — nên dùng giấy cắt sẵn để tiết kiệm.
                </p>
              )}
              {forcePreferred &&
                (() => {
                  const filtered = digitalConfig.preferredPapers.filter(
                    (p) =>
                      (!p.paperType || p.paperType === inputs.selectedPaperType) &&
                      (!p.gsm || p.gsm === inputs.selectedGSM)
                  );
                  return (
                    <div>
                      <label className="text-[10px] text-orange-500 block mb-1">Kích thước</label>
                      <select
                        value={preferredSizeMode}
                        onChange={(e) => setPreferredSizeMode(e.target.value)}
                        className="w-full p-1.5 border rounded bg-white text-xs font-bold text-orange-700 cursor-pointer"
                      >
                        <option value="auto">Auto ({filtered.length} khổ)</option>
                        {filtered.map((p, i) => (
                          <option key={i} value={`${p.width}×${p.height}mm`}>
                            {p.width}×{p.height}mm
                            {p.customPrice ? ` - ${formatVND(p.customPrice)}/tờ` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })()}
            </div>
          )}

          {/* Machine */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Chọn Máy</label>
            <select
              value={inputs.selectedMachine}
              onChange={(e) => setInputs({ ...inputs, selectedMachine: e.target.value })}
              className="w-full p-2 border rounded bg-white text-sm cursor-pointer"
            >
              <option value="auto">⚡ Auto</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Print Sides */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Chế độ in</label>
            <div className="flex bg-slate-100 p-1 rounded">
              <button
                onClick={() => setInputs({ ...inputs, printSides: 1 })}
                className={`flex-1 py-2 text-xs font-bold rounded cursor-pointer transition ${
                  inputs.printSides === 1 ? 'bg-white shadow text-slate-800' : 'text-slate-500'
                }`}
              >
                1 Mặt
              </button>
              <button
                onClick={() => setInputs({ ...inputs, printSides: 2 })}
                className={`flex-1 py-2 text-xs font-bold rounded cursor-pointer transition ${
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
                  key={opt}
                  onClick={() => setInputs({ ...inputs, lamination: opt })}
                  className={`py-2 text-[10px] font-bold rounded cursor-pointer transition ${
                    inputs.lamination === opt ? 'bg-white shadow text-slate-800' : 'text-slate-500'
                  }`}
                >
                  {opt === 'none' ? 'Không' : opt === '1side' ? '1 Mặt' : '2 Mặt'}
                </button>
              ))}
            </div>
          </div>

          {/* Bleed */}
          <div className="flex items-center justify-between pt-2 border-t">
            <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <Scissors size={12} /> Bù xén
            </label>
            <div className="flex items-center gap-2">
              {inputs.useBleed && (
                <input
                  type="number"
                  value={inputs.bleedMargin}
                  onChange={(e) => handleNumChange('bleedMargin', e.target.value)}
                  className="w-12 p-1 border rounded text-center text-sm bg-white"
                />
              )}
              <button
                onClick={() => setInputs({ ...inputs, useBleed: !inputs.useBleed })}
                className={`text-xs px-2 py-1 rounded-full cursor-pointer transition ${
                  inputs.useBleed ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-200 text-slate-500'
                }`}
              >
                {inputs.useBleed ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Extra Finishings */}
          <ExtraFinishingsInput
            extraFinishings={extraFinishings}
            handleAddFinishing={handleAddFinishing}
            updateFinishing={updateFinishing}
            removeFinishing={removeFinishing}
          />
        </div>

        {/* Debug Button */}
        <button
          onClick={() => {
            const best = digitalOptions[0];
            const info = {
              input: `${inputs.width}×${inputs.height} SL:${inputs.quantity}`,
              paperType: inputs.selectedPaperType,
              gsm: inputs.selectedGSM,
              bestOption: best
                ? {
                    paper: best.paperSize,
                    ups: best.ups,
                    totalBigSheets: best.totalBigSheets,
                    totalPrice: Math.round(best.digitalTotal),
                    cutXY: `${best.cutX}x${best.cutY}`
                  }
                : null,
              conditions: {
                sheets: best?.totalBigSheets,
                maxSheets: digitalConfig.maxSheetsForPreferred,
                sheetsOK: best ? best.totalBigSheets < digitalConfig.maxSheetsForPreferred : false,
                price: best ? Math.round(best.digitalTotal) : 0,
                maxPrice: digitalConfig.maxPriceForPreferred,
                priceOK: best ? best.digitalTotal < digitalConfig.maxPriceForPreferred : false,
                met: preferredConditionsMet
              },
              preferredPapers: digitalConfig.preferredPapers.map(
                (p) => `${p.paperType || '*'} ${p.gsm || '*'}gsm ${p.width}×${p.height}`
              ),
              forcePreferred,
              finalCount: finalOptions.length,
              finalOptions: finalOptions.slice(0, 3).map((o) => ({
                name: o.machineName,
                paper: o.paperSize,
                ups: o.ups,
                total: Math.round(o.digitalTotal),
                isPreferred: !!(o as any).isPreferred
              }))
            };
            setDebugInfo(JSON.stringify(info, null, 2));
          }}
          className="w-full mt-3 py-2 bg-slate-700 text-white text-xs font-bold rounded hover:bg-slate-800 cursor-pointer transition"
        >
          🔍 Tính toán
        </button>
        {debugInfo && (
          <div className="mt-2 relative">
            <button
              onClick={() => {
                const ta = document.createElement('textarea');
                ta.value = debugInfo;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
              }}
              className="absolute top-1 right-1 bg-green-600 text-white text-[10px] px-2 py-1 rounded hover:bg-green-700 z-10 cursor-pointer"
            >
              📋 Copy
            </button>
            <pre className="p-3 bg-slate-900 text-green-400 text-[10px] rounded overflow-auto max-h-60 font-mono whitespace-pre-wrap">
              {debugInfo}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
