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
} from '../types/business';
import { 
  customerApi, 
  quoteApi, 
  invoiceApi, 
  businessConfigApi, 
  statsApi 
} from '../services/businessApi';
import { useAuth } from '../components/auth';

// Helper function to transform backend config to frontend format
const transformBackendToFrontend = (backendConfig: any): BusinessConfig => {
  return {
    company: {
      name: backendConfig.businessName || DEFAULT_BUSINESS_CONFIG.company.name,
      address: backendConfig.businessAddress || DEFAULT_BUSINESS_CONFIG.company.address,
      phone: backendConfig.businessPhone || DEFAULT_BUSINESS_CONFIG.company.phone,
      email: backendConfig.businessEmail || DEFAULT_BUSINESS_CONFIG.company.email,
      website: backendConfig.businessWebsite || '',
      taxCode: backendConfig.businessTaxCode || '',
      bankAccount: backendConfig.bankAccount || '',
      bankName: backendConfig.bankName || '',
      bankBranch: backendConfig.bankBranch || '',
      logo: backendConfig.businessLogoUrl || '',
    },
    quote: {
      header: backendConfig.quoteHeader || DEFAULT_BUSINESS_CONFIG.quote.header,
      footer: backendConfig.quoteFooter || DEFAULT_BUSINESS_CONFIG.quote.footer,
      defaultVatPercent: backendConfig.defaultVatPercent || DEFAULT_BUSINESS_CONFIG.quote.defaultVatPercent,
      defaultValidityDays: backendConfig.defaultValidityDays || DEFAULT_BUSINESS_CONFIG.quote.defaultValidityDays,
      defaultPaymentDays: backendConfig.defaultPaymentDays || DEFAULT_BUSINESS_CONFIG.quote.defaultPaymentDays,
      numberPrefix: backendConfig.quoteNumberPrefix || DEFAULT_BUSINESS_CONFIG.quote.numberPrefix,
      nextNumber: backendConfig.quoteNextNumber || DEFAULT_BUSINESS_CONFIG.quote.nextNumber,
    },
    invoice: {
      header: backendConfig.invoiceHeader || DEFAULT_BUSINESS_CONFIG.invoice.header,
      footer: backendConfig.invoiceFooter || DEFAULT_BUSINESS_CONFIG.invoice.footer,
      defaultVatPercent: backendConfig.defaultVatPercent || DEFAULT_BUSINESS_CONFIG.invoice.defaultVatPercent,
      defaultValidityDays: backendConfig.defaultValidityDays || DEFAULT_BUSINESS_CONFIG.invoice.defaultValidityDays,
      defaultPaymentDays: backendConfig.defaultPaymentDays || DEFAULT_BUSINESS_CONFIG.invoice.defaultPaymentDays,
      numberPrefix: backendConfig.invoiceNumberPrefix || DEFAULT_BUSINESS_CONFIG.invoice.numberPrefix,
      nextNumber: backendConfig.invoiceNextNumber || DEFAULT_BUSINESS_CONFIG.invoice.nextNumber,
    },
  };
};

// --- MAIN HOOK ---
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
      // Reset state when not authenticated
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
      
      // Transform backend config to frontend format
      const frontendConfig = configData ? transformBackendToFrontend(configData) : DEFAULT_BUSINESS_CONFIG;
      setConfig(frontendConfig);
      
      setIsLoaded(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load data';
      // Auto-retry on JWT clock skew
      if (msg.includes('future') || msg.includes('JWT')) {
        try {
          const { supabase } = await import('../services/supabase');
          await supabase.auth.refreshSession();
          // Retry once
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

  // ============================================
  // CUSTOMER OPERATIONS
  // ============================================
  const addCustomer = useCallback(async (data: Omit<Customer, 'id' | 'totalOrders' | 'totalSpent' | 'createdAt' | 'updatedAt'>): Promise<Customer> => {
    try {
      const newCustomer = await customerApi.create(data);
      setCustomers(prev => [newCustomer, ...prev]);
      return newCustomer;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer');
      throw err;
    }
  }, []);

  const updateCustomer = useCallback(async (id: string, data: Partial<Customer>): Promise<void> => {
    try {
      const updatedCustomer = await customerApi.update(id, data);
      setCustomers(prev => prev.map(c => c.id === id ? updatedCustomer : c));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update customer');
      throw err;
    }
  }, []);

  const deleteCustomer = useCallback(async (id: string): Promise<boolean> => {
    try {
      await customerApi.delete(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete customer');
      return false;
    }
  }, []);

  const getCustomer = useCallback((id: string): Customer | undefined => {
    return customers.find(c => c.id === id);
  }, [customers]);

  // ============================================
  // QUOTE OPERATIONS
  // ============================================
  const addQuote = useCallback(async (data: {
    customerId: string;
    items: Omit<QuoteItem, 'id'>[];
    discountPercent?: number;
    vatPercent?: number;
    validUntil?: string;
    notes?: string;
  }): Promise<Quote> => {
    try {
      const items = data.items.map(item => ({
        ...item,
        total: item.quantity * item.unitPrice,
      }));
      
      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const discountPercent = data.discountPercent || 0;
      const discountAmount = subtotal * discountPercent / 100;
      const afterDiscount = subtotal - discountAmount;
      const vatPercent = data.vatPercent ?? config.quote.defaultVatPercent;
      const vatAmount = afterDiscount * vatPercent / 100;
      const total = afterDiscount + vatAmount;

      const validUntil = data.validUntil ? new Date(data.validUntil) : 
        new Date(Date.now() + config.quote.defaultValidityDays * 24 * 60 * 60 * 1000);

      const newQuote = await quoteApi.create({
        customerId: data.customerId,
        items,
        subtotal,
        discountPercent,
        discountAmount,
        vatPercent,
        vatAmount,
        total,
        validUntil,
        notes: data.notes,
      });

      setQuotes(prev => [newQuote, ...prev]);
      return newQuote;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create quote');
      throw err;
    }
  }, [config.quote]);

  const updateQuote = useCallback(async (id: string, data: Partial<Quote>): Promise<void> => {
    try {
      const updatedQuote = await quoteApi.update(id, data);
      setQuotes(prev => prev.map(q => q.id === id ? updatedQuote : q));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update quote');
      throw err;
    }
  }, []);

  const updateQuoteStatus = useCallback(async (id: string, status: QuoteStatus): Promise<void> => {
    try {
      const updatedQuote = await quoteApi.updateStatus(id, status);
      setQuotes(prev => prev.map(q => q.id === id ? updatedQuote : q));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update quote status');
      throw err;
    }
  }, []);

  const deleteQuote = useCallback(async (id: string): Promise<void> => {
    try {
      await quoteApi.delete(id);
      setQuotes(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete quote');
      throw err;
    }
  }, []);

  const getQuote = useCallback((id: string): Quote | undefined => {
    return quotes.find(q => q.id === id);
  }, [quotes]);

  // ============================================
  // INVOICE OPERATIONS
  // ============================================
  const addInvoice = useCallback(async (data: {
    customerId: string;
    items: Omit<InvoiceItem, 'id'>[];
    discountPercent?: number;
    vatPercent?: number;
    dueDate?: string;
    notes?: string;
    quoteId?: string;
    quoteNumber?: string;
  }): Promise<Invoice> => {
    try {
      const items = data.items.map(item => ({
        ...item,
        total: item.quantity * item.unitPrice,
      }));
      
      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const discountPercent = data.discountPercent || 0;
      const discountAmount = subtotal * discountPercent / 100;
      const afterDiscount = subtotal - discountAmount;
      const vatPercent = data.vatPercent ?? config.invoice.defaultVatPercent;
      const vatAmount = afterDiscount * vatPercent / 100;
      const total = afterDiscount + vatAmount;

      const dueDate = data.dueDate ? new Date(data.dueDate) : 
        new Date(Date.now() + config.invoice.defaultPaymentDays * 24 * 60 * 60 * 1000);

      const newInvoice = await invoiceApi.create({
        customerId: data.customerId,
        items,
        subtotal,
        discountPercent,
        discountAmount,
        vatPercent,
        vatAmount,
        total,
        dueDate,
        notes: data.notes,
        quoteId: data.quoteId,
        quoteNumber: data.quoteNumber,
      });

      setInvoices(prev => [newInvoice, ...prev]);
      
      // If created from quote, update quotes list
      if (data.quoteId) {
        setQuotes(prev => prev.map(q => 
          q.id === data.quoteId 
            ? { ...q, invoiceId: newInvoice.id, status: 'ACCEPTED' as QuoteStatus }
            : q
        ));
      }

      return newInvoice;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
      throw err;
    }
  }, [config.invoice]);

  const updateInvoice = useCallback(async (id: string, data: Partial<Invoice>): Promise<void> => {
    try {
      const updatedInvoice = await invoiceApi.update(id, data);
      setInvoices(prev => prev.map(inv => inv.id === id ? updatedInvoice : inv));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update invoice');
      throw err;
    }
  }, []);

  const addPayment = useCallback(async (invoiceId: string, payment: Omit<InvoicePayment, 'id'>): Promise<void> => {
    try {
      const updatedInvoice = await invoiceApi.addPayment(invoiceId, {
        amount: payment.amount,
        method: payment.method,
        notes: payment.notes,
        paidAt: new Date(payment.date),
      });
      
      setInvoices(prev => prev.map(inv => inv.id === invoiceId ? updatedInvoice : inv));
      
      // Reload customers to update stats
      const customersData = await customerApi.getAll();
      setCustomers(customersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add payment');
      throw err;
    }
  }, []);

  const updateInvoiceStatus = useCallback(async (id: string, status: InvoiceStatus): Promise<void> => {
    try {
      const updatedInvoice = await invoiceApi.update(id, { status });
      setInvoices(prev => prev.map(inv => inv.id === id ? updatedInvoice : inv));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update invoice status');
      throw err;
    }
  }, []);

  const deleteInvoice = useCallback(async (id: string): Promise<void> => {
    try {
      await invoiceApi.delete(id);
      setInvoices(prev => prev.filter(inv => inv.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete invoice');
      throw err;
    }
  }, []);

  const getInvoice = useCallback((id: string): Invoice | undefined => {
    return invoices.find(inv => inv.id === id);
  }, [invoices]);

  // ============================================
  // QUOTE TO INVOICE CONVERSION
  // ============================================
  const convertQuoteToInvoice = useCallback(async (quoteId: string): Promise<Invoice | null> => {
    try {
      const newInvoice = await quoteApi.convertToInvoice(quoteId);
      
      // Update local state
      setInvoices(prev => [newInvoice, ...prev]);
      setQuotes(prev => prev.map(q => 
        q.id === quoteId 
          ? { ...q, invoiceId: newInvoice.id, status: 'accepted' as QuoteStatus }
          : q
      ));
      
      return newInvoice;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert quote to invoice');
      return null;
    }
  }, []);

  // ============================================
  // CONFIG OPERATIONS
  // ============================================
  const updateConfig = useCallback(async (data: Partial<BusinessConfig>): Promise<void> => {
    try {
      const updatedConfig = await businessConfigApi.update(data);
      setConfig(updatedConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update config');
      throw err;
    }
  }, []);

  const updateCompanyInfo = useCallback(async (data: Partial<BusinessConfig['company']>): Promise<void> => {
    try {
      const updatedConfig = await businessConfigApi.update({
        company: { ...config.company, ...data }
      });
      setConfig(updatedConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update company info');
      throw err;
    }
  }, [config.company]);

  const updateQuoteConfig = useCallback(async (data: Partial<BusinessConfig['quote']>): Promise<void> => {
    try {
      // Transform to backend format
      const backendData: any = {};
      if (data.header !== undefined) backendData.quoteHeader = data.header;
      if (data.footer !== undefined) backendData.quoteFooter = data.footer;
      if (data.defaultVatPercent !== undefined) backendData.defaultVatPercent = data.defaultVatPercent;
      if (data.defaultValidityDays !== undefined) backendData.defaultValidityDays = data.defaultValidityDays;
      if (data.defaultPaymentDays !== undefined) backendData.defaultPaymentDays = data.defaultPaymentDays;
      if (data.numberPrefix !== undefined) backendData.quoteNumberPrefix = data.numberPrefix;
      if (data.nextNumber !== undefined) backendData.quoteNextNumber = data.nextNumber;
      
      const updatedConfig = await businessConfigApi.update(backendData);
      
      // Transform back to frontend format
      const frontendConfig = transformBackendToFrontend(updatedConfig);
      setConfig(frontendConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update quote config');
      throw err;
    }
  }, []);

  const updateInvoiceConfig = useCallback(async (data: Partial<BusinessConfig['invoice']>): Promise<void> => {
    try {
      // Transform to backend format
      const backendData: any = {};
      if (data.header !== undefined) backendData.invoiceHeader = data.header;
      if (data.footer !== undefined) backendData.invoiceFooter = data.footer;
      if (data.defaultVatPercent !== undefined) backendData.defaultVatPercent = data.defaultVatPercent;
      if (data.defaultValidityDays !== undefined) backendData.defaultValidityDays = data.defaultValidityDays;
      if (data.defaultPaymentDays !== undefined) backendData.defaultPaymentDays = data.defaultPaymentDays;
      if (data.numberPrefix !== undefined) backendData.invoiceNumberPrefix = data.numberPrefix;
      if (data.nextNumber !== undefined) backendData.invoiceNextNumber = data.nextNumber;
      
      const updatedConfig = await businessConfigApi.update(backendData);
      
      // Transform back to frontend format
      const frontendConfig = transformBackendToFrontend(updatedConfig);
      setConfig(frontendConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update invoice config');
      throw err;
    }
  }, []);

  // ============================================
  // STATISTICS
  // ============================================
  const getStats = useCallback(async () => {
    try {
      return await statsApi.get();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get stats');
      // Fallback to local calculation
      const totalCustomers = customers.length;
      const totalQuotes = quotes.length;
      const totalInvoices = invoices.length;
      
      const quotesByStatus = {
        draft: quotes.filter(q => q.status === 'DRAFT').length,
        sent: quotes.filter(q => q.status === 'SENT').length,
        accepted: quotes.filter(q => q.status === 'ACCEPTED').length,
        rejected: quotes.filter(q => q.status === 'REJECTED').length,
      };

      const invoicesByStatus = {
        unpaid: invoices.filter(i => i.status === 'UNPAID').length,
        partial: invoices.filter(i => i.status === 'PARTIAL').length,
        paid: invoices.filter(i => i.status === 'PAID').length,
        overdue: invoices.filter(i => i.status === 'OVERDUE').length,
      };

      const totalRevenue = invoices
        .filter(i => i.status === 'PAID')
        .reduce((sum, i) => sum + i.total, 0);

      const pendingAmount = invoices
        .filter(i => ['unpaid', 'partial'].includes(i.status))
        .reduce((sum, i) => sum + i.remainingAmount, 0);

      return {
        totalCustomers,
        totalQuotes,
        totalInvoices,
        quotesByStatus,
        invoicesByStatus,
        totalRevenue,
        pendingAmount,
      };
    }
  }, [customers, quotes, invoices]);

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