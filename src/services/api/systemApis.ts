import { supabase } from '../supabase';
import { ActivityLog } from '../../types/api';
import { getUserId, PaginationParams, paginate } from './helpers';

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

export const { uploadFile, uploadFiles, deleteFile } = fileApi;

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
