import React from 'react';
import { FileText, Plus } from 'lucide-react';
import { QuotesPageProps } from './types';
import { useQuotesPageState } from './hooks/useQuotesPageState';
import { QuotesStats } from './components/QuotesStats';
import { QuotesTable } from './components/QuotesTable';
import { QuoteFormModal } from './components/QuoteFormModal';
import { QuotePreviewModal } from './components/QuotePreviewModal';

export const QuotesPage: React.FC<QuotesPageProps> = () => {
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
    filteredQuotes,
    paginatedQuotes,
    totalPages,
    stats,
    isEditorOpen,
    setIsEditorOpen,
    editingQuote,
    setEditingQuote,
    previewQuote,
    setPreviewQuote,
    pendingOrderItems,
    setPendingOrderItems,
    handleSave,
    updateQuote,
    updateQuoteStatus,
    handleDelete,
    handleConvertToInvoice,
  } = useQuotesPageState();

  if (!isLoaded) {
    return <div className="h-full flex items-center justify-center">Đang tải...</div>;
  }

  return (
    <div className="h-full bg-slate-100 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-6 shadow-lg shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-xl">
                <FileText size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Báo Giá</h1>
                <p className="text-amber-100 text-sm">Quản lý báo giá khách hàng</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingQuote(null);
                setIsEditorOpen(true);
              }}
              className="bg-white text-amber-600 px-4 py-2.5 rounded-lg font-bold hover:bg-amber-50 flex items-center gap-2 shadow-lg"
            >
              <Plus size={18} />
              Tạo báo giá
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          <QuotesStats stats={stats} />

          <QuotesTable
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            paginatedQuotes={paginatedQuotes}
            totalFilteredCount={filteredQuotes.length}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalPages={totalPages}
            onPreview={setPreviewQuote}
            onEdit={(quote) => {
              setEditingQuote(quote);
              setIsEditorOpen(true);
            }}
            onSend={(quoteId) => updateQuoteStatus(quoteId, 'SENT')}
            onConvertToInvoice={handleConvertToInvoice}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Form Modal */}
      <QuoteFormModal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingQuote(null);
          setPendingOrderItems(null);
        }}
        quote={editingQuote}
        customers={customers}
        config={config?.quote || {}}
        initialItems={pendingOrderItems || undefined}
        onSave={handleSave}
        onUpdate={updateQuote}
      />

      {/* Preview Modal */}
      <QuotePreviewModal
        isOpen={!!previewQuote}
        onClose={() => setPreviewQuote(null)}
        quote={previewQuote}
        config={{ 
          company: config?.company || {}, 
          header: config?.quote?.header || '', 
          footer: config?.quote?.footer || '',
        }}
      />
    </div>
  );
};

export default QuotesPage;
