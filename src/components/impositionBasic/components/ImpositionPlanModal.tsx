import React from 'react';
import { X, AlertCircle, Check } from 'lucide-react';
import { LayoutPlan } from '../../../utils/layoutSolver';
import { ImpositionConfig } from '../types';

interface ImpositionPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: LayoutPlan[];
  currentPlanIndex: number;
  onSelectPlan: (index: number) => void;
  config: ImpositionConfig;
}

export const ImpositionPlanModal: React.FC<ImpositionPlanModalProps> = ({
  isOpen,
  onClose,
  plans,
  currentPlanIndex,
  onSelectPlan,
  config
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-medium text-lg text-gray-900">Chọn phương án xếp</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-5 overflow-auto max-h-[70vh]">
          {plans.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <AlertCircle size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-base">Không tìm thấy phương án</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {plans.map((pl, i) => {
                const sc = 130 / config.pageW;
                const isSelected = i === currentPlanIndex;
                return (
                  <div
                    key={i}
                    className={`border-2 p-4 rounded-xl cursor-pointer transition hover:shadow-xl ${
                      isSelected
                        ? 'border-violet-500 bg-violet-50 shadow-lg'
                        : 'border-gray-200 hover:border-violet-300'
                    }`}
                    onClick={() => {
                      onSelectPlan(i);
                      onClose();
                    }}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-medium text-sm text-gray-800">{pl.name}</span>
                      <span className="text-xs font-medium bg-violet-100 text-violet-700 px-2 py-1 rounded-full">
                        {pl.qty} tem
                      </span>
                    </div>
                    <div className="flex justify-center bg-gray-100 p-3 rounded-lg">
                      <div
                        className="bg-white shadow border relative rounded"
                        style={{ width: config.pageW * sc, height: config.pageH * sc }}
                      >
                        {pl.items.map((it, j) => {
                          const aw = (it.rot ? config.itemH : config.itemW) * sc;
                          const ah = (it.rot ? config.itemW : config.itemH) * sc;
                          return (
                            <div
                              key={j}
                              className="absolute bg-violet-200 border border-violet-300"
                              style={{
                                left: it.x * sc,
                                top: it.y * sc,
                                width: aw,
                                height: ah,
                                borderRadius:
                                  config.shape === 'circle'
                                    ? '50%'
                                    : config.cornerRadius > 0
                                    ? config.cornerRadius * sc + 'px'
                                    : '2px'
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="mt-3 text-center">
                        <span className="text-xs font-medium text-violet-600 flex items-center justify-center gap-1">
                          <Check size={14} /> Đang chọn
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
