import { useState, useEffect, useCallback } from 'react';
import {
  Customer,
  Quote,
  Invoice,
  BusinessConfig,
  DEFAULT_BUSINESS_CONFIG,
  QuoteItem,
  InvoiceItem,
  InvoicePayment,
  QuoteStatus,
  InvoiceStatus,
} from '../../types/business';
import { 
  customerApi, 
  quoteApi, 
  invoiceApi, 
  businessConfigApi 
} from '../../services/businessApi';
import { useAuth } from '../../components/auth';
import { transformBackendToFrontend } from './configTransformer';
import { createCustomer, updateCustomerRecord, deleteCustomerRecord } from './customerOperations';
import { createQuote, updateQuoteRecord, updateQuoteStatusRecord, deleteQuoteRecord } from './quoteOperations';
import {
  createInvoice,
  updateInvoiceRecord,
  addInvoicePaymentRecord,
  updateInvoiceStatusRecord,
  deleteInvoiceRecord,
  convertQuoteToInvoiceRecord,
} from './invoiceOperations';
import {
  updateConfigRecord,
  updateCompanyInfoRecord,
  updateQuoteConfigRecord,
  updateInvoiceConfigRecord,
} from './configOperations';
import { fetchBusinessStats } from './statsOperations';

export const useBusinessDatabase = () => {
  const { isAuthenticated, user } = useAuth();
  
  // State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [config, setConfig] = useState<BusinessConfig>(DEFAULT_BUSINESS_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data on mount and when user changes
  const loadData = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setCustomers([]);
      setQuotes([]);
      setInvoices([]);
      setConfig(DEFAULT_BUSINESS_CONFIG);
      setIsLoaded(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [customersData, quotesData, invoicesData, configData] = await Promise.all([
        customerApi.getAll(),
        quoteApi.getAll(),
        invoiceApi.getAll(),
        businessConfigApi.get(),
      ]);

      setCustomers(customersData);
      setQuotes(quotesData);
      setInvoices(invoicesData);
      
      const frontendConfig = configData ? transformBackendToFrontend(configData) : DEFAULT_BUSINESS_CONFIG;
      setConfig(frontendConfig);
      
      setIsLoaded(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load data';
      if (msg.includes('future') || msg.includes('JWT')) {
        try {
          const { supabase } = await import('../../services/supabase');
          await supabase.auth.refreshSession();
          const [c, q, i, cfg] = await Promise.all([customerApi.getAll(), quoteApi.getAll(), invoiceApi.getAll(), businessConfigApi.get()]);
          setCustomers(c); setQuotes(q); setInvoices(i);
          setConfig(cfg ? transformBackendToFrontend(cfg) : DEFAULT_BUSINESS_CONFIG);
          setIsLoaded(true);
          return;
        } catch {}
      }
      setError(msg);
      console.error('Error loading business data:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Customer Operations
  const addCustomer = useCallback(
    (data: Omit<Customer, 'id' | 'totalOrders' | 'totalSpent' | 'createdAt' | 'updatedAt'>) =>
      createCustomer(data, setCustomers, setError),
    []
  );

  const updateCustomer = useCallback(
    (id: string, data: Partial<Customer>) =>
      updateCustomerRecord(id, data, setCustomers, setError),
    []
  );

  const deleteCustomer = useCallback(
    (id: string) => deleteCustomerRecord(id, setCustomers, setError),
    []
  );

  const getCustomer = useCallback(
    (id: string): Customer | undefined => customers.find(c => c.id === id),
    [customers]
  );

  // Quote Operations
  const addQuote = useCallback(
    (data: {
      customerId: string;
      items: Omit<QuoteItem, 'id'>[];
      discountPercent?: number;
      vatPercent?: number;
      validUntil?: string;
      notes?: string;
    }) => createQuote(data, config.quote, setQuotes, setError),
    [config.quote]
  );

  const updateQuote = useCallback(
    (id: string, data: Partial<Quote>) =>
      updateQuoteRecord(id, data, setQuotes, setError),
    []
  );

  const updateQuoteStatus = useCallback(
    (id: string, status: QuoteStatus) =>
      updateQuoteStatusRecord(id, status, setQuotes, setError),
    []
  );

  const deleteQuote = useCallback(
    (id: string) => deleteQuoteRecord(id, setQuotes, setError),
    []
  );

  const getQuote = useCallback(
    (id: string): Quote | undefined => quotes.find(q => q.id === id),
    [quotes]
  );

  // Invoice Operations
  const addInvoice = useCallback(
    (data: {
      customerId: string;
      items: Omit<InvoiceItem, 'id'>[];
      discountPercent?: number;
      vatPercent?: number;
      dueDate?: string;
      notes?: string;
      quoteId?: string;
      quoteNumber?: string;
    }) => createInvoice(data, config.invoice, setInvoices, setQuotes, setError),
    [config.invoice]
  );

  const updateInvoice = useCallback(
    (id: string, data: Partial<Invoice>) =>
      updateInvoiceRecord(id, data, setInvoices, setError),
    []
  );

  const addPayment = useCallback(
    (invoiceId: string, payment: Omit<InvoicePayment, 'id'>) =>
      addInvoicePaymentRecord(invoiceId, payment, setInvoices, setCustomers, setError),
    []
  );

  const updateInvoiceStatus = useCallback(
    (id: string, status: InvoiceStatus) =>
      updateInvoiceStatusRecord(id, status, setInvoices, setError),
    []
  );

  const deleteInvoice = useCallback(
    (id: string) => deleteInvoiceRecord(id, setInvoices, setError),
    []
  );

  const getInvoice = useCallback(
    (id: string): Invoice | undefined => invoices.find(inv => inv.id === id),
    [invoices]
  );

  const convertQuoteToInvoice = useCallback(
    (quoteId: string) => convertQuoteToInvoiceRecord(quoteId, setInvoices, setQuotes, setError),
    []
  );

  // Config Operations
  const updateConfig = useCallback(
    (data: Partial<BusinessConfig>) => updateConfigRecord(data, setConfig, setError),
    []
  );

  const updateCompanyInfo = useCallback(
    (data: Partial<BusinessConfig['company']>) =>
      updateCompanyInfoRecord(data, config.company, setConfig, setError),
    [config.company]
  );

  const updateQuoteConfig = useCallback(
    (data: Partial<BusinessConfig['quote']>) =>
      updateQuoteConfigRecord(data, setConfig, setError),
    []
  );

  const updateInvoiceConfig = useCallback(
    (data: Partial<BusinessConfig['invoice']>) =>
      updateInvoiceConfigRecord(data, setConfig, setError),
    []
  );

  // Stats
  const getStats = useCallback(
    () => fetchBusinessStats(customers, quotes, invoices, setError),
    [customers, quotes, invoices]
  );

  return {
    // Data
    customers,
    quotes,
    invoices,
    config,
    isLoaded,
    loading,
    error,

    // Utility
    loadData,

    // Customer operations
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomer,

    // Quote operations
    addQuote,
    updateQuote,
    updateQuoteStatus,
    deleteQuote,
    getQuote,

    // Invoice operations
    addInvoice,
    updateInvoice,
    addPayment,
    updateInvoiceStatus,
    deleteInvoice,
    getInvoice,

    // Conversion
    convertQuoteToInvoice,

    // Config operations
    updateConfig,
    updateCompanyInfo,
    updateQuoteConfig,
    updateInvoiceConfig,

    // Stats
    getStats,
  };
};

export default useBusinessDatabase;
