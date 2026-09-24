import React from 'react';
import {
  Users, Mail, Phone, Building2, Edit3, Trash2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Customer, formatVND, formatDate } from '../../../../types/business';

interface CustomersTableProps {
  paginatedCustomers: Customer[];
  searchTerm: string;
  currentPage: number;
  totalPages: number;
  totalFilteredCount: number;
  itemsPerPage: number;
  onSelectCustomer: (customer: Customer) => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customer: Customer) => void;
  onAddNewCustomer: () => void;
  onPageChange: (newPage: number) => void;
}

export const CustomersTable: React.FC<CustomersTableProps> = ({
  paginatedCustomers,
  searchTerm,
  currentPage,
  totalPages,
  totalFilteredCount,
  itemsPerPage,
  onSelectCustomer,
  onEditCustomer,
  onDeleteCustomer,
  onAddNewCustomer,
  onPageChange,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase">Khách hàng</th>
              <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase">Liên hệ</th>
              <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase">Công ty</th>
              <th className="text-center px-6 py-4 text-xs font-bold text-slate-500 uppercase">Đơn hàng</th>
              <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase">Tổng chi tiêu</th>
              <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedCustomers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                  <Users size={48} className="mx-auto mb-3 opacity-30" />
                  <p>{searchTerm ? 'Không tìm thấy khách hàng phù hợp' : 'Chưa có khách hàng nào'}</p>
                  {!searchTerm && (
                    <button 
                      onClick={onAddNewCustomer}
                      className="mt-3 text-indigo-600 hover:underline"
                    >
                      Thêm khách hàng đầu tiên
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              paginatedCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => onSelectCustomer(customer)}
                      className="flex items-center gap-3 text-left hover:text-indigo-600"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        customer.totalOrders >= 20 ? 'bg-amber-100 text-amber-600' :
                        customer.totalOrders >= 10 ? 'bg-green-100 text-green-600' :
                        'bg-indigo-100 text-indigo-600'
                      }`}>
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">{customer.name}</div>
                        <div className="text-xs text-slate-400">
                          Từ {formatDate(customer.createdAt)}
                        </div>
                      </div>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {customer.email && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail size={12} className="text-slate-400" />
                          {customer.email}
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone size={12} className="text-slate-400" />
                          {customer.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Building2 size={14} className="text-slate-400" />
                      {customer.company || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                      customer.totalOrders >= 20 ? 'bg-amber-100 text-amber-700' :
                      customer.totalOrders >= 10 ? 'bg-green-100 text-green-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {customer.totalOrders}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-medium text-slate-800">{formatVND(customer.totalSpent)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEditCustomer(customer)}
                        className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg"
                        title="Sửa"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => onDeleteCustomer(customer)}
                        className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
                        title="Xóa"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Hiển thị {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalFilteredCount)} / {totalFilteredCount}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 border rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
              if (page > totalPages) return null;
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`w-10 h-10 rounded-lg font-medium ${
                    currentPage === page
                      ? 'bg-indigo-600 text-white'
                      : 'border hover:bg-white text-slate-600'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
