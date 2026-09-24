import React from 'react';
import { Settings, TrendingUp, AlertTriangle, Scissors } from 'lucide-react';
import { ConfigState, InputState } from '../types';

interface OffsetGeneralConfigProps {
  config: ConfigState;
  setConfig: (config: ConfigState) => void;
  inputs: InputState;
}

export const OffsetGeneralConfig: React.FC<OffsetGeneralConfigProps> = ({
  config,
  setConfig,
  inputs
}) => {
  return (
    <div className="bg-white rounded-xl shadow-md border overflow-hidden">
      <div className="p-5 border-b bg-slate-50 flex items-center justify-between">
        <h2 className="font-bold text-slate-700 flex items-center gap-2">
          <Settings size={18} className="text-indigo-600" /> Cấu hình chung & Chi phí in
        </h2>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-3 rounded-lg border">
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">
              Giá Cán Màng
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={config.laminationPrice}
                onChange={(e) =>
                  setConfig({ ...config, laminationPrice: parseInt(e.target.value) || 0 })
                }
                className="w-full p-2 border rounded-md font-mono font-bold text-slate-700 bg-white"
                placeholder="1200"
              />
              <span className="text-xs text-slate-400 whitespace-nowrap">đ/m²</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border">
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">
              Lợi Nhuận
            </label>
            <div className="flex items-center gap-1">
              <TrendingUp size={14} className="text-green-500" />
              <input
                type="number"
                value={config.profitMargin}
                onChange={(e) =>
                  setConfig({ ...config, profitMargin: parseFloat(e.target.value) || 0 })
                }
                className="w-full p-2 border rounded-md font-mono font-bold text-slate-700 bg-white"
                placeholder="0"
              />
              <span className="text-xs text-slate-400">%</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border">
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">
              Khổ Cắt Max
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={config.maxCutWidth}
                onChange={(e) =>
                  setConfig({ ...config, maxCutWidth: parseInt(e.target.value) || 0 })
                }
                className="w-full p-2 border rounded-md font-mono font-bold text-slate-700 bg-white"
                placeholder="0"
              />
              <span className="text-xs text-slate-400">mm</span>
            </div>
            <p className="text-[9px] text-slate-400 mt-1">0 = Không giới hạn</p>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border">
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">
              Khổ In Min
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={config.minPrintSize}
                onChange={(e) =>
                  setConfig({ ...config, minPrintSize: parseInt(e.target.value) || 0 })
                }
                className="w-full p-2 border rounded-md font-mono font-bold text-slate-700 bg-white"
                placeholder="250"
              />
              <span className="text-xs text-slate-400">mm</span>
            </div>
          </div>
        </div>
      </div>

      {/* Waste Configuration */}
      <div className="px-5 pb-5">
        <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
          <h3 className="text-sm font-bold text-orange-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={14} />
            Cấu hình Lượt In Hỏng (Waste)
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white p-3 rounded-md border border-orange-100">
              <label className="text-[10px] font-bold text-slate-500 block mb-1">
                Số tờ cố định
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={config.wasteBase}
                  onChange={(e) =>
                    setConfig({ ...config, wasteBase: parseInt(e.target.value) || 0 })
                  }
                  className="w-full p-2 border rounded font-mono font-bold text-slate-700"
                  placeholder="50"
                />
                <span className="text-xs text-slate-400">tờ</span>
              </div>
            </div>
            <div className="bg-white p-3 rounded-md border border-orange-100">
              <label className="text-[10px] font-bold text-slate-500 block mb-1">
                % Hỏng In 1 Mặt
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.1"
                  value={config.wastePercent1Side}
                  onChange={(e) =>
                    setConfig({ ...config, wastePercent1Side: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full p-2 border rounded font-mono font-bold text-slate-700"
                  placeholder="2"
                />
                <span className="text-xs text-slate-400">%</span>
              </div>
            </div>
            <div className="bg-white p-3 rounded-md border border-orange-100">
              <label className="text-[10px] font-bold text-slate-500 block mb-1">
                % Hỏng In 2 Mặt
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.1"
                  value={config.wastePercent2Side}
                  onChange={(e) =>
                    setConfig({ ...config, wastePercent2Side: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full p-2 border rounded font-mono font-bold text-slate-700"
                  placeholder="3"
                />
                <span className="text-xs text-slate-400">%</span>
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs text-orange-700 bg-orange-100/50 px-3 py-2 rounded">
            <b>Công thức:</b> Waste = {config.wasteBase} + (Số tờ ×{' '}
            {inputs.printSides === 2 ? config.wastePercent2Side : config.wastePercent1Side}%)
          </div>
        </div>
      </div>

      {/* Gia công khác */}
      <div className="px-5 pb-5">
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <h3 className="text-sm font-bold text-green-700 mb-3 flex items-center gap-2">
            <Scissors size={14} />
            Gia Công Khác (Giá Mặc Định)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {config.defaultFinishings.map((finishing, idx) => (
              <div key={finishing.type} className="bg-white p-3 rounded-md border border-green-100">
                <label className="text-[10px] font-bold text-slate-600 block mb-1">
                  {finishing.type}
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={finishing.defaultPrice}
                    onChange={(e) => {
                      const updated = [...config.defaultFinishings];
                      updated[idx] = {
                        ...updated[idx],
                        defaultPrice: parseInt(e.target.value) || 0
                      };
                      setConfig({ ...config, defaultFinishings: updated });
                    }}
                    className="w-full p-2 border rounded font-mono font-bold text-slate-700 text-sm"
                    placeholder="0"
                  />
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    đ/{finishing.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-green-600 bg-green-100/50 px-3 py-2 rounded">
            💡 Thiết lập giá mặc định cho các loại gia công. Giá này sẽ được áp dụng khi thêm gia
            công trong phần tính giá.
          </p>
        </div>
      </div>
    </div>
  );
};
