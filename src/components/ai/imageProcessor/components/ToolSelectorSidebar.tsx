import React from 'react';
import { Eraser, ImagePlus, Layers, ScanLine, Palette, Sparkles } from 'lucide-react';
import { AITool } from '../types';

interface ToolSelectorSidebarProps {
  activeTool: AITool;
  setActiveTool: (tool: AITool) => void;
}

const TOOLS = [
  { id: 'inpaint' as AITool, name: 'Xóa vùng ảnh', icon: Eraser, desc: 'Xóa và lấp đầy vùng được chọn' },
  { id: 'outpaint' as AITool, name: 'Mở rộng ảnh', icon: ImagePlus, desc: 'Mở rộng ảnh ra ngoài viền' },
  { id: 'remove-bg' as AITool, name: 'Xóa nền', icon: Layers, desc: 'Tự động xóa nền ảnh' },
  { id: 'upscale' as AITool, name: 'Nâng cấp', icon: ScanLine, desc: 'Tăng độ phân giải ảnh' },
  { id: 'color' as AITool, name: 'Chuyển màu', icon: Palette, desc: 'Chuyển đổi không gian màu' },
];

export const ToolSelectorSidebar: React.FC<ToolSelectorSidebarProps> = ({
  activeTool,
  setActiveTool
}) => {
  return (
    <div className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Sparkles size={16} className="text-purple-500" />
          Công cụ AI
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`w-full text-left p-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-purple-50 border-2 border-purple-300'
                  : 'hover:bg-gray-50 border-2 border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    isActive ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <Icon size={18} />
                </div>
                <div>
                  <p className={`font-medium text-sm ${isActive ? 'text-purple-700' : 'text-gray-700'}`}>
                    {tool.name}
                  </p>
                  <p className="text-xs text-gray-400">{tool.desc}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
