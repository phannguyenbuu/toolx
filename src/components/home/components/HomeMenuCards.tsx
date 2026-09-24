import React, { useState, useRef, useEffect } from 'react';
import {
  FileSpreadsheet,
  FileType,
  Printer,
  Box,
  LayoutGrid,
  Calculator,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { MenuCard } from '../types';

interface HomeMenuCardsProps {
  onNavigate: (pageId: string) => void;
}

const MENU_CARDS: MenuCard[] = [
  {
    id: 'label-designer',
    title: 'Biến Đổi Dữ Liệu',
    description: 'Thiết kế tem nhãn với dữ liệu từ Excel',
    icon: FileSpreadsheet,
    gradient: 'from-indigo-500 to-purple-600'
  },
  {
    id: 'pdf-processor',
    title: 'Thông Tin PDF',
    description: 'Kiểm tra trang màu, trang trắng đen, khổ PDF',
    icon: FileType,
    gradient: 'from-purple-500 to-pink-600'
  },
  {
    id: 'render-pdf',
    title: 'Render PDF',
    description: 'Kết xuất file PDF sang ảnh độ nét cao',
    icon: Printer,
    gradient: 'from-blue-500 to-cyan-600'
  },
  {
    id: 'die-cutting',
    title: 'Tạo Khuôn Hộp',
    description: 'Thiết kế mẫu hộp và xuất khuôn bế',
    icon: Box,
    gradient: 'from-pink-500 to-rose-600'
  },
  {
    id: 'imposition-advanced',
    title: 'Bình Tem',
    description: 'Sắp xếp layout in offset',
    icon: LayoutGrid,
    gradient: 'from-cyan-500 to-blue-600'
  },
  {
    id: 'price-calc-offset',
    title: 'Tính Giá In',
    description: 'Tính toán chi phí in ấn',
    icon: Calculator,
    gradient: 'from-amber-500 to-red-500'
  },
  {
    id: 'customers',
    title: 'Kinh Doanh',
    description: 'Quản lý khách hàng, báo giá',
    icon: Briefcase,
    gradient: 'from-emerald-500 to-teal-500'
  }
];

export const HomeMenuCards: React.FC<HomeMenuCardsProps> = ({ onNavigate }) => {
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

  const itemsPerView = isMobile ? 1 : 5;
  const maxIndex = Math.max(0, MENU_CARDS.length - itemsPerView);
  const gapSize = isMobile ? 12 : 16;

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, maxIndex]);

  const handlePrev = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  const handleNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  return (
    <div className="py-4 px-4">
      <div className="max-w-7xl mx-auto relative">
        {maxIndex > 0 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center text-slate-500 hover:text-slate-800 hover:shadow-md transition-all cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center text-slate-500 hover:text-slate-800 hover:shadow-md transition-all cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}

        <div className="overflow-hidden px-1" ref={carouselRef}>
          <div
            className="flex items-stretch transition-transform duration-500 ease-out"
            style={{
              gap: `${gapSize}px`,
              transform:
                maxIndex > 0
                  ? `translateX(calc(-${currentIndex * (100 / itemsPerView)}% - ${
                      (currentIndex * gapSize) / itemsPerView
                    }px))`
                  : 'none'
            }}
          >
            {MENU_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.id}
                  className="flex-shrink-0"
                  style={{
                    width: `calc((100% - ${(itemsPerView - 1) * gapSize}px) / ${itemsPerView})`
                  }}
                >
                  <div
                    onClick={() => onNavigate(card.id)}
                    className="bg-white rounded-xl cursor-pointer group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md h-full min-h-24 flex items-start gap-3 px-4 py-3 border border-slate-100"
                  >
                    <div
                      className={`w-12 h-12 bg-gradient-to-br ${card.gradient} rounded-xl flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className="w-6 h-6 text-white" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold text-slate-800 whitespace-normal break-words leading-snug">
                        {card.title}
                      </h3>
                      <p className="text-base text-slate-400 whitespace-normal break-words leading-snug hidden md:block">
                        {card.description}
                      </p>
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
  );
};
