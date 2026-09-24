import { supabase } from '../supabase';
import {
  Customer,
  Quote,
  Invoice,
  BusinessConfig,
  QuoteStatus,
  InvoiceStatus
} from '../../types/business';
import { toCamel, toSnake, getUserId, PaginationParams, paginate } from './helpers';

// ============================================
// BUSINESS CONFIG API
// ============================================
export const businessConfigApi = {
  getConfig: async (): Promise<BusinessConfig | null> => {
    const userId = await getUserId();
    const { data } = await supabase.from('business_configs').select('*').eq('user_id', userId).maybeSingle();
    return data ? toCamel(data) : null;
  },
  updateConfig: async (updates: Partial<BusinessConfig>): Promise<BusinessConfig> => {
    const userId = await getUserId();
    const snaked = toSnake(updates);
    snaked.user_id = userId;
    const { data, error } = await supabase.from('business_configs').upsert(snaked, { onConflict: 'user_id' }).select().single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  },
};

// ============================================
// CUSTOMER API
// ============================================
export const customerApi = {
  getCustomers: async (params?: PaginationParams) => {
    return paginate<Customer>('customers', params || {}, ['name', 'email', 'phone', 'company']);
  },
  getCustomer: async (id: string): Promise<Customer> => {
    const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  },
  createCustomer: async (cust: Omit<Customer, 'id' | 'totalOrders' | 'totalSpent' | 'createdAt' | 'updatedAt'>): Promise<Customer> => {
    const userId = await getUserId();
    const { data, error } = await supabase.from('customers').insert({ ...toSnake(cust), user_id: userId }).select().single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  },
  updateCustomer: async (id: string, updates: Partial<Customer>): Promise<Customer> => {
    const { data, error } = await supabase.from('customers').update(toSnake(updates)).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  },
  deleteCustomer: async (id: string) => {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};

// ============================================
// QUOTE API
// ============================================
export const quoteApi = {
  getQuotes: async (params?: PaginationParams & { status?: QuoteStatus; customerId?: string }) => {
    return paginate<Quote>('quotes', params || {}, ['quote_number', 'customer_name']);
  },
  getQuote: async (id: string): Promise<Quote> => {
    const { data, error } = await supabase.from('quotes').select('*').eq('id', id).single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  },
  createQuote: async (q: any): Promise<Quote> => {
    const userId = await getUserId();
    const num = `BG-${Date.now().toString(36).toUpperCase()}`;
    const { data, error } = await supabase.from('quotes').insert({
      ...toSnake(q), 
      user_id: userId, 
      quote_number: num, 
      status: 'DRAFT',
      title: q.title || 'Báo giá mới'
    }).select().single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  },
  updateQuote: async (id: string, updates: Partial<Quote>): Promise<Quote> => {
    const { data, error } = await supabase.from('quotes').update(toSnake(updates)).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  },
  updateQuoteStatus: async (id: string, status: QuoteStatus): Promise<Quote> => {
    const extra: any = { status };
    if (status === 'SENT') extra.sent_at = new Date().toISOString();
    if (status === 'ACCEPTED') extra.accepted_at = new Date().toISOString();
    const { data, error } = await supabase.from('quotes').update(extra).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  },
  deleteQuote: async (id: string) => {
    const { error } = await supabase.from('quotes').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
  convertToInvoice: async (id: string): Promise<Invoice> => {
    const quote = await quoteApi.getQuote(id);
    const inv = await invoiceApi.createInvoice({
      customerId: quote.customerId, items: quote.items, subtotal: quote.subtotal,
      discountPercent: quote.discountPercent, discountAmount: quote.discountAmount,
      vatPercent: quote.vatPercent, vatAmount: quote.vatAmount, total: quote.total,
      quoteId: id, quoteNumber: quote.quoteNumber, notes: quote.notes,
    });
    await supabase.from('quotes').update({ invoice_id: inv.id, status: 'ACCEPTED' }).eq('id', id);
    return inv;
  },
};

// ============================================
// INVOICE API
// ============================================
export const invoiceApi = {
  getInvoices: async (params?: PaginationParams & { status?: InvoiceStatus; customerId?: string }) => {
    return paginate<Invoice>('invoices', params || {}, ['invoice_number', 'customer_name']);
  },
  getInvoice: async (id: string): Promise<Invoice> => {
    const { data, error } = await supabase.from('invoices').select('*').eq('id', id).single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  },
  createInvoice: async (inv: any): Promise<Invoice> => {
    const userId = await getUserId();
    const num = `HD-${Date.now().toString(36).toUpperCase()}`;
    const { data, error } = await supabase.from('invoices').insert({
      ...toSnake(inv), 
      user_id: userId, 
      invoice_number: num, 
      status: 'UNPAID',
      paid_amount: 0, 
      remaining_amount: inv.total,
      title: inv.title || 'Hóa đơn mới'
    }).select().single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  },
  updateInvoice: async (id: string, updates: Partial<Invoice>): Promise<Invoice> => {
    const { data, error } = await supabase.from('invoices').update(toSnake(updates)).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  },
  addPayment: async (id: string, payment: { amount: number; method: string; reference?: string; notes?: string; paidAt: Date }): Promise<Invoice> => {
    await supabase.from('invoice_payments').insert({
      invoice_id: id, amount: payment.amount, method: payment.method,
      reference: payment.reference, notes: payment.notes, paid_at: payment.paidAt
    });
    const inv = await invoiceApi.getInvoice(id);
    const newPaid = (inv.paidAmount || 0) + payment.amount;
    const remaining = inv.total - newPaid;
    const status = remaining <= 0 ? 'PAID' : 'PARTIAL';
    return invoiceApi.updateInvoice(id, { paidAmount: newPaid, remainingAmount: remaining, status } as any);
  },
  deleteInvoice: async (id: string) => {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};
