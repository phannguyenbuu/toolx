import { supabase } from './supabase';
import {
  User,
  Subscription,
  Wallet,
  Transaction,
  ActivityLog,
  PaginatedResponse
} from '../types/api';
import {
  Customer,
  Quote,
  Invoice,
  BusinessConfig,
  QuoteStatus,
  InvoiceStatus
} from '../types/business';

// ============================================
// HELPER: Convert snake_case DB rows to camelCase
// ============================================
const toCamel = (row: any): any => {
  if (!row) return row;
  if (Array.isArray(row)) return row.map(toCamel);
  const out: any = {};
  for (const [k, v] of Object.entries(row)) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = v;
  }
  return out;
};

const toSnake = (obj: any): any => {
  if (!obj) return obj;
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    const snake = k.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);
    out[snake] = v;
  }
  return out;
};

const getUserId = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Chưa đăng nhập');
  return user.id;
};

// Pagination helper
interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const paginate = async <T>(
  table: string,
  params: PaginationParams & Record<string, any> = {},
  searchColumns?: string[]
): Promise<PaginatedResponse<T>> => {
  const userId = await getUserId();
  const page = params.page || 1;
  const limit = params.limit || 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from(table).select('*', { count: 'exact' }).eq('user_id', userId);

  if (params.search && searchColumns?.length) {
    const orFilter = searchColumns.map(c => `${c}.ilike.%${params.search}%`).join(',');
    query = query.or(orFilter);
  }
  if (params.status) query = query.eq('status', params.status);
  if (params.customerId) query = query.eq('customer_id', params.customerId);

  const sortCol = params.sortBy ? params.sortBy.replace(/[A-Z]/g, (c: string) => `_${c.toLowerCase()}`) : 'created_at';
  query = query.order(sortCol, { ascending: params.sortOrder === 'asc' }).range(from, to);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  return {
    data: toCamel(data || []),
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
};

// ============================================
// TOKEN MANAGEMENT (kept for backward compat)
// ============================================
export const tokenManager = {
  getToken: () => null as string | null,
  setToken: (_t: string) => {},
  removeToken: () => {},
  isTokenValid: () => false,
};

// ============================================
// AUTHENTICATION API
// ============================================
export const authApi = {
  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    const profile = await userApi.getProfile();
    const wallet = await walletApi.getWallet();
    return { access_token: data.session?.access_token || '', user: profile, wallet };
  },
  register: async (email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } }
    });
    if (error) throw new Error(error.message);
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id, email, full_name: fullName || '', role: 'user', status: 'active'
      });
      await supabase.from('wallets').insert({ user_id: data.user.id, balance: 0, currency: 'VND' });
    }
    const profile = await userApi.getProfile();
    const wallet = await walletApi.getWallet();
    return { access_token: data.session?.access_token || '', user: profile, wallet };
  },
  refreshToken: async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw new Error(error.message);
    return { access_token: data.session?.access_token || '' };
  },
  logout: async () => { await supabase.auth.signOut(); },
  forgotPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw new Error(error.message);
    return { message: 'Email đặt lại mật khẩu đã được gửi' };
  },
  resetPassword: async (_token: string, password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
    return { message: 'Mật khẩu đã được cập nhật' };
  },
};

// ============================================
// USER PROFILE API
// ============================================
export const userApi = {
  getProfile: async (): Promise<User> => {
    const userId = await getUserId();
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  },
  updateProfile: async (updates: { fullName?: string; phone?: string; avatarUrl?: string }): Promise<User> => {
    const userId = await getUserId();
    const { data, error } = await supabase.from('profiles').update(toSnake(updates)).eq('id', userId).select().single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  },
  uploadAvatar: async (file: File): Promise<{ avatarUrl: string }> => {
    const userId = await getUserId();
    const ext = file.name.split('.').pop();
    const path = `avatars/${userId}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) throw new Error(error.message);
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', userId);
    return { avatarUrl: urlData.publicUrl };
  },
  getOverview: async () => {
    const userId = await getUserId();
    const [profile, wallet, custCount, teamCount, sub] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('wallets').select('*').eq('user_id', userId).single(),
      supabase.from('customers').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('team_members').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
      supabase.from('subscriptions').select('*, subscription_plans(*)').eq('user_id', userId).maybeSingle(),
    ]);
    return {
      user: toCamel(profile.data),
      stats: {
        walletBalance: wallet.data?.balance || 0,
        customersCount: custCount.count || 0,
        teamMembersCount: teamCount.count || 0,
        recentActivityCount: 0,
        totalTransactions: 0,
        totalSpent: 0,
      },
      subscription: sub.data ? toCamel(sub.data) : null,
    };
  },
  changePassword: async (_currentPassword: string, newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    return { success: true };
  },
  deactivateAccount: async (_data: { reason?: string; feedback?: string }) => {
    const userId = await getUserId();
    await supabase.from('profiles').update({ status: 'inactive' }).eq('id', userId);
    await supabase.auth.signOut();
    return { success: true };
  },
};

// ============================================
// SUBSCRIPTION API
// ============================================
export const subscriptionApi = {
  getPlans: async () => {
    const { data, error } = await supabase.from('subscription_plans').select('*').eq('is_active', true).order('sort_order');
    if (error) throw new Error(error.message);
    return toCamel(data || []);
  },
  getSubscription: async (): Promise<Subscription | null> => {
    const userId = await getUserId();
    const { data } = await supabase.from('subscriptions').select('*, subscription_plans(*)').eq('user_id', userId).maybeSingle();
    return data ? toCamel(data) : null;
  },
  upgradeSubscription: async (planId: string, _paymentMethod: string) => {
    const userId = await getUserId();
    const now = new Date().toISOString();
    const end = new Date(Date.now() + 30 * 86400000).toISOString();
    const { data, error } = await supabase.from('subscriptions').upsert({
      user_id: userId, plan_id: planId, status: 'active', billing_cycle: 'monthly',
      current_period_start: now, current_period_end: end
    }, { onConflict: 'user_id' }).select().single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  },
  cancelSubscription: async () => {
    const userId = await getUserId();
    await supabase.from('subscriptions').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('user_id', userId);
    return { success: true };
  },
};

// ============================================
// WALLET & TRANSACTIONS API
// ============================================
export const walletApi = {
  getWallet: async (): Promise<Wallet> => {
    const userId = await getUserId();
    let { data, error } = await supabase.from('wallets').select('*').eq('user_id', userId).maybeSingle();
    if (!data) {
      const res = await supabase.from('wallets').insert({ user_id: userId, balance: 0, currency: 'VND' }).select().single();
      data = res.data;
      error = res.error;
    }
    if (error) throw new Error(error.message);
    return toCamel(data);
  },
  getTransactions: async (params?: PaginationParams & { type?: string; status?: string }) => {
    return paginate<Transaction>('transactions', params || {});
  },
  topupWallet: async (amount: number, paymentMethod: string) => {
    const userId = await getUserId();
    const wallet = await walletApi.getWallet();
    const newBalance = (wallet.balance || 0) + amount;
    const { data, error } = await supabase.from('transactions').insert({
      user_id: userId, type: 'topup', amount, balance_before: wallet.balance,
      balance_after: newBalance, payment_method: paymentMethod, status: 'completed'
    }).select().single();
    if (error) throw new Error(error.message);
    await supabase.from('wallets').update({ balance: newBalance }).eq('user_id', userId);
    return toCamel(data);
  },
};

// ============================================
// TEAM API
// ============================================
export const teamApi = {
  getTeamMembers: async () => {
    const userId = await getUserId();
    const { data: members, error } = await supabase.from('team_members').select('*').eq('owner_id', userId);
    if (error) throw new Error(error.message);
    
    // Fetch profiles separately
    if (!members || members.length === 0) return [];
    const userIds = members.map((m: any) => m.user_id);
    const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
    
    // Merge data
    const result = members.map((member: any) => ({
      ...member,
      profiles: profiles?.find((p: any) => p.id === member.user_id) || null
    }));
    
    return toCamel(result);
  },
  inviteTeamMember: async (inv: { email: string; role: string; permissions: string[] }) => {
    const userId = await getUserId();
    const { data: profile } = await supabase.from('profiles').select('id').eq('email', inv.email).single();
    if (!profile) throw new Error('Không tìm thấy người dùng với email này');
    const { data, error } = await supabase.from('team_members').insert({
      owner_id: userId, user_id: profile.id, role: inv.role, permissions: inv.permissions, status: 'pending'
    }).select().single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  },
  updateTeamMember: async (id: string, updates: { role?: string; permissions?: string[]; status?: string }) => {
    const { data, error } = await supabase.from('team_members').update(toSnake(updates)).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  },
  removeTeamMember: async (id: string) => {
    const { error } = await supabase.from('team_members').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  },
};

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

// ============================================
// ACTIVITY LOG API
// ============================================
export const activityApi = {
  getActivityHistory: async (params?: PaginationParams & { type?: string }) => {
    return paginate<ActivityLog>('activity_logs', params || {});
  },
};

// ============================================
// STATISTICS API
// ============================================
export const statsApi = {
  getBusinessStats: async () => {
    const userId = await getUserId();
    const [cust, quotes, invoices] = await Promise.all([
      supabase.from('customers').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('quotes').select('status, total').eq('user_id', userId),
      supabase.from('invoices').select('status, total, paid_amount').eq('user_id', userId),
    ]);
    const qByStatus: Record<string, number> = {};
    (quotes.data || []).forEach((q: any) => { qByStatus[q.status] = (qByStatus[q.status] || 0) + 1; });
    const iByStatus: Record<string, number> = {};
    let revenue = 0, pending = 0;
    (invoices.data || []).forEach((i: any) => {
      iByStatus[i.status] = (iByStatus[i.status] || 0) + 1;
      revenue += Number(i.paid_amount || 0);
      pending += Number(i.total || 0) - Number(i.paid_amount || 0);
    });
    return {
      totalCustomers: cust.count || 0,
      totalQuotes: (quotes.data || []).length,
      totalInvoices: (invoices.data || []).length,
      quotesByStatus: qByStatus,
      invoicesByStatus: iByStatus,
      totalRevenue: revenue,
      pendingAmount: pending,
    };
  },
  getUserStats: async () => {
    const userId = await getUserId();
    const { count } = await supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', userId);
    return { totalProjects: count || 0, totalExports: 0, storageUsed: 0, recentActivity: 0 };
  },
};

// ============================================
// FILE UPLOAD API (via Supabase Storage)
// ============================================
export const fileApi = {
  uploadFile: async (file: File, folder?: string) => {
    const userId = await getUserId();
    const path = `${folder || 'general'}/${userId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('files').upload(path, file);
    if (error) throw new Error(error.message);
    const { data: urlData } = supabase.storage.from('files').getPublicUrl(path);
    return { id: path, filename: file.name, originalName: file.name, mimeType: file.type, size: file.size, path, url: urlData.publicUrl };
  },
  uploadFiles: async (files: File[], folder?: string) => {
    return Promise.all(files.map(f => fileApi.uploadFile(f, folder)));
  },
  deleteFile: async (fileId: string) => {
    await supabase.storage.from('files').remove([fileId]);
  },
};

// ============================================
// HEALTH CHECK API
// ============================================
export const healthApi = {
  checkHealth: async () => {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    return {
      status: error ? 'error' : 'ok',
      timestamp: new Date().toISOString(),
      database: error ? 'disconnected' : 'connected',
      services: { supabase: 'connected', python: 'unknown' },
    };
  },
};

// ============================================
// EXPORTS
// ============================================
export default supabase;
export const { uploadFile, uploadFiles, deleteFile } = fileApi;
export type { PaginationParams };
export type ApiResponse<T = any> = { success: boolean; data?: T; message?: string; error?: string };
