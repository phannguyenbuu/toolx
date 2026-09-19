import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import * as api from '../services/supabaseApi';

// =====================================================
// useProjects Hook
// =====================================================

export const useProjects = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchProjects = async () => {
    setLoading(true);
    const { data, error } = await api.projectsApi.getAll();
    if (error) setError(error);
    else setProjects(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();

    const subscription = supabase
      .channel('projects_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        fetchProjects();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const createProject = async (project: any) => {
    const { data, error } = await api.projectsApi.create(project);
    if (!error) fetchProjects();
    return { data, error };
  };

  const updateProject = async (id: string, updates: any) => {
    const { data, error } = await api.projectsApi.update(id, updates);
    if (!error) fetchProjects();
    return { data, error };
  };

  const deleteProject = async (id: string) => {
    const { error } = await api.projectsApi.delete(id);
    if (!error) fetchProjects();
    return { error };
  };

  return {
    projects,
    loading,
    error,
    refresh: fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  };
};

// =====================================================
// useCustomers Hook
// =====================================================

export const useCustomers = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data } = await api.customersApi.getAll();
    setCustomers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();

    const subscription = supabase
      .channel('customers_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
        fetchCustomers();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const createCustomer = async (customer: any) => {
    const { data, error } = await api.customersApi.create(customer);
    if (!error) fetchCustomers();
    return { data, error };
  };

  const updateCustomer = async (id: string, updates: any) => {
    const { data, error } = await api.customersApi.update(id, updates);
    if (!error) fetchCustomers();
    return { data, error };
  };

  const deleteCustomer = async (id: string) => {
    const { error } = await api.customersApi.delete(id);
    if (!error) fetchCustomers();
    return { error };
  };

  return {
    customers,
    loading,
    refresh: fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  };
};

// =====================================================
// useQuotes Hook
// =====================================================

export const useQuotes = () => {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotes = async () => {
    setLoading(true);
    const { data } = await api.quotesApi.getAll();
    setQuotes(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchQuotes();

    const subscription = supabase
      .channel('quotes_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, () => {
        fetchQuotes();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const createQuote = async (quote: any) => {
    const { data, error } = await api.quotesApi.create(quote);
    if (!error) fetchQuotes();
    return { data, error };
  };

  const updateQuote = async (id: string, updates: any) => {
    const { data, error } = await api.quotesApi.update(id, updates);
    if (!error) fetchQuotes();
    return { data, error };
  };

  const deleteQuote = async (id: string) => {
    const { error } = await api.quotesApi.delete(id);
    if (!error) fetchQuotes();
    return { error };
  };

  return {
    quotes,
    loading,
    refresh: fetchQuotes,
    createQuote,
    updateQuote,
    deleteQuote,
  };
};

// =====================================================
// useInvoices Hook
// =====================================================

export const useInvoices = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = async () => {
    setLoading(true);
    const { data } = await api.invoicesApi.getAll();
    setInvoices(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();

    const subscription = supabase
      .channel('invoices_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        fetchInvoices();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const createInvoice = async (invoice: any) => {
    const { data, error } = await api.invoicesApi.create(invoice);
    if (!error) fetchInvoices();
    return { data, error };
  };

  const updateInvoice = async (id: string, updates: any) => {
    const { data, error } = await api.invoicesApi.update(id, updates);
    if (!error) fetchInvoices();
    return { data, error };
  };

  const deleteInvoice = async (id: string) => {
    const { error } = await api.invoicesApi.delete(id);
    if (!error) fetchInvoices();
    return { error };
  };

  return {
    invoices,
    loading,
    refresh: fetchInvoices,
    createInvoice,
    updateInvoice,
    deleteInvoice,
  };
};

// =====================================================
// useProducts Hook
// =====================================================

export const useProducts = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await api.productsApi.getAll();
    setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();

    const subscription = supabase
      .channel('products_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const createProduct = async (product: any) => {
    const { data, error } = await api.productsApi.create(product);
    if (!error) fetchProducts();
    return { data, error };
  };

  const updateProduct = async (id: string, updates: any) => {
    const { data, error } = await api.productsApi.update(id, updates);
    if (!error) fetchProducts();
    return { data, error };
  };

  const deleteProduct = async (id: string) => {
    const { error } = await api.productsApi.delete(id);
    if (!error) fetchProducts();
    return { error };
  };

  return {
    products,
    loading,
    refresh: fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
  };
};

// =====================================================
// useTemplates Hook
// =====================================================

export const useTemplates = (publicOnly = false) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await api.templatesApi.getAll(publicOnly);
    setTemplates(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();

    const subscription = supabase
      .channel('templates_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'templates' }, () => {
        fetchTemplates();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [publicOnly]);

  const createTemplate = async (template: any) => {
    const { data, error } = await api.templatesApi.create(template);
    if (!error) fetchTemplates();
    return { data, error };
  };

  const updateTemplate = async (id: string, updates: any) => {
    const { data, error } = await api.templatesApi.update(id, updates);
    if (!error) fetchTemplates();
    return { data, error };
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await api.templatesApi.delete(id);
    if (!error) fetchTemplates();
    return { error };
  };

  return {
    templates,
    loading,
    refresh: fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
};

// =====================================================
// useProfile Hook
// =====================================================

export const useProfile = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    setLoading(true);
    const { data } = await api.profileApi.get();
    setProfile(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const updateProfile = async (updates: any) => {
    const { data, error } = await api.profileApi.update(updates);
    if (!error) setProfile(data);
    return { data, error };
  };

  const uploadAvatar = async (file: File) => {
    const { data, error } = await api.profileApi.uploadAvatar(file);
    if (!error) setProfile(data);
    return { data, error };
  };

  return {
    profile,
    loading,
    refresh: fetchProfile,
    updateProfile,
    uploadAvatar,
  };
};
