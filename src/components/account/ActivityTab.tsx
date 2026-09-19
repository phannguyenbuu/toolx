import React from 'react';
import { History, User, Download, Plus, Edit3, Trash2, Users, Crown, Clock, Globe } from 'lucide-react';
import { ActivityLog, ActivityType } from './types';
import { formatDate } from './utils';

interface ActivityTabProps {
  activities: ActivityLog[];
  activityFilter: 'all' | ActivityType;
  onFilterChange: (filter: 'all' | ActivityType) => void;
}

export const ActivityTab: React.FC<ActivityTabProps> = ({
  activities, activityFilter, onFilterChange
}) => {
  const filteredActivities = activityFilter === 'all'
    ? activities
    : activities.filter(a => a.type === activityFilter);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login': return <User size={18} className="text-green-600" />;
      case 'export': return <Download size={18} className="text-blue-600" />;
      case 'create': return <Plus size={18} className="text-purple-600" />;
      case 'edit': return <Edit3 size={18} className="text-yellow-600" />;
      case 'delete': return <Trash2 size={18} className="text-red-600" />;
      case 'share': return <Users size={18} className="text-orange-600" />;
      case 'upgrade': return <Crown size={18} className="text-pink-600" />;
      default: return <History size={18} className="text-gray-600" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'login': return 'bg-green-100';
      case 'export': return 'bg-blue-100';
      case 'create': return 'bg-purple-100';
      case 'edit': return 'bg-yellow-100';
      case 'delete': return 'bg-red-100';
      case 'share': return 'bg-orange-100';
      case 'upgrade': return 'bg-pink-100';
      default: return 'bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Activity Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Lịch sử hoạt động</h2>
          <p className="text-sm text-gray-500">Theo dõi tất cả hoạt động trên tài khoản</p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={activityFilter}
            onChange={e => onFilterChange(e.target.value as 'all' | ActivityType)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Tất cả</option>
            <option value="login">Đăng nhập</option>
            <option value="export">Xuất PDF</option>
            <option value="create">Tạo mới</option>
            <option value="edit">Chỉnh sửa</option>
            <option value="share">Chia sẻ</option>
            <option value="upgrade">Nâng cấp</option>
          </select>
        </div>
      </div>

      {/* Activity List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100">
          {filteredActivities.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <History size={48} className="mx-auto mb-3 text-gray-300" />
              <p>Chưa có hoạt động nào</p>
            </div>
          ) : (
            filteredActivities.map(activity => (
              <div key={activity.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                <div className={`p-3 rounded-xl ${getActivityColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{activity.description}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatDate(activity.date)}
                    </span>
                    {activity.ip && (
                      <span className="flex items-center gap-1">
                        <Globe size={12} />
                        {activity.ip}
                      </span>
                    )}
                    {activity.device && (
                      <span>{activity.device}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
