import React, { useState, useRef, useEffect } from 'react';
import { exportQRtoEPS, exportQRtoPDF } from '../utils/qrExport';
import { scanQRCode } from '../utils/qrScanner';
import { QRHistory, useQRHistory } from './QRHistory';
import { ENV_CONFIG } from '../config/environment';
import { 
  FileSpreadsheet, FileType, LayoutGrid, Calculator,
  Briefcase, ChevronLeft, ChevronRight, ArrowRight,
  Link, Type, Wifi, Mail, Phone, CreditCard, MapPin, Calendar, Download, Search, MessageSquare, Send, Bitcoin, Move, Camera, Save, Plus, Trash2, Image as ImageIcon, Box, Printer
} from 'lucide-react';
import QRCodeStyling, { Options, DotType, CornerSquareType, CornerDotType } from 'qr-code-styling';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import html2canvas from 'html2canvas';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

(L.Icon.Default as any).mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface HomePageProps {
  onNavigate: (pageId: string) => void;
}

interface MenuCard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  gradient: string;
}

const menuCards: MenuCard[] = [
  { id: 'label-designer', title: 'Biến Đổi Dữ Liệu', description: 'Thiết kế tem nhãn với dữ liệu từ Excel', icon: FileSpreadsheet, gradient: 'from-indigo-500 to-purple-600' },
  { id: 'pdf-processor', title: 'Thông Tin PDF', description: 'Kiểm tra trang màu, trang trắng đen, khổ PDF', icon: FileType, gradient: 'from-purple-500 to-pink-600' },
  { id: 'render-pdf', title: 'Render PDF', description: 'Kết xuất file PDF sang ảnh độ nét cao', icon: Printer, gradient: 'from-blue-500 to-cyan-600' },
  { id: 'die-cutting', title: 'Tạo Khuôn Hộp', description: 'Thiết kế mẫu hộp và xuất khuôn bế', icon: Box, gradient: 'from-pink-500 to-rose-600' },
  { id: 'imposition-advanced', title: 'Bình Trang', description: 'Sắp xếp layout in offset', icon: LayoutGrid, gradient: 'from-cyan-500 to-blue-600' },
  { id: 'price-calc-offset', title: 'Tính Giá In', description: 'Tính toán chi phí in ấn', icon: Calculator, gradient: 'from-amber-500 to-red-500' },
  { id: 'customers', title: 'Kinh Doanh', description: 'Quản lý khách hàng, báo giá', icon: Briefcase, gradient: 'from-emerald-500 to-teal-500' },
];

type TabType = 'url' | 'text' | 'wifi' | 'google' | 'location' | 'vcard' | 'email' | 'sms' | 'whatsapp' | 'telegram' | 'paypal' | 'crypto' | 'event' | 'decode' | 'menu';

interface WifiData { ssid: string; password: string; type: 'WPA' | 'WEP' | 'nopass'; }
interface EmailData { to: string; subject: string; body: string; }
interface SmsData { phone: string; message: string; }
interface VCardData { fn: string; phone: string; email: string; org: string; title: string; }
interface LocationData { address: string; lat: number | null; lon: number | null; }
interface AddressSettings {
  currentAddress: string;
  savedAddresses: { id: string; name: string; address: string; lat: number; lon: number }[];
}
interface WhatsappData { phone: string; text: string; }
interface TelegramData { username: string; }
interface PaypalData { type: 'link'; email: string; amount: string; currency: string; }
interface CryptoData { type: 'bitcoin'; address: string; amount: string; }
interface EventData { title: string; location: string; start: string; end: string; desc: string; }
interface MenuItem {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
}

interface MenuData {
  restaurantName: string;
  items: MenuItem[];
}

const dotTypes: DotType[] = ['square', 'dots', 'rounded', 'extra-rounded', 'classy', 'classy-rounded'];
const cornerSquareTypes: CornerSquareType[] = ['square', 'dot', 'extra-rounded'];

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [qrContent, setQrContent] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [decodedContent, setDecodedContent] = useState<string>('');
  const { saveToHistory } = useQRHistory();
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [currentMenuItem, setCurrentMenuItem] = useState<MenuItem | null>(null);
  const [restaurantName, setRestaurantName] = useState<string>('');
  const qrImageInputRef = useRef<HTMLInputElement>(null);
  const menuImageInputRef = useRef<HTMLInputElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load address settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('addressSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setAddressSettings(settings);
      } catch (e) {
        console.error('Error loading address settings:', e);
      }
    }
  }, []);

  // Save address settings to localStorage
  const saveAddressSettings = (settings: AddressSettings) => {
    setAddressSettings(settings);
    localStorage.setItem('addressSettings', JSON.stringify(settings));
  };

  // Get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt không hỗ trợ định vị.');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Reverse geocoding to get address
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );
          const data = await response.json();
          const address = data.display_name || `Vĩ độ: ${latitude}, Kinh độ: ${longitude}`;
          
          // Update location data
          setData(prev => ({
            ...prev,
            location: {
              address: address,
              lat: latitude,
              lon: longitude
            }
          }));

          // Update current address in settings
          saveAddressSettings({
            ...addressSettings,
            currentAddress: address
          });

          alert('Đã lấy vị trí hiện tại: ' + address);
        } catch (error) {
          console.error('Error getting address:', error);
          // Still update coordinates even if address lookup fails
          setData(prev => ({
            ...prev,
            location: {
              address: `Vĩ độ: ${latitude}, Kinh độ: ${longitude}`,
              lat: latitude,
              lon: longitude
            }
          }));
          alert('Đã lấy tọa độ vị trí hiện tại.');
        }
        
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Không thể lấy vị trí hiện tại. Vui lòng kiểm tra quyền truy cập vị trí.');
        setIsGettingLocation(false);
      }
    );
  };

  const handleHistorySelect = (item: any) => {
    setQrContent(item.content);
    setDecodedContent(item.content);
    
    // Xử lý menu khôi phục
    if (item.type === 'menu' && item.menuData) {
      setRestaurantName(item.menuData.restaurantName);
      setMenuItems(item.menuData.items);
      setCurrentMenuItem(null);
      setActiveTab('menu');
      alert('Đã khôi phục menu từ lịch sử!');
      return;
    }
    
    // Set the appropriate tab based on type
    switch (item.type) {
      case 'decode':
        setActiveTab('decode');
        break;
      case 'url':
        setActiveTab('url');
        setData(prev => ({ ...prev, url: item.content }));
        break;
      case 'text':
        setActiveTab('text');
        setData(prev => ({ ...prev, text: item.content }));
        break;
      case 'wifi':
        setActiveTab('wifi');
        break;
      case 'google':
        setActiveTab('google');
        setData(prev => ({ ...prev, google: item.content }));
        break;
      case 'location':
        setActiveTab('location');
        break;
      case 'vcard':
        setActiveTab('vcard');
        break;
      case 'email':
        setActiveTab('email');
        break;
      case 'sms':
        setActiveTab('sms');
        break;
      case 'whatsapp':
        setActiveTab('whatsapp');
        break;
      case 'telegram':
        setActiveTab('telegram');
        break;
      case 'paypal':
        setActiveTab('paypal');
        break;
      case 'crypto':
        setActiveTab('crypto');
        break;
      case 'event':
        setActiveTab('event');
        break;
    }
  };

  const itemsPerView = isMobile ? 1 : 5;
  const maxIndex = Math.max(0, menuCards.length - itemsPerView);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prev => prev >= maxIndex ? 0 : prev + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, maxIndex]);

  const handlePrev = () => { setIsAutoPlaying(false); setCurrentIndex(prev => prev <= 0 ? maxIndex : prev - 1); };
  const handleNext = () => { setIsAutoPlaying(false); setCurrentIndex(prev => prev >= maxIndex ? 0 : prev + 1); };

  const gapSize = isMobile ? 12 : 16;

  const [activeTab, setActiveTab] = useState<TabType>('url');
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCode = useRef<QRCodeStyling | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerInstance = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [addressSettings, setAddressSettings] = useState<AddressSettings>({
    currentAddress: '',
    savedAddresses: []
  });
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const [data, setData] = useState({
    url: 'https://toolxprint.com',
    text: '',
    google: '',
    location: { address: '', lat: null, lon: null } as LocationData,
    wifi: { ssid: '', password: '', type: 'WPA' } as WifiData,
    email: { to: '', subject: '', body: '' } as EmailData,
    sms: { phone: '', message: '' } as SmsData,
    vcard: { fn: '', phone: '', email: '', org: '', title: '' } as VCardData,
    whatsapp: { phone: '', text: '' } as WhatsappData,
    telegram: { username: '' } as TelegramData,
    paypal: { type: 'link', email: '', amount: '', currency: 'USD' } as PaypalData,
    crypto: { type: 'bitcoin', address: '', amount: '' } as CryptoData,
    event: { title: '', location: '', start: '', end: '', desc: '' } as EventData,
  });

  const [design, setDesign] = useState<Options>({
    width: 240,
    height: 240,
    data: 'https://toolxprint.com',
    image: '',
    dotsOptions: { type: 'rounded' as DotType, color: '#000000' },
    backgroundOptions: { color: '#ffffff' },
    cornersSquareOptions: { type: 'extra-rounded' as CornerSquareType, color: '#000000' },
    cornersDotOptions: { type: 'dot' as CornerDotType, color: '#000000' },
    imageOptions: { hideBackgroundDots: true, imageSize: 0.4, margin: 5 },
  });

  const [useGradient, setUseGradient] = useState(false);
  const [gradientColors, setGradientColors] = useState({ start: '#000000', end: '#3b82f6' });
  const [separateEyeColor, setSeparateEyeColor] = useState(false);
  const [logoFile, setLogoFile] = useState<string>('');
  const qrUpdateTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (qrRef.current && !qrCode.current) {
      qrCode.current = new QRCodeStyling(design);
      qrRef.current.innerHTML = '';
      qrCode.current.append(qrRef.current);
      setQrContent(design.data || '');
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'location') return;
    if (!mapRef.current) return;
    if (mapInstance.current) {
      setTimeout(() => mapInstance.current?.invalidateSize(), 100);
      return;
    }

    const defaultLat = data.location.lat ?? 21.0285;
    const defaultLon = data.location.lon ?? 105.8542;

    mapInstance.current = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([defaultLat, defaultLon], 16);

    L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      crossOrigin: true,
    }).addTo(mapInstance.current);

    markerInstance.current = L.marker([defaultLat, defaultLon], { draggable: true }).addTo(mapInstance.current);
    markerInstance.current.on('dragend', (e: any) => {
      const newPos = e.target.getLatLng();
      setData(prev => ({ ...prev, location: { ...prev.location, lat: newPos.lat, lon: newPos.lng } }));
    });
    mapInstance.current.on('click', (e: any) => {
      markerInstance.current?.setLatLng(e.latlng);
      setData(prev => ({ ...prev, location: { ...prev.location, lat: e.latlng.lat, lon: e.latlng.lng } }));
    });

    setTimeout(() => mapInstance.current?.invalidateSize(), 100);
  }, [activeTab]);

  useEffect(() => {
    if (!mapInstance.current || !markerInstance.current) return;
    if (activeTab !== 'location') return;
    if (data.location.lat == null || data.location.lon == null) return;

    const currentMarkerPos = markerInstance.current.getLatLng();
    const dist = Math.sqrt(Math.pow(currentMarkerPos.lat - data.location.lat, 2) + Math.pow(currentMarkerPos.lng - data.location.lon, 2));
    if (dist > 0.0001) {
      markerInstance.current.setLatLng([data.location.lat, data.location.lon]);
      mapInstance.current.setView([data.location.lat, data.location.lon], 16);
    }
  }, [activeTab, data.location.lat, data.location.lon]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'location' && data.location.address.trim().length > 2 && showSuggestions) {
        setIsSearching(true);
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(data.location.address)}&limit=5&addressdetails=1`)
          .then(res => res.json())
          .then(res => {
            setSuggestions(res);
            setIsSearching(false);
          })
          .catch(() => setIsSearching(false));
      } else {
        setSuggestions([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [activeTab, data.location.address, showSuggestions]);

  const handleQRImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const content = await scanQRCode(file);
      setDecodedContent(content);
      setQrContent(content);
    } catch (error) {
      alert('Không thể đọc mã QR từ ảnh này. Vui lòng thử ảnh khác.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveToHistory = () => {
    // Get current QR data based on active tab
    let qrData = 'https://toolxprint.com';
    let menuData = null;
    
    switch (activeTab) {
      case 'url': qrData = data.url || 'https://toolxprint.com'; break;
      case 'text': qrData = data.text || 'Hello'; break;
      case 'google': qrData = data.google || 'https://docs.google.com'; break;
      case 'location':
        if (data.location.lat != null && data.location.lon != null) {
          qrData = `https://www.google.com/maps?q=${data.location.lat},${data.location.lon}`;
        } else {
          qrData = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.location.address || '')}`;
        }
        break;
      case 'wifi': qrData = `WIFI:T:${data.wifi.type};S:${data.wifi.ssid};P:${data.wifi.password};;`; break;
      case 'email': qrData = `mailto:${data.email.to}?subject=${encodeURIComponent(data.email.subject)}&body=${encodeURIComponent(data.email.body)}`; break;
      case 'sms': qrData = `SMSTO:${data.sms.phone}:${data.sms.message}`; break;
      case 'whatsapp': qrData = `https://wa.me/${data.whatsapp.phone}?text=${encodeURIComponent(data.whatsapp.text)}`; break;
      case 'telegram': qrData = `https://t.me/${data.telegram.username}`; break;
      case 'paypal': qrData = `https://www.paypal.com/paypalme/${data.paypal.email}/${data.paypal.amount}${data.paypal.currency}`; break;
      case 'crypto': qrData = `${data.crypto.type}:${data.crypto.address}?amount=${data.crypto.amount}`; break;
      case 'vcard':
        qrData = `BEGIN:VCARD\nVERSION:3.0\nFN:${data.vcard.fn}\nORG:${data.vcard.org}\nTITLE:${data.vcard.title}\nTEL:${data.vcard.phone}\nEMAIL:${data.vcard.email}\nEND:VCARD`;
        break;
      case 'event':
        qrData = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${data.event.title}\nDTSTART:${(data.event.start || '').replace(/[-:]/g,'')}00\nDTEND:${(data.event.end || '').replace(/[-:]/g,'')}00\nLOCATION:${data.event.location}\nDESCRIPTION:${data.event.desc}\nEND:VEVENT\nEND:VCALENDAR`;
        break;
      case 'decode':
        qrData = decodedContent || 'https://toolxprint.com';
        break;
      case 'menu':
        if (restaurantName && menuItems.length > 0) {
          // Lưu menu data đầy đủ vào history (bao gồm cả ảnh)
          menuData = {
            restaurantName,
            items: menuItems
          };
          const menuId = Date.now().toString();
          qrData = `${ENV_CONFIG.QR_BASE_URL}/menu/${menuId}`;
        }
        break;
    }

    if (qrData && qrData !== 'https://toolxprint.com' && qrData !== 'Hello') {
      // Gọi saveToHistory với menu data nếu có
      saveToHistory(qrData, activeTab, menuData || undefined);
      setHistoryRefreshTrigger(prev => prev + 1); // Trigger refresh
      alert('Đã lưu vào lịch sử QR!');
    } else {
      alert('Vui lòng nhập nội dung QR trước khi lưu.');
    }
  };

  const handleMenuImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      const newItem: MenuItem = {
        id: Date.now().toString(),
        title: '',
        description: '',
        image: imageUrl,
        category: 'Món ăn'
      };
      setCurrentMenuItem(newItem);
    };
    reader.readAsDataURL(file);
  };

  const handleAddMenuItem = () => {
    if (currentMenuItem && currentMenuItem.title && currentMenuItem.description) {
      setMenuItems([...menuItems, currentMenuItem]);
      setCurrentMenuItem(null);
      alert('Đã thêm món ăn vào menu!');
    } else {
      alert('Vui lòng nhập đầy đủ title và mô tả!');
    }
  };

  const handleDeleteMenuItem = (id: string) => {
    setMenuItems(menuItems.filter(item => item.id !== id));
    if (currentMenuItem?.id === id) {
      setCurrentMenuItem(null);
    }
  };

  const handleSelectMenuItem = (item: MenuItem) => {
    setCurrentMenuItem(item);
  };

  useEffect(() => {
    if (!qrCode.current) return;

    let qrData = 'https://toolxprint.com';
    switch (activeTab) {
      case 'url': qrData = data.url || 'https://toolxprint.com'; break;
      case 'text': qrData = data.text || 'Hello'; break;
      case 'google': qrData = data.google || 'https://docs.google.com'; break;
      case 'location':
        if (data.location.lat != null && data.location.lon != null) {
          qrData = `https://www.google.com/maps?q=${data.location.lat},${data.location.lon}`;
        } else {
          qrData = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.location.address || '')}`;
        }
        break;
      case 'wifi': qrData = `WIFI:T:${data.wifi.type};S:${data.wifi.ssid};P:${data.wifi.password};;`; break;
      case 'email': qrData = `mailto:${data.email.to}?subject=${encodeURIComponent(data.email.subject)}&body=${encodeURIComponent(data.email.body)}`; break;
      case 'sms': qrData = `SMSTO:${data.sms.phone}:${data.sms.message}`; break;
      case 'whatsapp': qrData = `https://wa.me/${data.whatsapp.phone}?text=${encodeURIComponent(data.whatsapp.text)}`; break;
      case 'telegram': qrData = `https://t.me/${data.telegram.username}`; break;
      case 'paypal': qrData = `https://www.paypal.com/paypalme/${data.paypal.email}/${data.paypal.amount}${data.paypal.currency}`; break;
      case 'crypto': qrData = `${data.crypto.type}:${data.crypto.address}?amount=${data.crypto.amount}`; break;
      case 'vcard':
        qrData = `BEGIN:VCARD\nVERSION:3.0\nFN:${data.vcard.fn}\nORG:${data.vcard.org}\nTITLE:${data.vcard.title}\nTEL:${data.vcard.phone}\nEMAIL:${data.vcard.email}\nEND:VCARD`;
        break;
      case 'event':
        qrData = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${data.event.title}\nDTSTART:${(data.event.start || '').replace(/[-:]/g,'')}00\nDTEND:${(data.event.end || '').replace(/[-:]/g,'')}00\nLOCATION:${data.event.location}\nDESCRIPTION:${data.event.desc}\nEND:VEVENT\nEND:VCALENDAR`;
        break;
      case 'decode':
        qrData = decodedContent || 'https://toolxprint.com';
        break;
      case 'menu':
        // Tạo QR link đến trang menu với dữ liệu
        if (restaurantName && menuItems.length > 0) {
          // Chỉ lưu text data, không lưu ảnh base64 để tránh localStorage quota exceeded
          const menuData = {
            restaurantName,
            items: menuItems.map(item => ({
              id: item.id,
              title: item.title,
              description: item.description,
              category: item.category,
              // Không lưu image, chỉ lưu URL hoặc để trống
              image: item.image.startsWith('data:') ? '' : item.image
            }))
          };
          // Lưu menu data vào localStorage để trang menu có thể đọc
          const menuId = Date.now().toString();
          localStorage.setItem(`menu_${menuId}`, JSON.stringify(menuData));
          qrData = `${ENV_CONFIG.QR_BASE_URL}/menu/${menuId}`;
          console.log('QR Data for menu:', qrData, 'Menu items:', menuItems.length);
        } else {
          qrData = `${ENV_CONFIG.QR_BASE_URL}/menu`;
          console.log('No restaurant name or menu items, using default URL');
        }
        break;
    }

    const options: Partial<Options> = {
      ...design,
      data: qrData,
      image: logoFile || undefined,
      dotsOptions: {
        ...design.dotsOptions,
        color: useGradient ? undefined : design.dotsOptions?.color,
        gradient: useGradient ? { type: 'linear', rotation: 0, colorStops: [{ offset: 0, color: gradientColors.start }, { offset: 1, color: gradientColors.end }] } : undefined
      },
      cornersSquareOptions: {
        ...design.cornersSquareOptions,
        color: separateEyeColor
          ? (design.cornersSquareOptions?.color as any)
          : (useGradient ? gradientColors.start : (design.dotsOptions?.color as any)),
      },
      cornersDotOptions: {
        ...design.cornersDotOptions,
        color: separateEyeColor
          ? (design.cornersDotOptions?.color as any)
          : (useGradient ? gradientColors.start : (design.dotsOptions?.color as any)),
      },
    };

    if (qrUpdateTimerRef.current != null) {
      window.clearTimeout(qrUpdateTimerRef.current);
    }
    qrUpdateTimerRef.current = window.setTimeout(() => {
      qrCode.current?.update(options);
      setQrContent(qrData);
    }, 250);

    return () => {
      if (qrUpdateTimerRef.current != null) {
        window.clearTimeout(qrUpdateTimerRef.current);
      }
    };
  }, [data, activeTab, design, useGradient, gradientColors, separateEyeColor, logoFile, decodedContent, currentMenuItem]);

  const handleDownload = async (ext: 'png' | 'svg' | 'jpeg' | 'eps' | 'pdf') => {
    if (ext === 'eps' || ext === 'pdf') {
      const svgString = qrRef.current?.querySelector('svg')?.outerHTML;
      if (!svgString) return;

      if (ext === 'eps') {
        await exportQRtoEPS(svgString);
      } else {
        await exportQRtoPDF(svgString);
      }
    } else {
      qrCode.current?.download({ name: 'qr-code', extension: ext });
    }
  };

  const handleCaptureMap = async () => {
    if (!mapContainerRef.current) return;
    setIsCapturing(true);
    try {
      const canvas = await html2canvas(mapContainerRef.current, {
        useCORS: true,
        scale: 3,
        allowTaint: true,
        logging: false,
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
    if (data.location.lat == null || data.location.lon == null) {
      alert('Vui lòng chọn địa điểm trước.');
      return;
    }
    const url = `https://www.openstreetmap.org/export#map=17/${data.location.lat}/${data.location.lon}`;
    window.open(url, '_blank');
  };

  const applyHouseNumberPrefix = (currentInput: string, selectedAddress: string) => {
    const input = (currentInput || '').trim();
    const address = (selectedAddress || '').trim();
    const numberPrefixMatch = input.match(/^((Số|No\.?|Ngõ|Hẻm)?\s*\d+\w*(\/\d+)?)\s*/i);
    if (!numberPrefixMatch) return address;
    const prefix = (numberPrefixMatch[0] || '').trim();
    if (!prefix) return address;
    if (address.toLowerCase().includes(prefix.toLowerCase())) return address;
    return `${prefix} ${address}`.trim();
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setLogoFile(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ComponentType<any> }[] = [
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
    { id: 'menu', label: 'Tạo menu QR', icon: ImageIcon },
  ];

  return (
    <div className="min-h-full bg-slate-50">
      {/* Menu Cards */}
      <div className="py-4 px-4">
        <div className="max-w-7xl mx-auto relative">
          {maxIndex > 0 && (
            <>
              <button onClick={handlePrev} className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center text-slate-500 hover:text-slate-800 hover:shadow-md transition-all">
                <ChevronLeft size={18} />
              </button>
              <button onClick={handleNext} className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center text-slate-500 hover:text-slate-800 hover:shadow-md transition-all">
                <ChevronRight size={18} />
              </button>
            </>
          )}

          <div className="overflow-hidden px-1" ref={carouselRef}>
            <div 
              className="flex items-stretch transition-transform duration-500 ease-out"
              style={{ gap: `${gapSize}px`, transform: maxIndex > 0 ? `translateX(calc(-${currentIndex * (100 / itemsPerView)}% - ${currentIndex * gapSize / itemsPerView}px))` : 'none' }}
            >
              {menuCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.id} className="flex-shrink-0" style={{ width: `calc((100% - ${(itemsPerView - 1) * gapSize}px) / ${itemsPerView})` }}>
                    <div
                      onClick={() => onNavigate(card.id)}
                      className="bg-white rounded-xl cursor-pointer group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md h-full min-h-24 flex items-start gap-3 px-4 py-3 border border-slate-100"
                    >
                      <div className={`w-12 h-12 bg-gradient-to-br ${card.gradient} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-6 h-6 text-white" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold text-slate-800 whitespace-normal break-words leading-snug">{card.title}</h3>
                        <p className="text-base text-slate-400 whitespace-normal break-words leading-snug hidden md:block">{card.description}</p>
                        <div className="flex items-center gap-1 text-base text-indigo-500 mt-1 group-hover:gap-2 transition-all">
                          <span>Mở</span>
                          <ArrowRight size={12} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Section - Clean Style */}
      <div className="bg-white w-full">
        <div className="px-4 pt-[15px] pb-[15px]">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Tạo QR Code</h2>
                  <p className="text-sm text-slate-400">Tạo mã QR đa dạng định dạng, có bản đồ & tuỳ chỉnh thiết kế.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-9 space-y-6">
                <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold text-slate-700">1) Loại QR</h3>
                    <span className="text-xs text-slate-400">Chọn loại và nhập dữ liệu</span>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {tabs.map(tab => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          className={`group rounded-xl border px-2 py-2 text-xs font-semibold transition-all flex flex-col items-center justify-center gap-1 min-h-[56px] ${
                            isActive
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <Icon size={16} className={isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} />
                          <span className="leading-none">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 p-4 bg-white rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-slate-500">Dữ liệu QR</span>
                      <button
                        onClick={handleSaveToHistory}
                        className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-colors"
                      >
                        <Save size={12} />
                        Lưu lịch sử
                      </button>
                    </div>
                    <div className="space-y-2">
                {activeTab === 'url' && (
                  <input type="url" value={data.url} onChange={(e) => setData({ ...data, url: e.target.value })} placeholder="https://example.com" className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-300" />
                )}
                {activeTab === 'text' && (
                  <textarea value={data.text} onChange={(e) => setData({ ...data, text: e.target.value })} placeholder="Nhập văn bản..." rows={3} className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-300 resize-none" />
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
                    <input type="text" value={data.wifi.ssid} onChange={(e) => setData({ ...data, wifi: { ...data.wifi, ssid: e.target.value }})} placeholder="Tên WiFi (SSID)" className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm" />
                    <input type="text" value={data.wifi.password} onChange={(e) => setData({ ...data, wifi: { ...data.wifi, password: e.target.value }})} placeholder="Mật khẩu" className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm" />
                    <select
                      value={data.wifi.type}
                      onChange={(e) => setData({ ...data, wifi: { ...data.wifi, type: e.target.value as WifiData['type'] }})}
                      className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm"
                    >
                      <option value="WPA">WPA/WPA2</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">Không mật khẩu</option>
                    </select>
                  </>
                )}
                {activeTab === 'email' && (
                  <>
                    <input type="email" value={data.email.to} onChange={(e) => setData({ ...data, email: { ...data.email, to: e.target.value }})} placeholder="Email nhận" className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm" />
                    <input type="text" value={data.email.subject} onChange={(e) => setData({ ...data, email: { ...data.email, subject: e.target.value }})} placeholder="Tiêu đề" className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm" />
                    <textarea
                      value={data.email.body}
                      onChange={(e) => setData({ ...data, email: { ...data.email, body: e.target.value }})}
                      placeholder="Nội dung"
                      rows={3}
                      className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm resize-none"
                    />
                  </>
                )}
                {activeTab === 'sms' && (
                  <>
                    <input type="tel" value={data.sms.phone} onChange={(e) => setData({ ...data, sms: { ...data.sms, phone: e.target.value }})} placeholder="Số điện thoại" className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm" />
                    <textarea value={data.sms.message} onChange={(e) => setData({ ...data, sms: { ...data.sms, message: e.target.value }})} placeholder="Tin nhắn" rows={3} className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm resize-none" />
                  </>
                )}
                {activeTab === 'whatsapp' && (
                  <>
                    <input type="tel" value={data.whatsapp.phone} onChange={(e) => setData({ ...data, whatsapp: { ...data.whatsapp, phone: e.target.value }})} placeholder="Số điện thoại (không dấu +)" className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm" />
                    <textarea value={data.whatsapp.text} onChange={(e) => setData({ ...data, whatsapp: { ...data.whatsapp, text: e.target.value }})} placeholder="Nội dung" rows={3} className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm resize-none" />
                  </>
                )}
                {activeTab === 'telegram' && (
                  <input type="text" value={data.telegram.username} onChange={(e) => setData({ ...data, telegram: { ...data.telegram, username: e.target.value }})} placeholder="username (không @)" className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm" />
                )}
                {activeTab === 'paypal' && (
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={data.paypal.email} onChange={(e) => setData({ ...data, paypal: { ...data.paypal, email: e.target.value }})} placeholder="paypal.me (tên)" className="col-span-2 w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm" />
                    <input type="text" value={data.paypal.amount} onChange={(e) => setData({ ...data, paypal: { ...data.paypal, amount: e.target.value }})} placeholder="Số tiền" className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm" />
                    <input type="text" value={data.paypal.currency} onChange={(e) => setData({ ...data, paypal: { ...data.paypal, currency: e.target.value }})} placeholder="USD" className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm" />
                  </div>
                )}
                {activeTab === 'crypto' && (
                  <div className="space-y-2">
                    <input type="text" value={data.crypto.address} onChange={(e) => setData({ ...data, crypto: { ...data.crypto, address: e.target.value }})} placeholder="Địa chỉ ví" className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm" />
                    <input type="text" value={data.crypto.amount} onChange={(e) => setData({ ...data, crypto: { ...data.crypto, amount: e.target.value }})} placeholder="Số lượng (amount)" className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm" />
                  </div>
                )}
                {activeTab === 'vcard' && (
                  <>
                    <input type="text" value={data.vcard.fn} onChange={(e) => setData({ ...data, vcard: { ...data.vcard, fn: e.target.value }})} placeholder="Họ tên" className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm" />
                    <input type="tel" value={data.vcard.phone} onChange={(e) => setData({ ...data, vcard: { ...data.vcard, phone: e.target.value }})} placeholder="Điện thoại" className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm" />
                    <input type="email" value={data.vcard.email} onChange={(e) => setData({ ...data, vcard: { ...data.vcard, email: e.target.value }})} placeholder="Email" className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm" />
                    <input type="text" value={data.vcard.org} onChange={(e) => setData({ ...data, vcard: { ...data.vcard, org: e.target.value }})} placeholder="Tổ chức" className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm" />
                    <input type="text" value={data.vcard.title} onChange={(e) => setData({ ...data, vcard: { ...data.vcard, title: e.target.value }})} placeholder="Chức danh" className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm" />
                  </>
                )}
                {activeTab === 'location' && (
                  <div className="space-y-3">
                    <div className="relative">
                      <label className="text-xs font-medium text-slate-500 mb-1 block">Tìm địa chỉ</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={data.location.address}
                          onChange={(e) => {
                            setData({ ...data, location: { ...data.location, address: e.target.value }});
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
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm border-b last:border-b-0"
                              onClick={() => {
                                const selectedAddress = String(item.display_name || '').trim();
                                const finalAddress = applyHouseNumberPrefix(data.location.address, selectedAddress);
                                const nextLat = item.lat ? parseFloat(item.lat) : null;
                                const nextLon = item.lon ? parseFloat(item.lon) : null;
                                setShowSuggestions(false);
                                setSuggestions([]);
                                setTimeout(() => {
                                  setData(prev => ({
                                    ...prev,
                                    location: {
                                      address: finalAddress,
                                      lat: nextLat,
                                      lon: nextLon,
                                    }
                                  }));
                                }, 0);
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
                          className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
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
                                setData(prev => ({
                                  ...prev,
                                  location: {
                                    address: addressSettings.currentAddress,
                                    lat: prev.location.lat,
                                    lon: prev.location.lon
                                  }
                                }));
                              }}
                              className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
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
                            const selected = addressSettings.savedAddresses.find(addr => addr.id === e.target.value);
                            if (selected) {
                              setData(prev => ({
                                ...prev,
                                location: {
                                  address: selected.address,
                                  lat: selected.lat,
                                  lon: selected.lon
                                }
                              }));
                            }
                          }}
                          value=""
                        >
                          <option value="">Chọn địa chỉ đã lưu</option>
                          {addressSettings.savedAddresses.map(addr => (
                            <option key={addr.id} value={addr.id}>
                              {addr.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div ref={mapContainerRef} className="border border-slate-200 rounded-xl overflow-hidden relative">
                      <div className="bg-indigo-50 px-3 py-2 border-b flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-700 flex items-center gap-1">
                          <Move size={12} /> Chỉnh vị trí
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleOpenVectorSource}
                            className="flex items-center gap-1 bg-white border border-orange-200 text-orange-600 px-2 py-1 rounded-lg shadow-sm hover:bg-orange-50 text-[10px] font-bold transition-all"
                            title="Mở OpenStreetMap để tải SVG/PDF vector"
                          >
                            Lấy Vector
                          </button>
                          <button
                            type="button"
                            onClick={handleCaptureMap}
                            disabled={isCapturing}
                            className="flex items-center gap-1 bg-white border border-indigo-200 text-indigo-600 px-2 py-1 rounded-lg shadow-sm hover:bg-indigo-50 text-[10px] font-bold transition-all disabled:opacity-50"
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
                        value={data.location.lat == null ? '' : String(data.location.lat)}
                        onChange={(e) => {
                          const v = e.target.value.trim();
                          setData(prev => ({ ...prev, location: { ...prev.location, lat: v ? Number(v) : null } }));
                        }}
                        placeholder="Vĩ độ"
                        className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm"
                      />
                      <input
                        type="text"
                        value={data.location.lon == null ? '' : String(data.location.lon)}
                        onChange={(e) => {
                          const v = e.target.value.trim();
                          setData(prev => ({ ...prev, location: { ...prev.location, lon: v ? Number(v) : null } }));
                        }}
                        placeholder="Kinh độ"
                        className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm"
                      />
                    </div>
                  </div>
                )}
                {activeTab === 'event' && (
                  <>
                    <input type="text" value={data.event.title} onChange={(e) => setData({ ...data, event: { ...data.event, title: e.target.value }})} placeholder="Tên sự kiện" className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm" />
                    <input type="text" value={data.event.location} onChange={(e) => setData({ ...data, event: { ...data.event, location: e.target.value }})} placeholder="Địa điểm" className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm" />
                    <input type="datetime-local" value={data.event.start} onChange={(e) => setData({ ...data, event: { ...data.event, start: e.target.value }})} className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm" />
                    <input type="datetime-local" value={data.event.end} onChange={(e) => setData({ ...data, event: { ...data.event, end: e.target.value }})} className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm" />
                    <textarea value={data.event.desc} onChange={(e) => setData({ ...data, event: { ...data.event, desc: e.target.value }})} placeholder="Mô tả" rows={3} className="w-full px-4 py-2.5 bg-white border-0 rounded-xl text-base shadow-sm resize-none" />
                  </>
                )}
                {activeTab === 'decode' && (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Tải lên ảnh QR</label>
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
                          className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 w-full"
                        >
                          <Camera size={16} /> Chọn ảnh QR để giải mã
                        </button>
                      </div>
                      {decodedContent && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                          <p className="text-xs font-medium text-green-700 mb-1">Đã giải mã thành công:</p>
                          <p className="text-sm text-green-600 break-all">{decodedContent}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
                {activeTab === 'menu' && (
                  <>
                    <div className="space-y-4">
                      {/* Tên nhà hàng */}
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Tên nhà hàng</label>
                        <input
                          type="text"
                          value={restaurantName}
                          onChange={(e) => setRestaurantName(e.target.value)}
                          placeholder="Nhập tên nhà hàng của bạn"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                        />
                      </div>

                      {/* Upload ảnh mới */}
                      <div className="border-2 border-dashed border-slate-300 rounded-xl p-4">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleMenuImageUpload}
                          className="hidden"
                          ref={menuImageInputRef}
                        />
                        <button
                          onClick={() => menuImageInputRef.current?.click()}
                          className="w-full flex flex-col items-center gap-2 py-4 text-slate-500 hover:text-slate-700 transition-colors"
                        >
                          <ImageIcon size={24} />
                          <span className="text-sm font-medium">Tải lên ảnh món ăn</span>
                          <span className="text-xs">JPG, PNG, GIF (tối đa 5MB)</span>
                        </button>
                      </div>

                      {/* Form nhập thông tin */}
                      {currentMenuItem && (
                        <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-slate-700">Thông tin món ăn</h4>
                            <button
                              onClick={() => setCurrentMenuItem(null)}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          
                          {currentMenuItem.image && (
                            <div className="w-full h-32 bg-slate-200 rounded-lg overflow-hidden">
                              <img 
                                src={currentMenuItem.image} 
                                alt="Preview" 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          
                          <input
                            type="text"
                            value={currentMenuItem.title}
                            onChange={(e) => setCurrentMenuItem({...currentMenuItem, title: e.target.value})}
                            placeholder="Tên món ăn"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                          />
                          
                          <textarea
                            value={currentMenuItem.description}
                            onChange={(e) => setCurrentMenuItem({...currentMenuItem, description: e.target.value})}
                            placeholder="Mô tả món ăn"
                            rows={3}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm resize-none"
                          />
                          
                          <select
                            value={currentMenuItem.category}
                            onChange={(e) => setCurrentMenuItem({...currentMenuItem, category: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                          >
                            <option value="Giới thiệu">Giới thiệu</option>
                            <option value="Món khai vị">Món khai vị</option>
                            <option value="Món chính">Món chính</option>
                            <option value="Món tráng miệng">Món tráng miệng</option>
                            <option value="Đồ uống">Đồ uống</option>
                          </select>
                          
                          <button
                            onClick={handleAddMenuItem}
                            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                          >
                            Thêm vào menu
                          </button>
                        </div>
                      )}

                      {/* Danh sách món ăn đã thêm */}
                      {menuItems.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-slate-700">Danh sách menu ({menuItems.length})</h4>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {menuItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                              >
                                <div className="w-12 h-12 bg-slate-200 rounded overflow-hidden flex-shrink-0">
                                  <img 
                                    src={item.image} 
                                    alt={item.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
                                  <p className="text-xs text-slate-500 truncate">{item.category}</p>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteMenuItem(item.id);
                                  }}
                                  className="text-red-500 hover:text-red-600"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Link preview */}
                      {restaurantName && menuItems.length > 0 && (
                        <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
                          <p className="text-xs font-medium text-indigo-700 mb-1">Link QR sẽ tạo:</p>
                          <p className="text-sm text-indigo-600 font-mono">{ENV_CONFIG.QR_BASE_URL}/menu/{Date.now()}</p>
                          <p className="text-xs text-indigo-500 mt-2">Khách hàng quét QR để xem menu của "{restaurantName}"</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-700">2) Thiết kế</h3>
                    <span className="text-[11px] text-slate-400">Trực quan & nhanh</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-2 block">Kiểu điểm</label>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {dotTypes.map(type => {
                          const isActive = design.dotsOptions?.type === type;
                          const previewClass =
                            type === 'square'
                              ? 'rounded-none'
                              : type === 'dots'
                              ? 'rounded-full'
                              : type === 'rounded'
                              ? 'rounded-md'
                              : type === 'extra-rounded'
                              ? 'rounded-xl'
                              : type === 'classy'
                              ? 'rounded-md rotate-45'
                              : 'rounded-xl rotate-45';
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setDesign({ ...design, dotsOptions: { ...design.dotsOptions, type }})}
                              className={`rounded-xl border p-2 text-[11px] font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
                                isActive
                                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                              title={type}
                            >
                              <span className={`w-5 h-5 bg-slate-900 ${previewClass}`} />
                              <span className="leading-none">{type}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-2 block">Kiểu góc</label>
                      <div className="grid grid-cols-3 gap-2">
                        {cornerSquareTypes.map(type => {
                          const isActive = design.cornersSquareOptions?.type === type;
                          const previewClass = type === 'square' ? 'rounded-none' : type === 'dot' ? 'rounded-full' : 'rounded-xl';
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setDesign({ ...design, cornersSquareOptions: { ...design.cornersSquareOptions, type }})}
                              className={`rounded-xl border p-2 text-[11px] font-semibold transition-all flex items-center justify-start gap-2 ${
                                isActive
                                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                              title={type}
                            >
                              <span className={`w-5 h-5 border-2 border-slate-900 ${previewClass}`} />
                              <span className="leading-none">{type}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Màu QR</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={design.dotsOptions?.color || '#000000'} onChange={(e) => setDesign({ ...design, dotsOptions: { ...design.dotsOptions, color: e.target.value }})} className="w-9 h-9 rounded-xl cursor-pointer border-0 shadow-sm" />
                          <span className="text-[11px] text-slate-400 font-mono truncate">{design.dotsOptions?.color}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Màu nền</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={design.backgroundOptions?.color || '#ffffff'} onChange={(e) => setDesign({ ...design, backgroundOptions: { ...design.backgroundOptions, color: e.target.value }})} className="w-9 h-9 rounded-xl cursor-pointer border-0 shadow-sm" />
                          <span className="text-[11px] text-slate-400 font-mono truncate">{design.backgroundOptions?.color}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={useGradient} onChange={(e) => setUseGradient(e.target.checked)} className="rounded text-indigo-500 focus:ring-indigo-500" />
                        <span className="text-xs text-slate-700 font-medium">Gradient</span>
                      </label>
                      {useGradient && (
                        <div className="flex items-center gap-1.5">
                          <input type="color" value={gradientColors.start} onChange={(e) => setGradientColors({ ...gradientColors, start: e.target.value })} className="w-7 h-7 rounded-lg cursor-pointer border-0" />
                          <span className="text-slate-300 text-xs">→</span>
                          <input type="color" value={gradientColors.end} onChange={(e) => setGradientColors({ ...gradientColors, end: e.target.value })} className="w-7 h-7 rounded-lg cursor-pointer border-0" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={separateEyeColor} onChange={(e) => setSeparateEyeColor(e.target.checked)} className="rounded text-indigo-500 focus:ring-indigo-500" />
                        <span className="text-xs text-slate-700 font-medium">Tách màu mắt</span>
                      </label>
                      {separateEyeColor && (
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={(design.cornersSquareOptions?.color as string) || '#000000'}
                            onChange={(e) => setDesign({ ...design, cornersSquareOptions: { ...design.cornersSquareOptions, color: e.target.value as any }})}
                            className="w-7 h-7 rounded-lg cursor-pointer border-0"
                            title="Màu góc"
                          />
                          <input
                            type="color"
                            value={(design.cornersDotOptions?.color as string) || '#000000'}
                            onChange={(e) => setDesign({ ...design, cornersDotOptions: { ...design.cornersDotOptions, color: e.target.value as any }})}
                            className="w-7 h-7 rounded-lg cursor-pointer border-0"
                            title="Màu chấm góc"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1.5 block">Logo giữa</label>
                      <div className="flex items-center gap-2">
                        <label className="px-3 py-2 bg-white rounded-xl text-xs text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors shadow-sm border border-slate-200">
                          Chọn file
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        </label>
                        {logoFile && (
                          <>
                            <span className="text-[11px] text-emerald-600 font-medium">Đã chọn</span>
                            <button type="button" onClick={() => setLogoFile('')} className="text-[11px] text-red-500 hover:text-red-600 font-medium">Xóa</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Preview */}
              <div className="lg:col-span-3">
                <div className="lg:sticky lg:top-24 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-700">3) Xem trước</h3>
                    <span className="text-[11px] text-slate-400">Live preview</span>
                  </div>

                  <div className="flex items-center justify-center">
                    <div ref={qrRef} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100" />
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      <button type="button" onClick={() => handleDownload('png')} className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors">
                        <Download size={14} /> PNG
                      </button>
                      <button type="button" onClick={() => handleDownload('svg')} className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors">
                        <Download size={14} /> SVG
                      </button>
                      <button type="button" onClick={() => handleDownload('jpeg')} className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-xl text-xs font-semibold hover:bg-amber-600 transition-colors">
                        <Download size={14} /> JPG
                      </button>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-500">Nội dung QR</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(qrContent)}
                          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          Sao chép
                        </button>
                      </div>
                      <textarea
                        value={qrContent}
                        readOnly
                        className="w-full h-20 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                      />
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-500">Lịch sử QR</span>
                      </div>
                      <QRHistory onSelectHistory={handleHistorySelect} refreshTrigger={historyRefreshTrigger} />
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
