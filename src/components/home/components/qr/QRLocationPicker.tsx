import React, { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Move, Camera } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import html2canvas from 'html2canvas';
import { LocationData, AddressSettings } from '../../types';
import { applyHouseNumberPrefix } from '../../helpers/qrContentBuilder';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

(L.Icon.Default as any).mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

interface QRLocationPickerProps {
  location: LocationData;
  onChangeLocation: (loc: LocationData) => void;
}

export const QRLocationPicker: React.FC<QRLocationPickerProps> = ({
  location,
  onChangeLocation
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerInstance = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [addressSettings, setAddressSettings] = useState<AddressSettings>({
    currentAddress: '',
    savedAddresses: []
  });

  // Load address settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('addressSettings');
    if (saved) {
      try {
        setAddressSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading address settings:', e);
      }
    }
  }, []);

  const saveAddressSettings = (settings: AddressSettings) => {
    setAddressSettings(settings);
    localStorage.setItem('addressSettings', JSON.stringify(settings));
  };

  // Leaflet map setup
  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstance.current) {
      setTimeout(() => mapInstance.current?.invalidateSize(), 100);
      return;
    }

    const defaultLat = location.lat ?? 21.0285;
    const defaultLon = location.lon ?? 105.8542;

    mapInstance.current = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([defaultLat, defaultLon], 16);

    L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      crossOrigin: true
    }).addTo(mapInstance.current);

    markerInstance.current = L.marker([defaultLat, defaultLon], { draggable: true }).addTo(
      mapInstance.current
    );

    markerInstance.current.on('dragend', (e: any) => {
      const newPos = e.target.getLatLng();
      onChangeLocation({ ...location, lat: newPos.lat, lon: newPos.lng });
    });

    mapInstance.current.on('click', (e: any) => {
      markerInstance.current?.setLatLng(e.latlng);
      onChangeLocation({ ...location, lat: e.latlng.lat, lon: e.latlng.lng });
    });

    setTimeout(() => mapInstance.current?.invalidateSize(), 100);
  }, []);

  // Sync marker position when external coords change
  useEffect(() => {
    if (!mapInstance.current || !markerInstance.current) return;
    if (location.lat == null || location.lon == null) return;

    const currentPos = markerInstance.current.getLatLng();
    const dist = Math.sqrt(
      Math.pow(currentPos.lat - location.lat, 2) +
        Math.pow(currentPos.lng - location.lon, 2)
    );
    if (dist > 0.0001) {
      markerInstance.current.setLatLng([location.lat, location.lon]);
      mapInstance.current.setView([location.lat, location.lon], 16);
    }
  }, [location.lat, location.lon]);

  // Debounced address search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (location.address.trim().length > 2 && showSuggestions) {
        setIsSearching(true);
        fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            location.address
          )}&limit=5&addressdetails=1`
        )
          .then((res) => res.json())
          .then((res) => {
            setSuggestions(res);
            setIsSearching(false);
          })
          .catch(() => setIsSearching(false));
      } else {
        setSuggestions([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [location.address, showSuggestions]);

  // Geolocation
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt không hỗ trợ định vị.');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );
          const resData = await res.json();
          const addr = resData.display_name || `Vĩ độ: ${latitude}, Kinh độ: ${longitude}`;

          onChangeLocation({
            address: addr,
            lat: latitude,
            lon: longitude
          });

          saveAddressSettings({
            ...addressSettings,
            currentAddress: addr
          });
          alert('Đã lấy vị trí hiện tại: ' + addr);
        } catch {
          onChangeLocation({
            address: `Vĩ độ: ${latitude}, Kinh độ: ${longitude}`,
            lat: latitude,
            lon: longitude
          });
          alert('Đã lấy tọa độ vị trí hiện tại.');
        } finally {
          setIsGettingLocation(false);
        }
      },
      () => {
        alert('Không thể lấy vị trí hiện tại. Vui lòng kiểm tra quyền truy cập vị trí.');
        setIsGettingLocation(false);
      }
    );
  };

  const handleCaptureMap = async () => {
    if (!mapContainerRef.current) return;
    setIsCapturing(true);
    try {
      const canvas = await html2canvas(mapContainerRef.current, {
        useCORS: true,
        scale: 3,
        allowTaint: true,
        logging: false
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `map-raster-${Date.now()}.png`;
      link.click();
    } finally {
      setIsCapturing(false);
    }
  };

  const handleOpenVectorSource = () => {
    if (location.lat == null || location.lon == null) {
      alert('Vui lòng chọn địa điểm trước.');
      return;
    }
    const url = `https://www.openstreetmap.org/export#map=17/${location.lat}/${location.lon}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <label className="text-xs font-medium text-slate-500 mb-1 block">Tìm địa chỉ</label>
        <div className="relative">
          <input
            type="text"
            value={location.address}
            onChange={(e) => {
              onChangeLocation({ ...location, address: e.target.value });
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Ví dụ: 123 Đường Láng..."
            className="w-full pl-10 pr-10 px-4 py-2.5 bg-white border border-slate-100 rounded-xl text-base shadow-sm focus:ring-2 focus:ring-indigo-500"
          />
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-auto">
            {suggestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm border-b last:border-b-0 cursor-pointer"
                onClick={() => {
                  const selectedAddress = String(item.display_name || '').trim();
                  const finalAddress = applyHouseNumberPrefix(location.address, selectedAddress);
                  const nextLat = item.lat ? parseFloat(item.lat) : null;
                  const nextLon = item.lon ? parseFloat(item.lon) : null;
                  setShowSuggestions(false);
                  setSuggestions([]);
                  onChangeLocation({
                    address: finalAddress,
                    lat: nextLat,
                    lon: nextLon
                  });
                }}
              >
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="mt-0.5 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-700">{item.display_name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Address Settings */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-500">Thiết lập địa chỉ</label>
          <button
            type="button"
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
            className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <MapPin size={12} />
            {isGettingLocation ? 'Đang lấy...' : 'Vị trí hiện tại'}
          </button>
        </div>

        {addressSettings.currentAddress && (
          <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-700 font-medium truncate flex-1">
                {addressSettings.currentAddress}
              </span>
              <button
                type="button"
                onClick={() => {
                  onChangeLocation({
                    address: addressSettings.currentAddress,
                    lat: location.lat,
                    lon: location.lon
                  });
                }}
                className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors cursor-pointer"
              >
                Dùng
              </button>
            </div>
          </div>
        )}

        {addressSettings.savedAddresses.length > 0 && (
          <select
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
            onChange={(e) => {
              const selected = addressSettings.savedAddresses.find(
                (addr) => addr.id === e.target.value
              );
              if (selected) {
                onChangeLocation({
                  address: selected.address,
                  lat: selected.lat,
                  lon: selected.lon
                });
              }
            }}
            value=""
          >
            <option value="">Chọn địa chỉ đã lưu</option>
            {addressSettings.savedAddresses.map((addr) => (
              <option key={addr.id} value={addr.id}>
                {addr.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div
        ref={mapContainerRef}
        className="border border-slate-200 rounded-xl overflow-hidden relative"
      >
        <div className="bg-indigo-50 px-3 py-2 border-b flex items-center justify-between">
          <span className="text-xs font-bold text-indigo-700 flex items-center gap-1">
            <Move size={12} /> Chỉnh vị trí
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenVectorSource}
              className="flex items-center gap-1 bg-white border border-orange-200 text-orange-600 px-2 py-1 rounded-lg shadow-sm hover:bg-orange-50 text-[10px] font-bold transition-all cursor-pointer"
              title="Mở OpenStreetMap để tải SVG/PDF vector"
            >
              Lấy Vector
            </button>
            <button
              type="button"
              onClick={handleCaptureMap}
              disabled={isCapturing}
              className="flex items-center gap-1 bg-white border border-indigo-200 text-indigo-600 px-2 py-1 rounded-lg shadow-sm hover:bg-indigo-50 text-[10px] font-bold transition-all disabled:opacity-50 cursor-pointer"
            >
              <Camera size={12} /> {isCapturing ? '...' : 'Chụp ảnh'}
            </button>
          </div>
        </div>
        <div ref={mapRef} className="w-full h-72 bg-slate-100" />
        {isCapturing && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50 backdrop-blur-sm font-semibold text-indigo-600">
            Đang xử lý ảnh...
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={location.lat == null ? '' : String(location.lat)}
          onChange={(e) => {
            const v = e.target.value.trim();
            onChangeLocation({
              ...location,
              lat: v ? Number(v) : null
            });
          }}
          placeholder="Vĩ độ"
          className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm"
        />
        <input
          type="text"
          value={location.lon == null ? '' : String(location.lon)}
          onChange={(e) => {
            const v = e.target.value.trim();
            onChangeLocation({
              ...location,
              lon: v ? Number(v) : null
            });
          }}
          placeholder="Kinh độ"
          className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm"
        />
      </div>
    </div>
  );
};
