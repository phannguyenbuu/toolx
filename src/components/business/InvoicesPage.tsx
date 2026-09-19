import React, { useState, useMemo } from 'react';
import { 
  Receipt, Plus, Search, Edit3, Trash2, Eye, Download,
  ChevronLeft, ChevronRight, X, Save, CheckCircle,
  Clock, AlertCircle, CreditCard, Calendar, User, Printer,
  AlertTriangle, Banknote, ArrowRight
} from 'lucide-react';
import { 
  Invoice, InvoiceItem, InvoiceStatus, InvoicePayment, Customer, PriceCalculatorOrder,
  formatVND, formatDate, getInvoiceStatusConfig 
} from '../../types/business';
import { useBusinessDatabase } from '../../hooks/useBusinessDatabaseApi';

interface InvoicesPageProps {
  onClose?: () => void;
}

// --- STATUS BADGE ---
const StatusBadge: React.FC<{ status: InvoiceStatus }> = ({ status }) => {
  const config = getInvoiceStatusConfig(status);
  
  // Fallback if status config not found
  if (!config) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
        <AlertCircle size={12} />
        {status || 'Unknown'}
      </span>
    );
  }
  
  const colorClasses = {
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
    green: 'bg-green-100 text-green-700',
    gray: 'bg-gray-100 text-gray-700',
  };
  const Icon = {
    AlertCircle, Clock, CheckCircle, AlertTriangle, X
  }[config.icon] || AlertCircle;
  
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${colorClasses[config.color as keyof typeof colorClasses]}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
};

// --- INVOICE FORM MODAL ---
const InvoiceFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  invoice?: Invoice | null;
  customers: Customer[];
  config: { header: string; footer: string; defaultVatPercent: number; defaultPaymentDays: number };
  onSave: (data: {
    customerId: string;
    items: Omit<InvoiceItem, 'id'>[];
    discountPercent?: number;
    vatPercent?: number;
    dueDate?: string;
    notes?: string;
  }) => void;
  onUpdate?: (id: string, data: Partial<Invoice>) => void;
}> = ({ isOpen, onClose, invoice, customers, config, onSave, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'items' | 'header' | 'footer'>('items');
  const [formData, setFormData] = useState({
    customerId: '',
    items: [] as Omit<InvoiceItem, 'id' | 'total'>[],
    discountPercent: 0,
    vatPercent: config.defaultVatPercent,
    dueDate: '',
    notes: '',
    header: config.header,
    footer: config.footer,
  });

  // Load draft orders from PriceCalculator
  const [draftOrders, setDraftOrders] = useState<PriceCalculatorOrder[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      // Load draft orders
      try {
        const saved = localStorage.getItem('priceCalculatorOrders');
        if (saved) {
          const parsed = JSON.parse(saved);
          setDraftOrders(Array.isArray(parsed) ? parsed.filter((o: any) => o?.result) : []);
        }
      } catch { setDraftOrders([]); }

      if (invoice) {
        setFormData({
          customerId: invoice.customerId,
          items: invoice.items.map(i => ({
            description: i.description,
            specifications: i.specifications,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            notes: i.notes,
          })),
          discountPercent: invoice.discountPercent,
          vatPercent: invoice.vatPercent,
          dueDate: invoice.dueDate,
          notes: invoice.notes || '',
          header: config?.header || '',
          footer: config?.footer || '',
        });
      } else {
        const defaultDays = config?.defaultPaymentDays || 30;
        const dueDate = new Date(Date.now() + defaultDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        setFormData({
          customerId: '',
          items: [],
          discountPercent: 0,
          vatPercent: config?.defaultVatPercent || 0,
          dueDate,
          notes: '',
          header: config?.header || '',
          footer: config?.footer || '',
        });
      }
      setActiveTab('items');
    }
  }, [isOpen, invoice, config]);

  // Calculations
  const subtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const discountAmount = subtotal * formData.discountPercent / 100;
  const afterDiscount = subtotal - discountAmount;
  const vatAmount = afterDiscount * formData.vatPercent / 100;
  const total = afterDiscount + vatAmount;

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', specifications: '', quantity: 1, unitPrice: 0 }]
    });
  };

  const handleUpdateItem = (index: number, field: string, value: string | number) => {
    const items = [...formData.items];
    items[index] = { ...items[index], [field]: value };
    setFormData({ ...formData, items });
  };

  const handleRemoveItem = (index: number) => {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  const handleImportOrder = (order: PriceCalculatorOrder) => {
    const lamText = order.inputs?.lamination === 'none' ? '' : 
      order.inputs?.lamination === '1side' ? ' + Cán 1 mặt' : ' + Cán 2 mặt';
    const finishings = (order.finishings || []).filter(f => f?.name).map(f => f.name).join(', ');
    
    const newItem = {
      description: `In ${order.inputs?.printSides === 1 ? '1 mặt' : '2 mặt'} - ${order.result?.paperDisplay || ''}${lamText}${finishings ? ' + ' + finishings : ''}`,
      specifications: `${order.inputs?.width}x${order.inputs?.height}mm | ${order.result?.paperSize} | ${order.result?.ups} con/tờ`,
      quantity: parseInt(order.inputs?.quantity) || 1,
      unitPrice: Math.round((order.result?.costs?.total || 0) / (parseInt(order.inputs?.quantity) || 1)),
    };
    
    setFormData({ ...formData, items: [...formData.items, newItem] });
    setShowImportModal(false);
  };

  const handleSubmit = () => {
    if (!formData.customerId) {
      alert('Vui lòng chọn khách hàng');
      return;
    }
    if (formData.items.length === 0) {
      alert('Vui lòng thêm ít nhất một hạng mục');
      return;
    }
    
    const items: Omit<InvoiceItem, 'id'>[] = formData.items.map(item => ({
      ...item,
      total: item.quantity * item.unitPrice,
    }));

    if (invoice && onUpdate) {
      onUpdate(invoice.id, {
        customerId: formData.customerId,
        items: items.map((item, i) => ({ ...item, id: invoice.items[i]?.id || `new-${i}` })),
        discountPercent: formData.discountPercent,
        vatPercent: formData.vatPercent,
        dueDate: formData.dueDate,
        notes: formData.notes,
      });
    } else {
      onSave({
        customerId: formData.customerId,
        items,
        discountPercent: formData.discountPercent,
        vatPercent: formData.vatPercent,
        dueDate: formData.dueDate,
        notes: formData.notes,
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-emerald-50 to-white flex justify-between items-center shrink-0">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Receipt size={18} className="text-emerald-600" />
            {invoice ? 'Sửa Hóa Đơn' : 'Tạo Hóa Đơn Mới'}
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
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-white"
                >
                  <option value="">-- Chọn khách hàng --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.company ? `- ${c.company}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Hạn thanh toán</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full p-2.5 border rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Items */}
          {
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
                    className="px-3 py-2 bg-emerald-50 text-emerald-600 rounded-lg font-medium hover:bg-emerald-100 flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Thêm hạng mục
                  </button>
                </div>
              </div>

              {formData.items.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center text-slate-400">
                  <Receipt size={32} className="mx-auto mb-2 opacity-50" />
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
                          <label className="text-[10px] text-slate-400 block mb-1">Thông số</label>
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
                            onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-full p-2 border rounded text-sm text-center"
                            min="1"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] text-slate-400 block mb-1">Đơn giá</label>
                          <input
                            type="text"
                            value={item.unitPrice.toLocaleString('vi-VN')}
                            onChange={(e) => handleUpdateItem(index, 'unitPrice', parseInt(e.target.value.replace(/\D/g, '')) || 0)}
                            className="w-full p-2 border rounded text-sm text-right"
                          />
                        </div>
                        <div className="col-span-2 flex items-end justify-between">
                          <div>
                            <div className="text-[10px] text-slate-400 mb-1">Thành tiền</div>
                            <div className="font-bold text-emerald-600">{formatVND(item.quantity * item.unitPrice)}</div>
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
                          onChange={(e) => setFormData({ ...formData, discountPercent: parseFloat(e.target.value) || 0 })}
                          className="w-16 p-1 border rounded text-center text-sm"
                          min="0" max="100"
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
                          onChange={(e) => setFormData({ ...formData, vatPercent: parseFloat(e.target.value) || 0 })}
                          className="w-16 p-1 border rounded text-center text-sm"
                        />
                        <span>%</span>
                        <span className="font-medium">{formatVND(vatAmount)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>Tổng cộng:</span>
                      <span className="text-emerald-600">{formatVND(total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Ghi chú</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-3 border rounded-lg text-sm"
                  rows={2}
                  placeholder="Ghi chú cho hóa đơn..."
                />
              </div>
            </div>
          }
        </div>

        {/* Actions */}
        <div className="p-4 border-t bg-slate-50 flex justify-between items-center shrink-0">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-white">
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
          >
            <Save size={16} />
            {invoice ? 'Cập nhật' : 'Tạo hóa đơn'}
          </button>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <Download size={18} className="text-indigo-600" />
                Import từ Tính giá
              </h4>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-red-500">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 max-h-80 overflow-auto space-y-2">
              {draftOrders.length === 0 ? (
                <div className="text-center text-slate-400 py-8">
                  <Receipt size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Không có đơn nháp nào</p>
                </div>
              ) : (
                draftOrders.map(order => (
                  <button
                    key={order.id}
                    onClick={() => handleImportOrder(order)}
                    className="w-full text-left p-3 border rounded-lg hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-slate-800">
                          {order.inputs?.width}x{order.inputs?.height}mm - {order.result?.paperDisplay}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          SL: {parseInt(order.inputs?.quantity || '0').toLocaleString()} | {order.result?.machineName}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-600">{formatVND(order.result?.costs?.total || 0)}</div>
                        <div className="text-[10px] text-slate-400">{order.timestamp}</div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- PAYMENT MODAL ---
const PaymentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onAddPayment: (invoiceId: string, payment: Omit<InvoicePayment, 'id'>) => void;
}> = ({ isOpen, onClose, invoice, onAddPayment }) => {
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<'cash' | 'transfer' | 'card' | 'other'>('transfer');
  const [notes, setNotes] = useState('');

  React.useEffect(() => {
    if (invoice) {
      setAmount(invoice.remainingAmount);
      setMethod('transfer');
      setNotes('');
    }
  }, [invoice]);

  if (!isOpen || !invoice) return null;

  const handleSubmit = async () => {
    if (amount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    if (amount > invoice.remainingAmount) {
      alert('Số tiền không được lớn hơn số còn nợ');
      return;
    }
    try {
      await onAddPayment(invoice.id, {
        amount,
        method,
        date: new Date().toISOString(),
        notes,
      });
      onClose();
    } catch (error) {
      alert('Có lỗi xảy ra khi thêm thanh toán');
      console.error('Error adding payment:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b bg-gradient-to-r from-emerald-50 to-white">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Banknote size={18} className="text-emerald-600" />
            Ghi nhận thanh toán
          </h3>
          <p className="text-sm text-slate-500">{invoice.invoiceNumber} - {invoice.customerName}</p>
        </div>
        
        <div className="p-5 space-y-4">
          <div className="bg-slate-50 p-3 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Tổng hóa đơn:</span>
              <span className="font-bold">{formatVND(invoice.total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Đã thanh toán:</span>
              <span className="text-green-600">{formatVND(invoice.paidAmount)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-2 border-t mt-2">
              <span>Còn lại:</span>
              <span className="text-red-600">{formatVND(invoice.remainingAmount)}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Số tiền thanh toán</label>
            <input
              type="text"
              value={amount.toLocaleString('vi-VN')}
              onChange={(e) => setAmount(parseInt(e.target.value.replace(/\D/g, '')) || 0)}
              className="w-full p-2.5 border rounded-lg text-right text-lg font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Phương thức</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="w-full p-2.5 border rounded-lg"
            >
              <option value="transfer">Chuyển khoản</option>
              <option value="cash">Tiền mặt</option>
              <option value="card">Thẻ</option>
              <option value="other">Khác</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Ghi chú</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 border rounded-lg"
              placeholder="Ghi chú thanh toán..."
            />
          </div>
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-white">
            Hủy
          </button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2">
            <CheckCircle size={16} />
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
};

// --- INVOICE PREVIEW MODAL ---
const InvoicePreviewModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  config: { company: any; header: string; footer: string };
}> = ({ isOpen, onClose, invoice, config }) => {
  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <style>{`
        @page {
          margin: 8mm;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white;
          }
          body * {
            visibility: hidden;
          }
          #invoice-print, #invoice-print * {
            visibility: visible;
          }
          #invoice-print {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            max-width: none !important;
            max-height: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
            display: block !important;
          }
          #invoice-print-scroll {
            display: block !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
          #invoice-print-inner {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            font-size: 13px !important;
          }
          #invoice-print-inner > div:first-child {
            margin-top: 0 !important;
            padding-top: 0 !important;
          }
        }
      `}</style>
      <div id="invoice-print" className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center shrink-0 print:hidden">
          <h3 className="font-bold text-slate-800">Xem trước hóa đơn - {invoice.invoiceNumber}</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2">
              <Printer size={16} /> In
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500">
              <X size={20} />
            </button>
          </div>
        </div>

        <div
          id="invoice-print-scroll"
          className="flex-1 overflow-auto bg-white print:bg-white print:p-0"
        >
          <div
            id="invoice-print-inner"
            className="bg-white p-8 print:shadow-none print:p-0"
            style={{ fontSize: '13px' }}
          >
            {/* Header */}
            <div className="mb-6 pb-4 border-b">
              <div className="flex items-start gap-4">
                {config.company?.logo && (
                  <img src={config.company.logo} alt="Logo" className="w-20 h-20 object-contain flex-shrink-0" />
                )}
                <div className="flex-1">
                  {config.header ? (
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: config.header }} />
                  ) : (
                    <div>
                      <h3 className="font-bold text-slate-800">{config.company?.name || 'TÊN CÔNG TY'}</h3>
                      <p className="text-sm text-slate-600">{config.company?.address || 'Địa chỉ công ty'}</p>
                      <p className="text-sm text-slate-600">ĐT: {config.company?.phone || '0xxx xxx xxx'} | Email: {config.company?.email || 'email@company.com'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Document Title */}
            <div className="py-3 text-center bg-emerald-50 mb-4">
              <h1 className="text-xl font-bold text-emerald-700">HÓA ĐƠN</h1>
              <p className="text-xs text-gray-500">
                Số: {invoice.invoiceNumber} | Ngày: {formatDate(invoice.createdAt)}
                {invoice.dueDate && ` | Hạn TT: ${formatDate(invoice.dueDate)}`}
              </p>
            </div>

            {/* Customer Info */}
            <div className="mb-6 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500">Khách hàng:</p>
                  <p className="font-bold">{invoice.customerName}</p>
                </div>
                <div>
                  <p className="text-gray-500">Địa chỉ:</p>
                  <p className="font-medium">{invoice.customerAddress || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Điện thoại:</p>
                  <p className="font-medium">{invoice.customerPhone || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Email:</p>
                  <p className="font-medium">{invoice.customerEmail || '-'}</p>
                </div>
                {invoice.customerTaxCode && (
                  <div>
                    <p className="text-gray-500">Mã số thuế:</p>
                    <p className="font-medium">{invoice.customerTaxCode}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full border-collapse mb-6">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border px-3 py-2 text-left text-xs font-bold">STT</th>
                  <th className="border px-3 py-2 text-left text-xs font-bold">Mô tả</th>
                  <th className="border px-3 py-2 text-center text-xs font-bold">SL</th>
                  <th className="border px-3 py-2 text-right text-xs font-bold">Đơn giá</th>
                  <th className="border px-3 py-2 text-right text-xs font-bold">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="border px-3 py-2 text-center">{index + 1}</td>
                    <td className="border px-3 py-2">
                      <div className="font-medium">{item.description}</div>
                      {item.specifications && <div className="text-xs text-slate-500">{item.specifications}</div>}
                    </td>
                    <td className="border px-3 py-2 text-center">{item.quantity.toLocaleString()}</td>
                    <td className="border px-3 py-2 text-right">{formatVND(item.unitPrice)}</td>
                    <td className="border px-3 py-2 text-right font-medium">{formatVND(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="border px-3 py-2 text-right">Tạm tính:</td>
                  <td className="border px-3 py-2 text-right">{formatVND(invoice.subtotal)}</td>
                </tr>
                {invoice.discountAmount > 0 && (
                  <tr>
                    <td colSpan={4} className="border px-3 py-2 text-right text-red-600">Giảm giá ({invoice.discountPercent}%):</td>
                    <td className="border px-3 py-2 text-right text-red-600">-{formatVND(invoice.discountAmount)}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={4} className="border px-3 py-2 text-right">VAT ({invoice.vatPercent}%):</td>
                  <td className="border px-3 py-2 text-right">{formatVND(invoice.vatAmount)}</td>
                </tr>
                <tr className="bg-emerald-50 font-bold">
                  <td colSpan={4} className="border px-3 py-2 text-right">TỔNG CỘNG:</td>
                  <td className="border px-3 py-2 text-right text-emerald-600">{formatVND(invoice.total)}</td>
                </tr>
              </tfoot>
            </table>

            {/* Payment Info */}
            {invoice.payments.length > 0 && (
              <div className="mb-6 p-3 bg-slate-50 rounded text-sm">
                <h4 className="font-bold mb-2">Lịch sử thanh toán:</h4>
                <div className="space-y-1">
                  {invoice.payments.map(p => (
                    <div key={p.id} className="flex justify-between text-green-600">
                      <span>{formatDate(p.date)} - {p.method === 'transfer' ? 'CK' : p.method === 'cash' ? 'TM' : p.method}</span>
                      <span>{formatVND(p.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold pt-1 border-t">
                    <span>Còn lại:</span>
                    <span className={invoice.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatVND(invoice.remainingAmount)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {invoice.notes && (
              <div className="mb-6 p-3 bg-slate-50 rounded text-sm">
                <strong>Ghi chú:</strong> {invoice.notes}
              </div>
            )}

            {/* Footer */}
            {config.footer && (
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: config.footer }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
export const InvoicesPage: React.FC<InvoicesPageProps> = ({ onClose }) => {
  const { 
    customers, invoices, config, isLoaded,
    addInvoice, updateInvoice, addPayment, deleteInvoice,
    loadData
  } = useBusinessDatabase();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const itemsPerPage = 10;

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv: Invoice) => {
      const matchesSearch = 
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: invoices.length,
    revenue: invoices.filter((i: Invoice) => i.status === 'PAID').reduce((sum: number, i: Invoice) => sum + Number(i.total || 0), 0),
    pending: invoices.filter((i: Invoice) => ['UNPAID', 'PARTIAL'].includes(i.status)).reduce((sum: number, i: Invoice) => sum + Number(i.remainingAmount || 0), 0),
    paid: invoices.filter((i: Invoice) => i.status === 'PAID').length,
    unpaid: invoices.filter((i: Invoice) => i.status === 'UNPAID').length,
  }), [invoices]);

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handlers
  const handleSave = async (data: Parameters<typeof addInvoice>[0]) => {
    try {
      await addInvoice(data);
    } catch (error) {
      alert('Có lỗi xảy ra khi tạo hóa đơn');
      console.error('Error creating invoice:', error);
    }
  };

  const handleDelete = async (invoice: Invoice) => {
    if (window.confirm(`Bạn có chắc muốn xóa hóa đơn ${invoice.invoiceNumber}?`)) {
      try {
        await deleteInvoice(invoice.id);
      } catch (error) {
        alert('Có lỗi xảy ra khi xóa hóa đơn');
        console.error('Error deleting invoice:', error);
      }
    }
  };

  if (!isLoaded) {
    return <div className="h-full flex items-center justify-center">Đang tải...</div>;
  }

  return (
    <div className="h-full bg-slate-100 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-6 shadow-lg shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-xl">
                <Receipt size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Hóa Đơn</h1>
                <p className="text-emerald-100 text-sm">Quản lý thanh toán & công nợ</p>
              </div>
            </div>
            <button
              onClick={() => { setEditingInvoice(null); setIsEditorOpen(true); }}
              className="bg-white text-emerald-600 px-4 py-2.5 rounded-lg font-bold hover:bg-emerald-50 flex items-center gap-2 shadow-lg"
            >
              <Plus size={18} />
              Tạo hóa đơn
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          {/* Stats */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border">
              <div className="text-sm text-slate-500">Tổng số</div>
              <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border">
              <div className="text-sm text-slate-500">Doanh thu</div>
              <div className="text-lg font-bold text-emerald-600">{formatVND(stats.revenue)}</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border">
              <div className="text-sm text-slate-500">Công nợ</div>
              <div className="text-lg font-bold text-red-600">{formatVND(stats.pending)}</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border">
              <div className="text-sm text-slate-500 flex items-center gap-1">
                <CheckCircle size={12} className="text-green-500" /> Đã TT
              </div>
              <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border">
              <div className="text-sm text-slate-500 flex items-center gap-1">
                <AlertCircle size={12} className="text-red-500" /> Chưa TT
              </div>
              <div className="text-2xl font-bold text-red-600">{stats.unpaid}</div>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo mã hóa đơn, tên khách hàng..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value as InvoiceStatus | 'all'); setCurrentPage(1); }}
                className="px-3 py-2.5 border rounded-lg"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="unpaid">Chưa thanh toán</option>
                <option value="partial">Thanh toán một phần</option>
                <option value="paid">Đã thanh toán</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase">Mã HĐ</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase">Khách hàng</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase">Ngày tạo</th>
                  <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase">Tổng tiền</th>
                  <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase">Còn nợ</th>
                  <th className="text-center px-6 py-4 text-xs font-bold text-slate-500 uppercase">Trạng thái</th>
                  <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      <Receipt size={48} className="mx-auto mb-3 opacity-30" />
                      <p>Chưa có hóa đơn nào</p>
                    </td>
                  </tr>
                ) : (
                  paginatedInvoices.map((invoice: Invoice) => (
                    <tr key={invoice.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-slate-800">{invoice.invoiceNumber}</span>
                        {invoice.quoteNumber && (
                          <div className="text-xs text-slate-400">Từ: {invoice.quoteNumber}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{invoice.customerName}</td>
                      <td className="px-6 py-4 text-slate-600">{formatDate(invoice.createdAt)}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-800">{formatVND(invoice.total)}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={invoice.remainingAmount > 0 ? 'text-red-600 font-bold' : 'text-green-600'}>
                          {formatVND(invoice.remainingAmount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setPreviewInvoice(invoice)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg" title="Xem">
                            <Eye size={16} />
                          </button>
                          {invoice.status !== 'PAID' && (
                            <button onClick={() => setPaymentInvoice(invoice)} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg" title="Thanh toán">
                              <Banknote size={16} />
                            </button>
                          )}
                          <button onClick={() => { setEditingInvoice(invoice); setIsEditorOpen(true); }} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg" title="Sửa">
                            <Edit3 size={16} />
                          </button>
                          <button onClick={() => handleDelete(invoice)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg" title="Xóa">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between">
                <div className="text-sm text-slate-500">
                  Hiển thị {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredInvoices.length)} / {filteredInvoices.length}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border rounded-lg hover:bg-white disabled:opacity-50">
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 border rounded-lg hover:bg-white disabled:opacity-50">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <InvoiceFormModal
        isOpen={isEditorOpen}
        onClose={() => { setIsEditorOpen(false); setEditingInvoice(null); }}
        invoice={editingInvoice}
        customers={customers}
        config={config?.invoice || {}}
        onSave={handleSave}
        onUpdate={updateInvoice}
      />

      {/* Preview Modal */}
      <InvoicePreviewModal
        isOpen={!!previewInvoice}
        onClose={() => setPreviewInvoice(null)}
        invoice={previewInvoice}
        config={{ 
          company: config?.company || {}, 
          header: config?.invoice?.header || '', 
          footer: config?.invoice?.footer || '' 
        }}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={!!paymentInvoice}
        onClose={() => setPaymentInvoice(null)}
        invoice={paymentInvoice}
        onAddPayment={addPayment}
      />
    </div>
  );
};

export default InvoicesPage;
