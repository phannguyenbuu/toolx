import React, { useEffect, useState, ChangeEvent } from 'react';
import { fetchAddressData, filterAddressByText, Address } from '../../utils/addressUtils';

interface ProvinceDistrictSelectProps {
  value?: {
    province?: string;
    commune?: string;
  };
  onChange?: (value: { province: string; commune: string }) => void;
  className?: string;
}

export const ProvinceDistrictSelect: React.FC<ProvinceDistrictSelectProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedCommune, setSelectedCommune] = useState<string>('');

  // Get unique provinces
  const provinces = React.useMemo(() => {
    const uniqueProvinces = new Set(addresses.map(a => a.provinceName));
    return Array.from(uniqueProvinces).sort();
  }, [addresses]);

  // Get communes for selected province
  const communes = React.useMemo(() => {
    if (!selectedProvince) return [];
    return addresses
      .filter(a => a.provinceName === selectedProvince)
      .map(a => ({ code: a.code, name: a.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [addresses, selectedProvince]);

  useEffect(() => {
    const loadAddresses = async () => {
      const data = await fetchAddressData();
      setAddresses(data);
      
      // Set initial values if provided
      if (value?.province) {
        setSelectedProvince(value.province);
        if (value.commune) {
          setSelectedCommune(value.commune);
        }
      }
    };
    loadAddresses();
  }, [value]);

  const handleProvinceChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const province = e.target.value;
    setSelectedProvince(province);
    setSelectedCommune(''); // Reset commune when province changes
    onChange?.({ province, commune: '' });
  };

  const handleCommuneChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const commune = e.target.value;
    setSelectedCommune(commune);
    onChange?.({ province: selectedProvince, commune });
  };

  return (
    <div className={`grid grid-cols-2 gap-4 ${className}`}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tỉnh/Thành phố
        </label>
        <select
          value={selectedProvince}
          onChange={handleProvinceChange}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Chọn Tỉnh/Thành phố</option>
          {provinces.map(province => (
            <option key={province} value={province}>
              {province}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Xã/Phường
        </label>
        <select
          value={selectedCommune}
          onChange={handleCommuneChange}
          disabled={!selectedProvince}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
        >
          <option value="">Chọn Xã/Phường</option>
          {communes.map(commune => (
            <option key={commune.code} value={commune.name}>
              {commune.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
