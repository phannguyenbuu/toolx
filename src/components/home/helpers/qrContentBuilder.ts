import { TabType, QRFormData, MenuItem } from '../types';
import { ENV_CONFIG } from '../../../config/environment';

export const applyHouseNumberPrefix = (currentInput: string, selectedAddress: string): string => {
  const input = (currentInput || '').trim();
  const address = (selectedAddress || '').trim();
  const numberPrefixMatch = input.match(/^((Số|No\.?|Ngõ|Hẻm)?\s*\d+\w*(\/\d+)?)\s*/i);
  if (!numberPrefixMatch) return address;
  const prefix = (numberPrefixMatch[0] || '').trim();
  if (!prefix) return address;
  if (address.toLowerCase().includes(prefix.toLowerCase())) return address;
  return `${prefix} ${address}`.trim();
};

export const buildQRContent = (
  activeTab: TabType,
  data: QRFormData,
  decodedContent: string,
  restaurantName: string,
  menuItems: MenuItem[]
): string => {
  switch (activeTab) {
    case 'url':
      return data.url || 'https://toolxprint.com';
    case 'text':
      return data.text || 'Hello';
    case 'google':
      return data.google || 'https://docs.google.com';
    case 'location':
      if (data.location.lat != null && data.location.lon != null) {
        return `https://www.google.com/maps?q=${data.location.lat},${data.location.lon}`;
      }
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        data.location.address || ''
      )}`;
    case 'wifi':
      return `WIFI:T:${data.wifi.type};S:${data.wifi.ssid};P:${data.wifi.password};;`;
    case 'email':
      return `mailto:${data.email.to}?subject=${encodeURIComponent(
        data.email.subject
      )}&body=${encodeURIComponent(data.email.body)}`;
    case 'sms':
      return `SMSTO:${data.sms.phone}:${data.sms.message}`;
    case 'whatsapp':
      return `https://wa.me/${data.whatsapp.phone}?text=${encodeURIComponent(
        data.whatsapp.text
      )}`;
    case 'telegram':
      return `https://t.me/${data.telegram.username}`;
    case 'paypal':
      return `https://www.paypal.com/paypalme/${data.paypal.email}/${data.paypal.amount}${data.paypal.currency}`;
    case 'crypto':
      return `${data.crypto.type}:${data.crypto.address}?amount=${data.crypto.amount}`;
    case 'vcard':
      return `BEGIN:VCARD\nVERSION:3.0\nFN:${data.vcard.fn}\nORG:${data.vcard.org}\nTITLE:${data.vcard.title}\nTEL:${data.vcard.phone}\nEMAIL:${data.vcard.email}\nEND:VCARD`;
    case 'event':
      return `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${data.event.title}\nDTSTART:${(
        data.event.start || ''
      ).replace(/[-:]/g, '')}00\nDTEND:${(data.event.end || '').replace(
        /[-:]/g,
        ''
      )}00\nLOCATION:${data.event.location}\nDESCRIPTION:${
        data.event.desc
      }\nEND:VEVENT\nEND:VCALENDAR`;
    case 'decode':
      return decodedContent || 'https://toolxprint.com';
    case 'menu':
      if (restaurantName && menuItems.length > 0) {
        const menuData = {
          restaurantName,
          items: menuItems.map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            category: item.category,
            image: item.image.startsWith('data:') ? '' : item.image
          }))
        };
        const menuId = Date.now().toString();
        try {
          localStorage.setItem(`menu_${menuId}`, JSON.stringify(menuData));
        } catch (e) {
          console.error('Error saving menu to localStorage:', e);
        }
        return `${ENV_CONFIG.QR_BASE_URL}/menu/${menuId}`;
      }
      return `${ENV_CONFIG.QR_BASE_URL}/menu`;
    default:
      return 'https://toolxprint.com';
  }
};
