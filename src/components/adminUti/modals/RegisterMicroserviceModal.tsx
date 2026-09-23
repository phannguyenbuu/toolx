import React from 'react';
import { PlusCircle, X } from 'lucide-react';

interface RegisterMicroserviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  name: string;
  setName: (v: string) => void;
  route: string;
  setRoute: (v: string) => void;
  port: number;
  setPort: (v: number) => void;
  category: string;
  setCategory: (v: string) => void;
  tech: string;
  setTech: (v: string) => void;
  caps: string;
  setCaps: (v: string) => void;
  desc: string;
  setDesc: (v: string) => void;
}

export const RegisterMicroserviceModal: React.FC<RegisterMicroserviceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  name,
  setName,
  route,
  setRoute,
  port,
  setPort,
  category,
  setCategory,
  tech,
  setTech,
  caps,
  setCaps,
  desc,
  setDesc
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold">
              <PlusCircle size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Đăng Ký Microservice Mới</h3>
              <p className="text-[11px] text-slate-500">Thêm module độc lập vào kiến trúc ToolxPrint</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-slate-700">Tên Microservice</label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Kiểm Tra File In Thông Minh"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Route Path</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-mono">/</span>
                <input
                  type="text"
                  required
                  placeholder="kiemtra"
                  value={route.startsWith('/') ? route.slice(1) : route}
                  onChange={(e) => setRoute(`/${e.target.value.replace(/^\/+/, '')}`)}
                  className="w-full pl-6 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white font-mono"
                />
              </div>
              <span className="text-[10px] text-slate-400">toolxprint.com{route.startsWith('/') ? route : `/${route}`}</span>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Backend Port (Node/API)</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white font-mono"
              />
              <span className="text-[10px] text-slate-400">Mặc định: 3002 (Unified Backend)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Nhóm / Danh Mục</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Tech Stack</label>
              <input
                type="text"
                value={tech}
                onChange={(e) => setTech(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">Khả Năng Cốt Lõi (Phân cách bởi dấu phẩy)</label>
            <input
              type="text"
              value={caps}
              onChange={(e) => setCaps(e.target.value)}
              placeholder="Tiền kiểm PDF, Báo cáo lỗi kỹ thuật..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">Mô Tả Chức Năng</label>
            <textarea
              rows={2}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Mô tả tóm tắt mục đích và vai trò của microservice này..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white resize-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer transition"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition"
            >
              <PlusCircle size={14} />
              <span>Xác Nhận & Gắn Dịch Vụ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
