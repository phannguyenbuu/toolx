import React from 'react';
import { CommonConfig } from '../types';

interface CommonConfigInputsProps {
  config: CommonConfig;
  onChange: (config: CommonConfig) => void;
}

export const CommonConfigInputs: React.FC<CommonConfigInputsProps> = ({
  config,
  onChange
}) => {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tiền tố (Prefix)
        </label>
        <input
          type="text"
          value={config.prefix}
          onChange={(e) => onChange({ ...config, prefix: e.target.value })}
          placeholder="VD: INV-"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Hậu tố (Suffix)
        </label>
        <input
          type="text"
          value={config.suffix}
          onChange={(e) => onChange({ ...config, suffix: e.target.value })}
          placeholder="VD: -2024"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
    </>
  );
};
