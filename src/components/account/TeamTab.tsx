import React from 'react';
import { Plus, Trash2, Check, X } from 'lucide-react';
import { TeamMember, AccountPlanInfo } from './types';
import { formatRelativeTime } from './utils';

interface TeamTabProps {
  teamMembers: TeamMember[];
  currentPlanInfo: AccountPlanInfo;
  onInvite: () => void;
  onRemoveMember: (id: string) => void;
}

export const TeamTab: React.FC<TeamTabProps> = ({
  teamMembers, currentPlanInfo, onInvite, onRemoveMember
}) => {
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Chủ sở hữu';
      case 'admin': return 'Quản trị viên';
      case 'editor': return 'Biên tập viên';
      case 'viewer': return 'Người xem';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-700';
      case 'admin': return 'bg-blue-100 text-blue-700';
      case 'editor': return 'bg-green-100 text-green-700';
      case 'viewer': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const permissions = [
    { name: 'Xem phiên làm việc', owner: true, admin: true, editor: true, viewer: true },
    { name: 'Tạo/Sửa phiên', owner: true, admin: true, editor: true, viewer: false },
    { name: 'Xuất PDF', owner: true, admin: true, editor: true, viewer: false },
    { name: 'Quản lý thành viên', owner: true, admin: true, editor: false, viewer: false },
    { name: 'Quản lý thanh toán', owner: true, admin: false, editor: false, viewer: false },
    { name: 'Xóa tài khoản', owner: true, admin: false, editor: false, viewer: false },
  ];

  return (
    <div className="space-y-6">
      {/* Team Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Quản lý Team</h2>
          <p className="text-sm text-gray-500">
            {teamMembers.length} / {currentPlanInfo.limits.teamMembers === 'unlimited' ? '∞' : currentPlanInfo.limits.teamMembers} thành viên
          </p>
        </div>
        <button 
          onClick={onInvite}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2"
        >
          <Plus size={18} />
          Mời thành viên
        </button>
      </div>

      {/* Team Members */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100">
          {teamMembers.map(member => (
            <div key={member.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-800">{member.name}</p>
                  {member.status === 'invited' && (
                    <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">Đã mời</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{member.email}</p>
              </div>
              <div className="text-right">
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${getRoleColor(member.role)}`}>
                  {getRoleLabel(member.role)}
                </span>
                {member.lastActive && (
                  <p className="text-xs text-gray-400 mt-1">
                    Hoạt động: {formatRelativeTime(member.lastActive)}
                  </p>
                )}
              </div>
              {member.role !== 'owner' && (
                <button 
                  onClick={() => onRemoveMember(member.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Role Permissions */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4">Quyền hạn theo vai trò</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Quyền</th>
                <th className="text-center py-3 px-4 font-medium text-purple-600">Chủ sở hữu</th>
                <th className="text-center py-3 px-4 font-medium text-blue-600">Quản trị viên</th>
                <th className="text-center py-3 px-4 font-medium text-green-600">Biên tập viên</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Người xem</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((perm, idx) => (
                <tr key={idx} className="border-b border-gray-50">
                  <td className="py-3 px-4 text-gray-700">{perm.name}</td>
                  <td className="text-center py-3 px-4">
                    {perm.owner ? <Check size={16} className="mx-auto text-emerald-500" /> : <X size={16} className="mx-auto text-gray-300" />}
                  </td>
                  <td className="text-center py-3 px-4">
                    {perm.admin ? <Check size={16} className="mx-auto text-emerald-500" /> : <X size={16} className="mx-auto text-gray-300" />}
                  </td>
                  <td className="text-center py-3 px-4">
                    {perm.editor ? <Check size={16} className="mx-auto text-emerald-500" /> : <X size={16} className="mx-auto text-gray-300" />}
                  </td>
                  <td className="text-center py-3 px-4">
                    {perm.viewer ? <Check size={16} className="mx-auto text-emerald-500" /> : <X size={16} className="mx-auto text-gray-300" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
