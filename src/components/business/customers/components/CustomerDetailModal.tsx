import React from 'react';
import { Users, X, Mail, Phone, MapPin, Hash, FileText, Receipt } from 'lucide-react';
import { Customer, formatVND, formatDate } from '../../../../types/business';
import { CustomerQuoteSummary, CustomerInvoiceSummary } from '../types';

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  quotes: CustomerQuoteSummary[];
  invoices: CustomerInvoiceSummary[];
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  isOpen,
  onClose,
  customer,
  quotes,
  invoices,
}) => {
  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-4 border-b bg-gradient-to-r from-indigo-50 to-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Users size={18} className="text-indigo-600" />
              {customer.name}
            </h3>
            <p className="text-sm text-slate-500">{customer.company}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-5 space-y-6">
          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3 rounded-lg">
              <div className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                <Mail size={12} /> Email
              </div>
              <div className="font-medium">{customer.email || '-'}</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <div className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                <Phone size={12} /> Điện thoại
              </div>
              <div className="font-medium">{customer.phone || '-'}</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <div className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                <MapPin size={12} /> Địa chỉ
              </div>
              <div className="font-medium">{customer.address || '-'}</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <div className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                <Hash size={12} /> MST
              </div>
              <div className="font-medium">{customer.taxCode || '-'}</div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-indigo-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-indigo-600">{customer.totalOrders}</div>
              <div className="text-xs text-indigo-500">Đơn hàng</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-lg font-bold text-green-600">{formatVND(customer.totalSpent)}</div>
              <div className="text-xs text-green-500">Tổng chi tiêu</div>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg text-center">
              <div className="text-sm font-bold text-slate-600">{formatDate(customer.createdAt)}</div>
              <div className="text-xs text-slate-500">Ngày tạo</div>
            </div>
          </div>

          {/* Recent Quotes */}
          {quotes.length > 0 && (
            <div>
              <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                <FileText size={16} className="text-amber-500" />
                Báo giá gần đây
              </h4>
              <div className="space-y-2">
                {quotes.slice(0, 3).map(q => (
                  <div key={q.id} className="flex items-center justify-between p-2 bg-amber-50 rounded-lg text-sm">
                    <span className="font-mono">{q.quoteNumber}</span>
                    <span className="font-medium">{formatVND(q.total)}</span>
                    <span className="text-slate-500">{formatDate(q.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Invoices */}
          {invoices.length > 0 && (
            <div>
              <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Receipt size={16} className="text-emerald-500" />
                Hóa đơn gần đây
              </h4>
              <div className="space-y-2">
                {invoices.slice(0, 3).map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg text-sm">
                    <span className="font-mono">{inv.invoiceNumber}</span>
                    <span className="font-medium">{formatVND(inv.total)}</span>
                    <span className="text-slate-500">{formatDate(inv.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {customer.notes && (
            <div>
              <h4 className="font-bold text-slate-700 mb-2">Ghi chú</h4>
              <p className="text-slate-600 bg-slate-50 p-3 rounded-lg">{customer.notes}</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-slate-50 shrink-0">
          <button onClick={onClose} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
