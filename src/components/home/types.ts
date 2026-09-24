import React from 'react';
import { DotType, CornerSquareType, CornerDotType, Options } from 'qr-code-styling';

export interface HomePageProps {
  onNavigate: (pageId: string) => void;
}

export interface MenuCard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  gradient: string;
}

export type TabType =
  | 'url'
  | 'text'
  | 'wifi'
  | 'google'
  | 'location'
  | 'vcard'
  | 'email'
  | 'sms'
  | 'whatsapp'
  | 'telegram'
  | 'paypal'
  | 'crypto'
  | 'event'
  | 'decode'
  | 'menu';

export interface WifiData {
  ssid: string;
  password: string;
  type: 'WPA' | 'WEP' | 'nopass';
}

export interface EmailData {
  to: string;
  subject: string;
  body: string;
}

export interface SmsData {
  phone: string;
  message: string;
}

export interface VCardData {
  fn: string;
  phone: string;
  email: string;
  org: string;
  title: string;
}

export interface LocationData {
  address: string;
  lat: number | null;
  lon: number | null;
}

export interface AddressSettings {
  currentAddress: string;
  savedAddresses: { id: string; name: string; address: string; lat: number; lon: number }[];
}

export interface WhatsappData {
  phone: string;
  text: string;
}

export interface TelegramData {
  username: string;
}

export interface PaypalData {
  type: 'link';
  email: string;
  amount: string;
  currency: string;
}

export interface CryptoData {
  type: 'bitcoin';
  address: string;
  amount: string;
}

export interface EventData {
  title: string;
  location: string;
  start: string;
  end: string;
  desc: string;
}

export interface MenuItem {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
}

export interface MenuData {
  restaurantName: string;
  items: MenuItem[];
}

export interface QRFormData {
  url: string;
  text: string;
  google: string;
  location: LocationData;
  wifi: WifiData;
  email: EmailData;
  sms: SmsData;
  vcard: VCardData;
  whatsapp: WhatsappData;
  telegram: TelegramData;
  paypal: PaypalData;
  crypto: CryptoData;
  event: EventData;
}
