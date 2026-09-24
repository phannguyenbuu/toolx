import React from 'react';
import {
  Link,
  Type,
  Wifi,
  FileSpreadsheet,
  MapPin,
  CreditCard,
  Mail,
  MessageSquare,
  Phone,
  Send,
  Bitcoin,
  Calendar,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { TabType } from '../../types';

interface QRTabsNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

const TABS: { id: TabType; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'url', label: 'URL', icon: Link },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'wifi', label: 'WiFi', icon: Wifi },
  { id: 'google', label: 'Google', icon: FileSpreadsheet },
  { id: 'location', label: 'Vị trí', icon: MapPin },
  { id: 'vcard', label: 'VCard', icon: CreditCard },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'sms', label: 'SMS', icon: MessageSquare },
  { id: 'whatsapp', label: 'WhatsApp', icon: Phone },
  { id: 'telegram', label: 'Telegram', icon: Send },
  { id: 'paypal', label: 'PayPal', icon: CreditCard },
  { id: 'crypto', label: 'Crypto', icon: Bitcoin },
  { id: 'event', label: 'Sự kiện', icon: Calendar },
  { id: 'decode', label: 'Giải mã QR từ ảnh', icon: Camera },
  { id: 'menu', label: 'Tạo menu QR', icon: ImageIcon }
];

export const QRTabsNav: React.FC<QRTabsNavProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`group rounded-xl border px-2 py-2 text-xs font-semibold transition-all flex flex-col items-center justify-center gap-1 min-h-[56px] cursor-pointer ${
              isActive
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Icon
              size={16}
              className={
                isActive
                  ? 'text-indigo-600'
                  : 'text-slate-400 group-hover:text-slate-600'
              }
            />
            <span className="leading-none text-center">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
