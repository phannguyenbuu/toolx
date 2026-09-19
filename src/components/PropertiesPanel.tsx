import React from 'react';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface ElementData {
  id: string;
  type: 'text' | 'box' | 'qr' | 'barcode' | 'image' | 'img-data';
  x: number; y: number; width: number; height: number;
  rotate?: number; opacity?: number; content?: string;
  fontFamily?: string; fontSize?: number; color?: string;
  fontWeight?: string; fontStyle?: string; textDecoration?: string;
  textAlignH?: 'left' | 'center' | 'right';
  textAlignV?: 'top' | 'middle' | 'bottom';
  stroke?: string; strokeWidth?: number;
  shadowColor?: string; shadowBlur?: number; shadowOffsetX?: number; shadowOffsetY?: number;
  backgroundColor?: string; borderColor?: string; borderWidth?: number; borderRadius?: number;
  src?: string; objectFit?: 'fill' | 'contain' | 'cover' | 'none';
  dataType?: 'filename' | 'number' | 'exact' | 'url';
  matchMode?: 'contains' | 'exact' | 'startsWith' | 'endsWith';
  ignoreExtension?: boolean; bidirectional?: boolean;
  [key: string]: any;
}

interface PropertiesPanelProps {
  element: ElementData;
  availableFonts: string[];
  dataHeaders: string[];
  onUpdate: (id: string, updates: Partial<ElementData>) => void;
  onLoadFont: (fontFamily: string) => void;
}

/* ── shared input class ── */
const inp = "w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400";
const sel = "w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400";

/* ── tiny reusable pieces ── */
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="border-b border-gray-100 px-3 py-2 space-y-2">
    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
    {children}
  </div>
);

const Lbl: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-[10px] text-gray-500 mb-0.5">{children}</label>
);

const ColorField: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <div>
    <Lbl>{label}</Lbl>
    <div className="flex items-center gap-1.5">
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5 shrink-0"/>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        className="flex-1 min-w-0 border border-gray-200 rounded px-2 py-1 text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-violet-400"/>
    </div>
  </div>
);

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ element, availableFonts, dataHeaders, onUpdate, onLoadFont }) => {
  const u = (updates: Partial<ElementData>) => onUpdate(element.id, updates);

  return (
    <div className="h-full overflow-y-auto">
      {/* ── Vị trí & Kích thước ── */}
      <Section title="Vị trí & Kích thước">
        <div className="grid grid-cols-2 gap-1.5">
          {([['X (mm)', 'x'], ['Y (mm)', 'y'], ['W (mm)', 'width'], ['H (mm)', 'height']] as const).map(([label, key]) => (
            <div key={key}>
              <Lbl>{label}</Lbl>
              <input type="number" value={(element as any)[key]} onChange={e => u({ [key]: Number(e.target.value) })} className={inp}/>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <Lbl>Xoay (°)</Lbl>
            <input type="number" value={element.rotate || 0} onChange={e => u({ rotate: Number(e.target.value) })} className={inp}/>
          </div>
          <div>
            <Lbl>Opacity (%)</Lbl>
            <input type="number" value={Math.round((element.opacity ?? 1) * 100)} min={0} max={100}
              onChange={e => u({ opacity: Number(e.target.value) / 100 })} className={inp}/>
          </div>
        </div>
      </Section>

      {/* ══════ TEXT ══════ */}
      {element.type === 'text' && (<>
        <Section title="Nội dung">
          <textarea value={element.content} onChange={e => u({ content: e.target.value })}
            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400 resize-none" rows={2}/>
          {dataHeaders.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {dataHeaders.map(h => (
                <button key={h} onClick={() => u({ content: (element.content || '') + `{${h}}` })}
                  className="px-1.5 py-0.5 text-[10px] bg-violet-50 text-violet-600 border border-violet-100 rounded hover:bg-violet-100">
                  {`{${h}}`}
                </button>
              ))}
            </div>
          )}
        </Section>

        <Section title="Kiểu chữ">
          <div>
            <Lbl>Font</Lbl>
            <select value={element.fontFamily} onChange={e => { onLoadFont(e.target.value); u({ fontFamily: e.target.value }); }} className={sel}>
              {availableFonts.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <Lbl>Cỡ chữ (px)</Lbl>
              <input type="number" value={element.fontSize} onChange={e => u({ fontSize: Number(e.target.value) })} className={inp}/>
            </div>
            <ColorField label="Màu chữ" value={element.color || '#000000'} onChange={v => u({ color: v })}/>
          </div>

          {/* Bold / Italic / Underline */}
          <div className="flex gap-1">
            {([
              { key: 'fontWeight', val: 'bold', icon: <Bold size={13}/>, active: element.fontWeight === 'bold', reset: 'normal' },
              { key: 'fontStyle', val: 'italic', icon: <Italic size={13}/>, active: element.fontStyle === 'italic', reset: 'normal' },
              { key: 'textDecoration', val: 'underline', icon: <Underline size={13}/>, active: element.textDecoration === 'underline', reset: 'none' },
            ] as const).map(b => (
              <button key={b.key} onClick={() => u({ [b.key]: b.active ? b.reset : b.val })}
                className={`flex-1 py-1.5 border rounded flex items-center justify-center transition-colors ${b.active ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 hover:bg-gray-50'}`}>
                {b.icon}
              </button>
            ))}
          </div>

          {/* Căn chỉnh ngang + dọc */}
          <div>
            <Lbl>Căn chỉnh</Lbl>
            <div className="grid grid-cols-2 gap-1.5">
              {/* Ngang */}
              <div className="flex gap-0.5">
                {([['left', <AlignLeft size={12}/>], ['center', <AlignCenter size={12}/>], ['right', <AlignRight size={12}/>]] as [string, React.ReactNode][]).map(([v, icon]) => (
                  <button key={v} onClick={() => u({ textAlignH: v as any })}
                    className={`flex-1 py-1 border rounded flex items-center justify-center transition-colors ${element.textAlignH === v ? 'bg-violet-100 border-violet-300 text-violet-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                    {icon}
                  </button>
                ))}
              </div>
              {/* Dọc */}
              <div className="flex gap-0.5">
                {([
                  ['top', <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="6" width="6" height="16" rx="2"/><rect x="14" y="6" width="6" height="9" rx="2"/><path d="M2 2h20"/></svg>],
                  ['middle', <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="6" height="16" rx="2"/><rect x="14" y="7" width="6" height="10" rx="2"/><path d="M2 12h20"/></svg>],
                  ['bottom', <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="6" height="16" rx="2"/><rect x="14" y="9" width="6" height="9" rx="2"/><path d="M2 22h20"/></svg>],
                ] as [string, React.ReactNode][]).map(([v, icon]) => (
                  <button key={v} onClick={() => u({ textAlignV: v as any })}
                    className={`flex-1 py-1 border rounded flex items-center justify-center transition-colors ${element.textAlignV === v ? 'bg-violet-100 border-violet-300 text-violet-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section title="Viền & Bóng">
          <div className="grid grid-cols-2 gap-1.5">
            <ColorField label="Màu viền chữ" value={element.stroke || '#000000'} onChange={v => u({ stroke: v })}/>
            <div>
              <Lbl>Dày viền</Lbl>
              <input type="number" value={element.strokeWidth || 0} min={0} step={0.5} onChange={e => u({ strokeWidth: Number(e.target.value) })} className={inp}/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <ColorField label="Màu bóng" value={element.shadowColor || '#000000'} onChange={v => u({ shadowColor: v })}/>
            <div>
              <Lbl>Độ mờ bóng</Lbl>
              <input type="number" value={element.shadowBlur || 0} min={0} onChange={e => u({ shadowBlur: Number(e.target.value) })} className={inp}/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div><Lbl>Bóng X</Lbl><input type="number" value={element.shadowOffsetX || 0} onChange={e => u({ shadowOffsetX: Number(e.target.value) })} className={inp}/></div>
            <div><Lbl>Bóng Y</Lbl><input type="number" value={element.shadowOffsetY || 0} onChange={e => u({ shadowOffsetY: Number(e.target.value) })} className={inp}/></div>
          </div>
        </Section>
      </>)}

      {/* ══════ BOX ══════ */}
      {element.type === 'box' && (
        <Section title="Hộp">
          <div className="grid grid-cols-2 gap-1.5">
            <ColorField label="Màu nền" value={element.backgroundColor || '#e5e7eb'} onChange={v => u({ backgroundColor: v })}/>
            <ColorField label="Màu viền" value={element.borderColor || '#000000'} onChange={v => u({ borderColor: v })}/>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div><Lbl>Dày viền</Lbl><input type="number" value={element.borderWidth || 0} min={0} onChange={e => u({ borderWidth: Number(e.target.value) })} className={inp}/></div>
            <div><Lbl>Bo góc (px)</Lbl><input type="number" value={element.borderRadius || 0} min={0} onChange={e => u({ borderRadius: Number(e.target.value) })} className={inp}/></div>
          </div>
        </Section>
      )}

      {/* ══════ IMAGE ══════ */}
      {element.type === 'image' && (
        <Section title="Hình ảnh">
          <input type="file" accept="image/*"
            onChange={async e => {
              const file = e.target.files?.[0]; if (!file) return;
              const reader = new FileReader();
              reader.onload = ev => u({ src: ev.target?.result as string });
              reader.readAsDataURL(file);
            }} className="w-full text-xs"/>
          {element.src && <img src={element.src} alt="" className="w-full h-16 object-contain border border-gray-200 rounded-lg"/>}
          <div>
            <Lbl>Cách hiển thị</Lbl>
            <select value={element.objectFit || 'contain'} onChange={e => u({ objectFit: e.target.value as any })} className={sel}>
              <option value="contain">Vừa khung (Contain)</option>
              <option value="cover">Phủ đầy (Cover)</option>
              <option value="fill">Kéo giãn (Fill)</option>
              <option value="none">Kích thước gốc</option>
            </select>
          </div>
        </Section>
      )}

      {/* ══════ IMG-DATA ══════ */}
      {element.type === 'img-data' && (
        <Section title="Ảnh từ Data">
          <div>
            <Lbl>Chế độ tìm ảnh</Lbl>
            <select value={element.dataType || 'filename'} onChange={e => u({ dataType: e.target.value as any, content: '' })} className={sel}>
              <option value="filename">Khớp tên file</option>
              <option value="number">Theo số thứ tự</option>
              <option value="url">URL ảnh từ Data</option>
            </select>
          </div>
          {element.dataType === 'url' && (
            <div className="bg-blue-50 rounded p-2 text-[10px] text-blue-700">
              💡 Dùng biến <code className="bg-blue-100 px-1 rounded">{'{cột_url}'}</code> trong Nội dung. Hệ thống sẽ tải ảnh từ URL trong data.
            </div>
          )}
          {(element.dataType === 'filename' || !element.dataType) && (<>
            <div>
              <Lbl>Cách khớp tên</Lbl>
              <select value={element.matchMode || 'contains'} onChange={e => u({ matchMode: e.target.value as any })} className={sel}>
                <option value="contains">Chứa (Contains)</option>
                <option value="exact">Chính xác (Exact)</option>
                <option value="startsWith">Bắt đầu bằng</option>
                <option value="endsWith">Kết thúc bằng</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={element.ignoreExtension || false} onChange={e => u({ ignoreExtension: e.target.checked })} className="rounded text-violet-600"/>
              <span className="text-xs text-gray-700">Bỏ qua đuôi file</span>
            </label>
            {(element.matchMode === 'startsWith' || element.matchMode === 'endsWith') && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={element.bidirectional || false} onChange={e => u({ bidirectional: e.target.checked })} className="rounded text-violet-600"/>
                <span className="text-xs text-gray-700">Khớp 2 chiều</span>
              </label>
            )}
          </>)}
        </Section>
      )}

      {/* ══════ QR / BARCODE ══════ */}
      {(element.type === 'qr' || element.type === 'barcode') && (
        <Section title={element.type === 'qr' ? 'QR Code' : 'Barcode'}>
          <div>
            <Lbl>Nội dung</Lbl>
            <textarea value={element.content} onChange={e => u({ content: e.target.value })}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400 resize-none" rows={2}/>
          </div>
        </Section>
      )}
    </div>
  );
};
