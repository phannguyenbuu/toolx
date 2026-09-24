import React, { useState, useEffect } from 'react';
import { Users, X, Save } from 'lucide-react';
import { Customer } from '../../../../types/business';
import { useGlobalAddressData } from '../../../../hooks/useGlobalAddressData';
import { CustomerFormSaveData } from '../types';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  onSave: (data: CustomerFormSaveData) => void;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  customer,
  onSave,
}) => {
  const { countries, getStatesByCountry, getCitiesByState } = useGlobalAddressData();
  const [selectedCountry, setSelectedCountry] = useState<string>('VN');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    taxCode: '',
    notes: '',
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        company: customer.company,
        address: customer.address,
        taxCode: customer.taxCode || '',
        notes: customer.notes || '',
      });
    } else {
      setFormData({ name: '', email: '', phone: '', company: '', address: '', taxCode: '', notes: '' });
    }
  }, [customer, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Vui lòng nhập tên khách hàng');
      return;
    }
    
    // Combine address fields
    const countryName = countries.find(c => c.isoCode === selectedCountry)?.name || '';
    const stateName = selectedState ? getStatesByCountry(selectedCountry).find(s => s.isoCode === selectedState)?.name || '' : '';
    const cityName = selectedCity || '';
    const detailAddress = formData.address || '';
    
    // Build full address string
    const addressParts = [detailAddress, cityName, stateName, countryName].filter(Boolean);
    const fullAddress = addressParts.join(', ');
    
    onSave({
      ...formData,
      address: fullAddress,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-4 border-b bg-gradient-to-r from-indigo-50 to-white flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Users size={18} className="text-indigo-600" />
            {customer ? 'Sửa Khách Hàng' : 'Thêm Khách Hàng Mới'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Họ và tên *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Nguyễn Văn A"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Số điện thoại</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0901234567"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Công ty</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Tên công ty"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Quốc gia</label>
              <select
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value);
                  setSelectedState('');
                  setSelectedCity('');
                }}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Chọn quốc gia</option>
                {countries.map(country => (
                  <option key={country.isoCode} value={country.isoCode}>
                    {country.flag} {country.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Tỉnh/Bang</label>
              <select
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  setSelectedCity('');
                }}
                disabled={!selectedCountry}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Chọn tỉnh/bang</option>
                {selectedCountry && getStatesByCountry(selectedCountry).map(state => (
                  <option key={state.isoCode} value={state.isoCode}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Thành phố</label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                disabled={!selectedState}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Chọn thành phố</option>
                {selectedState && getCitiesByState(selectedCountry, selectedState).map(city => (
                  <option key={city.name} value={city.name}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Địa chỉ chi tiết</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Số nhà, đường, phố..."
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Mã số thuế</label>
              <input
                type="text"
                value={formData.taxCode}
                onChange={(e) => setFormData(prev => ({ ...prev, taxCode: e.target.value }))}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0123456789"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Ghi chú</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                rows={3}
                placeholder="Ghi chú về khách hàng..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <Save size={16} />
              {customer ? 'Cập nhật' : 'Thêm mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
