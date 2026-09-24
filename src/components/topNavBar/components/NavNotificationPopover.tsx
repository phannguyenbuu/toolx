import React from 'react';
import {
  Bell,
  History,
  Clock,
  User,
  Download,
  Plus,
  Edit3,
  Trash2,
  Users,
  Crown,
} from 'lucide-react';
import { ActivityNotification } from '../types';

interface NavNotificationPopoverProps {
  isOpen: boolean;
  onToggle: () => void;
  notifications: ActivityNotification[];
  onOpenAccountPage?: (tab?: string) => void;
  onClose: () => void;
}

const getNotifIcon = (type: string) => {
  switch (type) {
    case 'login':
      return <User size={14} className="text-green-600" />;
    case 'export':
      return <Download size={14} className="text-blue-600" />;
    case 'create':
      return <Plus size={14} className="text-purple-600" />;
    case 'edit':
      return <Edit3 size={14} className="text-yellow-600" />;
    case 'delete':
      return <Trash2 size={14} className="text-red-600" />;
    case 'share':
      return <Users size={14} className="text-orange-600" />;
    case 'upgrade':
      return <Crown size={14} className="text-pink-600" />;
    default:
      return <History size={14} className="text-gray-600" />;
  }
};

const getNotifBg = (type: string) => {
  switch (type) {
    case 'login':
      return 'bg-green-100';
    case 'export':
      return 'bg-blue-100';
    case 'create':
      return 'bg-purple-100';
    case 'edit':
      return 'bg-yellow-100';
    case 'delete':
      return 'bg-red-100';
    case 'share':
      return 'bg-orange-100';
    case 'upgrade':
      return 'bg-pink-100';
    default:
      return 'bg-gray-100';
  }
};

const formatNotifDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString('vi-VN');
};

export const NavNotificationPopover: React.FC<NavNotificationPopoverProps> = ({
  isOpen,
  onToggle,
  notifications,
  onOpenAccountPage,
  onClose,
}) => {
  return (
    <div className="relative w-full flex justify-center">
      <button
        onClick={onToggle}
        title="Thông báo hoạt động"
        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all relative ${
          isOpen
            ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/60'
        }`}
      >
        <Bell size={18} />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </button>

      {/* Notification Popover Toast */}
      {isOpen && (
        <div className="fixed left-[84px] bottom-4 w-84 rounded-2xl shadow-2xl bg-white border border-gray-100 z-50 max-h-96 overflow-hidden animate-fadeIn">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <History size={16} className="text-indigo-500" />
              Lịch sử hoạt động
            </h3>
            <button
              onClick={() => {
                onOpenAccountPage?.('activity');
                onClose();
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              Xem tất cả
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                <Bell size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Chưa có hoạt động nào</p>
              </div>
            ) : (
              notifications.slice(0, 8).map((notif) => (
                <div
                  key={notif.id}
                  className="px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getNotifBg(notif.type)}`}>
                      {getNotifIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-800 font-medium truncate">
                        {notif.description}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                        <Clock size={10} />
                        {formatNotifDate(notif.date)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
