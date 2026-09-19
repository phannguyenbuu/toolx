import { supabase } from './supabase';

// ===== AUTH =====

// Đăng ký
export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { data, error };
};

// Đăng nhập
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
};

// Đăng xuất
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

// Lấy user hiện tại
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// ===== DATABASE =====

// Lấy tất cả records từ table
export const getAll = async (table: string) => {
  const { data, error } = await supabase.from(table).select('*');
  return { data, error };
};

// Lấy 1 record theo ID
export const getById = async (table: string, id: string) => {
  const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
  return { data, error };
};

// Tạo mới
export const create = async (table: string, values: any) => {
  const { data, error } = await supabase.from(table).insert(values).select();
  return { data, error };
};

// Cập nhật
export const update = async (table: string, id: string, values: any) => {
  const { data, error } = await supabase.from(table).update(values).eq('id', id).select();
  return { data, error };
};

// Xóa
export const remove = async (table: string, id: string) => {
  const { error } = await supabase.from(table).delete().eq('id', id);
  return { error };
};

// ===== STORAGE =====

// Upload file
export const uploadFile = async (bucket: string, path: string, file: File) => {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file);
  return { data, error };
};

// Lấy public URL
export const getPublicUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

// ===== REALTIME =====

// Subscribe to changes
export const subscribeToTable = (table: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`${table}_changes`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
    .subscribe();
};
