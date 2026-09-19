import React, { useState, useRef, useEffect } from 'react';
import { List, X, Image as ImageIcon, Search, ChevronUp, MapPin, Navigation } from 'lucide-react';

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

interface AddressSettings {
  currentAddress: string;
  savedAddresses: { id: string; name: string; address: string; lat: number; lon: number }[];
}

export const MenuView: React.FC<{ menuId: string | null }> = ({ menuId }) => {
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<MenuItem | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [addressSettings, setAddressSettings] = useState<AddressSettings>({
    currentAddress: '',
    savedAddresses: []
  });
  const [showAddressSettings, setShowAddressSettings] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  useEffect(() => {
    // Ẩn header của trang chính khi vào menu
    const topNav = document.querySelector('nav');
    if (topNav) {
      (topNav as HTMLElement).style.display = 'none';
    }
    
    // Ẩn robot assistant - tìm theo class và style
    const robotSelectors = [
      '.select-none', // Class chính của robot
      '[style*="position: fixed"]', // Robot có position fixed
      '[style*="bottom:"]', // Robot có bottom positioning
      '[style*="right:"]', // Robot có right positioning
      '[style*="z-index:"]', // Robot có z-index cao
      '[class*="robot"]',
      '[class*="assistant"]',
      '[class*="ai-robot"]',
      '[class*="ai-assistant"]',
      '[class*="chatbot"]'
    ];
    
    robotSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const el = element as HTMLElement;
        // Kiểm tra xem có phải robot không (position fixed, có bottom/right)
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' && 
            (style.bottom !== 'auto' || style.right !== 'auto')) {
          el.style.display = 'none';
        }
      });
    });

    return () => {
      // Hiện lại header khi rời trang
      const topNav = document.querySelector('nav');
      if (topNav) {
        (topNav as HTMLElement).style.display = '';
      }
      
      // Hiện lại robot assistant
      robotSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          (element as HTMLElement).style.display = '';
        });
      });
    };
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
          
          // Update current address in settings
          saveAddressSettings({
            ...addressSettings,
            currentAddress: address
          });

          alert('Đã lấy vị trí hiện tại: ' + address);
        } catch (error) {
          console.error('Error getting address:', error);
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

  useEffect(() => {
    if (menuId) {
      const data = localStorage.getItem(`menu_${menuId}`);
      if (data) {
        try {
          setMenuData(JSON.parse(data));
        } catch (e) {
          console.error('Error parsing menu data:', e);
        }
      }
      setLoading(false);
    }
  }, [menuId]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setIsMenuOpen(false);
    }
  };

  const openZoom = (item: MenuItem) => {
    setSelectedImage(item);
    setZoomLevel(1);
  };

  const closeZoom = () => {
    setSelectedImage(null);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Đang tải menu...</p>
        </div>
      </div>
    );
  }

  if (!menuData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Không tìm thấy menu</h1>
          <p className="text-gray-400">Menu có thể đã hết hạn hoặc bị xóa</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white font-sans pb-20">
      
      {/* --- HEADER (Cố định) --- */}
      <header className="sticky top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gray-800/95 backdrop-blur-md shadow-lg z-40 border-b border-gray-700">
        <div className="flex items-center gap-2" onClick={scrollToTop}>
          <div className="bg-orange-500 p-1.5 rounded-lg">
            <ImageIcon size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-100 leading-tight">{menuData.restaurantName}</h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Menu Danh Sách</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowAddressSettings(!showAddressSettings)}
            className="flex items-center gap-1 px-2 py-1.5 bg-blue-600 rounded-full hover:bg-blue-700 active:scale-95 transition-all border border-blue-500"
          >
            <MapPin size={16} />
            <span className="text-xs font-medium">Địa chỉ</span>
          </button>
          
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 rounded-full hover:bg-gray-600 active:scale-95 transition-all border border-gray-600"
          >
            <span className="text-xs font-medium">Mục lục</span>
            <List size={18} />
          </button>
        </div>
      </header>

      {/* --- MAIN CONTENT (LIST VIEW) --- */}
      <main className="flex-1 w-full max-w-lg mx-auto p-4 space-y-8">
        {menuData.items.map((item) => (
          <article 
            key={item.id} 
            id={item.id} 
            className="flex flex-col gap-3 scroll-mt-20"
          >
            {/* Header của từng phần */}
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] font-bold uppercase rounded border border-orange-500/30">
                {item.category}
              </span>
              <h2 className="text-lg font-bold text-gray-100">{item.title}</h2>
            </div>

            {/* Ảnh (Bấm để zoom) */}
            <div 
              onClick={() => openZoom(item)}
              className="relative w-full aspect-[4/5] bg-gray-800 rounded-xl overflow-hidden shadow-2xl border border-gray-700 cursor-zoom-in group"
            >
              {item.image ? (
                <>
                  <img 
                    src={item.image} 
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  
                  {/* Overlay hướng dẫn bấm */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Search size={14} className="text-white" />
                      <span className="text-xs text-white">Chạm để phóng to</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-700">
                  <svg className="w-16 h-16 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-400 text-sm mt-2">Không có ảnh</p>
                </div>
              )}
            </div>

            {/* Mô tả */}
            <p className="text-sm text-gray-400 italic leading-relaxed pl-1 border-l-2 border-gray-700">
              {item.description}
            </p>
            
            {/* Divider */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-700 to-transparent mt-4" />
          </article>
        ))}

        <div className="text-center py-8 text-gray-500 text-xs">
          <p>Đã hiển thị hết danh sách menu</p>
          <button onClick={scrollToTop} className="mt-4 inline-flex items-center gap-1 text-orange-400 hover:text-orange-300">
            <ChevronUp size={14} /> Về đầu trang
          </button>
        </div>
      </main>

      {/* --- MỤC LỤC (DRAWER) --- */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setIsMenuOpen(false)}></div>
          
          <div className="relative bg-gray-800 w-full sm:max-w-md sm:mx-auto rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col animate-slide-up border-t border-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800 rounded-t-2xl sticky top-0 z-10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <List size={20} className="text-orange-500"/> Đi đến trang...
              </h3>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-gray-700 rounded-full hover:bg-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-2 space-y-1">
              {menuData.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-700 active:bg-gray-600 transition-colors text-left group"
                >
                  {item.image ? (
                    <img src={item.image} alt="" className="w-12 h-12 rounded bg-gray-900 object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <div className="w-12 h-12 rounded bg-gray-900 flex items-center justify-center">
                      <ImageIcon size={16} className="text-gray-500" />
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-bold text-orange-400 uppercase">{item.category}</span>
                    <h4 className="text-sm font-medium text-gray-200">{item.title}</h4>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- THIẾT LẬP ĐỊA CHỈ (DRAWER) --- */}
      {showAddressSettings && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setShowAddressSettings(false)}></div>
          
          <div className="relative bg-gray-800 w-full sm:max-w-md sm:mx-auto rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col animate-slide-up border-t border-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800 rounded-t-2xl sticky top-0 z-10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MapPin size={20} className="text-blue-500"/> Thiết lập địa chỉ
              </h3>
              <button onClick={() => setShowAddressSettings(false)} className="p-2 bg-gray-700 rounded-full hover:bg-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Nút lấy vị trí hiện tại */}
              <button
                onClick={getCurrentLocation}
                disabled={isGettingLocation}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Navigation size={18} />
                {isGettingLocation ? 'Đang lấy vị trí...' : 'Lấy vị trí hiện tại'}
              </button>

              {/* Địa chỉ hiện tại */}
              {addressSettings.currentAddress && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-blue-800">Địa chỉ hiện tại:</p>
                      <p className="text-sm text-blue-700 break-words">{addressSettings.currentAddress}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Danh sách địa chỉ đã lưu */}
              {addressSettings.savedAddresses.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-2">Địa chỉ đã lưu:</p>
                  <div className="space-y-2">
                    {addressSettings.savedAddresses.map(addr => (
                      <div key={addr.id} className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                        <div className="flex items-start gap-2">
                          <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-200">{addr.name}</p>
                            <p className="text-xs text-gray-400 break-words">{addr.address}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ghi chú */}
              <div className="p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                <p className="text-xs text-gray-400">
                  💡 Địa chỉ được chia sẻ giữa trang chủ và menu. Bạn có thể lấy vị trí hiện tại hoặc sử dụng địa chỉ đã lưu từ trang QR.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ZOOM MODAL (FULL SCREEN) --- */}
      {selectedImage && selectedImage.image && (
        <div className="fixed inset-0 z-[60] bg-black animate-fade-in flex flex-col">
          {/* Zoom Header Controls */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
             <div className="pointer-events-auto">
                <h3 className="text-white font-bold text-sm shadow-black drop-shadow-md">{selectedImage.title}</h3>
                <p className="text-gray-300 text-xs shadow-black drop-shadow-md">{selectedImage.category}</p>
             </div>
             <button 
              onClick={closeZoom}
              className="pointer-events-auto p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30"
            >
              <X size={24} />
            </button>
          </div>

          {/* Zoomable Image Container */}
          <div className="flex-1 w-full h-full overflow-auto flex items-center justify-center touch-pan-x touch-pan-y bg-black">
             <div 
                className="transition-all duration-200 ease-out origin-top-left flex items-center justify-center min-h-full min-w-full p-4 box-border"
                style={{ 
                  width: `${zoomLevel * 100}%`,
                  height: `${zoomLevel * 100}%` 
                }}
             >
                <img 
                  src={selectedImage.image} 
                  alt="Zoom view"
                  className="w-full h-full object-contain"
                />
             </div>
          </div>

          {/* Zoom Slider Controls */}
          <div className="absolute bottom-8 left-0 right-0 px-8 flex flex-col items-center gap-2 z-10 pb-safe">
            <div className="bg-gray-900/80 backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-4 w-full max-w-sm border border-gray-700 shadow-2xl">
              <span className="text-xs font-bold text-gray-400 min-w-[20px]">1x</span>
              <input 
                type="range" 
                min="1" 
                max="3" 
                step="0.1" 
                value={zoomLevel}
                onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <span className="text-xs font-bold text-orange-400 min-w-[20px]">3x</span>
            </div>
            <p className="text-[10px] text-gray-500 font-medium">Kéo thanh trượt để phóng to</p>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};
