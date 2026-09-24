import React from 'react';
import { Receipt, Plus } from 'lucide-react';
import { InvoicesPageProps } from './types';
import { useInvoicesPageState } from './hooks/useInvoicesPageState';
import { InvoicesStats } from './components/InvoicesStats';
import { InvoicesTable } from './components/InvoicesTable';
import { InvoiceFormModal } from './components/InvoiceFormModal';
import { InvoicePreviewModal } from './components/InvoicePreviewModal';
import { PaymentModal } from './components/PaymentModal';

export const InvoicesPage: React.FC<InvoicesPageProps> = () => {
  const {
    customers,
    config,
    isLoaded,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    filteredInvoices,
    paginatedInvoices,
    totalPages,
    stats,
    isEditorOpen,
    setIsEditorOpen,
    editingInvoice,
    setEditingInvoice,
    previewInvoice,
    setPreviewInvoice,
    paymentInvoice,
    setPaymentInvoice,
    handleSave,
    updateInvoice,
    addPayment,
    handleDelete,
  } = useInvoicesPageState();

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
              onClick={() => {
                setEditingInvoice(null);
                setIsEditorOpen(true);
              }}
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
          <InvoicesStats stats={stats} />

          <InvoicesTable
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            paginatedInvoices={paginatedInvoices}
            totalFilteredCount={filteredInvoices.length}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalPages={totalPages}
            onPreview={setPreviewInvoice}
            onPayment={setPaymentInvoice}
            onEdit={(invoice) => {
              setEditingInvoice(invoice);
              setIsEditorOpen(true);
            }}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Form Modal */}
      <InvoiceFormModal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingInvoice(null);
        }}
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
          footer: config?.invoice?.footer || '',
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
