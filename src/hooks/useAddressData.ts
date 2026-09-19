import { useState, useEffect } from 'react';

interface AddressData {
  code: string;
  name: string;
  englishName: string;
  administrativeLevel: string;
  provinceCode: string;
  provinceName: string;
  decree: string;
}

interface UseAddressDataReturn {
  provinces: string[];
  communes: AddressData[];
  loading: boolean;
  error: string | null;
  getCommunesByProvince: (province: string) => AddressData[];
}

const CACHE_KEY = 'address_data_cache';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export const useAddressData = (): UseAddressDataReturn => {
  const [communes, setCommunes] = useState<AddressData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check cache first
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_EXPIRY) {
            setCommunes(data);
            setLoading(false);
            return;
          }
        }

        // Fetch fresh data
        const response = await fetch('https://production.cas.so/address-kit/2025-07-01/communes');
        const data = await response.json();
        
        // Cache the data
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: data.communes,
          timestamp: Date.now()
        }));

        setCommunes(data.communes);
        setError(null);
      } catch (err) {
        setError('Không thể tải dữ liệu địa chỉ');
        console.error('Error fetching address data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get unique provinces
  const provinces = Array.from(new Set(communes.map(c => c.provinceName))).sort();

  // Get communes by province
  const getCommunesByProvince = (province: string) => {
    return communes.filter(c => c.provinceName === province).sort((a, b) => a.name.localeCompare(b.name));
  };

  return {
    provinces,
    communes,
    loading,
    error,
    getCommunesByProvince
  };
};
