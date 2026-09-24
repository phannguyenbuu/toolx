import React, { useState, useEffect } from 'react';
import { FileText, X, Download, Plus, Trash2, Save, Package } from 'lucide-react';
import { Quote, QuoteItem, Customer, PriceCalculatorOrder, formatVND } from '../../../../types/business';
import { InitialQuoteItem, QuoteFormSaveData } from '../types';
import { QuoteImportModal } from './QuoteImportModal';

interface QuoteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote?: Quote | null;
  customers: Customer[];
  config: { header?: string; footer?: string; defaultVatPercent?: number; defaultValidityDays?: number };
  initialItems?: InitialQuoteItem[];
  onSave: (data: QuoteFormSaveData) => void | Promise<any>;
  onUpdate?: (id: string, data: Partial<Quote>) => void | Promise<any>;
}

export const QuoteFormModal: React.FC<QuoteFormModalProps> = ({
  isOpen,
  onClose,
  quote,
  customers,
  config,
  initialItems,
  onSave,
  onUpdate,
}) => {
  const [formData, setFormData] = useState({
    customerId: '',
    items: [] as Omit<QuoteItem, 'id' | 'total'>[],
    discountPercent: 0,
    vatPercent: config.defaultVatPercent || 0,
    validUntil: '',
    notes: '',
    header: config.header || '',
    footer: config.footer || '',
  });

  const [draftOrders, setDraftOrders] = useState<PriceCalculatorOrder[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem('txp-orders') || localStorage.getItem('priceCalculatorOrders');
        if (saved) {
          const parsed = JSON.parse(saved);
          setDraftOrders(Array.isArray(parsed) ? parsed.filter((o: any) => o?.result) : []);
        }
      } catch {
        setDraftOrders([]);
      }

      if (quote) {
        setFormData({
          customerId: quote.customerId,
          items: quote.items.map(i => ({
            description: i.description,
            specifications: i.specifications,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            notes: i.notes,
          })),
          discountPercent: quote.discountPercent,
          vatPercent: quote.vatPercent,
          validUntil: quote.validUntil,
          notes: quote.notes || '',
          header: config?.header || '',
          footer: config?.footer || '',
        });
      } else {
        const defaultDays = config?.defaultValidityDays || 30;
        const validUntil = new Date(Date.now() + defaultDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        setFormData({
          customerId: '',
          items: initialItems ? initialItems.map(i => ({
            description: i.description,
            specifications: i.specifications,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            notes: i.notes,
          })) : [],
          discountPercent: 0,
          vatPercent: config?.defaultVatPercent || 0,
          validUntil,
          notes: '',
          header: config?.header || '',
          footer: config?.footer || '',
        });
      }
    }
  }, [isOpen, quote, config, initialItems]);

  // Calculations
  const subtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const discountAmount = (subtotal * formData.discountPercent) / 100;
  const afterDiscount = subtotal - discountAmount;
  const vatAmount = (afterDiscount * formData.vatPercent) / 100;
  const total = afterDiscount + vatAmount;

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', specifications: '', quantity: 1, unitPrice: 0 }],
    }));
  };

  const handleUpdateItem = (index: number, field: string, value: string | number) => {
    const items = [...formData.items];
    items[index] = { ...items[index], [field]: value };
    setFormData(prev => ({ ...prev, items }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const handleImportOrder = (order: PriceCalculatorOrder) => {
    const lamText = order.inputs?.lamination === 'none' ? '' : 
      order.inputs?.lamination === '1side' ? ' + Cán 1 mặt' : ' + Cán 2 mặt';
    const finishings = (order.finishings || []).filter(f => f?.name).map(f => f.name).join(', ');
    
    const qty = parseInt(order.inputs?.quantity, 10) || 1;
    const newItem = {
      description: `In ${order.inputs?.printSides === 1 ? '1 mặt' : '2 mặt'} - ${order.result?.paperDisplay || ''}${lamText}${finishings ? ' + ' + finishings : ''}`,
      specifications: `${order.inputs?.width}x${order.inputs?.height}mm | ${order.result?.paperSize} | ${order.result?.ups} con/tờ`,
      quantity: qty,
      unitPrice: Math.round((order.result?.costs?.total || 0) / qty),
    };
    
    setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
    setShowImportModal(false);
  };

  const handleSubmit = async () => {
    if (!formData.customerId) {
      alert('Vui lòng chọn khách hàng');
      return;
    }
    if (formData.items.length === 0) {
      alert('Vui lòng thêm ít nhất một hạng mục');
      return;
    }
    
    const items: Omit<QuoteItem, 'id'>[] = formData.items.map(item => ({
      ...item,
      total: item.quantity * item.unitPrice,
    }));

    try {
      if (quote && onUpdate) {
        await onUpdate(quote.id, {
          customerId: formData.customerId,
          items: items.map((item, i) => ({ ...item, id: quote.items[i]?.id || `new-${i}` })),
          discountPercent: formData.discountPercent,
          vatPercent: formData.vatPercent,
          validUntil: formData.validUntil,
          notes: formData.notes,
        });
      } else {
        await onSave({
          customerId: formData.customerId,
          items,
          discountPercent: formData.discountPercent,
          vatPercent: formData.vatPercent,
          validUntil: formData.validUntil,
          notes: formData.notes,
        });
      }
      onClose();
    } catch (error) {
      alert('Có lỗi xảy ra khi lưu báo giá');
      console.error('Error saving quote:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-amber-50 to-white flex justify-between items-center shrink-0">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <FileText size={18} className="text-amber-600" />
            {quote ? 'Sửa Báo Giá' : 'Tạo Báo Giá Mới'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5 space-y-5">
          {/* Customer Selection */}
          <div className="bg-slate-50 p-4 rounded-lg border">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Khách hàng *</label>
                <select
                  value={formData.customerId}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerId: e.target.value }))}
                  className="w-full p-2.5 border rounded-lg bg-white"
                >
                  <option value="">-- Chọn khách hàng --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.company ? `- ${c.company}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Hiệu lực đến</label>
                <input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                  className="w-full p-2.5 border rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-slate-700">Danh sách hạng mục</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowImportModal(true)}
                  className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100 flex items-center gap-2"
                >
                  <Download size={16} />
                  Import từ Tính giá
                </button>
                <button
                  onClick={handleAddItem}
                  className="px-3 py-2 bg-amber-50 text-amber-600 rounded-lg font-medium hover:bg-amber-100 flex items-center gap-2"
                >
                  <Plus size={16} />
                  Thêm hạng mục
                </button>
              </div>
            </div>

            {formData.items.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center text-slate-400">
                <Package size={32} className="mx-auto mb-2 opacity-50" />
                <p>Chưa có hạng mục nào</p>
              </div>
            ) : (
              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-white">
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-4">
                        <label className="text-[10px] text-slate-400 block mb-1">Mô tả</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                          className="w-full p-2 border rounded text-sm"
                          placeholder="Tên sản phẩm/dịch vụ"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="text-[10px] text-slate-400 block mb-1">Thông số kỹ thuật</label>
                        <input
                          type="text"
                          value={item.specifications}
                          onChange={(e) => handleUpdateItem(index, 'specifications', e.target.value)}
                          className="w-full p-2 border rounded text-sm"
                          placeholder="Kích thước, loại giấy..."
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="text-[10px] text-slate-400 block mb-1">SL</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value, 10) || 0)}
                          className="w-full p-2 border rounded text-sm text-center"
                          min="1"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-400 block mb-1">Đơn giá</label>
                        <input
                          type="text"
                          value={item.unitPrice.toLocaleString('vi-VN')}
                          onChange={(e) => handleUpdateItem(index, 'unitPrice', parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
                          className="w-full p-2 border rounded text-sm text-right"
                        />
                      </div>
                      <div className="col-span-2 flex items-end justify-between">
                        <div>
                          <div className="text-[10px] text-slate-400 mb-1">Thành tiền</div>
                          <div className="font-bold text-amber-600">{formatVND(item.quantity * item.unitPrice)}</div>
                        </div>
                        <button onClick={() => handleRemoveItem(index)} className="p-2 text-red-400 hover:bg-red-50 rounded">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Summary */}
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex justify-end">
                <div className="w-72 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Tạm tính:</span>
                    <span className="font-medium">{formatVND(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-slate-500">Giảm giá:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={formData.discountPercent}
                        onChange={(e) => setFormData(prev => ({ ...prev, discountPercent: parseFloat(e.target.value) || 0 }))}
                        className="w-16 p-1 border rounded text-center text-sm"
                        min="0"
                        max="100"
                      />
                      <span>%</span>
                      <span className="font-medium text-red-500">-{formatVND(discountAmount)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-slate-500">VAT:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={formData.vatPercent}
                        onChange={(e) => setFormData(prev => ({ ...prev, vatPercent: parseFloat(e.target.value) || 0 }))}
                        className="w-16 p-1 border rounded text-center text-sm"
                      />
                      <span>%</span>
                      <span className="font-medium">{formatVND(vatAmount)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Tổng cộng:</span>
                    <span className="text-amber-600">{formatVND(total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Ghi chú</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full p-3 border rounded-lg text-sm"
                rows={2}
                placeholder="Ghi chú cho báo giá..."
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t bg-slate-50 flex justify-between items-center shrink-0">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-white">
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2"
          >
            <Save size={16} />
            {quote ? 'Cập nhật' : 'Tạo báo giá'}
          </button>
        </div>
      </div>

      {/* Import Modal */}
      <QuoteImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        draftOrders={draftOrders}
        onSelectOrder={handleImportOrder}
      />
    </div>
  );
};
