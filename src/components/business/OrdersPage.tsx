import React, { useState, useMemo } from 'react';
import { FileText, Search, Clock, Trash2, Copy, Package, User, ChevronDown } from 'lucide-react';
import { usePrintConfig } from '../../contexts/PrintConfigContext';
import { useAppNavigation } from '../../hooks/useAppNavigation';

const formatVND = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
const copyText = (text: string) => { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); };

const STATUS_OPTIONS = [
  { value: 'quoting', label: 'Đang báo giá', bg: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'processing', label: 'Đang làm', bg: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'completed', label: 'Hoàn thành', bg: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'delivered', label: 'Đã giao', bg: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'cancelled', label: 'Đã hủy', bg: 'bg-red-100 text-red-700 border-red-300' },
] as const;

const getStatusStyle = (s: string) => STATUS_OPTIONS.find(o => o.value === s) || STATUS_OPTIONS[0];

export function OrdersPage({ onClose }: { onClose?: () => void }) {
  const { orders, setOrders } = usePrintConfig();
  const { setCurrentPage } = useAppNavigation();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const update = (id: number, field: string, value: any) => setOrders(orders.map(o => o.id === id ? { ...o, [field]: value } : o));
  const remove = (id: number) => { if (window.confirm('Xóa đơn hàng này?')) setOrders(orders.filter(o => o.id !== id)); };

  const filtered = useMemo(() => orders.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (typeFilter !== 'all' && (o as any).type !== typeFilter) return false;
    if (search && !(o.customerName || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [orders, statusFilter, typeFilter, search]);

  const stats = useMemo(() => ({
    total: orders.length,
    quoting: orders.filter(o => o.status === 'quoting').length,
    processing: orders.filter(o => o.status === 'processing').length,
    completed: orders.filter(o => o.status === 'completed').length,
    revenue: orders.reduce((s, o) => s + (o.result?.costs?.total || 0), 0),
  }), [orders]);

  return (
    <div className="h-full bg-slate-50 font-sans text-slate-800 overflow-auto">
      <div className="max-w-6xl mx-auto p-4 space-y-3">
        {/* Header + Stats */}
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-xl flex items-center gap-2"><Package size={20} /> Đơn Hàng</h2>
          {orders.length > 0 && (
            <div className="flex gap-3 text-sm">
              <span className="text-slate-500">{stats.total} đơn</span>
              <span className="text-blue-600 font-bold">{stats.quoting} báo giá</span>
              <span className="text-orange-600 font-bold">{stats.processing} đang làm</span>
              <span className="text-green-600 font-bold">{stats.completed} xong</span>
              <span className="text-cyan-700 font-bold">{formatVND(stats.revenue)}</span>
            </div>
          )}
        </div>

        {/* Filters */}
        {orders.length > 0 && (
          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-1 flex-1 bg-white border rounded-lg px-3 py-1.5">
              <Search size={14} className="text-slate-400" />
              <input type="text" placeholder="Tìm khách hàng..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 text-sm outline-none" />
            </div>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="text-sm border rounded-lg px-3 py-1.5 bg-white">
              <option value="all">Tất cả</option><option value="digital">Digital</option><option value="offset">Offset</option>
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm border rounded-lg px-3 py-1.5 bg-white">
              <option value="all">Tất cả TT</option>
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        )}

        {/* Empty */}
        {orders.length === 0 ? (
          <div className="bg-white p-12 rounded-xl text-center border">
            <FileText size={48} className="mx-auto mb-3 text-slate-300" />
            <p className="text-lg text-slate-500 font-medium">Chưa có đơn hàng</p>
            <p className="text-sm text-slate-400 mt-1">Tạo đơn từ trang Tính Giá.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white p-8 rounded-xl text-center border">
            <Search size={36} className="mx-auto mb-2 text-slate-300" />
            <p className="text-slate-500">Không tìm thấy đơn hàng</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(entry => {
              const sc = getStatusStyle(entry.status);
              const orderId = (entry as any).orderId || `#${entry.id}`;
              return (
                <div key={entry.id} className="bg-white rounded-lg border shadow-sm">
                  <div className="p-3 flex gap-3">
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-sm text-cyan-700">{orderId}</span>
                        {(entry as any).type && <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${(entry as any).type === 'digital' ? 'bg-purple-100 text-purple-600' : 'bg-amber-100 text-amber-600'}`}>{(entry as any).type === 'digital' ? 'Digital' : 'Offset'}</span>}
                        <select value={entry.status} onChange={e => update(entry.id, 'status', e.target.value)} className={`text-xs font-bold border rounded px-2 py-0.5 ${sc.bg} cursor-pointer outline-none`}>
                          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        <span className="text-xs text-slate-400 ml-auto"><Clock size={11} className="inline mr-0.5" />{entry.timestamp}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <User size={13} className="text-slate-400" />
                        <input type="text" placeholder="Khách vãng lai" value={entry.customerName || ''} onChange={e => update(entry.id, 'customerName', e.target.value)} className="text-base font-semibold border-b border-dashed border-slate-300 bg-transparent outline-none focus:border-cyan-400 py-0 flex-1 max-w-[250px]" />
                      </div>
                      <div className="text-sm text-slate-600"><b>{entry.result.machineName}</b> — {entry.result.paperDisplay}</div>
                      <div className="text-sm text-slate-500">{entry.inputs.width}×{entry.inputs.height}mm · SL: <b>{parseInt(entry.inputs.quantity).toLocaleString()}</b> · {entry.result.ups} con · {entry.result.totalBigSheets || '?'} tờ</div>
                    </div>
                    {/* Price */}
                    <div className="text-right shrink-0">
                      <div className="text-xl font-bold text-cyan-700">{formatVND(entry.result.costs.total)}</div>
                      <div className="text-xs text-slate-400">{formatVND(entry.unitPrice)}/sp</div>
                    </div>
                    {/* Quote + Notes */}
                    <div className="shrink-0 flex gap-2">
                      <textarea className="w-44 h-20 text-[10px] font-mono bg-slate-50 border rounded p-1.5 resize-none outline-none text-slate-600" readOnly value={entry.quoteText} />
                      <textarea className="w-36 h-20 text-[10px] bg-slate-50 border rounded p-1.5 resize-none outline-none text-slate-600" placeholder="Ghi chú..." value={entry.notes || ''} onChange={e => update(entry.id, 'notes', e.target.value)} />
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="px-3 pb-2 flex items-center gap-3 border-t pt-1.5 text-xs">
                    <button onClick={() => { localStorage.setItem('txp-pending-quote-order', JSON.stringify(entry)); setCurrentPage('quotes'); }} className="text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-1"><FileText size={12} /> Báo giá</button>
                    <button onClick={() => copyText(entry.quoteText)} className="text-cyan-600 hover:text-cyan-800 font-bold flex items-center gap-1"><Copy size={12} /> Copy</button>
                    <button onClick={() => remove(entry.id)} className="text-red-400 hover:text-red-600 font-bold flex items-center gap-1 ml-auto"><Trash2 size={12} /> Xóa</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
