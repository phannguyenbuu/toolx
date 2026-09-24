import { supabase } from '../supabase';
import { toCamel, toSnake, getUserId } from './helpers';

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
