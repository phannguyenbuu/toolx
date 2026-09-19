import React, { useState, useEffect, useRef } from 'react';
import { Building2, X, Save, Plus, Trash2, Upload, Image, CreditCard } from 'lucide-react';
import { BusinessInfo } from '../types';

interface EditBusinessModalProps {
  isOpen: boolean;
  businessInfo: BusinessInfo;
  onClose: () => void;
  onSave: (info: BusinessInfo) => void;
}

export const EditBusinessModal: React.FC<EditBusinessModalProps> = ({
  isOpen, businessInfo, onClose, onSave
}) => {
  const [editData, setEditData] = useState<BusinessInfo>({
    ...businessInfo,
    equipment: businessInfo.equipment || [],
    taxPercent: businessInfo.taxPercent || 10,
  });
  const [newEquipment, setNewEquipment] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert('Logo không được vượt quá 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditData({ ...editData, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setEditData({ ...editData, logo: undefined });
  };

  useEffect(() => {
    setEditData({
      ...businessInfo,
      equipment: businessInfo.equipment || [],
      taxPercent: businessInfo.taxPercent || 10,
    });
  }, [businessInfo]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(editData);
    onClose();
    alert('Đã lưu thông tin thành công!');
  };

  const addEquipment = () => {
    if (newEquipment.trim()) {
      setEditData({ ...editData, equipment: [...(editData.equipment || []), newEquipment.trim()] });
      setNewEquipment('');
    }
  };

  const removeEquipment = (idx: number) => {
    setEditData({ ...editData, equipment: (editData.equipment || []).filter((_, i) => i !== idx) });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[1001] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-6 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-xl">
                <Building2 size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Chỉnh sửa thông tin xưởng in</h3>
                <p className="text-indigo-200 text-sm">Cập nhật thông tin doanh nghiệp</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Logo Upload */}
          <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300">
            <label className="block text-sm font-medium text-gray-700 mb-3">Logo công ty</label>
            <div className="flex items-center gap-4">
              <div className="h-24 w-24 rounded-xl bg-white border-2 border-slate-200 flex items-center justify-center overflow-hidden">
                {editData.logo ? (
                  <img src={editData.logo} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <Image size={32} className="text-slate-300" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
                >
                  <Upload size={16} />
                  Tải lên logo
                </button>
                {editData.logo && (
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Xóa logo
                  </button>
                )}
                <p className="text-xs text-slate-500">PNG, JPG. Tối đa 2MB. Khuyến nghị 200x200px</p>
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên xưởng in</label>
              <input
                type="text"
                value={editData.name}
                onChange={e => setEditData({ ...editData, name: e.target.value })}
                placeholder="VD: Xưởng In ABC"
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mã số thuế</label>
              <input
                type="text"
                value={editData.taxCode}
                onChange={e => setEditData({ ...editData, taxCode: e.target.value })}
                placeholder="VD: 0123456789"
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
            <input
              type="text"
              value={editData.address}
              onChange={e => setEditData({ ...editData, address: e.target.value })}
              placeholder="VD: 123 Đường ABC, Quận 1, TP.HCM"
              className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Điện thoại</label>
              <input
                type="tel"
                value={editData.phone}
                onChange={e => setEditData({ ...editData, phone: e.target.value })}
                placeholder="VD: 0901234567"
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={editData.email}
                onChange={e => setEditData({ ...editData, email: e.target.value })}
                placeholder="VD: contact@xuongin.vn"
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input
              type="url"
              value={editData.website}
              onChange={e => setEditData({ ...editData, website: e.target.value })}
              placeholder="VD: https://xuongin.vn"
              className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
            <textarea
              value={editData.description}
              onChange={e => setEditData({ ...editData, description: e.target.value })}
              rows={2}
              placeholder="Mô tả ngắn về xưởng in của bạn..."
              className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Bank Account Info */}
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
            <h4 className="font-medium text-emerald-800 mb-3 flex items-center gap-2">
              <CreditCard size={18} />
              Thông tin thanh toán (hiển thị trên báo giá & hóa đơn)
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số tài khoản</label>
                <input
                  type="text"
                  value={editData.bankAccount || ''}
                  onChange={e => setEditData({ ...editData, bankAccount: e.target.value })}
                  placeholder="VD: 1234567890"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngân hàng</label>
                <input
                  type="text"
                  value={editData.bankName || ''}
                  onChange={e => setEditData({ ...editData, bankName: e.target.value })}
                  placeholder="VD: Vietcombank"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Chi nhánh</label>
                <input
                  type="text"
                  value={editData.bankBranch || ''}
                  onChange={e => setEditData({ ...editData, bankBranch: e.target.value })}
                  placeholder="VD: Chi nhánh Hồ Chí Minh"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Công suất sản xuất</label>
            <input
              type="text"
              value={editData.printingCapacity}
              onChange={e => setEditData({ ...editData, printingCapacity: e.target.value })}
              placeholder="VD: 50.000 tem/ngày"
              className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500"
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
                className="flex-1 border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={addEquipment}
                className="px-4 py-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-all"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-200 rounded-lg font-medium text-gray-600 hover:bg-gray-50 transition-all"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <Save size={18} />
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
};
