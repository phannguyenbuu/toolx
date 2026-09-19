import React, { useState } from 'react';
import { User, Shield, Bell, Key } from 'lucide-react';
import { ProvinceDistrictSelect } from '../common/ProvinceDistrictSelect';

interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  province: string;
  commune: string;
  birthDate: string;
}

export const SettingsTab: React.FC = () => {
  const [profile, setProfile] = useState<ProfileData>({
    fullName: '',
    email: 'admin@xuongin.vn',
    phone: '0901234567',
    address: '',
    province: '',
    commune: '',
    birthDate: ''
  });
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Cài đặt tài khoản</h2>

      {/* Profile Settings */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <User size={18} className="text-indigo-600" />
          Thông tin cá nhân
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên *</label>
            <input
              type="text"
              value={profile.fullName}
              onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
              placeholder="Nguyễn Văn A"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tỉnh/Thành phố</label>
            <input
              type="text"
              value={profile.province}
              onChange={(e) => setProfile({ ...profile, province: e.target.value })}
              placeholder="Nhập tỉnh/thành phố"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Xã/Phường</label>
            <input
              type="text"
              value={profile.commune}
              onChange={(e) => setProfile({ ...profile, commune: e.target.value })}
              placeholder="Nhập xã/phường"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
            <input
              type="text"
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              placeholder="Số nhà, đường, phố..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
            <input 
              type="tel" 
              defaultValue="0901234567" 
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày sinh</label>
            <input 
              type="date" 
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500" 
            />
          </div>
        </div>
        <button className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all">
          Lưu thay đổi
        </button>
      </div>

      {/* Security Settings */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Shield size={18} className="text-indigo-600" />
          Bảo mật
        </h3>
        <div className="space-y-4">
          <button className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
            <div className="flex items-center gap-3">
              <Key size={18} className="text-gray-400" />
              <div className="text-left">
                <p className="font-medium text-gray-800">Đổi mật khẩu</p>
                <p className="text-sm text-gray-500">Cập nhật mật khẩu đăng nhập</p>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </button>
          <button className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
            <div className="flex items-center gap-3">
              <Shield size={18} className="text-gray-400" />
              <div className="text-left">
                <p className="font-medium text-gray-800">Xác thực 2 bước</p>
                <p className="text-sm text-gray-500">Bảo vệ tài khoản với xác thực 2 yếu tố</p>
              </div>
            </div>
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">Tắt</span>
          </button>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Bell size={18} className="text-indigo-600" />
          Thông báo
        </h3>
        <div className="space-y-3">
          {[
            { label: 'Email thông báo giao dịch', desc: 'Nhận email khi có giao dịch mới', default: true },
            { label: 'Email khuyến mãi', desc: 'Nhận thông tin ưu đãi và khuyến mãi', default: false },
            { label: 'Thông báo đẩy', desc: 'Nhận thông báo trên trình duyệt', default: true },
            { label: 'Báo cáo hàng tuần', desc: 'Nhận báo cáo hoạt động hàng tuần', default: false },
          ].map((item, idx) => (
            <label key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
              <div>
                <p className="font-medium text-gray-700">{item.label}</p>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
              <input 
                type="checkbox" 
                defaultChecked={item.default} 
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" 
              />
            </label>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-2xl p-6 border border-red-200 shadow-sm">
        <h3 className="font-bold text-red-600 mb-4">Vùng nguy hiểm</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
            <div>
              <p className="font-medium text-gray-800">Xóa tài khoản</p>
              <p className="text-sm text-gray-500">Xóa vĩnh viễn tài khoản và tất cả dữ liệu</p>
            </div>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all">
              Xóa tài khoản
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
