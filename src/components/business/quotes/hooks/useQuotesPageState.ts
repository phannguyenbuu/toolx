import { useState, useMemo, useEffect, useCallback } from 'react';
import { Quote, QuoteStatus } from '../../../../types/business';
import { useBusinessDatabase } from '../../../../hooks/useBusinessDatabaseApi';
import { InitialQuoteItem, QuoteFormSaveData, QuotesStatsData } from '../types';

export const useQuotesPageState = () => {
  const { 
    customers, quotes, config, isLoaded,
    addQuote, updateQuote, updateQuoteStatus, deleteQuote, convertQuoteToInvoice,
  } = useBusinessDatabase();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null);
  const [pendingOrderItems, setPendingOrderItems] = useState<InitialQuoteItem[] | null>(null);
  const itemsPerPage = 10;

  // Auto-open form when navigated from Price Calculator with a pending order
  useEffect(() => {
    if (!isLoaded) return;
    try {
      const pending = localStorage.getItem('txp-pending-quote-order');
      if (pending) {
        const order = JSON.parse(pending);
        localStorage.removeItem('txp-pending-quote-order');
        const inputs = order.inputs || {};
        const result = order.result || {};
        const costs = result.costs || {};
        const qty = parseInt(inputs.quantity, 10) || 1;
        const unitPrice = qty > 0 ? Math.round(costs.total / qty) : 0;
        
        setPendingOrderItems([{
          description: `In ${order.type === 'offset' ? 'Offset' : 'Digital'} - ${result.machineName || ''}`,
          specifications: `${inputs.width}x${inputs.height}mm, ${result.paperDisplay || ''}, In ${inputs.printSides === 2 ? '2 mặt' : '1 mặt'}`,
          quantity: qty,
          unitPrice: unitPrice,
          notes: order.customerName ? `Khách: ${order.customerName}` : '',
        }]);
        setIsEditorOpen(true);
      }
    } catch (e) {
      console.error('Error loading pending quote order:', e);
    }
  }, [isLoaded]);

  // Filter quotes
  const filteredQuotes = useMemo(() => {
    return quotes.filter((q: Quote) => {
      const matchesSearch = 
        q.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quotes, searchTerm, statusFilter]);

  // Stats
  const stats: QuotesStatsData = useMemo(() => ({
    total: quotes.length,
    draft: quotes.filter((q: Quote) => q.status === 'DRAFT').length,
    sent: quotes.filter((q: Quote) => q.status === 'SENT').length,
    accepted: quotes.filter((q: Quote) => q.status === 'ACCEPTED').length,
    totalValue: quotes.filter((q: Quote) => q.status === 'ACCEPTED').reduce((sum: number, q: Quote) => sum + Number(q.total || 0), 0),
  }), [quotes]);

  // Pagination
  const totalPages = Math.ceil(filteredQuotes.length / itemsPerPage);
  const paginatedQuotes = filteredQuotes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handlers
  const handleSave = useCallback(async (data: QuoteFormSaveData) => {
    try {
      await addQuote(data as any);
    } catch (error) {
      alert('Có lỗi xảy ra khi tạo báo giá');
      console.error('Error creating quote:', error);
    }
  }, [addQuote]);

  const handleDelete = useCallback(async (quote: Quote) => {
    if (window.confirm(`Bạn có chắc muốn xóa báo giá ${quote.quoteNumber}?`)) {
      try {
        await deleteQuote(quote.id);
      } catch (error) {
        alert('Có lỗi xảy ra khi xóa báo giá');
        console.error('Error deleting quote:', error);
      }
    }
  }, [deleteQuote]);

  const handleConvertToInvoice = useCallback(async (quote: Quote) => {
    if (quote.invoiceId) {
      alert('Báo giá này đã được chuyển thành hóa đơn');
      return;
    }
    if (window.confirm(`Chuyển báo giá ${quote.quoteNumber} thành hóa đơn?`)) {
      try {
        const invoice = await convertQuoteToInvoice(quote.id);
        if (invoice) {
          alert(`Đã tạo hóa đơn ${invoice.invoiceNumber}`);
        }
      } catch (error) {
        alert('Có lỗi xảy ra khi tạo hóa đơn');
        console.error('Error converting quote to invoice:', error);
      }
    }
  }, [convertQuoteToInvoice]);

  return {
    customers,
    quotes,
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
  };
};
