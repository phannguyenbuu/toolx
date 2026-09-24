import React from 'react';
import { NumberingMode } from '../types';
import { AutoNumberingIcons } from '../icons';

interface ModeTabsProps {
  mode: NumberingMode;
  onSelectMode: (mode: NumberingMode) => void;
}

const modeDescriptions: Record<NumberingMode, string> = {
  standard: 'Tạo dãy số tuần tự với số 0 đứng trước (VD: 000001, 000002...)',
  alpha: 'Tạo dãy chữ-số theo bảng chữ cái (VD: A001 → A999 → B001...)',
  repeat: 'Tạo dãy số lặp lại cho in carbonless (VD: 1, 1, 1, 2, 2, 2...)'
};

export const ModeTabs: React.FC<ModeTabsProps> = ({ mode, onSelectMode }) => {
  return (
    <>
      {/* Mode Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => onSelectMode('standard')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all cursor-pointer ${
            mode === 'standard'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {AutoNumberingIcons.hashtag}
          <span>Chuẩn</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectMode('alpha')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all cursor-pointer ${
            mode === 'alpha'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {AutoNumberingIcons.font}
          <span>Chữ-Số (A-Z)</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectMode('repeat')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all cursor-pointer ${
            mode === 'repeat'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {AutoNumberingIcons.copy}
          <span>Lặp lại (Carbonless)</span>
        </button>
      </div>

      {/* Mode Description */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6">
        <p className="text-blue-700 text-sm">{modeDescriptions[mode]}</p>
      </div>
    </>
  );
};
