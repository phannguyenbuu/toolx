import React, { useRef } from 'react';
import { Image, Building2, Upload, Trash2 } from 'lucide-react';

interface BusinessLogoCardProps {
  logo?: string;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'logo') => void;
  onRemove: (type: 'logo') => void;
}

export const BusinessLogoCard: React.FC<BusinessLogoCardProps> = ({
  logo,
  onUpload,
  onRemove,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-white rounded-xl border p-6">
      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Image size={18} className="text-indigo-600" />
        Logo công ty
      </h3>
      <div className="flex items-center gap-6">
        <div className="h-24 w-24 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
          {logo ? (
            <img src={logo} alt="Logo" className="h-full w-full object-contain" />
          ) : (
            <Building2 size={32} className="text-gray-300" />
          )}
        </div>
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => onUpload(e, 'logo')}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
          >
            <Upload size={16} />
            Tải lên logo
          </button>
          {logo && (
            <button
              onClick={() => onRemove('logo')}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 flex items-center gap-2"
            >
              <Trash2 size={16} />
              Xóa
            </button>
          )}
          <p className="text-xs text-gray-500">PNG, JPG. Tối đa 2MB</p>
        </div>
      </div>
    </div>
  );
};
