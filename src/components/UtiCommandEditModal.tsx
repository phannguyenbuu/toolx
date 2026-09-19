import React, { useState, useEffect } from 'react';
import { X, Check, Tag, Folder, AlignLeft, Sparkles, Code2, Eye, EyeOff } from 'lucide-react';
import { UtiCommandItem } from '../services/utiCommandService';

interface UtiCommandEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: UtiCommandItem) => void;
  initialData?: UtiCommandItem | null;
  existingCategories: string[];
}

const EMOJI_SUGGESTIONS = ['⚡', '🖥️', '🎨', '🖨️', '🚀', '📦', '🔍', '⚙️', '🧹', '📄', '⚠️', '🌐', '📏', '🎯', '🛠️', '🔒'];

export const UtiCommandEditModal: React.FC<UtiCommandEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingCategories
}) => {
  const [label, setLabel] = useState('');
  const [command, setCommand] = useState('');
  const [icon, setIcon] = useState('⚡');
  const [category, setCategory] = useState('🎨 Render Vector 128GB');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState<'python' | 'powershell' | 'bash' | 'javascript' | 'json'>('python');
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (initialData) {
      setLabel(initialData.label || '');
      setCommand(initialData.command || '');
      setIcon(initialData.icon || '⚡');
      setCategory(initialData.category || existingCategories[0] || '🎨 Render Vector 128GB');
      setDescription(initialData.description || '');
      setLanguage(initialData.language || 'python');
      setIsVisible(initialData.is_visible !== false);
    } else {
      setLabel('');
      setCommand('');
      setIcon('⚡');
      setCategory(existingCategories[0] || '🎨 Render Vector 128GB');
      setCustomCategory('');
      setDescription('');
      setLanguage('python');
      setIsVisible(true);
    }
  }, [initialData, isOpen, existingCategories]);

  if (!isOpen) return null;

  const handleLabelChange = (val: string) => {
    setLabel(val);
    if (!initialData) {
      // Auto-generate slug from label if creating new
      const slug = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      setCommand(slug);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      alert('Vui lòng nhập tên Menu Item!');
      return;
    }
    const cleanCommand = (command || label)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, '_');

    const finalCategory = customCategory.trim() ? customCategory.trim() : category;

    const updatedItem: UtiCommandItem = {
      command: cleanCommand,
      label: label.trim(),
      icon: icon.trim() || '⚡',
      category: finalCategory,
      description: description.trim(),
      language,
      is_visible: isVisible,
      command_content: initialData?.command_content || `# Mã lệnh sống cho ${label}\nprint("Xin chào từ ${label}!")\n`,
      created_at: initialData?.created_at,
      updated_at: new Date().toISOString()
    };

    onSave(updatedItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 text-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            <h3 className="text-base font-bold text-slate-900">
              {initialData ? 'Chỉnh sửa Menu Item / UtiCommand' : 'Thêm Menu Item / UtiCommand mới'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Tên Menu Item */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5 flex items-center gap-1.5">
              <Tag size={13} className="text-indigo-600" />
              <span>Tên Menu Item (Hiển thị) *</span>
            </label>
            <input
              type="text"
              required
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="ví dụ: Kiểm tra MediaBox PDF, Render 128GB..."
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs shadow-2xs"
            />
          </div>

          {/* Mã Lệnh (Command Slug) */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5 flex items-center gap-1.5">
              <Code2 size={13} className="text-indigo-600" />
              <span>Mã Lệnh (Command Slug - Duy nhất) *</span>
            </label>
            <input
              type="text"
              required
              disabled={!!initialData}
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="ví dụ: check_mediabox, render_sample_128gb..."
              className={`w-full border rounded-xl px-3 py-2.5 font-mono text-xs shadow-2xs ${
                initialData
                  ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500'
              }`}
            />
            <p className="text-[10px] text-slate-500 mt-1">
              {initialData ? 'Không thể đổi mã định danh khi đã khởi tạo.' : 'Dùng làm định danh thực thi API và gọi lệnh qua GoAgent.'}
            </p>
          </div>

          {/* Icon Chọn nhanh */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5 flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-500" />
              <span>Biểu tượng (Icon / Emoji)</span>
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-16 text-center text-lg bg-white border border-slate-300 rounded-xl py-1.5 text-slate-900 focus:outline-hidden focus:border-indigo-500 shadow-2xs"
              />
              <span className="text-[11px] text-slate-500">Chọn nhanh từ danh sách:</span>
            </div>
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
              {EMOJI_SUGGESTIONS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setIcon(em)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-base hover:bg-slate-200 transition cursor-pointer ${
                    icon === em ? 'bg-indigo-100 border border-indigo-500 text-indigo-900' : ''
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Danh mục (Category) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5 flex items-center gap-1.5">
                <Folder size={13} className="text-indigo-600" />
                <span>Danh mục có sẵn</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-hidden focus:border-indigo-500 text-xs shadow-2xs cursor-pointer"
              >
                {existingCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">
                Hoặc danh mục mới:
              </label>
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="ví dụ: 🚀 Tác vụ Nâng cao..."
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 text-xs shadow-2xs"
              />
            </div>
          </div>

          {/* Ngôn ngữ & Trạng thái hiển thị */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">
                Ngôn ngữ mã lệnh
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:border-indigo-500 text-xs shadow-2xs cursor-pointer"
              >
                <option value="python">Python (PyMuPDF / GoAgent)</option>
                <option value="powershell">PowerShell</option>
                <option value="bash">Bash / Shell</option>
                <option value="javascript">JavaScript / Node</option>
                <option value="json">JSON Config</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">
                Hiển thị trên Sidebar Menu
              </label>
              <button
                type="button"
                onClick={() => setIsVisible(!isVisible)}
                className={`w-full py-2 px-3 rounded-xl border flex items-center justify-center gap-2 font-semibold transition cursor-pointer shadow-2xs ${
                  isVisible
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-slate-100 border-slate-300 text-slate-600'
                }`}
              >
                {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                <span>{isVisible ? 'Đang Bật (Hiển thị)' : 'Đang Ẩn (Tắt)'}</span>
              </button>
            </div>
          </div>

          {/* Mô tả */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5 flex items-center gap-1.5">
              <AlignLeft size={13} className="text-slate-500" />
              <span>Mô tả ngắn chức năng</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Giải thích tác vụ này làm gì khi được thực thi..."
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 text-xs shadow-2xs"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition cursor-pointer"
            >
              <Check size={15} />
              <span>{initialData ? 'Lưu thay đổi' : 'Thêm vào Menu'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
