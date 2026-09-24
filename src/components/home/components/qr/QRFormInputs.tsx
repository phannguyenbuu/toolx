import React from 'react';
import { Camera } from 'lucide-react';
import {
  TabType,
  QRFormData,
  WifiData,
  MenuItem
} from '../../types';
import { QRLocationPicker } from './QRLocationPicker';
import { QRMenuEditor } from './QRMenuEditor';
import { QRContactInputs } from './QRContactInputs';

interface QRFormInputsProps {
  activeTab: TabType;
  data: QRFormData;
  setData: React.Dispatch<React.SetStateAction<QRFormData>>;
  isScanning: boolean;
  decodedContent: string;
  qrImageInputRef: React.RefObject<HTMLInputElement | null>;
  handleQRImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  restaurantName: string;
  setRestaurantName: (name: string) => void;
  menuItems: MenuItem[];
  setMenuItems: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  currentMenuItem: MenuItem | null;
  setCurrentMenuItem: (item: MenuItem | null) => void;
  menuImageInputRef: React.RefObject<HTMLInputElement | null>;
  handleMenuImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAddMenuItem: () => void;
  handleDeleteMenuItem: (id: string) => void;
}

export const QRFormInputs: React.FC<QRFormInputsProps> = ({
  activeTab,
  data,
  setData,
  isScanning,
  decodedContent,
  qrImageInputRef,
  handleQRImageUpload,
  restaurantName,
  setRestaurantName,
  menuItems,
  setMenuItems,
  currentMenuItem,
  setCurrentMenuItem,
  menuImageInputRef,
  handleMenuImageUpload,
  handleAddMenuItem,
  handleDeleteMenuItem
}) => {
  return (
    <div className="space-y-2">
      {activeTab === 'url' && (
        <input
          type="url"
          value={data.url}
          onChange={(e) => setData({ ...data, url: e.target.value })}
          placeholder="https://example.com"
          className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-300"
        />
      )}

      {activeTab === 'text' && (
        <textarea
          value={data.text}
          onChange={(e) => setData({ ...data, text: e.target.value })}
          placeholder="Nhập văn bản..."
          rows={3}
          className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-300 resize-none"
        />
      )}

      {activeTab === 'google' && (
        <div className="space-y-2">
          <input
            type="url"
            value={data.google}
            onChange={(e) => setData({ ...data, google: e.target.value })}
            placeholder="https://docs.google.com/..."
            className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm"
          />
          <p className="text-sm text-slate-400">Hỗ trợ Google Docs/Sheets/Slides.</p>
        </div>
      )}

      {activeTab === 'wifi' && (
        <>
          <input
            type="text"
            value={data.wifi.ssid}
            onChange={(e) =>
              setData({ ...data, wifi: { ...data.wifi, ssid: e.target.value } })
            }
            placeholder="Tên WiFi (SSID)"
            className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm"
          />
          <input
            type="text"
            value={data.wifi.password}
            onChange={(e) =>
              setData({
                ...data,
                wifi: { ...data.wifi, password: e.target.value }
              })
            }
            placeholder="Mật khẩu"
            className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm"
          />
          <select
            value={data.wifi.type}
            onChange={(e) =>
              setData({
                ...data,
                wifi: { ...data.wifi, type: e.target.value as WifiData['type'] }
              })
            }
            className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm"
          >
            <option value="WPA">WPA/WPA2</option>
            <option value="WEP">WEP</option>
            <option value="nopass">Không mật khẩu</option>
          </select>
        </>
      )}

      <QRContactInputs activeTab={activeTab} data={data} setData={setData} />

      {activeTab === 'paypal' && (
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={data.paypal.email}
            onChange={(e) =>
              setData({
                ...data,
                paypal: { ...data.paypal, email: e.target.value }
              })
            }
            placeholder="paypal.me (tên)"
            className="col-span-2 w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm"
          />
          <input
            type="text"
            value={data.paypal.amount}
            onChange={(e) =>
              setData({
                ...data,
                paypal: { ...data.paypal, amount: e.target.value }
              })
            }
            placeholder="Số tiền"
            className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm"
          />
          <input
            type="text"
            value={data.paypal.currency}
            onChange={(e) =>
              setData({
                ...data,
                paypal: { ...data.paypal, currency: e.target.value }
              })
            }
            placeholder="USD"
            className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm"
          />
        </div>
      )}

      {activeTab === 'crypto' && (
        <div className="space-y-2">
          <input
            type="text"
            value={data.crypto.address}
            onChange={(e) =>
              setData({
                ...data,
                crypto: { ...data.crypto, address: e.target.value }
              })
            }
            placeholder="Địa chỉ ví"
            className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm"
          />
          <input
            type="text"
            value={data.crypto.amount}
            onChange={(e) =>
              setData({
                ...data,
                crypto: { ...data.crypto, amount: e.target.value }
              })
            }
            placeholder="Số lượng (amount)"
            className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm"
          />
        </div>
      )}

      {activeTab === 'location' && (
        <QRLocationPicker
          location={data.location}
          onChangeLocation={(loc) => setData({ ...data, location: loc })}
        />
      )}

      {activeTab === 'event' && (
        <>
          <input
            type="text"
            value={data.event.title}
            onChange={(e) =>
              setData({ ...data, event: { ...data.event, title: e.target.value } })
            }
            placeholder="Tên sự kiện"
            className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm"
          />
          <input
            type="text"
            value={data.event.location}
            onChange={(e) =>
              setData({
                ...data,
                event: { ...data.event, location: e.target.value }
              })
            }
            placeholder="Địa điểm"
            className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm"
          />
          <input
            type="datetime-local"
            value={data.event.start}
            onChange={(e) =>
              setData({
                ...data,
                event: { ...data.event, start: e.target.value }
              })
            }
            className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm"
          />
          <input
            type="datetime-local"
            value={data.event.end}
            onChange={(e) =>
              setData({ ...data, event: { ...data.event, end: e.target.value } })
            }
            className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm"
          />
          <textarea
            value={data.event.desc}
            onChange={(e) =>
              setData({ ...data, event: { ...data.event, desc: e.target.value } })
            }
            placeholder="Mô tả"
            rows={3}
            className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm resize-none"
          />
        </>
      )}

      {activeTab === 'decode' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-500 mb-1 block">
              Tải lên ảnh QR
            </label>
            {isScanning && <span className="text-xs text-slate-500">Đang đọc...</span>}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleQRImageUpload}
              className="hidden"
              ref={qrImageInputRef}
            />
            <button
              onClick={() => qrImageInputRef.current?.click()}
              className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 w-full cursor-pointer"
            >
              <Camera size={16} /> Chọn ảnh QR để giải mã
            </button>
          </div>
          {decodedContent && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-xs font-medium text-green-700 mb-1">
                Đã giải mã thành công:
              </p>
              <p className="text-sm text-green-600 break-all">{decodedContent}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'menu' && (
        <QRMenuEditor
          restaurantName={restaurantName}
          setRestaurantName={setRestaurantName}
          menuItems={menuItems}
          setMenuItems={setMenuItems}
          currentMenuItem={currentMenuItem}
          setCurrentMenuItem={setCurrentMenuItem}
          menuImageInputRef={menuImageInputRef}
          handleMenuImageUpload={handleMenuImageUpload}
          handleAddMenuItem={handleAddMenuItem}
          handleDeleteMenuItem={handleDeleteMenuItem}
        />
      )}
    </div>
  );
};
