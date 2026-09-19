/**
 * Variables Helper Component
 * 
 * Hiển thị danh sách variables có sẵn cho Header/Footer templates
 * Cho phép copy variable vào clipboard
 */

import React, { useState } from 'react';
import { Copy, Check, Search, Info } from 'lucide-react';
import {
  VariableDefinition,
  QUOTE_VARIABLES,
  INVOICE_VARIABLES,
  getVariablesByCategory,
} from '../utils/templateVariables';

interface VariablesHelperProps {
  type: 'quote' | 'invoice';
  className?: string;
}

export const VariablesHelper: React.FC<VariablesHelperProps> = ({ type, className = '' }) => {
  const [copiedKey, setCopiedKey] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const variables = type === 'quote' ? QUOTE_VARIABLES : INVOICE_VARIABLES;

  // Filter variables
  const filteredVariables = variables.filter(v => {
    const matchesSearch = 
      v.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || v.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const groupedVariables = {
    company: filteredVariables.filter(v => v.category === 'company'),
    customer: filteredVariables.filter(v => v.category === 'customer'),
    document: filteredVariables.filter(v => v.category === 'document'),
    financial: filteredVariables.filter(v => v.category === 'financial'),
  };

  const copyVariable = (key: string) => {
    const variableText = `{{${key}}}`;
    navigator.clipboard.writeText(variableText);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  const categoryLabels = {
    company: '🏢 Thông tin công ty',
    customer: '👤 Thông tin khách hàng',
    document: '📄 Thông tin chứng từ',
    financial: '💰 Thông tin tài chính',
  };

  const categoryColors = {
    company: 'bg-blue-50 border-blue-200 text-blue-700',
    customer: 'bg-green-50 border-green-200 text-green-700',
    document: 'bg-amber-50 border-amber-200 text-amber-700',
    financial: 'bg-purple-50 border-purple-200 text-purple-700',
  };

  return (
    <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Info size={18} className="text-blue-600" />
          <h4 className="font-bold text-gray-800">Biến có sẵn</h4>
        </div>
        <span className="text-xs text-gray-500">
          {filteredVariables.length} biến
        </span>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm biến..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tất cả</option>
          <option value="company">Công ty</option>
          <option value="customer">Khách hàng</option>
          <option value="document">Chứng từ</option>
          <option value="financial">Tài chính</option>
        </select>
      </div>

      {/* Info Box */}
      <div className="bg-white/70 rounded-lg p-3 mb-3 text-xs text-gray-600">
        <p className="font-medium mb-1">💡 Cách sử dụng:</p>
        <ul className="list-disc ml-4 space-y-0.5">
          <li>Click vào biến để copy vào clipboard</li>
          <li>Paste vào editor: <code className="bg-gray-100 px-1 rounded">Ctrl+V</code></li>
          <li>Biến sẽ tự động thay thế khi in/xuất PDF</li>
        </ul>
      </div>

      {/* Variables List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {Object.entries(groupedVariables).map(([category, vars]) => {
          if (vars.length === 0) return null;
          
          return (
            <div key={category}>
              <h5 className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
                {categoryLabels[category as keyof typeof categoryLabels]}
              </h5>
              <div className="grid grid-cols-1 gap-2">
                {vars.map((variable) => (
                  <button
                    key={variable.key}
                    onClick={() => copyVariable(variable.key)}
                    className={`text-left px-3 py-2 rounded-lg border transition-all hover:shadow-sm ${
                      categoryColors[category as keyof typeof categoryColors]
                    } ${copiedKey === variable.key ? 'ring-2 ring-green-500' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-xs font-mono font-bold">
                            {`{{${variable.key}}}`}
                          </code>
                          {copiedKey === variable.key && (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                              <Check size={12} />
                              Đã copy
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-medium text-gray-700">{variable.label}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{variable.description}</p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          VD: <span className="font-medium">{variable.example}</span>
                        </p>
                      </div>
                      <Copy size={14} className="text-gray-400 flex-shrink-0 mt-1" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* No Results */}
      {filteredVariables.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Search size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Không tìm thấy biến nào</p>
        </div>
      )}

      {/* Footer Note */}
      <div className="mt-3 pt-3 border-t border-blue-200">
        <p className="text-[10px] text-gray-500 text-center">
          ⚠️ Biến không có giá trị sẽ hiển thị nguyên dạng <code className="bg-gray-100 px-1 rounded">{`{{variable}}`}</code>
        </p>
      </div>
    </div>
  );
};

export default VariablesHelper;
