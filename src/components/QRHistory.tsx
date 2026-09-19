import React, { useState, useEffect } from 'react';
import { History, Trash2, Clock, ExternalLink, X } from 'lucide-react';

// QR History-specific interfaces (not related to API data)
interface MenuItem {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
}

interface QRHistoryItem {
  id: string;
  content: string;
  type: string;
  timestamp: string;
  menuData?: { // Menu-specific data structure
    restaurantName: string;
    items: MenuItem[];
  };
}

interface QRHistoryProps {
  onSelectHistory?: (item: QRHistoryItem) => void;
  className?: string;
  refreshTrigger?: number; // Add trigger to force refresh
}

export const QRHistory: React.FC<QRHistoryProps> = ({ onSelectHistory, className = '', refreshTrigger }) => {
  const [history, setHistory] = useState<QRHistoryItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadHistory();
  }, [refreshTrigger]); // Reload when trigger changes

  const loadHistory = () => {
    try {
      const savedHistory = localStorage.getItem('qrHistory');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error('Lỗi khi tải lịch sử QR:', error);
    }
  };

  const saveHistory = (newHistory: QRHistoryItem[]) => {
    try {
      localStorage.setItem('qrHistory', JSON.stringify(newHistory));
      setHistory(newHistory);
    } catch (error) {
      console.error('Lỗi khi lưu lịch sử QR:', error);
    }
  };

  const clearHistory = () => {
    if (window.confirm('Bạn có chắc muốn xóa toàn bộ lịch sử QR?')) {
      saveHistory([]);
    }
  };

  const deleteItem = (id: string) => {
    const newHistory = history.filter(item => item.id !== id);
    saveHistory(newHistory);
  };

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'url': 'URL',
      'text': 'Văn bản',
      'wifi': 'WiFi',
      'email': 'Email',
      'sms': 'SMS',
      'whatsapp': 'WhatsApp',
      'telegram': 'Telegram',
      'vcard': 'VCard',
      'location': 'Vị trí',
      'event': 'Sự kiện',
      'crypto': 'Crypto',
      'paypal': 'PayPal',
      'google': 'Google',
      'decode': 'Giải mã QR'
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'url': 'bg-blue-100 text-blue-700',
      'text': 'bg-gray-100 text-gray-700',
      'wifi': 'bg-green-100 text-green-700',
      'email': 'bg-purple-100 text-purple-700',
      'sms': 'bg-orange-100 text-orange-700',
      'whatsapp': 'bg-emerald-100 text-emerald-700',
      'telegram': 'bg-sky-100 text-sky-700',
      'vcard': 'bg-indigo-100 text-indigo-700',
      'location': 'bg-red-100 text-red-700',
      'event': 'bg-amber-100 text-amber-700',
      'crypto': 'bg-yellow-100 text-yellow-700',
      'paypal': 'bg-pink-100 text-pink-700',
      'google': 'bg-cyan-100 text-cyan-700',
      'decode': 'bg-teal-100 text-teal-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const filteredHistory = history.filter(item =>
    item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getTypeLabel(item.type).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (item: QRHistoryItem) => {
    if (onSelectHistory) {
      onSelectHistory(item);
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Nút mở lịch sử */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <History size={14} />
        Lịch sử QR
        <span className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
          {history.length}
        </span>
      </button>

      {/* Modal lịch sử */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <History size={18} className="text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-800">Lịch sử tạo QR</h2>
                <span className="text-sm text-slate-400">({history.length} mục)</span>
              </div>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={12} />
                    Xóa tất cả
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="p-4 border-b">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm nội dung hoặc loại QR..."
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Danh sách lịch sử */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 200px)' }}>
              {filteredHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <History size={48} className="mb-3 opacity-50" />
                  <p className="text-sm">
                    {searchTerm ? 'Không tìm thấy kết quả' : 'Chưa có lịch sử QR nào'}
                  </p>
                  <p className="text-xs mt-1">
                    {searchTerm ? 'Thử tìm kiếm với từ khóa khác' : 'Tạo QR đầu tiên của bạn ngay!'}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(item.type)}`}>
                              {getTypeLabel(item.type)}
                            </span>
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                              <Clock size={10} />
                              {item.timestamp}
                            </div>
                          </div>
                          <p className="text-sm text-slate-700 break-all line-clamp-2">
                            {item.content}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleSelect(item)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Sử dụng lại QR này"
                          >
                            <ExternalLink size={14} />
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa mục này"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Hook để quản lý lịch sử QR
export const useQRHistory = () => {
  const saveToHistory = (content: string, type: string, menuData?: { restaurantName: string; items: MenuItem[] }) => {
    try {
      const savedHistory = localStorage.getItem('qrHistory');
      const history: QRHistoryItem[] = savedHistory ? JSON.parse(savedHistory) : [];
      
      const newEntry: QRHistoryItem = {
        id: Date.now().toString(),
        content,
        type,
        timestamp: new Date().toLocaleString('vi-VN'),
        menuData // Thêm menu data nếu có
      };
      
      // Kiểm tra trùng lặp
      const isDuplicate = history.some(item => 
        item.content === content && item.type === type
      );
      
      if (!isDuplicate) {
        const updatedHistory = [newEntry, ...history.slice(0, 49)]; // Giữ tối đa 50 mục
        localStorage.setItem('qrHistory', JSON.stringify(updatedHistory));
      }
    } catch (error) {
      console.error('Lỗi khi lưu vào lịch sử QR:', error);
    }
  };

  const clearHistory = () => {
    try {
      localStorage.removeItem('qrHistory');
    } catch (error) {
      console.error('Lỗi khi xóa lịch sử QR:', error);
    }
  };

  return { saveToHistory, clearHistory };
};

export default QRHistory;
