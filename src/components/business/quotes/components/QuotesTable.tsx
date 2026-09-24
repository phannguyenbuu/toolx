import React from 'react';
import { Search, FileText, Eye, Edit3, Send, ArrowRight, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Quote, QuoteStatus, formatVND, formatDate } from '../../../../types/business';
import { StatusBadge } from './StatusBadge';

interface QuotesTableProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: QuoteStatus | 'all';
  setStatusFilter: (filter: QuoteStatus | 'all') => void;
  paginatedQuotes: Quote[];
  totalFilteredCount: number;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  itemsPerPage: number;
  totalPages: number;
  onPreview: (quote: Quote) => void;
  onEdit: (quote: Quote) => void;
  onSend: (quoteId: string) => void;
  onConvertToInvoice: (quote: Quote) => void;
  onDelete: (quote: Quote) => void;
}

export const QuotesTable: React.FC<QuotesTableProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  paginatedQuotes,
  totalFilteredCount,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  totalPages,
  onPreview,
  onEdit,
  onSend,
  onConvertToInvoice,
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
              placeholder="Tìm kiếm theo mã báo giá, tên khách hàng..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as QuoteStatus | 'all');
              setCurrentPage(1);
            }}
            className="px-3 py-2.5 border rounded-lg"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="draft">Nháp</option>
            <option value="sent">Đã gửi</option>
            <option value="accepted">Đã chấp nhận</option>
            <option value="rejected">Từ chối</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase">Mã báo giá</th>
              <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase">Khách hàng</th>
              <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase">Ngày tạo</th>
              <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase">Tổng tiền</th>
              <th className="text-center px-6 py-4 text-xs font-bold text-slate-500 uppercase">Trạng thái</th>
              <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedQuotes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                  <FileText size={48} className="mx-auto mb-3 opacity-30" />
                  <p>Chưa có báo giá nào</p>
                </td>
              </tr>
            ) : (
              paginatedQuotes.map((quote: Quote) => (
                <tr key={quote.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <span className="font-mono font-bold text-slate-800">{quote.quoteNumber}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{quote.customerName}</td>
                  <td className="px-6 py-4 text-slate-600">{formatDate(quote.createdAt)}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-800">{formatVND(quote.total)}</td>
                  <td className="px-6 py-4 text-center">
                    <StatusBadge status={quote.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onPreview(quote)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg" title="Xem">
                        <Eye size={16} />
                      </button>
                      <button onClick={() => onEdit(quote)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg" title="Sửa">
                        <Edit3 size={16} />
                      </button>
                      {quote.status === 'DRAFT' && (
                        <button onClick={() => onSend(quote.id)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="Đánh dấu đã gửi">
                          <Send size={16} />
                        </button>
                      )}
                      {['SENT', 'ACCEPTED'].includes(quote.status) && !quote.invoiceId && (
                        <button onClick={() => onConvertToInvoice(quote)} className="p-2 text-green-500 hover:bg-green-50 rounded-lg" title="Tạo hóa đơn">
                          <ArrowRight size={16} />
                        </button>
                      )}
                      <button onClick={() => onDelete(quote)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg" title="Xóa">
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
