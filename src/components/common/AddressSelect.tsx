import React, { useEffect, useState, ChangeEvent } from 'react';
import { fetchAddressData, filterAddressByText, Address } from '../../utils/addressUtils';

interface AddressSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const AddressSelect: React.FC<AddressSelectProps> = ({
  value,
  onChange,
  placeholder = 'Chọn địa chỉ...',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [filteredAddresses, setFilteredAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  useEffect(() => {
    const loadAddresses = async () => {
      const data = await fetchAddressData();
      setAddresses(data);
      setFilteredAddresses(data);
    };
    loadAddresses();
  }, []);

  useEffect(() => {
    if (searchText) {
      setFilteredAddresses(filterAddressByText(addresses, searchText));
    } else {
      setFilteredAddresses(addresses);
    }
  }, [searchText, addresses]);

  const handleSelect = (address: Address) => {
    setSelectedAddress(address);
    onChange?.(address.name);
    setIsOpen(false);
    setSearchText('');
  };

  return (
    <div className="relative">
      <div 
        className={`relative border rounded-lg ${className}`}
        onClick={() => setIsOpen(true)}
      >
        <input
          type="text"
          value={searchText || selectedAddress?.name || value || ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          onFocus={() => setIsOpen(true)}
        />
      </div>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
            {filteredAddresses.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Không tìm thấy địa chỉ phù hợp
              </div>
            ) : (
              filteredAddresses.map((address) => (
                <div
                  key={address.code}
                  className="px-4 py-2 cursor-pointer hover:bg-indigo-50"
                  onClick={() => handleSelect(address)}
                >
                  <div className="font-medium">{address.name}</div>
                  <div className="text-sm text-gray-500">{address.provinceName}</div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
