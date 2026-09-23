import React, { useState } from 'react';
import { Zap, Check, X, Settings, Trash2, Plus } from 'lucide-react';
import { DigitalConfig } from '../../../contexts/PrintConfigContext';
import { Paper } from '../../../utils/calculatorTypes';
import { formatVND } from '../helpers';

interface DigitalPreferredPapersConfigProps {
  digitalConfig: DigitalConfig;
  setDigitalConfig: (config: DigitalConfig) => void;
  paperDatabase: Paper[];
}

export const DigitalPreferredPapersConfig: React.FC<DigitalPreferredPapersConfigProps> = ({
  digitalConfig,
  setDigitalConfig,
  paperDatabase
}) => {
  const [editingPaperRow, setEditingPaperRow] = useState<number | null>(null);
  const [paperRowForm, setPaperRowForm] = useState({
    paperType: '',
    width: '',
    height: '',
    gsm: '',
    customPrice: ''
  });

  const paperTypes = Array.from(new Set(paperDatabase.map((p) => p.type)));

  return (
    <div className="bg-cyan-50 rounded-lg border border-cyan-200 p-4">
      <h3 className="text-sm font-bold text-cyan-700 mb-3 flex items-center gap-2">
        <Zap size={14} /> Giấy Cắt Sẵn Ưu Tiên
      </h3>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-white p-3 rounded-lg border border-cyan-100">
          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
            Số tờ in dưới
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={digitalConfig.maxSheetsForPreferred}
              onChange={(e) =>
                setDigitalConfig({
                  ...digitalConfig,
                  maxSheetsForPreferred: parseInt(e.target.value) || 0
                })
              }
              className="w-full p-2 border rounded font-mono font-bold text-sm text-cyan-700 bg-cyan-50/50"
            />
            <span className="text-xs text-slate-400">tờ</span>
          </div>
        </div>
        <div className="bg-white p-3 rounded-lg border border-cyan-100">
          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
            Tổng đơn hàng dưới
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={digitalConfig.maxPriceForPreferred}
              onChange={(e) =>
                setDigitalConfig({
                  ...digitalConfig,
                  maxPriceForPreferred: parseInt(e.target.value) || 0
                })
              }
              className="w-full p-2 border rounded font-mono font-bold text-sm text-cyan-700 bg-cyan-50/50"
            />
            <span className="text-xs text-slate-400">VND</span>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-cyan-600 mb-3 bg-cyan-100/50 px-2 py-1.5 rounded">
        💡 Khi số tờ bình &lt; {digitalConfig.maxSheetsForPreferred} <b>và</b> tổng đơn &lt;{' '}
        {formatVND(digitalConfig.maxPriceForPreferred)} → ưu tiên dùng giấy cắt sẵn.
      </p>
      <table className="w-full text-sm bg-white rounded border border-cyan-100 overflow-hidden">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left p-2 text-[10px] font-bold text-slate-500">Loại Giấy</th>
            <th className="text-left p-2 text-[10px] font-bold text-slate-500">Rộng</th>
            <th className="text-left p-2 text-[10px] font-bold text-slate-500">Cao</th>
            <th className="text-left p-2 text-[10px] font-bold text-slate-500">GSM</th>
            <th className="text-left p-2 text-[10px] font-bold text-slate-500">Đơn giá</th>
            <th className="p-2 w-16"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {digitalConfig.preferredPapers.map((paper, idx) => (
            <tr key={idx} className={editingPaperRow === idx ? 'bg-cyan-50' : 'hover:bg-slate-50'}>
              <td className="p-2">
                {editingPaperRow === idx ? (
                  <select
                    value={paperRowForm.paperType}
                    onChange={(e) =>
                      setPaperRowForm({ ...paperRowForm, paperType: e.target.value })
                    }
                    className="w-full p-1.5 border rounded text-sm bg-white cursor-pointer"
                  >
                    <option value="">-- Chọn --</option>
                    {paperTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-slate-700">{paper.paperType || 'Chưa chọn'}</span>
                )}
              </td>
              <td className="p-2">
                {editingPaperRow === idx ? (
                  <input
                    type="number"
                    value={paperRowForm.width}
                    onChange={(e) => setPaperRowForm({ ...paperRowForm, width: e.target.value })}
                    className="w-full p-1.5 border rounded font-mono text-sm bg-white"
                  />
                ) : (
                  <span className="font-mono font-bold text-slate-700">{paper.width}</span>
                )}
              </td>
              <td className="p-2">
                {editingPaperRow === idx ? (
                  <input
                    type="number"
                    value={paperRowForm.height}
                    onChange={(e) => setPaperRowForm({ ...paperRowForm, height: e.target.value })}
                    className="w-full p-1.5 border rounded font-mono text-sm bg-white"
                  />
                ) : (
                  <span className="font-mono font-bold text-cyan-600">{paper.height}</span>
                )}
              </td>
              <td className="p-2">
                {editingPaperRow === idx ? (
                  <input
                    type="number"
                    value={paperRowForm.gsm}
                    onChange={(e) => setPaperRowForm({ ...paperRowForm, gsm: e.target.value })}
                    placeholder="Auto"
                    className="w-full p-1.5 border rounded font-mono text-sm bg-white"
                  />
                ) : (
                  <span className="font-mono text-slate-600">
                    {paper.gsm || <span className="text-slate-400 text-xs">Auto</span>}
                  </span>
                )}
              </td>
              <td className="p-2">
                {editingPaperRow === idx ? (
                  <input
                    type="number"
                    value={paperRowForm.customPrice}
                    onChange={(e) =>
                      setPaperRowForm({ ...paperRowForm, customPrice: e.target.value })
                    }
                    placeholder="Auto"
                    className="w-full p-1.5 border rounded font-mono text-sm bg-white"
                  />
                ) : (
                  <span className="font-mono text-slate-600">
                    {paper.customPrice ? (
                      formatVND(paper.customPrice)
                    ) : (
                      <span className="text-slate-400 text-xs">Auto</span>
                    )}
                  </span>
                )}
              </td>
              <td className="p-2">
                {editingPaperRow === idx ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        const updated = [...digitalConfig.preferredPapers];
                        updated[idx] = {
                          paperType: paperRowForm.paperType,
                          width: parseInt(paperRowForm.width) || 0,
                          height: parseInt(paperRowForm.height) || 0,
                          gsm: parseInt(paperRowForm.gsm) || undefined,
                          customPrice: parseInt(paperRowForm.customPrice) || undefined
                        };
                        setDigitalConfig({ ...digitalConfig, preferredPapers: updated });
                        setEditingPaperRow(null);
                      }}
                      className="p-1 bg-green-500 text-white rounded cursor-pointer"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      onClick={() => setEditingPaperRow(null)}
                      className="p-1 bg-slate-200 text-slate-600 rounded cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingPaperRow(idx);
                        setPaperRowForm({
                          paperType: paper.paperType,
                          width: String(paper.width),
                          height: String(paper.height),
                          gsm: paper.gsm ? String(paper.gsm) : '',
                          customPrice: paper.customPrice ? String(paper.customPrice) : ''
                        });
                      }}
                      className="p-1 text-cyan-500 hover:bg-cyan-100 rounded cursor-pointer"
                    >
                      <Settings size={12} />
                    </button>
                    <button
                      onClick={() =>
                        setDigitalConfig({
                          ...digitalConfig,
                          preferredPapers: digitalConfig.preferredPapers.filter((_, i) => i !== idx)
                        })
                      }
                      className="p-1 text-red-400 hover:bg-red-100 rounded cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        onClick={() => {
          const newIdx = digitalConfig.preferredPapers.length;
          setDigitalConfig({
            ...digitalConfig,
            preferredPapers: [
              ...digitalConfig.preferredPapers,
              { paperType: '', width: 320, height: 450 }
            ]
          });
          setEditingPaperRow(newIdx);
          setPaperRowForm({
            paperType: '',
            width: '320',
            height: '450',
            gsm: '',
            customPrice: ''
          });
        }}
        className="w-full mt-2 py-1.5 border-2 border-dashed border-cyan-300 rounded text-cyan-600 text-sm font-medium hover:bg-cyan-100 flex items-center justify-center gap-1 cursor-pointer transition"
      >
        <Plus size={14} /> Thêm khổ giấy
      </button>
    </div>
  );
};
