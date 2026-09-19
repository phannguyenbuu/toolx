import { useState, useEffect, useCallback } from 'react';
import {
  Customer,
  Quote,
  Invoice,
  BusinessConfig,
  BusinessDatabase,
  DEFAULT_BUSINESS_CONFIG,
  generateId,
  QuoteItem,
  InvoiceItem,
  InvoicePayment,
  QuoteStatus,
  InvoiceStatus,
} from '../types/business';

// LocalStorage keys
const STORAGE_KEYS = {
  CUSTOMERS: 'business_customers',
  QUOTES: 'business_quotes',
  INVOICES: 'business_invoices',
  CONFIG: 'business_config',
};

// --- LOAD/SAVE HELPERS ---
const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error(`Error loading ${key}:`, e);
  }
  return defaultValue;
};

const saveToStorage = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving ${key}:`, e);
  }
};

// --- MAIN HOOK ---
export const useBusinessDatabase = () => {
  // State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [config, setConfig] = useState<BusinessConfig>(DEFAULT_BUSINESS_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data on mount
  useEffect(() => {
    setCustomers(loadFromStorage(STORAGE_KEYS.CUSTOMERS, []));
    setQuotes(loadFromStorage(STORAGE_KEYS.QUOTES, []));
    setInvoices(loadFromStorage(STORAGE_KEYS.INVOICES, []));
    
    // Load config and merge with businessInfo from account settings
    let loadedConfig = loadFromStorage(STORAGE_KEYS.CONFIG, DEFAULT_BUSINESS_CONFIG);
    try {
      const accountBusinessInfo = localStorage.getItem('businessInfo');
      if (accountBusinessInfo) {
        const info = JSON.parse(accountBusinessInfo);
        loadedConfig = {
          ...loadedConfig,
          company: {
            ...loadedConfig.company,
            name: info.name || loadedConfig.company.name,
            address: info.address || loadedConfig.company.address,
            phone: info.phone || loadedConfig.company.phone,
            email: info.email || loadedConfig.company.email,
            website: info.website,
            taxCode: info.taxCode,
            bankAccount: info.bankAccount,
            bankName: info.bankName,
            bankBranch: info.bankBranch,
            logo: info.logo,
          }
        };
      }
    } catch (e) {
      console.error('Error loading account business info:', e);
    }
    
    setConfig(loadedConfig);
    setIsLoaded(true);
  }, []);

  // Auto-save when data changes
  useEffect(() => {
    if (isLoaded) {
      saveToStorage(STORAGE_KEYS.CUSTOMERS, customers);
    }
  }, [customers, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      saveToStorage(STORAGE_KEYS.QUOTES, quotes);
    }
  }, [quotes, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      saveToStorage(STORAGE_KEYS.INVOICES, invoices);
    }
  }, [invoices, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      saveToStorage(STORAGE_KEYS.CONFIG, config);
    }
  }, [config, isLoaded]);

  // ============================================
  // CUSTOMER OPERATIONS
  // ============================================
  const addCustomer = useCallback((data: Omit<Customer, 'id' | 'totalOrders' | 'totalSpent' | 'createdAt' | 'updatedAt'>): Customer => {
    const now = new Date().toISOString();
    const newCustomer: Customer = {
      ...data,
      id: generateId(),
      totalOrders: 0,
      totalSpent: 0,
      createdAt: now,
      updatedAt: now,
    };
    setCustomers(prev => [newCustomer, ...prev]);
    return newCustomer;
  }, []);

  const updateCustomer = useCallback((id: string, data: Partial<Customer>): void => {
    setCustomers(prev => prev.map(c => 
      c.id === id 
        ? { ...c, ...data, updatedAt: new Date().toISOString() }
        : c
    ));
  }, []);

  const deleteCustomer = useCallback((id: string): boolean => {
    // Check if customer has quotes or invoices
    const hasQuotes = quotes.some(q => q.customerId === id);
    const hasInvoices = invoices.some(i => i.customerId === id);
    if (hasQuotes || hasInvoices) {
      return false; // Cannot delete
    }
    setCustomers(prev => prev.filter(c => c.id !== id));
    return true;
  }, [quotes, invoices]);

  const getCustomer = useCallback((id: string): Customer | undefined => {
    return customers.find(c => c.id === id);
  }, [customers]);

  // Update customer stats when invoice is paid
  const updateCustomerStats = useCallback((customerId: string, orderAmount: number): void => {
    setCustomers(prev => prev.map(c => 
      c.id === customerId 
        ? { 
            ...c, 
            totalOrders: c.totalOrders + 1,
            totalSpent: c.totalSpent + orderAmount,
            updatedAt: new Date().toISOString() 
          }
        : c
    ));
  }, []);

  // ============================================
  // QUOTE OPERATIONS
  // ============================================
  const generateQuoteNumber = useCallback((): string => {
    const year = new Date().getFullYear();
    const number = String(config.quote.nextNumber).padStart(4, '0');
    // Update next number
    setConfig(prev => ({
      ...prev,
      quote: { ...prev.quote, nextNumber: prev.quote.nextNumber + 1 }
    }));
    return `${config.quote.numberPrefix}-${year}-${number}`;
  }, [config.quote.numberPrefix, config.quote.nextNumber]);

  const addQuote = useCallback((data: {
    customerId: string;
    items: Omit<QuoteItem, 'id'>[];
    discountPercent?: number;
    vatPercent?: number;
    validUntil?: string;
    notes?: string;
  }): Quote => {
    const customer = customers.find(c => c.id === data.customerId);
    if (!customer) throw new Error('Customer not found');

    const now = new Date().toISOString();
    const items: QuoteItem[] = data.items.map(item => ({
      ...item,
      id: generateId(),
      total: item.quantity * item.unitPrice,
    }));
    
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const discountPercent = data.discountPercent || 0;
    const discountAmount = subtotal * discountPercent / 100;
    const afterDiscount = subtotal - discountAmount;
    const vatPercent = data.vatPercent ?? config.quote.defaultVatPercent;
    const vatAmount = afterDiscount * vatPercent / 100;
    const total = afterDiscount + vatAmount;

    const validUntil = data.validUntil || 
      new Date(Date.now() + config.quote.defaultValidityDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const newQuote: Quote = {
      id: generateId(),
      quoteNumber: generateQuoteNumber(),
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      items,
      subtotal,
      discountPercent,
      discountAmount,
      vatPercent,
      vatAmount,
      total,
      status: 'DRAFT',
      createdAt: now,
      validUntil,
      notes: data.notes,
    };

    setQuotes(prev => [newQuote, ...prev]);
    return newQuote;
  }, [customers, config.quote, generateQuoteNumber]);

  const updateQuote = useCallback((id: string, data: Partial<Quote>): void => {
    setQuotes(prev => prev.map(q => {
      if (q.id !== id) return q;
      
      // Recalculate totals if items changed
      let updated = { ...q, ...data };
      if (data.items) {
        const items = data.items.map(item => ({
          ...item,
          total: item.quantity * item.unitPrice,
        }));
        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const discountAmount = subtotal * updated.discountPercent / 100;
        const afterDiscount = subtotal - discountAmount;
        const vatAmount = afterDiscount * updated.vatPercent / 100;
        const total = afterDiscount + vatAmount;
        updated = { ...updated, items, subtotal, discountAmount, vatAmount, total };
      }
      return updated;
    }));
  }, []);

  const updateQuoteStatus = useCallback((id: string, status: QuoteStatus): void => {
    const now = new Date().toISOString();
    setQuotes(prev => prev.map(q => {
      if (q.id !== id) return q;
      const updates: Partial<Quote> = { status };
      if (status === 'SENT') updates.sentAt = now;
      if (status === 'ACCEPTED') updates.acceptedAt = now;
      return { ...q, ...updates };
    }));
  }, []);

  const deleteQuote = useCallback((id: string): void => {
    setQuotes(prev => prev.filter(q => q.id !== id));
  }, []);

  const getQuote = useCallback((id: string): Quote | undefined => {
    return quotes.find(q => q.id === id);
  }, [quotes]);

  // ============================================
  // INVOICE OPERATIONS
  // ============================================
  const generateInvoiceNumber = useCallback((): string => {
    const year = new Date().getFullYear();
    const number = String(config.invoice.nextNumber).padStart(4, '0');
    // Update next number
    setConfig(prev => ({
      ...prev,
      invoice: { ...prev.invoice, nextNumber: prev.invoice.nextNumber + 1 }
    }));
    return `${config.invoice.numberPrefix}-${year}-${number}`;
  }, [config.invoice.numberPrefix, config.invoice.nextNumber]);

  const addInvoice = useCallback((data: {
    customerId: string;
    items: Omit<InvoiceItem, 'id'>[];
    discountPercent?: number;
    vatPercent?: number;
    dueDate?: string;
    notes?: string;
    quoteId?: string;
    quoteNumber?: string;
  }): Invoice => {
    const customer = customers.find(c => c.id === data.customerId);
    if (!customer) throw new Error('Customer not found');

    const now = new Date().toISOString();
    const items: InvoiceItem[] = data.items.map(item => ({
      ...item,
      id: generateId(),
      total: item.quantity * item.unitPrice,
    }));
    
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const discountPercent = data.discountPercent || 0;
    const discountAmount = subtotal * discountPercent / 100;
    const afterDiscount = subtotal - discountAmount;
    const vatPercent = data.vatPercent ?? config.invoice.defaultVatPercent;
    const vatAmount = afterDiscount * vatPercent / 100;
    const total = afterDiscount + vatAmount;

    const dueDate = data.dueDate || 
      new Date(Date.now() + config.invoice.defaultPaymentDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const newInvoice: Invoice = {
      id: generateId(),
      invoiceNumber: generateInvoiceNumber(),
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      customerTaxCode: customer.taxCode,
      items,
      subtotal,
      discountPercent,
      discountAmount,
      vatPercent,
      vatAmount,
      total,
      payments: [],
      paidAmount: 0,
      remainingAmount: total,
      status: 'UNPAID',
      createdAt: now,
      dueDate,
      notes: data.notes,
      quoteId: data.quoteId,
      quoteNumber: data.quoteNumber,
    };

    setInvoices(prev => [newInvoice, ...prev]);
    
    // If created from quote, update quote
    if (data.quoteId) {
      setQuotes(prev => prev.map(q => 
        q.id === data.quoteId 
          ? { ...q, invoiceId: newInvoice.id, status: 'ACCEPTED' as QuoteStatus }
          : q
      ));
    }

    return newInvoice;
  }, [customers, config.invoice, generateInvoiceNumber]);

  const updateInvoice = useCallback((id: string, data: Partial<Invoice>): void => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id !== id) return inv;
      
      let updated = { ...inv, ...data };
      
      // Recalculate totals if items changed
      if (data.items) {
        const items = data.items.map(item => ({
          ...item,
          total: item.quantity * item.unitPrice,
        }));
        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const discountAmount = subtotal * updated.discountPercent / 100;
        const afterDiscount = subtotal - discountAmount;
        const vatAmount = afterDiscount * updated.vatPercent / 100;
        const total = afterDiscount + vatAmount;
        const remainingAmount = total - updated.paidAmount;
        updated = { ...updated, items, subtotal, discountAmount, vatAmount, total, remainingAmount };
      }
      
      return updated;
    }));
  }, []);

  const addPayment = useCallback((invoiceId: string, payment: Omit<InvoicePayment, 'id'>): void => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id !== invoiceId) return inv;
      
      const newPayment: InvoicePayment = {
        ...payment,
        id: generateId(),
      };
      
      const payments = [...inv.payments, newPayment];
      const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
      const remainingAmount = inv.total - paidAmount;
      
      let status: InvoiceStatus = inv.status;
      if (paidAmount >= inv.total) {
        status = 'PAID';
      } else if (paidAmount > 0) {
        status = 'PARTIAL';
      }
      
      const updates: Partial<Invoice> = {
        payments,
        paidAmount,
        remainingAmount,
        status,
      };
      
      if (status === 'PAID') {
        updates.paidAt = new Date().toISOString();
        // Update customer stats
        const customer = customers.find(c => c.id === inv.customerId);
        if (customer) {
          updateCustomerStats(inv.customerId, inv.total);
        }
      }
      
      return { ...inv, ...updates };
    }));
  }, [customers, updateCustomerStats]);

  const updateInvoiceStatus = useCallback((id: string, status: InvoiceStatus): void => {
    setInvoices(prev => prev.map(inv => 
      inv.id === id ? { ...inv, status } : inv
    ));
  }, []);

  const deleteInvoice = useCallback((id: string): void => {
    setInvoices(prev => prev.filter(inv => inv.id !== id));
  }, []);

  const getInvoice = useCallback((id: string): Invoice | undefined => {
    return invoices.find(inv => inv.id === id);
  }, [invoices]);

  // ============================================
  // QUOTE TO INVOICE CONVERSION
  // ============================================
  const convertQuoteToInvoice = useCallback((quoteId: string): Invoice | null => {
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) return null;
    if (quote.invoiceId) return null; // Already converted

    const invoiceItems: Omit<InvoiceItem, 'id'>[] = quote.items.map(item => ({
      description: item.description,
      specifications: item.specifications,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
      notes: item.notes,
    }));

    return addInvoice({
      customerId: quote.customerId,
      items: invoiceItems,
      discountPercent: quote.discountPercent,
      vatPercent: quote.vatPercent,
      notes: quote.notes,
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
    });
  }, [quotes, addInvoice]);

  // ============================================
  // CONFIG OPERATIONS
  // ============================================
  const updateConfig = useCallback((data: Partial<BusinessConfig>): void => {
    setConfig(prev => ({ ...prev, ...data }));
  }, []);

  const updateCompanyInfo = useCallback((data: Partial<BusinessConfig['company']>): void => {
    setConfig(prev => ({ ...prev, company: { ...prev.company, ...data } }));
  }, []);

  const updateQuoteConfig = useCallback((data: Partial<BusinessConfig['quote']>): void => {
    setConfig(prev => ({ ...prev, quote: { ...prev.quote, ...data } }));
  }, []);

  const updateInvoiceConfig = useCallback((data: Partial<BusinessConfig['invoice']>): void => {
    setConfig(prev => ({ ...prev, invoice: { ...prev.invoice, ...data } }));
  }, []);

  // ============================================
  // STATISTICS
  // ============================================
  const getStats = useCallback(() => {
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
  }, [customers, quotes, invoices]);

  return {
    // Data
    customers,
    quotes,
    invoices,
    config,
    isLoaded,

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
