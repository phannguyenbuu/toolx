import { supabase } from '../supabase';
import { PaginatedResponse } from '../../types/api';

// ============================================
// HELPER: Convert snake_case DB rows to camelCase
// ============================================
export const toCamel = (row: any): any => {
  if (!row) return row;
  if (Array.isArray(row)) return row.map(toCamel);
  const out: any = {};
  for (const [k, v] of Object.entries(row)) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = v;
  }
  return out;
};

export const toSnake = (obj: any): any => {
  if (!obj) return obj;
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    const snake = k.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);
    out[snake] = v;
  }
  return out;
};

export const getUserId = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Chưa đăng nhập');
  return user.id;
};

// Pagination helper
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export type ApiResponse<T = any> = { success: boolean; data?: T; message?: string; error?: string };

export const paginate = async <T>(
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
