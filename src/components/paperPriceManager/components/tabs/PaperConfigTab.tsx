import React from 'react';
import {
  Settings,
  Building2,
  RefreshCw,
  Database,
  Trash2
} from 'lucide-react';
import { MySupplierProfile, PaperManagerConfig } from '../../types';

interface PaperConfigTabProps {
  myProfile: MySupplierProfile;
  updateProfile: (p: MySupplierProfile) => void;
  managerConfig: PaperManagerConfig;
  updateConfig: (c: PaperManagerConfig) => void;
  paperDatabaseLength: number;
  suppliersCount: number;
  supplierPaperPricesCount: number;
  paperGroupsCount: number;
  onResetDatabase: () => void;
  onClearSuppliers: () => void;
}

export const PaperConfigTab: React.FC<PaperConfigTabProps> = ({
  myProfile,
  updateProfile,
  managerConfig,
  updateConfig,
  paperDatabaseLength,
  suppliersCount,
  supplierPaperPricesCount,
  paperGroupsCount,
  onResetDatabase,
  onClearSuppliers
}) => {
  return (
    <div className="space-y-4">
      <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
        <Settings size={20} /> Cấu Hình
      </h2>
      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
        {/* My Supplier Profile */}
        <div>
          <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Building2 size={16} className="text-indigo-600" /> Thông Tin Nhà Cung Cấp (Của Bạn)
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            Thông tin này hiển thị khi NCC khác thêm bạn vào danh sách. Mã định danh dùng thay email nếu bạn không muốn chia sẻ email.
          </p>
          <div className="bg-indigo-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Tên công ty / Tên hiển thị
                </label>
                <input
                  className="w-full p-2.5 border rounded-lg text-sm bg-white"
                  placeholder="VD: Giấy Bình An"
                  value={myProfile.name}
                  onChange={(e) => updateProfile({ ...myProfile, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Mã định danh <span className="text-indigo-500">(thay thế email)</span>
                </label>
                <input
                  className="w-full p-2.5 border rounded-lg text-sm bg-white font-mono"
                  placeholder="VD: NCC-BINHAN-001"
                  value={myProfile.code}
                  onChange={(e) => updateProfile({ ...myProfile, code: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full p-2.5 border rounded-lg text-sm bg-white"
                  placeholder="email@congty.com"
                  value={myProfile.email}
                  onChange={(e) => updateProfile({ ...myProfile, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Số điện thoại
                </label>
                <input
                  className="w-full p-2.5 border rounded-lg text-sm bg-white"
                  placeholder="0901234567"
                  value={myProfile.phone}
                  onChange={(e) => updateProfile({ ...myProfile, phone: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Địa chỉ
              </label>
              <input
                className="w-full p-2.5 border rounded-lg text-sm bg-white"
                placeholder="Quận, Thành phố"
                value={myProfile.address}
                onChange={(e) => updateProfile({ ...myProfile, address: e.target.value })}
              />
            </div>
            {myProfile.code && (
              <div className="bg-white rounded-lg border border-indigo-200 p-3 flex items-center gap-3">
                <div className="text-xs text-slate-500">
                  Chia sẻ mã này cho đối tác để họ thêm bạn:
                </div>
                <code className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded font-bold text-sm">
                  {myProfile.code}
                </code>
              </div>
            )}
          </div>
        </div>

        {/* Auto Sync */}
        <div>
          <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
            <RefreshCw size={16} className="text-cyan-600" /> Tự Động Đồng Bộ
          </h3>
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Chu kỳ đồng bộ tự động</p>
                <p className="text-xs text-slate-400">
                  Tự động lấy giá mới từ tất cả NCC theo chu kỳ. 0 = tắt.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={managerConfig.autoSyncInterval}
                  onChange={(e) =>
                    updateConfig({
                      ...managerConfig,
                      autoSyncInterval: Number(e.target.value) || 0
                    })
                  }
                  className="w-20 p-2 border rounded text-sm text-center font-mono"
                />
                <span className="text-sm text-slate-500">phút</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Thông báo khi giá thay đổi</p>
                <p className="text-xs text-slate-400">Hiện thông báo khi NCC cập nhật giá mới.</p>
              </div>
              <button
                onClick={() =>
                  updateConfig({
                    ...managerConfig,
                    notifyPriceChange: !managerConfig.notifyPriceChange
                  })
                }
                className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer ${
                  managerConfig.notifyPriceChange
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {managerConfig.notifyPriceChange ? 'BẬT' : 'TẮT'}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Tự động áp dụng giá rẻ nhất</p>
                <p className="text-xs text-slate-400">
                  Khi đồng bộ, tự động cập nhật giá rẻ nhất vào bảng tính giá.
                </p>
              </div>
              <button
                onClick={() =>
                  updateConfig({
                    ...managerConfig,
                    autoApplyCheapest: !managerConfig.autoApplyCheapest
                  })
                }
                className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer ${
                  managerConfig.autoApplyCheapest
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {managerConfig.autoApplyCheapest ? 'BẬT' : 'TẮT'}
              </button>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div>
          <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Database size={16} className="text-indigo-600" /> Quản Lý Dữ Liệu
          </h3>
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div className="bg-white rounded-lg border p-3">
                <div className="text-2xl font-bold text-slate-700">{paperDatabaseLength}</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Loại giấy</div>
              </div>
              <div className="bg-white rounded-lg border p-3">
                <div className="text-2xl font-bold text-indigo-600">{suppliersCount}</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Nhà cung cấp</div>
              </div>
              <div className="bg-white rounded-lg border p-3">
                <div className="text-2xl font-bold text-cyan-600">
                  {supplierPaperPricesCount}
                </div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Giá từ NCC</div>
              </div>
              <div className="bg-white rounded-lg border p-3">
                <div className="text-2xl font-bold text-green-600">{paperGroupsCount}</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Nhóm giấy</div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={onResetDatabase}
                className="text-sm text-red-500 hover:bg-red-50 px-3 py-2 rounded border border-red-200 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={12} /> Reset bảng giá
              </button>
              <button
                onClick={onClearSuppliers}
                className="text-sm text-red-500 hover:bg-red-50 px-3 py-2 rounded border border-red-200 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={12} /> Xóa tất cả NCC
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
