import React from 'react';
import { Search, Receipt, Eye, Banknote, Edit3, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Invoice, InvoiceStatus, formatVND, formatDate } from '../../../../types/business';
import { StatusBadge } from './StatusBadge';

interface InvoicesTableProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: InvoiceStatus | 'all';
  setStatusFilter: (filter: InvoiceStatus | 'all') => void;
  paginatedInvoices: Invoice[];
  totalFilteredCount: number;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  itemsPerPage: number;
  totalPages: number;
  onPreview: (invoice: Invoice) => void;
  onPayment: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
}

export const InvoicesTable: React.FC<InvoicesTableProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  paginatedInvoices,
  totalFilteredCount,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  totalPages,
  onPreview,
  onPayment,
  onEdit,
  onDelete,
}) => {
  return (
    <>
      {/* Search & Filter */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã hóa đơn, tên khách hàng..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as InvoiceStatus | 'all');
              setCurrentPage(1);
            }}
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
                      <button onClick={() => onPreview(invoice)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg" title="Xem">
                        <Eye size={16} />
                      </button>
                      {invoice.status !== 'PAID' && (
                        <button onClick={() => onPayment(invoice)} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg" title="Thanh toán">
                          <Banknote size={16} />
                        </button>
                      )}
                      <button onClick={() => onEdit(invoice)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg" title="Sửa">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => onDelete(invoice)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg" title="Xóa">
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
              Hiển thị {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalFilteredCount)} / {totalFilteredCount}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border rounded-lg hover:bg-white disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border rounded-lg hover:bg-white disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
