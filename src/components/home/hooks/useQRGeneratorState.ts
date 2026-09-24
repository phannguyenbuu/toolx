import { useState, useRef, useEffect, useCallback } from 'react';
import QRCodeStyling, {
  Options,
  DotType,
  CornerSquareType,
  CornerDotType
} from 'qr-code-styling';
import {
  TabType,
  QRFormData,
  MenuItem
} from '../types';
import { buildQRContent } from '../helpers/qrContentBuilder';
import { scanQRCode } from '../../../utils/qrScanner';
import { exportQRtoEPS, exportQRtoPDF } from '../../../utils/qrExport';
import { useQRHistory } from '../../QRHistory';

export function useQRGeneratorState() {
  const [activeTab, setActiveTab] = useState<TabType>('url');
  const [qrContent, setQrContent] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [decodedContent, setDecodedContent] = useState<string>('');
  const { saveToHistory } = useQRHistory();
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);

  // Menu items state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [currentMenuItem, setCurrentMenuItem] = useState<MenuItem | null>(null);
  const [restaurantName, setRestaurantName] = useState<string>('');

  // Refs
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCode = useRef<QRCodeStyling | null>(null);
  const qrImageInputRef = useRef<HTMLInputElement>(null);
  const menuImageInputRef = useRef<HTMLInputElement>(null);
  const qrUpdateTimerRef = useRef<number | null>(null);

  // Form Data
  const [data, setData] = useState<QRFormData>({
    url: 'https://toolxprint.com',
    text: '',
    google: '',
    location: { address: '', lat: null, lon: null },
    wifi: { ssid: '', password: '', type: 'WPA' },
    email: { to: '', subject: '', body: '' },
    sms: { phone: '', message: '' },
    vcard: { fn: '', phone: '', email: '', org: '', title: '' },
    whatsapp: { phone: '', text: '' },
    telegram: { username: '' },
    paypal: { type: 'link', email: '', amount: '', currency: 'USD' },
    crypto: { type: 'bitcoin', address: '', amount: '' },
    event: { title: '', location: '', start: '', end: '', desc: '' }
  });

  // QR Design state
  const [design, setDesign] = useState<Options>({
    width: 240,
    height: 240,
    data: 'https://toolxprint.com',
    image: '',
    dotsOptions: { type: 'rounded' as DotType, color: '#000000' },
    backgroundOptions: { color: '#ffffff' },
    cornersSquareOptions: {
      type: 'extra-rounded' as CornerSquareType,
      color: '#000000'
    },
    cornersDotOptions: { type: 'dot' as CornerDotType, color: '#000000' },
    imageOptions: { hideBackgroundDots: true, imageSize: 0.4, margin: 5 }
  });

  const [useGradient, setUseGradient] = useState(false);
  const [gradientColors, setGradientColors] = useState({
    start: '#000000',
    end: '#3b82f6'
  });
  const [separateEyeColor, setSeparateEyeColor] = useState(false);
  const [logoFile, setLogoFile] = useState<string>('');

  // Initial QR mounting
  useEffect(() => {
    if (qrRef.current && !qrCode.current) {
      qrCode.current = new QRCodeStyling(design);
      qrRef.current.innerHTML = '';
      qrCode.current.append(qrRef.current);
      setQrContent(design.data || '');
    }
  }, []);

  // Update QR Code on changes
  useEffect(() => {
    if (!qrCode.current) return;

    const qrData = buildQRContent(
      activeTab,
      data,
      decodedContent,
      restaurantName,
      menuItems
    );

    const options: Partial<Options> = {
      ...design,
      data: qrData,
      image: logoFile || undefined,
      dotsOptions: {
        ...design.dotsOptions,
        color: useGradient ? undefined : design.dotsOptions?.color,
        gradient: useGradient
          ? {
              type: 'linear',
              rotation: 0,
              colorStops: [
                { offset: 0, color: gradientColors.start },
                { offset: 1, color: gradientColors.end }
              ]
            }
          : undefined
      },
      cornersSquareOptions: {
        ...design.cornersSquareOptions,
        color: separateEyeColor
          ? (design.cornersSquareOptions?.color as any)
          : useGradient
          ? gradientColors.start
          : (design.dotsOptions?.color as any)
      },
      cornersDotOptions: {
        ...design.cornersDotOptions,
        color: separateEyeColor
          ? (design.cornersDotOptions?.color as any)
          : useGradient
          ? gradientColors.start
          : (design.dotsOptions?.color as any)
      }
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
  }, [
    data,
    activeTab,
    design,
    useGradient,
    gradientColors,
    separateEyeColor,
    logoFile,
    decodedContent,
    currentMenuItem,
    restaurantName,
    menuItems
  ]);

  // QR image scan upload
  const handleQRImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const content = await scanQRCode(file);
      setDecodedContent(content);
      setQrContent(content);
    } catch {
      alert('Không thể đọc mã QR từ ảnh này. Vui lòng thử ảnh khác.');
    } finally {
      setIsScanning(false);
    }
  };

  // Menu image upload & item management
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
      setMenuItems((prev) => [...prev, currentMenuItem]);
      setCurrentMenuItem(null);
      alert('Đã thêm món ăn vào menu!');
    } else {
      alert('Vui lòng nhập đầy đủ title và mô tả!');
    }
  };

  const handleDeleteMenuItem = (id: string) => {
    setMenuItems((prev) => prev.filter((item) => item.id !== id));
    if (currentMenuItem?.id === id) {
      setCurrentMenuItem(null);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setLogoFile(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Save to history
  const handleSaveToHistory = () => {
    let menuData = null;
    const qrData = buildQRContent(
      activeTab,
      data,
      decodedContent,
      restaurantName,
      menuItems
    );

    if (activeTab === 'menu' && restaurantName && menuItems.length > 0) {
      menuData = {
        restaurantName,
        items: menuItems
      };
    }

    if (qrData && qrData !== 'https://toolxprint.com' && qrData !== 'Hello') {
      saveToHistory(qrData, activeTab, menuData || undefined);
      setHistoryRefreshTrigger((prev) => prev + 1);
      alert('Đã lưu vào lịch sử QR!');
    } else {
      alert('Vui lòng nhập nội dung QR trước khi lưu.');
    }
  };

  // Restore from history
  const handleHistorySelect = useCallback(
    (item: any) => {
      setQrContent(item.content);
      setDecodedContent(item.content);

      if (item.type === 'menu' && item.menuData) {
        setRestaurantName(item.menuData.restaurantName);
        setMenuItems(item.menuData.items);
        setCurrentMenuItem(null);
        setActiveTab('menu');
        alert('Đã khôi phục menu từ lịch sử!');
        return;
      }

      switch (item.type) {
        case 'decode':
          setActiveTab('decode');
          break;
        case 'url':
          setActiveTab('url');
          setData((prev) => ({ ...prev, url: item.content }));
          break;
        case 'text':
          setActiveTab('text');
          setData((prev) => ({ ...prev, text: item.content }));
          break;
        case 'wifi':
          setActiveTab('wifi');
          break;
        case 'google':
          setActiveTab('google');
          setData((prev) => ({ ...prev, google: item.content }));
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
    },
    [setData]
  );

  // Download
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

  return {
    activeTab,
    setActiveTab,
    qrContent,
    data,
    setData,
    design,
    setDesign,
    useGradient,
    setUseGradient,
    gradientColors,
    setGradientColors,
    separateEyeColor,
    setSeparateEyeColor,
    logoFile,
    setLogoFile,
    isScanning,
    decodedContent,
    restaurantName,
    setRestaurantName,
    menuItems,
    setMenuItems,
    currentMenuItem,
    setCurrentMenuItem,
    qrRef,
    qrImageInputRef,
    menuImageInputRef,
    historyRefreshTrigger,
    handleQRImageUpload,
    handleMenuImageUpload,
    handleAddMenuItem,
    handleDeleteMenuItem,
    handleLogoUpload,
    handleSaveToHistory,
    handleHistorySelect,
    handleDownload
  };
}
