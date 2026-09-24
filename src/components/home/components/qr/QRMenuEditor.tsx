import React from 'react';
import { Image as ImageIcon, Trash2 } from 'lucide-react';
import { MenuItem } from '../../types';
import { ENV_CONFIG } from '../../../../config/environment';

interface QRMenuEditorProps {
  restaurantName: string;
  setRestaurantName: (name: string) => void;
  menuItems: MenuItem[];
  setMenuItems: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  currentMenuItem: MenuItem | null;
  setCurrentMenuItem: (item: MenuItem | null) => void;
  menuImageInputRef: React.RefObject<HTMLInputElement | null>;
  handleMenuImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAddMenuItem: () => void;
  handleDeleteMenuItem: (id: string) => void;
}

export const QRMenuEditor: React.FC<QRMenuEditorProps> = ({
  restaurantName,
  setRestaurantName,
  menuItems,
  currentMenuItem,
  setCurrentMenuItem,
  menuImageInputRef,
  handleMenuImageUpload,
  handleAddMenuItem,
  handleDeleteMenuItem
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1 block">
          Tên nhà hàng
        </label>
        <input
          type="text"
          value={restaurantName}
          onChange={(e) => setRestaurantName(e.target.value)}
          placeholder="Nhập tên nhà hàng của bạn"
          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
        />
      </div>

      <div className="border-2 border-dashed border-slate-300 rounded-xl p-4">
        <input
          type="file"
          accept="image/*"
          onChange={handleMenuImageUpload}
          className="hidden"
          ref={menuImageInputRef}
        />
        <button
          onClick={() => menuImageInputRef.current?.click()}
          className="w-full flex flex-col items-center gap-2 py-4 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <ImageIcon size={24} />
          <span className="text-sm font-medium">Tải lên ảnh món ăn</span>
          <span className="text-xs">JPG, PNG, GIF (tối đa 5MB)</span>
        </button>
      </div>

      {currentMenuItem && (
        <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-700">Thông tin món ăn</h4>
            <button
              onClick={() => setCurrentMenuItem(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {currentMenuItem.image && (
            <div className="w-full h-32 bg-slate-200 rounded-lg overflow-hidden">
              <img
                src={currentMenuItem.image}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <input
            type="text"
            value={currentMenuItem.title}
            onChange={(e) =>
              setCurrentMenuItem({ ...currentMenuItem, title: e.target.value })
            }
            placeholder="Tên món ăn"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
          />

          <textarea
            value={currentMenuItem.description}
            onChange={(e) =>
              setCurrentMenuItem({
                ...currentMenuItem,
                description: e.target.value
              })
            }
            placeholder="Mô tả món ăn"
            rows={3}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm resize-none"
          />

          <select
            value={currentMenuItem.category}
            onChange={(e) =>
              setCurrentMenuItem({
                ...currentMenuItem,
                category: e.target.value
              })
            }
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
          >
            <option value="Giới thiệu">Giới thiệu</option>
            <option value="Món khai vị">Món khai vị</option>
            <option value="Món chính">Món chính</option>
            <option value="Món tráng miệng">Món tráng miệng</option>
            <option value="Đồ uống">Đồ uống</option>
          </select>

          <button
            onClick={handleAddMenuItem}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            Thêm vào menu
          </button>
        </div>
      )}

      {menuItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-700">
            Danh sách menu ({menuItems.length})
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {menuItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="w-12 h-12 bg-slate-200 rounded overflow-hidden flex-shrink-0">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {item.title}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{item.category}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteMenuItem(item.id);
                  }}
                  className="text-red-500 hover:text-red-600 cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {restaurantName && menuItems.length > 0 && (
        <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
          <p className="text-xs font-medium text-indigo-700 mb-1">
            Link QR sẽ tạo:
          </p>
          <p className="text-sm text-indigo-600 font-mono">
            {ENV_CONFIG.QR_BASE_URL}/menu/{Date.now()}
          </p>
          <p className="text-xs text-indigo-500 mt-2">
            Khách hàng quét QR để xem menu của &quot;{restaurantName}&quot;
          </p>
        </div>
      )}
    </div>
  );
};
