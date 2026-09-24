import { useState, useMemo, useCallback } from 'react';
import { Invoice, InvoiceStatus } from '../../../../types/business';
import { useBusinessDatabase } from '../../../../hooks/useBusinessDatabaseApi';
import { InvoiceFormSaveData, InvoicesStatsData } from '../types';

export const useInvoicesPageState = () => {
  const { 
    customers, invoices, config, isLoaded,
    addInvoice, updateInvoice, addPayment, deleteInvoice,
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
  const stats: InvoicesStatsData = useMemo(() => ({
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
  const handleSave = useCallback(async (data: InvoiceFormSaveData) => {
    try {
      await addInvoice(data as any);
    } catch (error) {
      alert('Có lỗi xảy ra khi tạo hóa đơn');
      console.error('Error creating invoice:', error);
    }
  }, [addInvoice]);

  const handleDelete = useCallback(async (invoice: Invoice) => {
    if (window.confirm(`Bạn có chắc muốn xóa hóa đơn ${invoice.invoiceNumber}?`)) {
      try {
        await deleteInvoice(invoice.id);
      } catch (error) {
        alert('Có lỗi xảy ra khi xóa hóa đơn');
        console.error('Error deleting invoice:', error);
      }
    }
  }, [deleteInvoice]);

  return {
    customers,
    invoices,
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
  };
};
