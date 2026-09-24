import React from 'react';
import { Building2 } from 'lucide-react';
import { BusinessInfo } from '../types';

interface CountryItem {
  isoCode: string;
  name: string;
  flag?: string;
}

interface StateItem {
  isoCode: string;
  name: string;
}

interface CityItem {
  name: string;
}

interface AddressData {
  countries: CountryItem[];
  getStatesByCountry: (countryCode: string) => StateItem[];
  getCitiesByState: (countryCode: string, stateCode: string) => CityItem[];
  loading?: boolean;
  error?: string | null;
}

interface BusinessBasicInfoCardProps {
  editData: BusinessInfo;
  selectedCountry: string;
  selectedState: string;
  addressData: AddressData;
  onCountryChange: (countryCode: string) => void;
  onStateChange: (stateCode: string, stateName: string) => void;
  onChange: (field: keyof BusinessInfo, value: any) => void;
}

export const BusinessBasicInfoCard: React.FC<BusinessBasicInfoCardProps> = ({
  editData,
  selectedCountry,
  selectedState,
  addressData,
  onCountryChange,
  onStateChange,
  onChange,
}) => {
  const { countries, getStatesByCountry, getCitiesByState, loading, error } = addressData;

  return (
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
            value={editData.name || ''}
            onChange={e => onChange('name', e.target.value)}
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="VD: Xưởng In ABC"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mã số thuế</label>
          <input
            type="text"
            value={editData.taxCode || ''}
            onChange={e => onChange('taxCode', e.target.value)}
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="VD: 0123456789"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quốc gia</label>
          <select
            value={selectedCountry}
            onChange={e => onCountryChange(e.target.value)}
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
              const code = e.target.value;
              const states = getStatesByCountry(selectedCountry);
              const state = states.find(s => s.isoCode === code);
              onStateChange(code, state?.name || '');
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
            value={editData.commune || ''}
            onChange={e => onChange('commune', e.target.value)}
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
            value={editData.address || ''}
            onChange={e => onChange('address', e.target.value)}
            placeholder="Số nhà, đường, phố..."
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Điện thoại</label>
          <input
            type="tel"
            value={editData.phone || ''}
            onChange={e => onChange('phone', e.target.value)}
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="VD: 0901234567"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={editData.email || ''}
            onChange={e => onChange('email', e.target.value)}
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="VD: contact@xuongin.vn"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
          <input
            type="url"
            value={editData.website || ''}
            onChange={e => onChange('website', e.target.value)}
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="VD: https://xuongin.vn"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
          <input
            type="text"
            value={editData.description || ''}
            onChange={e => onChange('description', e.target.value)}
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
            onChange={e => onChange('taxPercent', parseFloat(e.target.value) || 0)}
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="VD: 10"
          />
        </div>
      </div>
    </div>
  );
};
