import React from 'react';
import { Plus, Search } from 'lucide-react';
import { BusinessHeader } from '../BusinessHeader';
import { CustomersStats } from './components/CustomersStats';
import { CustomersTable } from './components/CustomersTable';
import { CustomerFormModal } from './components/CustomerFormModal';
import { CustomerDetailModal } from './components/CustomerDetailModal';
import { useCustomersPageState } from './hooks/useCustomersPageState';
import { CustomersPageProps } from './types';

export const CustomersPage: React.FC<CustomersPageProps> = () => {
  const {
    isLoaded,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    isModalOpen,
    editingCustomer,
    viewingCustomer,
    setViewingCustomer,
    itemsPerPage,
    filteredCustomers,
    totalPages,
    paginatedCustomers,
    stats,
    getCustomerQuotes,
    getCustomerInvoices,
    handleSave,
    handleDelete,
    handleOpenAddModal,
    handleOpenEditModal,
    handleCloseModal,
  } = useCustomersPageState();

  if (!isLoaded) {
    return <div className="h-full flex items-center justify-center">Đang tải...</div>;
  }

  return (
    <div className="h-full bg-slate-100 flex flex-col overflow-hidden">
      {/* Header */}
      <BusinessHeader
        title="Khách Hàng"
        subtitle="Quản lý danh sách khách hàng"
        isLoaded={isLoaded}
        loading={loading}
        error={error}
      >
        <button
          onClick={handleOpenAddModal}
          className="bg-white text-indigo-600 px-4 py-2.5 rounded-lg font-bold hover:bg-indigo-50 flex items-center gap-2 shadow-lg"
        >
          <Plus size={18} />
          Thêm khách hàng
        </button>
      </BusinessHeader>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          {/* Search Bar */}
          <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên, email, công ty, số điện thoại..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Stats */}
          <CustomersStats stats={stats} />

          {/* Table */}
          <CustomersTable
            paginatedCustomers={paginatedCustomers}
            searchTerm={searchTerm}
            currentPage={currentPage}
            totalPages={totalPages}
            totalFilteredCount={filteredCustomers.length}
            itemsPerPage={itemsPerPage}
            onSelectCustomer={(c) => setViewingCustomer(c)}
            onEditCustomer={handleOpenEditModal}
            onDeleteCustomer={handleDelete}
            onAddNewCustomer={handleOpenAddModal}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Form Modal */}
      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        customer={editingCustomer}
        onSave={handleSave}
      />

      {/* Detail Modal */}
      <CustomerDetailModal
        isOpen={!!viewingCustomer}
        onClose={() => setViewingCustomer(null)}
        customer={viewingCustomer}
        quotes={viewingCustomer ? getCustomerQuotes(viewingCustomer.id) : []}
        invoices={viewingCustomer ? getCustomerInvoices(viewingCustomer.id) : []}
      />
    </div>
  );
};

export default CustomersPage;
