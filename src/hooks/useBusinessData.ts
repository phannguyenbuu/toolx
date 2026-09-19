import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  customerApi, 
  quoteApi, 
  invoiceApi, 
  businessConfigApi, 
  statsApi 
} from '../services/api';
import { 
  Customer, 
  Quote, 
  Invoice, 
  BusinessConfig, 
  QuoteStatus, 
  InvoiceStatus 
} from '../types/business';
import { useSupabaseAuth as useAuth } from '../components/auth/SupabaseAuthContext';

// ============================================
// TYPES
// ============================================

interface BusinessStats {
  totalCustomers: number;
  totalQuotes: number;
  totalInvoices: number;
  quotesByStatus: Record<string, number>;
  invoicesByStatus: Record<string, number>;
  totalRevenue: number;
  pendingAmount: number;
}

interface UseBusinessDataState {
  // Data
  customers: Customer[];
  quotes: Quote[];
  invoices: Invoice[];
  config: BusinessConfig | null;
  stats: BusinessStats | null;
  
  // Loading states
  isLoading: boolean;
  customersLoading: boolean;
  quotesLoading: boolean;
  invoicesLoading: boolean;
  configLoading: boolean;
  statsLoading: boolean;
  
  // Error states
  error: string | null;
  customersError: string | null;
  quotesError: string | null;
  invoicesError: string | null;
  configError: string | null;
  statsError: string | null;
  
  // Success flags
  isLoaded: boolean;
}

interface UseBusinessDataActions {
  // Refresh functions
  refreshAll: () => Promise<void>;
  refreshCustomers: () => Promise<void>;
  refreshQuotes: () => Promise<void>;
  refreshInvoices: () => Promise<void>;
  refreshConfig: () => Promise<void>;
  refreshStats: () => Promise<void>;
  
  // Customer actions
  createCustomer: (data: Omit<Customer, 'id' | 'totalOrders' | 'totalSpent' | 'createdAt' | 'updatedAt'>) => Promise<Customer>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;
  
  // Quote actions
  createQuote: (data: {
    customerId: string;
    items: any[];
    subtotal: number;
    discountPercent?: number;
    discountAmount?: number;
    vatPercent?: number;
    vatAmount?: number;
    total: number;
    validUntil?: Date;
    notes?: string;
  }) => Promise<Quote>;
  updateQuote: (id: string, data: Partial<Quote>) => Promise<Quote>;
  updateQuoteStatus: (id: string, status: QuoteStatus) => Promise<Quote>;
  deleteQuote: (id: string) => Promise<void>;
  convertQuoteToInvoice: (id: string) => Promise<Invoice>;
  
  // Invoice actions
  createInvoice: (data: {
    customerId: string;
    items: any[];
    subtotal: number;
    discountPercent?: number;
    discountAmount?: number;
    vatPercent?: number;
    vatAmount?: number;
    total: number;
    dueDate?: Date;
    notes?: string;
    quoteId?: string;
    quoteNumber?: string;
  }) => Promise<Invoice>;
  updateInvoice: (id: string, data: Partial<Invoice>) => Promise<Invoice>;
  addPayment: (invoiceId: string, paymentData: {
    amount: number;
    method: string;
    reference?: string;
    notes?: string;
    paidAt: Date;
  }) => Promise<Invoice>;
  deleteInvoice: (id: string) => Promise<void>;
  
  // Config actions
  updateConfig: (data: Partial<BusinessConfig>) => Promise<BusinessConfig>;
}

type UseBusinessDataReturn = UseBusinessDataState & UseBusinessDataActions;

// ============================================
// MAIN HOOK
// ============================================

export const useBusinessData = (): UseBusinessDataReturn => {
  const { isAuthenticated, user } = useAuth();
  const mountedRef = useRef(true);
  
  // State
  const [state, setState] = useState<UseBusinessDataState>({
    // Data
    customers: [],
    quotes: [],
    invoices: [],
    config: null,
    stats: null,
    
    // Loading states
    isLoading: false,
    customersLoading: false,
    quotesLoading: false,
    invoicesLoading: false,
    configLoading: false,
    statsLoading: false,
    
    // Error states
    error: null,
    customersError: null,
    quotesError: null,
    invoicesError: null,
    configError: null,
    statsError: null,
    
    // Success flags
    isLoaded: false,
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Helper function to update state safely
  const updateState = useCallback((updates: Partial<UseBusinessDataState>) => {
    if (mountedRef.current) {
      setState(prev => ({ ...prev, ...updates }));
    }
  }, []);

  // Helper function to handle errors
  const handleError = useCallback((error: any, type: string) => {
    const errorMessage = error?.message || `Lỗi khi tải ${type}`;
    console.error(`Business Data Error (${type}):`, error);
    return errorMessage;
  }, []);

  // ============================================
  // DATA LOADING FUNCTIONS
  // ============================================

  const loadCustomers = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    updateState({ customersLoading: true, customersError: null });
    
    try {
      const result = await customerApi.getCustomers();
      updateState({ 
        customers: result.data || result, // Handle both paginated and direct array response
        customersLoading: false 
      });
    } catch (error) {
      const errorMessage = handleError(error, 'khách hàng');
      updateState({ 
        customersError: errorMessage, 
        customersLoading: false 
      });
    }
  }, [isAuthenticated, user, updateState, handleError]);

  const loadQuotes = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    updateState({ quotesLoading: true, quotesError: null });
    
    try {
      const result = await quoteApi.getQuotes();
      updateState({ 
        quotes: result.data || result,
        quotesLoading: false 
      });
    } catch (error) {
      const errorMessage = handleError(error, 'báo giá');
      updateState({ 
        quotesError: errorMessage, 
        quotesLoading: false 
      });
    }
  }, [isAuthenticated, user, updateState, handleError]);

  const loadInvoices = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    updateState({ invoicesLoading: true, invoicesError: null });
    
    try {
      const result = await invoiceApi.getInvoices();
      updateState({ 
        invoices: result.data || result,
        invoicesLoading: false 
      });
    } catch (error) {
      const errorMessage = handleError(error, 'hóa đơn');
      updateState({ 
        invoicesError: errorMessage, 
        invoicesLoading: false 
      });
    }
  }, [isAuthenticated, user, updateState, handleError]);

  const loadConfig = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    updateState({ configLoading: true, configError: null });
    
    try {
      const config = await businessConfigApi.getConfig();
      updateState({ 
        config,
        configLoading: false 
      });
    } catch (error) {
      const errorMessage = handleError(error, 'cấu hình');
      updateState({ 
        configError: errorMessage, 
        configLoading: false 
      });
    }
  }, [isAuthenticated, user, updateState, handleError]);

  const loadStats = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    updateState({ statsLoading: true, statsError: null });
    
    try {
      const stats = await statsApi.getBusinessStats();
      updateState({ 
        stats,
        statsLoading: false 
      });
    } catch (error) {
      const errorMessage = handleError(error, 'thống kê');
      updateState({ 
        statsError: errorMessage, 
        statsLoading: false 
      });
    }
  }, [isAuthenticated, user, updateState, handleError]);

  // ============================================
  // REFRESH FUNCTIONS
  // ============================================

  const refreshAll = useCallback(async () => {
    if (!isAuthenticated || !user) {
      // Reset state when not authenticated
      updateState({
        customers: [],
        quotes: [],
        invoices: [],
        config: null,
        stats: null,
        isLoaded: false,
        error: null,
      });
      return;
    }

    updateState({ isLoading: true, error: null });

    try {
      await Promise.all([
        loadCustomers(),
        loadQuotes(),
        loadInvoices(),
        loadConfig(),
        loadStats(),
      ]);
      
      updateState({ isLoaded: true });
    } catch (error) {
      const errorMessage = handleError(error, 'dữ liệu');
      updateState({ error: errorMessage });
    } finally {
      updateState({ isLoading: false });
    }
  }, [isAuthenticated, user, loadCustomers, loadQuotes, loadInvoices, loadConfig, loadStats, updateState, handleError]);

  const refreshCustomers = useCallback(async () => {
    await loadCustomers();
  }, [loadCustomers]);

  const refreshQuotes = useCallback(async () => {
    await loadQuotes();
  }, [loadQuotes]);

  const refreshInvoices = useCallback(async () => {
    await loadInvoices();
  }, [loadInvoices]);

  const refreshConfig = useCallback(async () => {
    await loadConfig();
  }, [loadConfig]);

  const refreshStats = useCallback(async () => {
    await loadStats();
  }, [loadStats]);

  // ============================================
  // CUSTOMER ACTIONS
  // ============================================

  const createCustomer = useCallback(async (data: Omit<Customer, 'id' | 'totalOrders' | 'totalSpent' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newCustomer = await customerApi.createCustomer(data);
      updateState({
        customers: [newCustomer, ...state.customers]
      });
      return newCustomer;
    } catch (error) {
      const errorMessage = handleError(error, 'tạo khách hàng');
      throw new Error(errorMessage);
    }
  }, [updateState, handleError, state.customers]);

  const updateCustomer = useCallback(async (id: string, data: Partial<Customer>) => {
    try {
      const updatedCustomer = await customerApi.updateCustomer(id, data);
      updateState({
        customers: state.customers.map(c => c.id === id ? updatedCustomer : c)
      });
      return updatedCustomer;
    } catch (error) {
      const errorMessage = handleError(error, 'cập nhật khách hàng');
      throw new Error(errorMessage);
    }
  }, [updateState, handleError, state.customers]);

  const deleteCustomer = useCallback(async (id: string) => {
    try {
      await customerApi.deleteCustomer(id);
      updateState({
        customers: state.customers.filter(c => c.id !== id)
      });
    } catch (error) {
      const errorMessage = handleError(error, 'xóa khách hàng');
      throw new Error(errorMessage);
    }
  }, [updateState, handleError, state.customers]);

  // ============================================
  // QUOTE ACTIONS
  // ============================================

  const createQuote = useCallback(async (data: {
    customerId: string;
    items: any[];
    subtotal: number;
    discountPercent?: number;
    discountAmount?: number;
    vatPercent?: number;
    vatAmount?: number;
    total: number;
    validUntil?: Date;
    notes?: string;
  }) => {
    try {
      const newQuote = await quoteApi.createQuote(data);
      updateState({
        quotes: [newQuote, ...state.quotes]
      });
      return newQuote;
    } catch (error) {
      const errorMessage = handleError(error, 'tạo báo giá');
      throw new Error(errorMessage);
    }
  }, [updateState, handleError, state.quotes]);

  const updateQuote = useCallback(async (id: string, data: Partial<Quote>) => {
    try {
      const updatedQuote = await quoteApi.updateQuote(id, data);
      updateState({
        quotes: state.quotes.map(q => q.id === id ? updatedQuote : q)
      });
      return updatedQuote;
    } catch (error) {
      const errorMessage = handleError(error, 'cập nhật báo giá');
      throw new Error(errorMessage);
    }
  }, [updateState, handleError, state.quotes]);

  const updateQuoteStatus = useCallback(async (id: string, status: QuoteStatus) => {
    try {
      const updatedQuote = await quoteApi.updateQuoteStatus(id, status);
      updateState({
        quotes: state.quotes.map(q => q.id === id ? updatedQuote : q)
      });
      return updatedQuote;
    } catch (error) {
      const errorMessage = handleError(error, 'cập nhật trạng thái báo giá');
      throw new Error(errorMessage);
    }
  }, [updateState, handleError, state.quotes]);

  const deleteQuote = useCallback(async (id: string) => {
    try {
      await quoteApi.deleteQuote(id);
      updateState({
        quotes: state.quotes.filter(q => q.id !== id)
      });
    } catch (error) {
      const errorMessage = handleError(error, 'xóa báo giá');
      throw new Error(errorMessage);
    }
  }, [updateState, handleError, state.quotes]);

  const convertQuoteToInvoice = useCallback(async (id: string) => {
    try {
      const newInvoice = await quoteApi.convertToInvoice(id);
      updateState({
        invoices: [newInvoice, ...state.invoices],
        quotes: state.quotes.map(q => 
          q.id === id 
            ? { ...q, invoiceId: newInvoice.id, status: 'ACCEPTED' as QuoteStatus }
            : q
        )
      });
      return newInvoice;
    } catch (error) {
      const errorMessage = handleError(error, 'chuyển báo giá thành hóa đơn');
      throw new Error(errorMessage);
    }
  }, [updateState, handleError, state.invoices, state.quotes]);

  // ============================================
  // INVOICE ACTIONS
  // ============================================

  const createInvoice = useCallback(async (data: {
    customerId: string;
    items: any[];
    subtotal: number;
    discountPercent?: number;
    discountAmount?: number;
    vatPercent?: number;
    vatAmount?: number;
    total: number;
    dueDate?: Date;
    notes?: string;
    quoteId?: string;
    quoteNumber?: string;
  }) => {
    try {
      const newInvoice = await invoiceApi.createInvoice(data);
      updateState({
        invoices: [newInvoice, ...state.invoices]
      });
      return newInvoice;
    } catch (error) {
      const errorMessage = handleError(error, 'tạo hóa đơn');
      throw new Error(errorMessage);
    }
  }, [updateState, handleError, state.invoices]);

  const updateInvoice = useCallback(async (id: string, data: Partial<Invoice>) => {
    try {
      const updatedInvoice = await invoiceApi.updateInvoice(id, data);
      updateState({
        invoices: state.invoices.map(inv => inv.id === id ? updatedInvoice : inv)
      });
      return updatedInvoice;
    } catch (error) {
      const errorMessage = handleError(error, 'cập nhật hóa đơn');
      throw new Error(errorMessage);
    }
  }, [updateState, handleError, state.invoices]);

  const addPayment = useCallback(async (invoiceId: string, paymentData: {
    amount: number;
    method: string;
    reference?: string;
    notes?: string;
    paidAt: Date;
  }) => {
    try {
      const updatedInvoice = await invoiceApi.addPayment(invoiceId, paymentData);
      updateState({
        invoices: state.invoices.map(inv => inv.id === invoiceId ? updatedInvoice : inv)
      });
      
      // Refresh customers to update stats
      await refreshCustomers();
      
      return updatedInvoice;
    } catch (error) {
      const errorMessage = handleError(error, 'thêm thanh toán');
      throw new Error(errorMessage);
    }
  }, [updateState, handleError, refreshCustomers, state.invoices]);

  const deleteInvoice = useCallback(async (id: string) => {
    try {
      await invoiceApi.deleteInvoice(id);
      updateState({
        invoices: state.invoices.filter(inv => inv.id !== id)
      });
    } catch (error) {
      const errorMessage = handleError(error, 'xóa hóa đơn');
      throw new Error(errorMessage);
    }
  }, [updateState, handleError, state.invoices]);

  // ============================================
  // CONFIG ACTIONS
  // ============================================

  const updateConfig = useCallback(async (data: Partial<BusinessConfig>) => {
    try {
      const updatedConfig = await businessConfigApi.updateConfig(data);
      updateState({ config: updatedConfig });
      return updatedConfig;
    } catch (error) {
      const errorMessage = handleError(error, 'cập nhật cấu hình');
      throw new Error(errorMessage);
    }
  }, [updateState, handleError]);

  // ============================================
  // EFFECTS
  // ============================================

  // Auto load data when authenticated
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // ============================================
  // RETURN HOOK
  // ============================================

  return {
    // State
    ...state,
    
    // Actions
    refreshAll,
    refreshCustomers,
    refreshQuotes,
    refreshInvoices,
    refreshConfig,
    refreshStats,
    
    // Customer actions
    createCustomer,
    updateCustomer,
    deleteCustomer,
    
    // Quote actions
    createQuote,
    updateQuote,
    updateQuoteStatus,
    deleteQuote,
    convertQuoteToInvoice,
    
    // Invoice actions
    createInvoice,
    updateInvoice,
    addPayment,
    deleteInvoice,
    
    // Config actions
    updateConfig,
  };
};

export default useBusinessData;