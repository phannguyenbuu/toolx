import { supabase } from './supabase';

const getUserId = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Chưa đăng nhập');
  return user.id;
};

export const workspaceService = {
  getWorkspaces: async () => {
    const userId = await getUserId();
    const { data, error } = await supabase.from('workspaces').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  createWorkspace: async (workspace: any) => {
    const userId = await getUserId();
    const { data, error } = await supabase.from('workspaces').insert({ ...workspace, user_id: userId }).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  updateWorkspace: async (id: string, workspace: any) => {
    const { data, error } = await supabase.from('workspaces').update(workspace).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  deleteWorkspace: async (id: string) => {
    const { error } = await supabase.from('workspaces').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  },

  saveWorkspace: async (workspace: any) => {
    const userId = await getUserId();
    const { data, error } = await supabase.from('workspaces').insert({ ...workspace, user_id: userId }).select().single();
    if (error) throw new Error(error.message);
    return data;
  },
};

export default workspaceService;
