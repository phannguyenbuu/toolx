import { supabase } from './supabase';

// =====================================================
// PROJECTS API
// =====================================================

export const projectsApi = {
  // Get all projects
  getAll: async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });
    return { data, error };
  },

  // Get project by ID
  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    return { data, error };
  },

  // Create project
  create: async (project: any) => {
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select()
      .single();
    return { data, error };
  },

  // Update project
  update: async (id: string, updates: any) => {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  // Delete project
  delete: async (id: string) => {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);
    return { error };
  },
};

// =====================================================
// CUSTOMERS API
// =====================================================

export const customersApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');
    return { data, error };
  },

  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();
    return { data, error };
  },

  create: async (customer: any) => {
    const { data, error } = await supabase
      .from('customers')
      .insert(customer)
      .select()
      .single();
    return { data, error };
  },

  update: async (id: string, updates: any) => {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);
    return { error };
  },
};

// =====================================================
// QUOTES API
// =====================================================

export const quotesApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('quotes')
      .select('*, customer:customers(*)')
      .order('created_at', { ascending: false });
    return { data, error };
  },

  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('quotes')
      .select('*, customer:customers(*)')
      .eq('id', id)
      .single();
    return { data, error };
  },

  create: async (quote: any) => {
    const { data, error } = await supabase
      .from('quotes')
      .insert(quote)
      .select()
      .single();
    return { data, error };
  },

  update: async (id: string, updates: any) => {
    const { data, error } = await supabase
      .from('quotes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id);
    return { error };
  },
};

// =====================================================
// INVOICES API
// =====================================================

export const invoicesApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, customer:customers(*)')
      .order('created_at', { ascending: false });
    return { data, error };
  },

  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, customer:customers(*)')
      .eq('id', id)
      .single();
    return { data, error };
  },

  create: async (invoice: any) => {
    const { data, error } = await supabase
      .from('invoices')
      .insert(invoice)
      .select()
      .single();
    return { data, error };
  },

  update: async (id: string, updates: any) => {
    const { data, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);
    return { error };
  },
};

// =====================================================
// PRODUCTS API
// =====================================================

export const productsApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');
    return { data, error };
  },

  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    return { data, error };
  },

  create: async (product: any) => {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single();
    return { data, error };
  },

  update: async (id: string, updates: any) => {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    return { error };
  },
};

// =====================================================
// TEMPLATES API
// =====================================================

export const templatesApi = {
  getAll: async (publicOnly = false) => {
    let query = supabase.from('templates').select('*');
    if (publicOnly) {
      query = query.eq('is_public', true);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    return { data, error };
  },

  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();
    return { data, error };
  },

  create: async (template: any) => {
    const { data, error } = await supabase
      .from('templates')
      .insert(template)
      .select()
      .single();
    return { data, error };
  },

  update: async (id: string, updates: any) => {
    const { data, error } = await supabase
      .from('templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id);
    return { error };
  },
};

// =====================================================
// FILES API
// =====================================================

export const filesApi = {
  getAll: async (projectId?: string) => {
    let query = supabase.from('files').select('*');
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    return { data, error };
  },

  create: async (file: any) => {
    const { data, error } = await supabase
      .from('files')
      .insert(file)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from('files')
      .delete()
      .eq('id', id);
    return { error };
  },
};

// =====================================================
// STORAGE API
// =====================================================

export const storageApi = {
  // Upload file
  upload: async (bucket: string, path: string, file: File) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true });
    return { data, error };
  },

  // Get public URL
  getPublicUrl: (bucket: string, path: string) => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  // Delete file
  delete: async (bucket: string, path: string) => {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    return { error };
  },

  // List files
  list: async (bucket: string, path: string = '') => {
    const { data, error } = await supabase.storage.from(bucket).list(path);
    return { data, error };
  },
};

// =====================================================
// PROFILE API
// =====================================================

export const profileApi = {
  get: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    return { data, error };
  },

  update: async (updates: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    return { data, error };
  },

  uploadAvatar: async (file: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('Not authenticated') };

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) return { data: null, error: uploadError };

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const { data, error } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id)
      .select()
      .single();

    return { data, error };
  },
};
