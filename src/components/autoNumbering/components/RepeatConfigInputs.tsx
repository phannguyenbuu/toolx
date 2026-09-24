import React from 'react';
import { RepeatConfig } from '../types';

interface RepeatConfigInputsProps {
  config: RepeatConfig;
  onChange: (config: RepeatConfig) => void;
}

export const RepeatConfigInputs: React.FC<RepeatConfigInputsProps> = ({
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
          Số bản/bộ (copies)
        </label>
        <input
          type="number"
          value={config.copiesPerSet}
          onChange={(e) =>
            onChange({ ...config, copiesPerSet: parseInt(e.target.value) || 1 })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          min={1}
          max={100}
        />
      </div>
    </>
  );
};
