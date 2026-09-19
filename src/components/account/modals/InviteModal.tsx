import React, { useState } from 'react';
import { Users, X, Mail } from 'lucide-react';
import { TeamRole, AccountPlanInfo } from '../types';

interface InviteModalProps {
  isOpen: boolean;
  teamCount: number;
  currentPlanInfo: AccountPlanInfo;
  onClose: () => void;
  onInvite: (email: string, role: TeamRole) => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  isOpen, teamCount, currentPlanInfo, onClose, onInvite
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamRole>('viewer');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!email.trim() || !email.includes('@')) {
      alert('Vui lòng nhập email hợp lệ');
      return;
    }
    onInvite(email, role);
    setEmail('');
  };

  const maxMembers = currentPlanInfo.limits.teamMembers;
  const canInvite = maxMembers === 'unlimited' || teamCount < maxMembers;

  return (
    <div className="fixed inset-0 bg-black/50 z-[1001] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-xl">
                <Users size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Mời thành viên</h3>
                <p className="text-blue-100 text-sm">
                  {teamCount} / {maxMembers === 'unlimited' ? '∞' : maxMembers} thành viên
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {!canInvite ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={32} className="text-orange-500" />
              </div>
              <h4 className="font-bold text-gray-800 mb-2">Đã đạt giới hạn thành viên</h4>
              <p className="text-sm text-gray-500 mb-4">
                Gói {currentPlanInfo.name} chỉ cho phép tối đa {maxMembers} thành viên.
                Vui lòng nâng cấp gói để mời thêm.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-all"
              >
                Nâng cấp gói
              </button>
            </div>
          ) : (
            <>
              {/* Email input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Role select */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as TeamRole)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none"
                >
                  <option value="viewer">Người xem - Chỉ xem, không chỉnh sửa</option>
                  <option value="editor">Biên tập viên - Có thể tạo và chỉnh sửa</option>
                  <option value="admin">Quản trị viên - Quản lý team và nội dung</option>
                </select>
              </div>

              {/* Role description */}
              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm font-medium text-gray-700 mb-2">Quyền hạn của vai trò:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {role === 'viewer' && (
                    <>
                      <li>• Xem các phiên làm việc</li>
                      <li>• Không thể chỉnh sửa hoặc tạo mới</li>
                    </>
                  )}
                  {role === 'editor' && (
                    <>
                      <li>• Xem và chỉnh sửa phiên làm việc</li>
                      <li>• Tạo phiên mới</li>
                      <li>• Xuất PDF</li>
                    </>
                  )}
                  {role === 'admin' && (
                    <>
                      <li>• Tất cả quyền của Biên tập viên</li>
                      <li>• Quản lý thành viên team</li>
                      <li>• Xem báo cáo hoạt động</li>
                    </>
                  )}
                </ul>
              </div>

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-bold hover:from-blue-600 hover:to-indigo-600 transition-all flex items-center justify-center gap-2"
              >
                <Mail size={20} />
                Gửi lời mời
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
