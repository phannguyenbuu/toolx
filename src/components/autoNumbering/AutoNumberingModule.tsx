import React from 'react';
import { AutoNumberingModuleProps } from './types';
import { AutoNumberingIcons } from './icons';
import { useAutoNumberingState } from './useAutoNumberingState';
import { ModeTabs } from './components/ModeTabs';
import { StandardConfigInputs } from './components/StandardConfigInputs';
import { AlphaConfigInputs } from './components/AlphaConfigInputs';
import { RepeatConfigInputs } from './components/RepeatConfigInputs';
import { CommonConfigInputs } from './components/CommonConfigInputs';
import { PreviewTable } from './components/PreviewTable';

export const AutoNumberingModule: React.FC<AutoNumberingModuleProps> = ({
  onApply,
  onClose
}) => {
  const {
    mode,
    setMode,
    generatedData,
    standardConfig,
    setStandardConfig,
    alphaConfig,
    setAlphaConfig,
    repeatConfig,
    setRepeatConfig,
    commonConfig,
    setCommonConfig,
    handleGenerate,
    handleApply
  } = useAutoNumberingState(onApply);

  const currentTotalQuantity =
    mode === 'standard'
      ? standardConfig.totalQuantity
      : mode === 'alpha'
      ? alphaConfig.totalQuantity
      : repeatConfig.totalQuantity;

  return (
    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-auto overflow-hidden">
      <div className="p-6">
        {/* Mode Tabs */}
        <ModeTabs mode={mode} onSelectMode={setMode} />

        {/* Configuration Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {mode === 'standard' && (
            <StandardConfigInputs
              config={standardConfig}
              onChange={setStandardConfig}
            />
          )}

          {mode === 'alpha' && (
            <AlphaConfigInputs
              config={alphaConfig}
              onChange={setAlphaConfig}
            />
          )}

          {mode === 'repeat' && (
            <RepeatConfigInputs
              config={repeatConfig}
              onChange={setRepeatConfig}
            />
          )}

          <CommonConfigInputs
            config={commonConfig}
            onChange={setCommonConfig}
          />
        </div>

        {/* Generate Button */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            type="button"
            onClick={handleGenerate}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200 cursor-pointer"
          >
            {AutoNumberingIcons.play}
            <span>Tạo dữ liệu</span>
          </button>
        </div>

        {/* Preview Table */}
        <PreviewTable
          generatedData={generatedData}
          mode={mode}
          totalQuantity={currentTotalQuantity}
          copiesPerSet={repeatConfig.copiesPerSet}
        />

        {/* Action Buttons */}
        {generatedData.length > 0 && onApply && (
          <div className="mt-6 pt-6 border-t border-gray-200 flex flex-wrap gap-3 justify-end">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Hủy
              </button>
            )}
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-200 cursor-pointer"
            >
              {AutoNumberingIcons.download}
              <span>Áp dụng dữ liệu</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutoNumberingModule;
