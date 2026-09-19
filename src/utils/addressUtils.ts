import { normalizeVietnamese } from './stringUtils';

export interface Address {
  code: string;
  name: string;
  englishName: string;
  administrativeLevel: string;
  provinceCode: string;
  provinceName: string;
  decree: string;
}

export const fetchAddressData = async () => {
  try {
    const response = await fetch('https://production.cas.so/address-kit/2025-07-01/communes');
    const data = await response.json();
    return data.communes as Address[];
  } catch (error) {
    console.error('Error fetching address data:', error);
    return [];
  }
};

export const filterAddressByText = (addresses: Address[], searchText: string) => {
  const normalizedSearch = normalizeVietnamese(searchText.toLowerCase());
  return addresses.filter(address => {
    const normalizedName = normalizeVietnamese(address.name.toLowerCase());
    const normalizedProvince = normalizeVietnamese(address.provinceName.toLowerCase());
    return normalizedName.includes(normalizedSearch) || 
           normalizedProvince.includes(normalizedSearch);
  });
};
