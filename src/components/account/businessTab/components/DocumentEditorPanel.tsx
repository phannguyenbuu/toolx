import React, { useRef } from 'react';
import { FileImage, Upload, X, Image as ImageIcon } from 'lucide-react';
import { HTMLEditor } from './HTMLEditor';
import { WYSIWYGEditor } from './WYSIWYGEditor';
import { SingleDocConfig, DisplaySettings } from '../types';

interface DocumentEditorPanelProps {
  previewType: 'quote' | 'invoice';
  setPreviewType: (type: 'quote' | 'invoice') => void;
  currentDocConfig: SingleDocConfig;
  editMode: 'visual' | 'html';
  setEditMode: (mode: 'visual' | 'html') => void;
  displaySettings: DisplaySettings;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'headerImage' | 'footerImage') => void;
  onRemoveImage: (type: 'headerImage' | 'footerImage') => void;
  onDocumentChange: (field: keyof SingleDocConfig, value: string) => void;
  onDisplaySettingChange: (field: keyof DisplaySettings) => void;
}

const DISPLAY_FIELDS: { key: keyof DisplaySettings; label: string }[] = [
  { key: 'showCustomerName', label: 'Tên khách hàng' },
  { key: 'showCustomerEmail', label: 'Email khách hàng' },
  { key: 'showCustomerPhone', label: 'Số điện thoại' },
  { key: 'showCustomerAddress', label: 'Địa chỉ' },
  { key: 'showCustomerTaxCode', label: 'Mã số thuế KH' },
  { key: 'showDocumentNumber', label: 'Số báo giá/hóa đơn' },
  { key: 'showDocumentDate', label: 'Ngày lập' },
  { key: 'showValidUntil', label: 'Hiệu lực đến' },
  { key: 'showPaymentInfo', label: 'Thông tin thanh toán' },
  { key: 'showSignature', label: 'Chữ ký' },
];

export const DocumentEditorPanel: React.FC<DocumentEditorPanelProps> = ({
  previewType,
  setPreviewType,
  currentDocConfig,
  editMode,
  setEditMode,
  displaySettings,
  onImageUpload,
  onRemoveImage,
  onDocumentChange,
  onDisplaySettingChange,
}) => {
  const headerImageRef = useRef<HTMLInputElement>(null);
  const footerImageRef = useRef<HTMLInputElement>(null);

  const docLabel = previewType === 'quote' ? 'Báo giá' : 'Hóa đơn';

  return (
    <div className="space-y-4">
      {/* Document Type Selector */}
      <div className="bg-gradient-to-r from-amber-50 to-emerald-50 rounded-xl border p-4 mb-4">
        <p className="text-sm text-gray-600 mb-2">Đang chỉnh sửa:</p>
        <div className="flex gap-2">
          <button
            onClick={() => setPreviewType('quote')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
              previewType === 'quote'
                ? 'bg-amber-500 text-white shadow'
                : 'bg-white text-gray-600 hover:bg-amber-100'
            }`}
          >
            📋 Báo giá
          </button>
          <button
            onClick={() => setPreviewType('invoice')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
              previewType === 'invoice'
                ? 'bg-emerald-500 text-white shadow'
                : 'bg-white text-gray-600 hover:bg-emerald-100'
            }`}
          >
            🧾 Hóa đơn
          </button>
        </div>
      </div>

      {/* Header Config */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <FileImage size={16} className={previewType === 'quote' ? 'text-amber-600' : 'text-emerald-600'} />
            Header ({docLabel})
          </h3>
          {/* Editor Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setEditMode('visual')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                editMode === 'visual'
                  ? 'bg-white text-indigo-600 shadow'
                  : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              👁️ Visual
            </button>
            <button
              onClick={() => setEditMode('html')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                editMode === 'html'
                  ? 'bg-white text-indigo-600 shadow'
                  : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              {'<>'} HTML
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {/* Header Image */}
          <div className="flex items-center gap-3">
            <div className="h-14 w-28 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0">
              {currentDocConfig.headerImage ? (
                <img src={currentDocConfig.headerImage} alt="Header" className="h-full w-full object-contain" />
              ) : (
                <FileImage size={20} className="text-gray-300" />
              )}
            </div>
            <div className="flex gap-2">
              <input
                ref={headerImageRef}
                type="file"
                accept="image/*"
                onChange={(e) => onImageUpload(e, 'headerImage')}
                className="hidden"
              />
              <button
                onClick={() => headerImageRef.current?.click()}
                className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200 flex items-center gap-1"
              >
                <Upload size={12} /> Tải ảnh
              </button>
              {currentDocConfig.headerImage && (
                <button
                  onClick={() => onRemoveImage('headerImage')}
                  className="px-2 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Header Text Editor */}
          {editMode === 'visual' ? (
            <WYSIWYGEditor
              value={currentDocConfig.header}
              onChange={(html) => onDocumentChange('header', html)}
              placeholder="Nhập nội dung header: Tên công ty, địa chỉ, thông tin liên hệ..."
              minHeight="100px"
            />
          ) : (
            <HTMLEditor
              value={currentDocConfig.header}
              onChange={(html) => onDocumentChange('header', html)}
              placeholder="<div>Nhập HTML cho header...</div>"
              minHeight="150px"
            />
          )}
        </div>
      </div>

      {/* Footer Config */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <FileImage size={16} className="text-emerald-600" />
            Footer ({docLabel})
          </h3>
          {/* Editor Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setEditMode('visual')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                editMode === 'visual'
                  ? 'bg-white text-indigo-600 shadow'
                  : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              👁️ Visual
            </button>
            <button
              onClick={() => setEditMode('html')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                editMode === 'html'
                  ? 'bg-white text-indigo-600 shadow'
                  : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              {'<>'} HTML
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {/* Footer Image */}
          <div className="flex items-center gap-3">
            <div className="h-14 w-28 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0">
              {currentDocConfig.footerImage ? (
                <img src={currentDocConfig.footerImage} alt="Footer" className="h-full w-full object-contain" />
              ) : (
                <FileImage size={20} className="text-gray-300" />
              )}
            </div>
            <div className="flex gap-2">
              <input
                ref={footerImageRef}
                type="file"
                accept="image/*"
                onChange={(e) => onImageUpload(e, 'footerImage')}
                className="hidden"
              />
              <button
                onClick={() => footerImageRef.current?.click()}
                className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-200 flex items-center gap-1"
              >
                <Upload size={12} /> Tải ảnh
              </button>
              {currentDocConfig.footerImage && (
                <button
                  onClick={() => onRemoveImage('footerImage')}
                  className="px-2 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Footer Text Editor */}
          {editMode === 'visual' ? (
            <WYSIWYGEditor
              value={currentDocConfig.footer}
              onChange={(html) => onDocumentChange('footer', html)}
              placeholder="Nhập nội dung footer: Điều khoản, thông tin thanh toán, chữ ký..."
              minHeight="100px"
            />
          ) : (
            <HTMLEditor
              value={currentDocConfig.footer}
              onChange={(html) => onDocumentChange('footer', html)}
              placeholder="<div>Nhập HTML cho footer...</div>"
              minHeight="150px"
            />
          )}
        </div>
      </div>

      {/* Display Settings */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <ImageIcon size={16} className="text-indigo-600" />
          Hiển thị thông tin
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {DISPLAY_FIELDS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1.5 rounded">
              <input
                type="checkbox"
                checked={displaySettings[key]}
                onChange={() => onDisplaySettingChange(key)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>
      
      <p className="text-xs text-gray-500 text-center">
        💡 Tick chọn các thông tin muốn hiển thị trên báo giá/hóa đơn
      </p>
    </div>
  );
};
