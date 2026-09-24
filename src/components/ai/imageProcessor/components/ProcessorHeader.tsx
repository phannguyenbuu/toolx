import React from 'react';
import { Wand2, Loader2, Check, AlertCircle } from 'lucide-react';
import { AIStatus } from '../types';

interface ProcessorHeaderProps {
  aiStatus: AIStatus;
}

export const ProcessorHeader: React.FC<ProcessorHeaderProps> = ({ aiStatus }) => {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl text-white">
            <Wand2 size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Xử lý ảnh AI</h1>
            <p className="text-sm text-gray-500">Công cụ AI mạnh mẽ cho xử lý ảnh</p>
          </div>
        </div>

        {/* AI Status */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            aiStatus === 'available'
              ? 'bg-green-100 text-green-700'
              : aiStatus === 'not-installed'
              ? 'bg-yellow-100 text-yellow-700'
              : aiStatus === 'unavailable'
              ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {aiStatus === 'checking' && <Loader2 size={14} className="animate-spin" />}
          {aiStatus === 'available' && <Check size={14} />}
          {aiStatus === 'not-installed' && <AlertCircle size={14} />}
          {aiStatus === 'unavailable' && <AlertCircle size={14} />}
          {aiStatus === 'checking'
            ? 'Đang kiểm tra...'
            : aiStatus === 'available'
            ? 'AI sẵn sàng'
            : aiStatus === 'not-installed'
            ? 'AI chưa cài đặt'
            : 'AI không khả dụng'}
        </div>
      </div>
    </div>
  );
};
