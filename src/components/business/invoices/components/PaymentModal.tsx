import React, { useState, useEffect } from 'react';
import { Banknote, CheckCircle } from 'lucide-react';
import { Invoice, InvoicePayment, formatVND } from '../../../../types/business';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onAddPayment: (invoiceId: string, payment: Omit<InvoicePayment, 'id'>) => void | Promise<any>;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onAddPayment,
}) => {
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<'cash' | 'transfer' | 'card' | 'other'>('transfer');
  const [notes, setNotes] = useState('');

  useEffect(() => {
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
              onChange={(e) => setAmount(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
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
