import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Bold, Italic, Underline, List, ListOrdered, AlignLeft, 
  AlignCenter, AlignRight, Link, Type, Heading2, Table 
} from 'lucide-react';

export interface WYSIWYGEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const ToolButton: React.FC<{ 
  onClick: () => void; 
  active?: boolean; 
  title: string; 
  children: React.ReactNode; 
}> = ({ onClick, active, title, children }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded transition-colors ${
      active ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100 text-gray-600'
    }`}
  >
    {children}
  </button>
);

export const WYSIWYGEditor: React.FC<WYSIWYGEditorProps> = ({ 
  value, 
  onChange, 
  placeholder, 
  minHeight = '120px' 
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [tableSize, setTableSize] = useState({ rows: 2, cols: 2, stroke: 0 });

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const execCommand = useCallback((command: string, cmdValue?: string) => {
    document.execCommand(command, false, cmdValue);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    editorRef.current?.focus();
  }, [onChange]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const insertTable = (rows: number, cols: number, stroke: number = 0) => {
    const borderStyle = stroke === 0 
      ? 'border: 1px dashed #d1d5db;' 
      : `border: ${stroke}px solid #333;`;
    
    const tableClass = stroke === 0 ? 'table-no-border' : '';
    let tableHtml = `<table class="${tableClass}" style="border-collapse: collapse; width: 100%; margin: 8px 0;" data-stroke="${stroke}">`;
    for (let i = 0; i < rows; i++) {
      tableHtml += '<tr>';
      for (let j = 0; j < cols; j++) {
        tableHtml += `<td style="${borderStyle} padding: 6px; min-width: 50px;">${i === 0 ? 'Tiêu đề' : 'Nội dung'}</td>`;
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</table>';
    
    document.execCommand('insertHTML', false, tableHtml);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    setShowTablePicker(false);
    editorRef.current?.focus();
  };

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${isFocused ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-gray-300'}`}>
      {/* Toolbar */}
      <div className="bg-gray-50 border-b px-2 py-1.5 flex flex-wrap gap-0.5 items-center">
        <ToolButton onClick={() => execCommand('bold')} title="Đậm (Ctrl+B)">
          <Bold size={14} />
        </ToolButton>
        <ToolButton onClick={() => execCommand('italic')} title="Nghiêng (Ctrl+I)">
          <Italic size={14} />
        </ToolButton>
        <ToolButton onClick={() => execCommand('underline')} title="Gạch chân (Ctrl+U)">
          <Underline size={14} />
        </ToolButton>
        <div className="w-px bg-gray-300 mx-1 h-5" />
        <ToolButton onClick={() => execCommand('formatBlock', 'h2')} title="Tiêu đề">
          <Heading2 size={14} />
        </ToolButton>
        <ToolButton onClick={() => execCommand('formatBlock', 'p')} title="Đoạn văn">
          <Type size={14} />
        </ToolButton>
        <div className="w-px bg-gray-300 mx-1 h-5" />
        <ToolButton onClick={() => execCommand('insertUnorderedList')} title="Danh sách">
          <List size={14} />
        </ToolButton>
        <ToolButton onClick={() => execCommand('insertOrderedList')} title="Danh sách số">
          <ListOrdered size={14} />
        </ToolButton>
        <div className="w-px bg-gray-300 mx-1 h-5" />
        <ToolButton onClick={() => execCommand('justifyLeft')} title="Căn trái">
          <AlignLeft size={14} />
        </ToolButton>
        <ToolButton onClick={() => execCommand('justifyCenter')} title="Căn giữa">
          <AlignCenter size={14} />
        </ToolButton>
        <ToolButton onClick={() => execCommand('justifyRight')} title="Căn phải">
          <AlignRight size={14} />
        </ToolButton>
        <div className="w-px bg-gray-300 mx-1 h-5" />
        <ToolButton 
          onClick={() => {
            const url = prompt('Nhập URL:');
            if (url) execCommand('createLink', url);
          }} 
          title="Chèn link"
        >
          <Link size={14} />
        </ToolButton>
        <div className="w-px bg-gray-300 mx-1 h-5" />
        {/* Table Picker */}
        <div className="relative">
          <ToolButton onClick={() => setShowTablePicker(!showTablePicker)} title="Chèn bảng">
            <Table size={14} />
          </ToolButton>
          {showTablePicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-3 z-50 min-w-[240px]">
              <p className="text-xs text-gray-600 mb-2">Chọn kích thước bảng:</p>
              <div className="flex gap-2 mb-2">
                <div>
                  <label className="text-xs text-gray-500">Hàng</label>
                  <input 
                    type="number" 
                    min="1" max="10" 
                    value={tableSize.rows}
                    onChange={e => setTableSize(prev => ({ ...prev, rows: Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)) }))}
                    className="w-14 border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Cột</label>
                  <input 
                    type="number" 
                    min="1" max="10" 
                    value={tableSize.cols}
                    onChange={e => setTableSize(prev => ({ ...prev, cols: Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)) }))}
                    className="w-14 border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Viền (px)</label>
                  <input 
                    type="number" 
                    min="0" max="5" 
                    value={tableSize.stroke}
                    onChange={e => setTableSize(prev => ({ ...prev, stroke: Math.max(0, Math.min(5, parseInt(e.target.value, 10) || 0)) }))}
                    className="w-14 border rounded px-2 py-1 text-sm"
                  />
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mb-2">
                💡 Viền = 0: hiện đường mờ trong editor, không in ra
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={() => insertTable(tableSize.rows, tableSize.cols, tableSize.stroke)}
                  className="flex-1 px-3 py-1.5 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700"
                >
                  Chèn
                </button>
                <button 
                  onClick={() => setShowTablePicker(false)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200"
                >
                  Hủy
                </button>
              </div>
              {/* Quick templates */}
              <div className="mt-2 pt-2 border-t">
                <p className="text-xs text-gray-500 mb-1">Mẫu nhanh (viền {tableSize.stroke}px):</p>
                <div className="flex gap-1 flex-wrap">
                  {[[2,2], [2,3], [3,2], [3,3], [4,2]].map(([r, c]) => (
                    <button
                      key={`${r}x${c}`}
                      onClick={() => insertTable(r, c, tableSize.stroke)}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                    >
                      {r}x{c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="px-3 py-2 outline-none prose prose-sm max-w-none"
        style={{ minHeight }}
        data-placeholder={placeholder}
      />
      
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};
