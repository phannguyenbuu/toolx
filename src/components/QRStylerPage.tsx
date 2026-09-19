import React, { useState, useEffect, useRef } from 'react';
import QRCodeStyling, { Options, DotType, CornerSquareType, CornerDotType } from 'qr-code-styling';
import { 
  Download, Link, Type, Wifi, MapPin, Mail, Phone, 
  CreditCard, Calendar, Image, Palette, Square, Circle,
  ChevronDown, RefreshCw
} from 'lucide-react';

type TabType = 'url' | 'text' | 'wifi' | 'email' | 'phone' | 'vcard' | 'location' | 'event';

interface WifiData { ssid: string; password: string; type: 'WPA' | 'WEP' | 'nopass'; }
interface EmailData { to: string; subject: string; body: string; }
interface VCardData { fn: string; phone: string; email: string; org: string; title: string; }
interface LocationData { lat: string; lon: string; }
interface EventData { title: string; location: string; start: string; end: string; desc: string; }

const dotTypes: DotType[] = ['square', 'dots', 'rounded', 'extra-rounded', 'classy', 'classy-rounded'];
const cornerSquareTypes: CornerSquareType[] = ['square', 'dot', 'extra-rounded'];
const cornerDotTypes: CornerDotType[] = ['square', 'dot'];

export const QRStylerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('url');
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCode = useRef<QRCodeStyling | null>(null);

  const [data, setData] = useState({
    url: 'https://hethongin.com',
    text: '',
    wifi: { ssid: '', password: '', type: 'WPA' } as WifiData,
    email: { to: '', subject: '', body: '' } as EmailData,
    phone: '',
    vcard: { fn: '', phone: '', email: '', org: '', title: '' } as VCardData,
    location: { lat: '', lon: '' } as LocationData,
    event: { title: '', location: '', start: '', end: '', desc: '' } as EventData,
  });

  const [design, setDesign] = useState<Options>({
    width: 280,
    height: 280,
    data: 'https://hethongin.com',
    image: '',
    dotsOptions: { type: 'rounded' as DotType, color: '#000000' },
    backgroundOptions: { color: '#ffffff' },
    cornersSquareOptions: { type: 'extra-rounded' as CornerSquareType, color: '#000000' },
    cornersDotOptions: { type: 'dot' as CornerDotType, color: '#000000' },
    imageOptions: { hideBackgroundDots: true, imageSize: 0.4, margin: 5 },
  });

  const [useGradient, setUseGradient] = useState(false);
  const [gradientColors, setGradientColors] = useState({ start: '#000000', end: '#3b82f6' });
  const [logoFile, setLogoFile] = useState<string>('');

  useEffect(() => {
    qrCode.current = new QRCodeStyling(design);
    if (qrRef.current) {
      qrRef.current.innerHTML = '';
      qrCode.current.append(qrRef.current);
    }
  }, []);

  useEffect(() => {
    if (!qrCode.current) return;

    let qrData = 'https://hethongin.com';
    switch (activeTab) {
      case 'url': qrData = data.url || 'https://hethongin.com'; break;
      case 'text': qrData = data.text || 'Hello'; break;
      case 'wifi': 
        qrData = `WIFI:T:${data.wifi.type};S:${data.wifi.ssid};P:${data.wifi.password};;`; 
        break;
      case 'email': 
        qrData = `mailto:${data.email.to}?subject=${encodeURIComponent(data.email.subject)}&body=${encodeURIComponent(data.email.body)}`; 
        break;
      case 'phone': qrData = `tel:${data.phone}`; break;
      case 'vcard':
        qrData = `BEGIN:VCARD\nVERSION:3.0\nFN:${data.vcard.fn}\nORG:${data.vcard.org}\nTITLE:${data.vcard.title}\nTEL:${data.vcard.phone}\nEMAIL:${data.vcard.email}\nEND:VCARD`;
        break;
      case 'location':
        qrData = data.location.lat && data.location.lon 
          ? `https://www.google.com/maps?q=${data.location.lat},${data.location.lon}`
          : 'https://maps.google.com';
        break;
      case 'event':
        qrData = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${data.event.title}\nDTSTART:${(data.event.start || '').replace(/[-:T]/g, '')}00\nDTEND:${(data.event.end || '').replace(/[-:T]/g, '')}00\nLOCATION:${data.event.location}\nDESCRIPTION:${data.event.desc}\nEND:VEVENT\nEND:VCALENDAR`;
        break;
    }

    const options: Partial<Options> = {
      ...design,
      data: qrData,
      image: logoFile || undefined,
      dotsOptions: {
        ...design.dotsOptions,
        color: useGradient ? undefined : design.dotsOptions?.color,
        gradient: useGradient ? {
          type: 'linear',
          rotation: 0,
          colorStops: [{ offset: 0, color: gradientColors.start }, { offset: 1, color: gradientColors.end }]
        } : undefined
      }
    };

    qrCode.current.update(options);
  }, [data, activeTab, design, useGradient, gradientColors, logoFile]);

  const handleDownload = (ext: 'png' | 'svg' | 'jpeg') => {
    qrCode.current?.download({ name: 'qr-code', extension: ext });
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
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'phone', label: 'Phone', icon: Phone },
    { id: 'vcard', label: 'VCard', icon: CreditCard },
    { id: 'location', label: 'Location', icon: MapPin },
    { id: 'event', label: 'Event', icon: Calendar },
  ];

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-6 text-center">
          Tạo QR Code Đẹp
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Content & Style */}
          <div className="space-y-4">
            {/* Content Type Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Loại nội dung</h3>
              <div className="grid grid-cols-4 gap-2">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex flex-col items-center p-2 rounded-lg text-xs transition-all ${
                        activeTab === tab.id 
                          ? 'bg-indigo-100 text-indigo-700 border border-indigo-300' 
                          : 'bg-slate-50 text-slate-500 border border-transparent hover:bg-slate-100'
                      }`}
                    >
                      <Icon size={18} className="mb-1" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content Input */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Nội dung</h3>
              {activeTab === 'url' && (
                <input
                  type="url"
                  value={data.url}
                  onChange={(e) => setData({ ...data, url: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              )}
              {activeTab === 'text' && (
                <textarea
                  value={data.text}
                  onChange={(e) => setData({ ...data, text: e.target.value })}
                  placeholder="Nhập văn bản..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              )}
              {activeTab === 'wifi' && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={data.wifi.ssid}
                    onChange={(e) => setData({ ...data, wifi: { ...data.wifi, ssid: e.target.value }})}
                    placeholder="Tên WiFi (SSID)"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    value={data.wifi.password}
                    onChange={(e) => setData({ ...data, wifi: { ...data.wifi, password: e.target.value }})}
                    placeholder="Mật khẩu"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <select
                    value={data.wifi.type}
                    onChange={(e) => setData({ ...data, wifi: { ...data.wifi, type: e.target.value as any }})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="WPA">WPA/WPA2</option>
                    <option value="WEP">WEP</option>
                    <option value="nopass">Không mật khẩu</option>
                  </select>
                </div>
              )}
              {activeTab === 'email' && (
                <div className="space-y-2">
                  <input type="email" value={data.email.to} onChange={(e) => setData({ ...data, email: { ...data.email, to: e.target.value }})} placeholder="Email" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  <input type="text" value={data.email.subject} onChange={(e) => setData({ ...data, email: { ...data.email, subject: e.target.value }})} placeholder="Tiêu đề" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  <textarea value={data.email.body} onChange={(e) => setData({ ...data, email: { ...data.email, body: e.target.value }})} placeholder="Nội dung" rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
              )}
              {activeTab === 'phone' && (
                <input type="tel" value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} placeholder="+84 xxx xxx xxx" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              )}
              {activeTab === 'vcard' && (
                <div className="space-y-2">
                  <input type="text" value={data.vcard.fn} onChange={(e) => setData({ ...data, vcard: { ...data.vcard, fn: e.target.value }})} placeholder="Họ tên" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  <input type="tel" value={data.vcard.phone} onChange={(e) => setData({ ...data, vcard: { ...data.vcard, phone: e.target.value }})} placeholder="Điện thoại" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  <input type="email" value={data.vcard.email} onChange={(e) => setData({ ...data, vcard: { ...data.vcard, email: e.target.value }})} placeholder="Email" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  <input type="text" value={data.vcard.org} onChange={(e) => setData({ ...data, vcard: { ...data.vcard, org: e.target.value }})} placeholder="Công ty" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  <input type="text" value={data.vcard.title} onChange={(e) => setData({ ...data, vcard: { ...data.vcard, title: e.target.value }})} placeholder="Chức vụ" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
              )}
              {activeTab === 'location' && (
                <div className="space-y-2">
                  <input type="text" value={data.location.lat} onChange={(e) => setData({ ...data, location: { ...data.location, lat: e.target.value }})} placeholder="Vĩ độ (latitude)" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  <input type="text" value={data.location.lon} onChange={(e) => setData({ ...data, location: { ...data.location, lon: e.target.value }})} placeholder="Kinh độ (longitude)" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
              )}
              {activeTab === 'event' && (
                <div className="space-y-2">
                  <input type="text" value={data.event.title} onChange={(e) => setData({ ...data, event: { ...data.event, title: e.target.value }})} placeholder="Tên sự kiện" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  <input type="text" value={data.event.location} onChange={(e) => setData({ ...data, event: { ...data.event, location: e.target.value }})} placeholder="Địa điểm" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="datetime-local" value={data.event.start} onChange={(e) => setData({ ...data, event: { ...data.event, start: e.target.value }})} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                    <input type="datetime-local" value={data.event.end} onChange={(e) => setData({ ...data, event: { ...data.event, end: e.target.value }})} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <textarea value={data.event.desc} onChange={(e) => setData({ ...data, event: { ...data.event, desc: e.target.value }})} placeholder="Mô tả" rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
              )}
            </div>

            {/* Style Options */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Kiểu dáng</h3>
              
              {/* Dot Style */}
              <div className="mb-4">
                <label className="text-xs text-slate-500 mb-2 block">Kiểu điểm</label>
                <div className="grid grid-cols-6 gap-1">
                  {dotTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => setDesign({ ...design, dotsOptions: { ...design.dotsOptions, type }})}
                      className={`p-2 rounded text-xs border ${design.dotsOptions?.type === type ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}
                    >
                      {type.slice(0, 4)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Corner Square Style */}
              <div className="mb-4">
                <label className="text-xs text-slate-500 mb-2 block">Kiểu góc</label>
                <div className="grid grid-cols-3 gap-1">
                  {cornerSquareTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => setDesign({ ...design, cornersSquareOptions: { ...design.cornersSquareOptions, type }})}
                      className={`p-2 rounded text-xs border ${design.cornersSquareOptions?.type === type ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Màu QR</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={design.dotsOptions?.color || '#000000'}
                      onChange={(e) => setDesign({ ...design, dotsOptions: { ...design.dotsOptions, color: e.target.value }})}
                      className="w-8 h-8 rounded cursor-pointer border-0"
                    />
                    <span className="text-xs text-slate-500">{design.dotsOptions?.color}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Màu nền</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={design.backgroundOptions?.color || '#ffffff'}
                      onChange={(e) => setDesign({ ...design, backgroundOptions: { ...design.backgroundOptions, color: e.target.value }})}
                      className="w-8 h-8 rounded cursor-pointer border-0"
                    />
                    <span className="text-xs text-slate-500">{design.backgroundOptions?.color}</span>
                  </div>
                </div>
              </div>

              {/* Gradient Toggle */}
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useGradient}
                    onChange={(e) => setUseGradient(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-xs text-slate-600">Sử dụng gradient</span>
                </label>
                {useGradient && (
                  <div className="flex gap-2 mt-2">
                    <input type="color" value={gradientColors.start} onChange={(e) => setGradientColors({ ...gradientColors, start: e.target.value })} className="w-8 h-8 rounded cursor-pointer" />
                    <span className="text-xs text-slate-400 self-center">→</span>
                    <input type="color" value={gradientColors.end} onChange={(e) => setGradientColors({ ...gradientColors, end: e.target.value })} className="w-8 h-8 rounded cursor-pointer" />
                  </div>
                )}
              </div>

              {/* Logo Upload */}
              <div>
                <label className="text-xs text-slate-500 mb-2 block">Logo ở giữa</label>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="text-xs file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-indigo-50 file:text-indigo-700"
                  />
                  {logoFile && (
                    <button onClick={() => setLogoFile('')} className="text-xs text-red-500 hover:text-red-700">Xóa</button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Preview & Download */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Xem trước</h3>
              <div 
                ref={qrRef} 
                className="bg-white p-4 rounded-xl shadow-inner border border-slate-100"
              />
            </div>

            {/* Download Buttons */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Tải xuống</h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleDownload('png')}
                  className="flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  <Download size={16} />
                  PNG
                </button>
                <button
                  onClick={() => handleDownload('svg')}
                  className="flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  <Download size={16} />
                  SVG
                </button>
                <button
                  onClick={() => handleDownload('jpeg')}
                  className="flex items-center justify-center gap-2 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
                >
                  <Download size={16} />
                  JPEG
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRStylerPage;
