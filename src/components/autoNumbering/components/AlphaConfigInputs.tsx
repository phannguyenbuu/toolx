import React from 'react';
import { AlphaConfig } from '../types';

interface AlphaConfigInputsProps {
  config: AlphaConfig;
  onChange: (config: AlphaConfig) => void;
}

export const AlphaConfigInputs: React.FC<AlphaConfigInputsProps> = ({
  config,
  onChange
}) => {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Giá trị bắt đầu
        </label>
        <input
          type="number"
          value={config.startValue}
          onChange={(e) =>
            onChange({ ...config, startValue: parseInt(e.target.value) || 1 })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          min={1}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tổng số lượng
        </label>
        <input
          type="number"
          value={config.totalQuantity}
          onChange={(e) =>
            onChange({ ...config, totalQuantity: parseInt(e.target.value) || 1 })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          min={1}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Chữ cái bắt đầu
        </label>
        <input
          type="text"
          value={config.startLetter}
          onChange={(e) =>
            onChange({
              ...config,
              startLetter: e.target.value.toUpperCase().slice(0, 1) || 'A'
            })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
          maxLength={1}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Số mỗi chữ cái
        </label>
        <input
          type="number"
          value={config.numbersPerLetter}
          onChange={(e) =>
            onChange({
              ...config,
              numbersPerLetter: parseInt(e.target.value) || 999
            })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          min={1}
          max={9999}
        />
      </div>
    </>
  );
};
