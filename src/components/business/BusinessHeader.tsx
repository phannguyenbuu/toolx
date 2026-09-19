import React from 'react';
import { Database, AlertCircle } from 'lucide-react';

interface BusinessHeaderProps {
  title: string;
  subtitle: string;
  isLoaded: boolean;
  loading: boolean;
  error: string | null;
  children?: React.ReactNode;
}

export const BusinessHeader: React.FC<BusinessHeaderProps> = ({
  title,
  subtitle,
  loading,
  error,
  children
}) => {

  return (
    <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6 shadow-lg">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl">
              <Database size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{title}</h1>
              <p className="text-indigo-200 text-sm">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Action Buttons */}
            {children}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 bg-red-500/20 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-red-200" />
              <span className="text-sm text-red-200">Lỗi: {error}</span>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="mt-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-200 border-t-transparent"></div>
              <span className="text-sm text-yellow-200">Đang tải dữ liệu...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};