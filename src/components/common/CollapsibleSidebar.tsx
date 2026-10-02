import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface CollapsibleSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  /** Độ rộng sidebar khi mở, ví dụ: '384px', '700px', '45vw' */
  width?: string;
  /** Vị trí của nút toggle: 'left' (sidebar bên phải) | 'right' (sidebar bên trái) */
  toggleSide?: 'left' | 'right';
  children: React.ReactNode;
  className?: string;
}

/**
 * CollapsibleSidebar — wrapper dùng chung cho sidebar có thể thu gọn/mở rộng.
 * Tự xử lý nút toggle nổi cạnh sidebar và animation collapse.
 *
 * Dùng cho: ImpositionPaperSidebar (advanced), ImpositionHistoryPanel (basic),
 * và bất kỳ sidebar nào có cùng pattern.
 */
export const CollapsibleSidebar: React.FC<CollapsibleSidebarProps> = ({
  isCollapsed,
  onToggle,
  width = '384px',
  toggleSide = 'left',
  children,
  className = '',
}) => {
  const isLeftToggle = toggleSide === 'left';

  return (
    <>
      {/* Nút toggle nổi trên cạnh sidebar */}
      <button
        type="button"
        onClick={onToggle}
        style={
          isCollapsed
            ? { [isLeftToggle ? 'left' : 'right']: 0 }
            : { [isLeftToggle ? 'left' : 'right']: width }
        }
        className={`fixed z-50 top-1/2 -translate-y-1/2 transition-all duration-200 ease-in-out w-5 hover:w-7 h-14 bg-white/95 backdrop-blur-sm border border-slate-200 hover:border-slate-300 ${
          isLeftToggle ? 'border-l-0 rounded-r-xl' : 'border-r-0 rounded-l-xl'
        } shadow-xs hover:shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer group select-none`}
        title={isCollapsed ? 'Mở rộng' : 'Thu gọn'}
      >
        {isLeftToggle ? (
          isCollapsed ? (
            <ChevronRight size={16} strokeWidth={1.75} className="transition-transform group-hover:scale-105" />
          ) : (
            <ChevronLeft size={16} strokeWidth={1.75} className="transition-transform group-hover:scale-105" />
          )
        ) : (
          isCollapsed ? (
            <ChevronLeft size={16} strokeWidth={1.75} className="transition-transform group-hover:scale-105" />
          ) : (
            <ChevronRight size={16} strokeWidth={1.75} className="transition-transform group-hover:scale-105" />
          )
        )}
      </button>

      {/* Sidebar container */}
      <aside
        style={{ width: isCollapsed ? 0 : width, maxWidth: '95vw' }}
        className={`flex-shrink-0 h-full flex flex-col z-40 shadow-xl transition-all duration-300 ease-in-out relative overflow-hidden bg-white border-slate-200 ${
          isCollapsed
            ? 'min-w-0 border-l-0 opacity-0 pointer-events-none'
            : 'border-l opacity-100'
        } ${className}`}
      >
        <div style={{ width }} className="max-w-[95vw] h-full flex flex-col overflow-y-auto flex-shrink-0">
          {children}
        </div>
      </aside>
    </>
  );
};
