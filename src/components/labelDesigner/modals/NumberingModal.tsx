import React from 'react';
import { X, Trash2 } from 'lucide-react';
import { AutoNumberingModule } from '../../AutoNumberingModule';
import { SheetRow, generateId } from '../types';

export interface SavedNumberingSet {
  id: string;
  name: string;
  data: any[];
  formula: string;
  createdAt: number;
}

export interface NumberingModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedNumberingSets: SavedNumberingSet[];
  setSavedNumberingSets: React.Dispatch<React.SetStateAction<SavedNumberingSet[]>>;
  dataHeaders: string[];
  setDataHeaders: React.Dispatch<React.SetStateAction<string[]>>;
  dataRows: SheetRow[];
  setDataRows: React.Dispatch<React.SetStateAction<SheetRow[]>>;
}

export const NumberingModal: React.FC<NumberingModalProps> = ({
  isOpen,
  onClose,
  savedNumberingSets,
  setSavedNumberingSets,
  dataHeaders,
  setDataHeaders,
  dataRows,
  setDataRows
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[90vw] max-w-6xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold">Số nhảy tự động</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Left: Saved Sets */}
          <div className="w-64 border-r flex flex-col">
            <div className="p-3 border-b bg-gray-50">
              <h4 className="text-sm font-semibold text-gray-700">
                Đã lưu ({savedNumberingSets.length})
              </h4>
            </div>
            <div className="flex-1 overflow-auto">
              {savedNumberingSets.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">Chưa có số nhảy nào</p>
              ) : (
                <div className="p-2 space-y-2">
                  {savedNumberingSets.map(set => (
                    <div
                      key={set.id}
                      className="border rounded-lg p-2 hover:bg-gray-50 cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className="flex-1 min-w-0"
                          onClick={() => {
                            const newRows = set.data.map((row, index) => ({
                              ...(dataRows[index] || {}),
                              [set.name]: row.value
                            }));
                            if (!dataHeaders.includes(set.name)) {
                              setDataHeaders([...dataHeaders, set.name]);
                            }
                            if (dataRows.length === 0) {
                              setDataRows(newRows);
                            } else {
                              const mergedRows = dataRows.map((row, index) => ({
                                ...row,
                                [set.name]: set.data[index]?.value || row[set.name] || ''
                              }));
                              for (let i = dataRows.length; i < set.data.length; i++) {
                                mergedRows.push({ [set.name]: set.data[i].value });
                              }
                              setDataRows(mergedRows);
                            }
                            alert(`Đã áp dụng "${set.name}" với ${set.data.length} bản ghi`);
                          }}
                        >
                          <p className="text-xs font-medium text-gray-900 truncate">{set.name}</p>
                          <p className="text-[10px] text-gray-500">{set.data.length} bản ghi</p>
                          <p className="text-[10px] text-gray-400 truncate">
                            {new Date(set.createdAt).toLocaleString('vi-VN')}
                          </p>
                        </div>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            if (window.confirm(`Xóa "${set.name}"?`)) {
                              setSavedNumberingSets(prev => prev.filter(s => s.id !== set.id));
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-500"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Generator */}
          <div className="flex-1 overflow-auto">
            <AutoNumberingModule
              onApply={(data: any[], formula: string) => {
                const name = prompt(
                  'Đặt tên cho số nhảy này:',
                  `AUTO_${savedNumberingSets.length + 1}`
                );
                if (!name) return;

                const newSet: SavedNumberingSet = {
                  id: generateId(),
                  name,
                  data,
                  formula,
                  createdAt: Date.now()
                };
                setSavedNumberingSets(prev => [...prev, newSet]);

                const newRows = data.map((row, index) => ({
                  ...(dataRows[index] || {}),
                  [name]: row.value
                }));
                if (!dataHeaders.includes(name)) {
                  setDataHeaders([...dataHeaders, name]);
                }
                if (dataRows.length === 0) {
                  setDataRows(newRows);
                } else {
                  const mergedRows = dataRows.map((row, index) => ({
                    ...row,
                    [name]: data[index]?.value || row[name] || ''
                  }));
                  for (let i = dataRows.length; i < data.length; i++) {
                    mergedRows.push({ [name]: data[i].value });
                  }
                  setDataRows(mergedRows);
                }
                alert(`Đã lưu và áp dụng "${name}" với ${data.length} bản ghi`);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
