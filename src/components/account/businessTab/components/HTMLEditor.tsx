import React from 'react';

export interface HTMLEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export const HTMLEditor: React.FC<HTMLEditorProps> = ({
  value,
  onChange,
  placeholder,
  minHeight = '120px',
}) => {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-800 px-3 py-2 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
        <span className="text-xs text-gray-400 ml-2">HTML Editor</span>
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full font-mono text-sm border-0 p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
        style={{ minHeight }}
        placeholder={placeholder || '<div>Nhập HTML...</div>'}
      />
      <div className="bg-gray-50 px-3 py-2 border-t text-xs text-gray-500">
        💡 Sử dụng biến: {'{'}{'{'} quoteNumber {'}'}{'}'}, {'{'}{'{'} customerName {'}'}{'}'}, {'{'}{'{'} total {'}'}{'}'}, v.v.
      </div>
    </div>
  );
};
