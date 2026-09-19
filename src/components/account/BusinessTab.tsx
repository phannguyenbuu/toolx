import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useGlobalAddressData } from '../../hooks/useGlobalAddressData';
import { useBusinessDatabase } from '../../hooks/useBusinessDatabaseApi';
import { businessConfigApi } from '../../services/businessApi';
import { 
  Building2, Award, Printer,
  Save, Plus, X, Upload, Image, CreditCard, Trash2, FileImage,
  Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Link, Type, Heading2, Table
} from 'lucide-react';
import { BusinessInfo } from './types';

interface BusinessTabProps {
  businessInfo: BusinessInfo;
  onSave: (info: BusinessInfo) => void;
}

interface SingleDocConfig {
  header: string;
  footer: string;
  headerImage?: string;
  footerImage?: string;
}

interface DocumentConfig {
  quote: SingleDocConfig;
  invoice: SingleDocConfig;
}

interface DisplaySettings {
  showCustomerName: boolean;
  showCustomerEmail: boolean;
  showCustomerPhone: boolean;
  showCustomerAddress: boolean;
  showCustomerTaxCode: boolean;
  showDocumentNumber: boolean;
  showDocumentDate: boolean;
  showValidUntil: boolean;
  showPaymentInfo: boolean;
  showSignature: boolean;
}

const defaultDisplaySettings: DisplaySettings = {
  showCustomerName: true,
  showCustomerEmail: true,
  showCustomerPhone: true,
  showCustomerAddress: true,
  showCustomerTaxCode: false,
  showDocumentNumber: true,
  showDocumentDate: true,
  showValidUntil: true,
  showPaymentInfo: true,
  showSignature: true,
};

// HTML Editor Component
interface HTMLEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const HTMLEditor: React.FC<HTMLEditorProps> = ({ value, onChange, placeholder, minHeight = '120px' }) => {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-800 px-3 py-2 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
        <span className="text-xs text-gray-400 ml-2">HTML Editor</span>
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full font-mono text-sm border-0 p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
        style={{ minHeight }}
        placeholder={placeholder || '<div>Nhập HTML...</div>'}
      />
      <div className="bg-gray-50 px-3 py-2 border-t text-xs text-gray-500">
        💡 Sử dụng biến: {'{'}{'{'} quoteNumber {'}'}{'}'}, {'{'}{'{'} customerName {'}'}{'}'}, {'{'}{'{'} total {'}'}{'}'}, v.v.
      </div>
    </div>
  );
};

// WYSIWYG Editor Component
interface WYSIWYGEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const WYSIWYGEditor: React.FC<WYSIWYGEditorProps> = ({ value, onChange, placeholder, minHeight = '120px' }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [tableSize, setTableSize] = useState({ rows: 2, cols: 2, stroke: 0 });

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    editorRef.current?.focus();
  }, [onChange]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const insertTable = (rows: number, cols: number, stroke: number = 0) => {
    // stroke = 0: dashed border (editor only visual), stroke > 0: solid border with specified width
    const borderStyle = stroke === 0 
      ? 'border: 1px dashed #d1d5db;' // Visual guide in editor, light gray dashed
      : `border: ${stroke}px solid #333;`; // Actual border for print
    
    const tableClass = stroke === 0 ? 'table-no-border' : '';
    let tableHtml = `<table class="${tableClass}" style="border-collapse: collapse; width: 100%; margin: 8px 0;" data-stroke="${stroke}">`;
    for (let i = 0; i < rows; i++) {
      tableHtml += '<tr>';
      for (let j = 0; j < cols; j++) {
        tableHtml += `<td style="${borderStyle} padding: 6px; min-width: 50px;">${i === 0 ? 'Tiêu đề' : 'Nội dung'}</td>`;
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</table>';
    
    document.execCommand('insertHTML', false, tableHtml);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    setShowTablePicker(false);
    editorRef.current?.focus();
  };

  const ToolButton: React.FC<{ onClick: () => void; active?: boolean; title: string; children: React.ReactNode }> = 
    ({ onClick, active, title, children }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100 text-gray-600'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${isFocused ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-gray-300'}`}>
      {/* Toolbar */}
      <div className="bg-gray-50 border-b px-2 py-1.5 flex flex-wrap gap-0.5 items-center">
        <ToolButton onClick={() => execCommand('bold')} title="Đậm (Ctrl+B)">
          <Bold size={14} />
        </ToolButton>
        <ToolButton onClick={() => execCommand('italic')} title="Nghiêng (Ctrl+I)">
          <Italic size={14} />
        </ToolButton>
        <ToolButton onClick={() => execCommand('underline')} title="Gạch chân (Ctrl+U)">
          <Underline size={14} />
        </ToolButton>
        <div className="w-px bg-gray-300 mx-1 h-5" />
        <ToolButton onClick={() => execCommand('formatBlock', 'h2')} title="Tiêu đề">
          <Heading2 size={14} />
        </ToolButton>
        <ToolButton onClick={() => execCommand('formatBlock', 'p')} title="Đoạn văn">
          <Type size={14} />
        </ToolButton>
        <div className="w-px bg-gray-300 mx-1 h-5" />
        <ToolButton onClick={() => execCommand('insertUnorderedList')} title="Danh sách">
          <List size={14} />
        </ToolButton>
        <ToolButton onClick={() => execCommand('insertOrderedList')} title="Danh sách số">
          <ListOrdered size={14} />
        </ToolButton>
        <div className="w-px bg-gray-300 mx-1 h-5" />
        <ToolButton onClick={() => execCommand('justifyLeft')} title="Căn trái">
          <AlignLeft size={14} />
        </ToolButton>
        <ToolButton onClick={() => execCommand('justifyCenter')} title="Căn giữa">
          <AlignCenter size={14} />
        </ToolButton>
        <ToolButton onClick={() => execCommand('justifyRight')} title="Căn phải">
          <AlignRight size={14} />
        </ToolButton>
        <div className="w-px bg-gray-300 mx-1 h-5" />
        <ToolButton 
          onClick={() => {
            const url = prompt('Nhập URL:');
            if (url) execCommand('createLink', url);
          }} 
          title="Chèn link"
        >
          <Link size={14} />
        </ToolButton>
        <div className="w-px bg-gray-300 mx-1 h-5" />
        {/* Table Picker */}
        <div className="relative">
          <ToolButton onClick={() => setShowTablePicker(!showTablePicker)} title="Chèn bảng">
            <Table size={14} />
          </ToolButton>
          {showTablePicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-3 z-50 min-w-[240px]">
              <p className="text-xs text-gray-600 mb-2">Chọn kích thước bảng:</p>
              <div className="flex gap-2 mb-2">
                <div>
                  <label className="text-xs text-gray-500">Hàng</label>
                  <input 
                    type="number" 
                    min="1" max="10" 
                    value={tableSize.rows}
                    onChange={e => setTableSize(prev => ({ ...prev, rows: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) }))}
                    className="w-14 border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Cột</label>
                  <input 
                    type="number" 
                    min="1" max="10" 
                    value={tableSize.cols}
                    onChange={e => setTableSize(prev => ({ ...prev, cols: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) }))}
                    className="w-14 border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Viền (px)</label>
                  <input 
                    type="number" 
                    min="0" max="5" 
                    value={tableSize.stroke}
                    onChange={e => setTableSize(prev => ({ ...prev, stroke: Math.max(0, Math.min(5, parseInt(e.target.value) || 0)) }))}
                    className="w-14 border rounded px-2 py-1 text-sm"
                  />
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mb-2">
                💡 Viền = 0: hiện đường mờ trong editor, không in ra
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={() => insertTable(tableSize.rows, tableSize.cols, tableSize.stroke)}
                  className="flex-1 px-3 py-1.5 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700"
                >
                  Chèn
                </button>
                <button 
                  onClick={() => setShowTablePicker(false)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200"
                >
                  Hủy
                </button>
              </div>
              {/* Quick templates */}
              <div className="mt-2 pt-2 border-t">
                <p className="text-xs text-gray-500 mb-1">Mẫu nhanh (viền {tableSize.stroke}px):</p>
                <div className="flex gap-1 flex-wrap">
                  {[[2,2], [2,3], [3,2], [3,3], [4,2]].map(([r, c]) => (
                    <button
                      key={`${r}x${c}`}
                      onClick={() => insertTable(r, c, tableSize.stroke)}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                    >
                      {r}x{c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="px-3 py-2 outline-none prose prose-sm max-w-none"
        style={{ minHeight }}
        data-placeholder={placeholder}
      />
      
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};

export const BusinessTab: React.FC<BusinessTabProps> = ({ businessInfo, onSave }) => {
  const { countries, getStatesByCountry, getCitiesByState, loading, error } = useGlobalAddressData();
  const { config: dbConfig, updateQuoteConfig, updateInvoiceConfig } = useBusinessDatabase();
  
  const [editData, setEditData] = useState<BusinessInfo>({
    ...businessInfo,
    equipment: businessInfo.equipment || [],
    taxPercent: businessInfo.taxPercent || 10,
  });
  const [selectedCountry, setSelectedCountry] = useState<string>('VN'); // Default to Vietnam
  const [selectedState, setSelectedState] = useState<string>('');
  const [documentConfig, setDocumentConfig] = useState<DocumentConfig>({
    quote: { header: '', footer: '', headerImage: undefined, footerImage: undefined },
    invoice: { header: '', footer: '', headerImage: undefined, footerImage: undefined },
  });
  const [newEquipment, setNewEquipment] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [activeSection, setActiveSection] = useState<'info' | 'document'>('info');
  const [previewType, setPreviewType] = useState<'quote' | 'invoice'>('quote');
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(defaultDisplaySettings);
  const [editMode, setEditMode] = useState<'visual' | 'html'>('visual');
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const headerImageRef = useRef<HTMLInputElement>(null);
  const footerImageRef = useRef<HTMLInputElement>(null);

  // Get current doc config based on previewType
  const currentDocConfig = documentConfig[previewType];

  // Load document config from database
  useEffect(() => {
    if (dbConfig) {
      setDocumentConfig({
        quote: {
          header: dbConfig.quote?.header || '',
          footer: dbConfig.quote?.footer || '',
          headerImage: undefined, // Images not stored in DB yet
          footerImage: undefined,
        },
        invoice: {
          header: dbConfig.invoice?.header || '',
          footer: dbConfig.invoice?.footer || '',
          headerImage: undefined,
          footerImage: undefined,
        },
      });
    }
  }, [dbConfig]);

  useEffect(() => {
    setEditData({
      ...businessInfo,
      equipment: businessInfo.equipment || [],
      taxPercent: businessInfo.taxPercent || 10,
    });
  }, [businessInfo]);

  // Load business info from database config
  useEffect(() => {
    if (dbConfig && dbConfig.company) {
      setEditData(prev => ({
        ...prev,
        name: dbConfig.company.name || prev.name,
        address: dbConfig.company.address?.split(',')[0]?.trim() || prev.address,
        phone: dbConfig.company.phone || prev.phone,
        email: dbConfig.company.email || prev.email,
        taxCode: dbConfig.company.taxCode || prev.taxCode,
        website: dbConfig.company.website || prev.website,
        bankAccount: dbConfig.company.bankAccount || prev.bankAccount,
        bankName: dbConfig.company.bankName || prev.bankName,
        bankBranch: dbConfig.company.bankBranch || prev.bankBranch,
        logo: dbConfig.company.logo || prev.logo,
        taxPercent: dbConfig.quote?.defaultVatPercent || prev.taxPercent || 10,
      }));
    }
  }, [dbConfig]);

  // Handle image upload
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>, 
    type: 'logo' | 'headerImage' | 'footerImage'
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Ảnh không được vượt quá 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'logo') {
          setEditData({ ...editData, logo: reader.result as string });
        } else {
          setDocumentConfig({
            ...documentConfig,
            [previewType]: { ...documentConfig[previewType], [type]: reader.result as string }
          });
        }
        setHasChanges(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (type: 'logo' | 'headerImage' | 'footerImage') => {
    if (type === 'logo') {
      setEditData({ ...editData, logo: undefined });
    } else {
      setDocumentConfig({
        ...documentConfig,
        [previewType]: { ...documentConfig[previewType], [type]: undefined }
      });
    }
    setHasChanges(true);
  };

  const addEquipment = () => {
    if (newEquipment.trim()) {
      setEditData({ ...editData, equipment: [...(editData.equipment || []), newEquipment.trim()] });
      setNewEquipment('');
      setHasChanges(true);
    }
  };

  const removeEquipment = (idx: number) => {
    setEditData({ ...editData, equipment: (editData.equipment || []).filter((_, i) => i !== idx) });
    setHasChanges(true);
  };

  const handleFieldChange = (field: keyof BusinessInfo, value: string | number) => {
    setEditData({ ...editData, [field]: value });
    setHasChanges(true);
  };

  const handleDocumentChange = (field: keyof SingleDocConfig, value: string) => {
    setDocumentConfig({
      ...documentConfig,
      [previewType]: { ...documentConfig[previewType], [field]: value }
    });
    setHasChanges(true);
  };

  const handleDisplaySettingChange = (field: keyof DisplaySettings) => {
    setDisplaySettings({ ...displaySettings, [field]: !displaySettings[field] });
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      // Save all to business config API
      await Promise.all([
        // Save business info to backend
        businessConfigApi.update({
          businessName: editData.name,
          businessAddress: `${editData.address}, ${editData.commune}, ${editData.province}`,
          businessPhone: editData.phone,
          businessEmail: editData.email,
          businessTaxCode: editData.taxCode,
          businessWebsite: editData.website,
          bankAccount: editData.bankAccount,
          bankName: editData.bankName,
          bankBranch: editData.bankBranch,
          equipment: editData.equipment,
          defaultVatPercent: editData.taxPercent, // Lưu vào defaultVatPercent
        } as any),
        // Save quote config
        updateQuoteConfig({
          header: documentConfig.quote.header,
          footer: documentConfig.quote.footer,
          defaultVatPercent: editData.taxPercent,
        }),
        // Save invoice config
        updateInvoiceConfig({
          header: documentConfig.invoice.header,
          footer: documentConfig.invoice.footer,
          defaultVatPercent: editData.taxPercent,
        }),
      ]);
      
      // Also update parent component state (for backward compatibility)
      onSave(editData);
      
      setHasChanges(false);
      alert('Đã lưu thông tin thành công!');
    } catch (e) {
      console.error('Error saving:', e);
      alert('Có lỗi xảy ra khi lưu thông tin!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Thông tin xưởng in</h2>
          <p className="text-sm text-gray-500">Quản lý thông tin doanh nghiệp và mẫu báo giá/hóa đơn</p>
        </div>
        {hasChanges && (
          <button 
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <Save size={18} />
            Lưu thay đổi
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveSection('info')}
          className={`px-4 py-2 font-medium border-b-2 -mb-px transition-colors ${
            activeSection === 'info'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Thông tin cơ bản
        </button>
        <button
          onClick={() => setActiveSection('document')}
          className={`px-4 py-2 font-medium border-b-2 -mb-px transition-colors ${
            activeSection === 'document'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Header & Footer (Báo giá/Hóa đơn)
        </button>
      </div>

      {activeSection === 'info' && (
        <div className="space-y-6">
          {/* Logo Upload */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Image size={18} className="text-indigo-600" />
              Logo công ty
            </h3>
            <div className="flex items-center gap-6">
              <div className="h-24 w-24 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                {editData.logo ? (
                  <img src={editData.logo} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <Building2 size={32} className="text-gray-300" />
                )}
              </div>
              <div className="space-y-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'logo')}
                  className="hidden"
                />
                <button
                  onClick={() => logoInputRef.current?.click()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
                >
                  <Upload size={16} />
                  Tải lên logo
                </button>
                {editData.logo && (
                  <button
                    onClick={() => removeImage('logo')}
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

          {/* Basic Info */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Building2 size={18} className="text-indigo-600" />
              Thông tin cơ bản
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên xưởng in</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={e => handleFieldChange('name', e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="VD: Xưởng In ABC"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã số thuế</label>
                <input
                  type="text"
                  value={editData.taxCode}
                  onChange={e => handleFieldChange('taxCode', e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="VD: 0123456789"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quốc gia</label>
                <select
                  value={selectedCountry}
                  onChange={e => {
                    setSelectedCountry(e.target.value);
                    setSelectedState('');
                    handleFieldChange('province', '');
                    handleFieldChange('commune', '');
                  }}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Chọn Quốc gia</option>
                  {countries.map(country => (
                    <option key={country.isoCode} value={country.isoCode}>
                      {country.flag} {country.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tỉnh/Bang</label>
                <select
                  value={selectedState}
                  onChange={e => {
                    setSelectedState(e.target.value);
                    const states = getStatesByCountry(selectedCountry);
                    const state = states.find(s => s.isoCode === e.target.value);
                    handleFieldChange('province', state?.name || '');
                    handleFieldChange('commune', '');
                  }}
                  disabled={!selectedCountry}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                >
                  <option value="">Chọn Tỉnh/Bang</option>
                  {selectedCountry && getStatesByCountry(selectedCountry).map(state => (
                    <option key={state.isoCode} value={state.isoCode}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thành phố</label>
                <select
                  value={editData.commune}
                  onChange={e => handleFieldChange('commune', e.target.value)}
                  disabled={!selectedState}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                >
                  <option value="">Chọn Thành phố</option>
                  {selectedState && getCitiesByState(selectedCountry, selectedState).map(city => (
                    <option key={city.name} value={city.name}>
                      {city.name}
                    </option>
                  ))}
                </select>
                {loading && <p className="mt-1 text-sm text-gray-500">Đang tải dữ liệu...</p>}
                {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ chi tiết</label>
                <input
                  type="text"
                  value={editData.address}
                  onChange={e => handleFieldChange('address', e.target.value)}
                  placeholder="Số nhà, đường, phố..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Điện thoại</label>
                <input
                  type="tel"
                  value={editData.phone}
                  onChange={e => handleFieldChange('phone', e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="VD: 0901234567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editData.email}
                  onChange={e => handleFieldChange('email', e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="VD: contact@xuongin.vn"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="url"
                  value={editData.website}
                  onChange={e => handleFieldChange('website', e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="VD: https://xuongin.vn"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                <input
                  type="text"
                  value={editData.description}
                  onChange={e => handleFieldChange('description', e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Mô tả ngắn về xưởng in"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">% Thuế mặc định</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={editData.taxPercent || 0}
                  onChange={e => handleFieldChange('taxPercent', parseFloat(e.target.value) || 0)}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="VD: 10"
                />
              </div>
            </div>
          </div>

          {/* Bank Info */}
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6">
            <h3 className="font-bold text-emerald-800 mb-4 flex items-center gap-2">
              <CreditCard size={18} />
              Thông tin thanh toán
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số tài khoản</label>
                <input
                  type="text"
                  value={editData.bankAccount || ''}
                  onChange={e => handleFieldChange('bankAccount', e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="VD: 1234567890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngân hàng</label>
                <input
                  type="text"
                  value={editData.bankName || ''}
                  onChange={e => handleFieldChange('bankName', e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="VD: Vietcombank"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chi nhánh</label>
                <input
                  type="text"
                  value={editData.bankBranch || ''}
                  onChange={e => handleFieldChange('bankBranch', e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="VD: Chi nhánh HCM"
                />
              </div>
            </div>
          </div>

          {/* Production Capacity */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Printer size={18} className="text-indigo-600" />
              Năng lực sản xuất
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Công suất</label>
                <input
                  type="text"
                  value={editData.printingCapacity}
                  onChange={e => handleFieldChange('printingCapacity', e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="VD: 50.000 tem/ngày"
                />
              </div>
              
              {/* Equipment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Thiết bị</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(editData.equipment || []).map((eq, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                      {eq}
                      <button onClick={() => removeEquipment(idx)} className="text-gray-400 hover:text-red-500">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newEquipment}
                    onChange={e => setNewEquipment(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && addEquipment()}
                    placeholder="Thêm thiết bị..."
                    className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button onClick={addEquipment} className="px-4 py-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200">
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'document' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Header/Footer Config */}
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
                  Header ({previewType === 'quote' ? 'Báo giá' : 'Hóa đơn'})
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
                    <input ref={headerImageRef} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'headerImage')} className="hidden" />
                    <button onClick={() => headerImageRef.current?.click()} className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200 flex items-center gap-1">
                      <Upload size={12} /> Tải ảnh
                    </button>
                    {currentDocConfig.headerImage && (
                      <button onClick={() => removeImage('headerImage')} className="px-2 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
                {/* Header Text Editor */}
                {editMode === 'visual' ? (
                  <WYSIWYGEditor
                    value={currentDocConfig.header}
                    onChange={(html) => handleDocumentChange('header', html)}
                    placeholder="Nhập nội dung header: Tên công ty, địa chỉ, thông tin liên hệ..."
                    minHeight="100px"
                  />
                ) : (
                  <HTMLEditor
                    value={currentDocConfig.header}
                    onChange={(html) => handleDocumentChange('header', html)}
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
                  Footer ({previewType === 'quote' ? 'Báo giá' : 'Hóa đơn'})
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
                    <input ref={footerImageRef} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'footerImage')} className="hidden" />
                    <button onClick={() => footerImageRef.current?.click()} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-200 flex items-center gap-1">
                      <Upload size={12} /> Tải ảnh
                    </button>
                    {currentDocConfig.footerImage && (
                      <button onClick={() => removeImage('footerImage')} className="px-2 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
                {/* Footer Text Editor */}
                {editMode === 'visual' ? (
                  <WYSIWYGEditor
                    value={currentDocConfig.footer}
                    onChange={(html) => handleDocumentChange('footer', html)}
                    placeholder="Nhập nội dung footer: Điều khoản, thông tin thanh toán, chữ ký..."
                    minHeight="100px"
                  />
                ) : (
                  <HTMLEditor
                    value={currentDocConfig.footer}
                    onChange={(html) => handleDocumentChange('footer', html)}
                    placeholder="<div>Nhập HTML cho footer...</div>"
                    minHeight="150px"
                  />
                )}
              </div>
            </div>

            {/* Display Settings */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Image size={16} className="text-indigo-600" />
                Hiển thị thông tin
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
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
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                    <input
                      type="checkbox"
                      checked={displaySettings[key as keyof DisplaySettings]}
                      onChange={() => handleDisplaySettingChange(key as keyof DisplaySettings)}
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

          {/* Right Column - Preview */}
          <div className="bg-white rounded-xl border p-5 lg:sticky lg:top-4 lg:self-start">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800 text-sm">Xem trước</h3>
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setPreviewType('quote')}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    previewType === 'quote'
                      ? 'bg-amber-500 text-white shadow'
                      : 'text-gray-600 hover:text-amber-600'
                  }`}
                >
                  📋 Báo giá
                </button>
                <button
                  onClick={() => setPreviewType('invoice')}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    previewType === 'invoice'
                      ? 'bg-emerald-500 text-white shadow'
                      : 'text-gray-600 hover:text-emerald-600'
                  }`}
                >
                  🧾 Hóa đơn
                </button>
              </div>
            </div>
            
            {/* Document Preview */}
            <div className="border rounded-lg bg-white shadow-inner overflow-hidden max-h-[700px] overflow-y-auto">
              <div className="bg-gradient-to-r from-slate-100 to-slate-50 p-1.5 border-b flex items-center gap-2 sticky top-0">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-400"></div>
                  <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                </div>
                <span className="text-[10px] text-gray-500 ml-1">
                  {previewType === 'quote' ? 'BAO-GIA-001.pdf' : 'HOA-DON-001.pdf'}
                </span>
              </div>
              
              <div className="p-4 bg-slate-100">
                {/* Style to hide borders for tables with stroke=0 in preview */}
                <style>{`
                  .preview-doc table.table-no-border td,
                  .preview-doc table[data-stroke="0"] td {
                    border: none !important;
                  }
                `}</style>
                <div className="preview-doc bg-white rounded shadow-lg" style={{ minHeight: '500px' }}>
                  {/* Header */}
                  <div className="p-6 border-b">
                    <div className="flex items-start gap-4">
                      {editData.logo && (
                        <img src={editData.logo} alt="Logo" className="w-20 h-20 object-contain flex-shrink-0" />
                      )}
                      {currentDocConfig.headerImage && (
                        <img src={currentDocConfig.headerImage} alt="Header" className="h-16 object-contain" />
                      )}
                      <div className="flex-1">
                        {currentDocConfig.header ? (
                          <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: currentDocConfig.header }} />
                        ) : (
                          <div>
                            <h2 className="text-xl font-bold text-gray-800">{editData.name || 'TÊN CÔNG TY'}</h2>
                            <p className="text-sm text-gray-600">{editData.address || 'Địa chỉ công ty'}</p>
                            <p className="text-sm text-gray-600">ĐT: {editData.phone || '0xxx xxx xxx'} | Email: {editData.email || 'email@company.com'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Document Title */}
                  <div className={`py-3 text-center ${previewType === 'quote' ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                    <h1 className={`text-xl font-bold ${previewType === 'quote' ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {previewType === 'quote' ? 'BÁO GIÁ' : 'HÓA ĐƠN'}
                    </h1>
                    {(displaySettings.showDocumentNumber || displaySettings.showDocumentDate) && (
                      <p className="text-xs text-gray-500">
                        {displaySettings.showDocumentNumber && `Số: ${previewType === 'quote' ? 'BG-2024-001' : 'HD-2024-001'}`}
                        {displaySettings.showDocumentNumber && displaySettings.showDocumentDate && ' | '}
                        {displaySettings.showDocumentDate && `Ngày: ${new Date().toLocaleDateString('vi-VN')}`}
                        {displaySettings.showValidUntil && previewType === 'quote' && ' | HĐ đến: 25/12/2024'}
                      </p>
                    )}
                  </div>

                  {/* Customer Info */}
                  <div className="px-4 py-3 border-b">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {displaySettings.showCustomerName && (
                        <div>
                          <p className="text-gray-500">Khách hàng:</p>
                          <p className="font-medium">Công ty ABC</p>
                        </div>
                      )}
                      {displaySettings.showCustomerAddress && (
                        <div>
                          <p className="text-gray-500">Địa chỉ:</p>
                          <p className="font-medium">123 Đường XYZ, Q.1</p>
                        </div>
                      )}
                      {displaySettings.showCustomerPhone && (
                        <div>
                          <p className="text-gray-500">Điện thoại:</p>
                          <p className="font-medium">0901 234 567</p>
                        </div>
                      )}
                      {displaySettings.showCustomerEmail && (
                        <div>
                          <p className="text-gray-500">Email:</p>
                          <p className="font-medium">abc@email.com</p>
                        </div>
                      )}
                      {displaySettings.showCustomerTaxCode && (
                        <div>
                          <p className="text-gray-500">Mã số thuế:</p>
                          <p className="font-medium">0123456789</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="px-6 py-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={`${previewType === 'quote' ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                          <th className="text-left py-2 px-3 font-medium">Hạng mục</th>
                          <th className="text-right py-2 px-3 font-medium">SL</th>
                          <th className="text-right py-2 px-3 font-medium">Đơn giá</th>
                          <th className="text-right py-2 px-3 font-medium">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="py-2 px-3">In name card 2 mặt, cán bóng</td>
                          <td className="py-2 px-3 text-right">500</td>
                          <td className="py-2 px-3 text-right">1,200đ</td>
                          <td className="py-2 px-3 text-right font-medium">600,000đ</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 px-3">In brochure A4 gấp 3</td>
                          <td className="py-2 px-3 text-right">200</td>
                          <td className="py-2 px-3 text-right">3,500đ</td>
                          <td className="py-2 px-3 text-right font-medium">700,000đ</td>
                        </tr>
                        <tr className={`${previewType === 'quote' ? 'bg-amber-50' : 'bg-emerald-50'} font-bold`}>
                          <td colSpan={3} className="py-2 px-3 text-right">Tổng cộng:</td>
                          <td className="py-2 px-3 text-right">1,300,000đ</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Payment Info (Invoice only) */}
                  {previewType === 'invoice' && displaySettings.showPaymentInfo && (
                    <div className="px-4 py-3 bg-gray-50 border-t">
                      <h4 className="font-medium text-gray-700 mb-1 text-xs">Thông tin thanh toán:</h4>
                      <div className="text-xs text-gray-600">
                        <p>Ngân hàng: {editData.bankName || 'Vietcombank'}</p>
                        <p>STK: {editData.bankAccount || '1234567890'}</p>
                        <p>Chi nhánh: {editData.bankBranch || 'TP.HCM'}</p>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="p-4 border-t mt-auto">
                    {currentDocConfig.footerImage && (
                      <img src={currentDocConfig.footerImage} alt="Footer" className="h-10 object-contain mb-3" />
                    )}
                    {currentDocConfig.footer ? (
                      <div className="prose prose-sm max-w-none text-xs" dangerouslySetInnerHTML={{ __html: currentDocConfig.footer }} />
                    ) : (
                      <div className="text-xs text-gray-500">
                        <p><strong>Điều khoản:</strong></p>
                        <ul className="list-disc ml-4 mt-1">
                          <li>{previewType === 'quote' ? 'Báo giá có hiệu lực 15 ngày' : 'Thanh toán trong vòng 7 ngày'}</li>
                          <li>Giá đã bao gồm VAT 10%</li>
                        </ul>
                        {displaySettings.showSignature && (
                          <div className="flex justify-between mt-4 pt-3">
                            <div className="text-center">
                              <p className="font-medium">Người lập</p>
                              <p className="text-[10px] text-gray-400 mt-8">(Ký, ghi rõ họ tên)</p>
                            </div>
                            <div className="text-center">
                              <p className="font-medium">Khách hàng</p>
                              <p className="text-[10px] text-gray-400 mt-8">(Ký, ghi rõ họ tên)</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-3 text-center">
              💡 Thay đổi nội dung Header/Footer ở phần bên trái để cập nhật preview
            </p>
          </div>
        </div>
      )}

      {/* Save Button (sticky) */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-end">
          <button 
            onClick={handleSave}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg"
          >
            <Save size={20} />
            Lưu tất cả thay đổi
          </button>
        </div>
      )}
    </div>
  );
};
