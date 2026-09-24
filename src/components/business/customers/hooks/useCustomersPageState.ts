import { useState, useMemo } from 'react';
import { normalizeVietnamese } from '../../../../utils/stringUtils';
import { Customer, Quote, Invoice } from '../../../../types/business';
import { useBusinessDatabase } from '../../../../hooks/useBusinessDatabaseApi';
import { CustomerFormSaveData, CustomersStatsData } from '../types';

export const useCustomersPageState = () => {
  const { 
    customers, quotes, invoices, addCustomer, updateCustomer, deleteCustomer, 
    isLoaded, loading, error, loadData
  } = useBusinessDatabase();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const itemsPerPage = 10;

  // Filter customers
  const filteredCustomers = useMemo(() => {
    const normalizedSearch = normalizeVietnamese(searchTerm);
    return customers.filter((c: Customer) => 
      normalizeVietnamese(c.name).includes(normalizedSearch) ||
      normalizeVietnamese(c.email).includes(normalizedSearch) ||
      normalizeVietnamese(c.company).includes(normalizedSearch) ||
      normalizeVietnamese(c.phone).includes(normalizedSearch)
    );
  }, [customers, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const stats: CustomersStatsData = useMemo(() => ({
    total: customers.length,
    totalOrders: customers.reduce((sum: number, c: Customer) => sum + c.totalOrders, 0),
    totalSpent: customers.reduce((sum: number, c: Customer) => sum + Number(c.totalSpent || 0), 0),
    vip: customers.filter((c: Customer) => c.totalOrders >= 10).length,
  }), [customers]);

  // Get customer's quotes and invoices
  const getCustomerQuotes = (customerId: string) => 
    quotes.filter((q: Quote) => q.customerId === customerId).map((q: Quote) => ({
      id: q.id, quoteNumber: q.quoteNumber, total: q.total, status: q.status, createdAt: q.createdAt
    }));
  
  const getCustomerInvoices = (customerId: string) => 
    invoices.filter((i: Invoice) => i.customerId === customerId).map((i: Invoice) => ({
      id: i.id, invoiceNumber: i.invoiceNumber, total: i.total, status: i.status, createdAt: i.createdAt
    }));

  // Handlers
  const handleSave = async (data: CustomerFormSaveData) => {
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, data);
      } else {
        await addCustomer(data);
      }
      setEditingCustomer(null);
    } catch (err) {
      alert('Có lỗi xảy ra khi lưu khách hàng');
      console.error('Error saving customer:', err);
    }
  };

  const handleDelete = async (customer: Customer) => {
    const hasData = quotes.some((q: Quote) => q.customerId === customer.id) || invoices.some((i: Invoice) => i.customerId === customer.id);
    if (hasData) {
      alert('Không thể xóa khách hàng này vì đã có báo giá hoặc hóa đơn liên quan.');
      return;
    }
    if (window.confirm(`Bạn có chắc muốn xóa khách hàng "${customer.name}"?`)) {
      try {
        await deleteCustomer(customer.id);
      } catch (err) {
        alert('Có lỗi xảy ra khi xóa khách hàng');
        console.error('Error deleting customer:', err);
      }
    }
  };

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  return {
    isLoaded,
    loading,
    error,
    loadData,
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
  };
};
