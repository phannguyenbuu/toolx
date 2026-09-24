import React from 'react';
import { GeneratedRow, NumberingMode } from '../types';
import { AutoNumberingIcons } from '../icons';

interface PreviewTableProps {
  generatedData: GeneratedRow[];
  mode: NumberingMode;
  totalQuantity: number;
  copiesPerSet?: number;
}

export const PreviewTable: React.FC<PreviewTableProps> = ({
  generatedData,
  mode,
  totalQuantity,
  copiesPerSet = 1
}) => {
  if (generatedData.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {AutoNumberingIcons.table}
        <label className="text-sm font-medium text-gray-700">
          Xem trước (10 dòng đầu tiên)
        </label>
      </div>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">
                  STT
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Giá trị
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {generatedData.slice(0, 10).map((row) => (
                <tr key={row.index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-500">{row.index}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 font-mono">
                    {row.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-indigo-500 rounded-full" />
          Tổng: <strong>{totalQuantity}</strong> bản ghi
        </span>
        {mode === 'repeat' && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-purple-500 rounded-full" />
            Số bộ: <strong>{Math.ceil(totalQuantity / copiesPerSet)}</strong>
          </span>
        )}
      </div>
    </div>
  );
};
