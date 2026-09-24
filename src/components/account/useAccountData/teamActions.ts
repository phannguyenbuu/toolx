import {
  AccountPlan,
  TeamMember,
  ActivityLog
} from '../types';
import { accountPlans } from '../constants';
import { teamApi } from '../../../services/userApi';
import { SubscriptionPlan } from '../../../services/subscriptionPlansApi';

export interface TeamActionContext {
  isAuthenticated: boolean;
  currentPlan: AccountPlan;
  teamMembers: TeamMember[];
  activities: ActivityLog[];
  subscriptionPlans: SubscriptionPlan[];
  loadAccountData: () => Promise<void>;
  saveTeamMembers: (members: TeamMember[]) => void;
  saveActivities: (acts: ActivityLog[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (err: string | null) => void;
}

export async function executeInviteMember(
  email: string,
  role: TeamMember['role'],
  onSuccess: () => void,
  onLimitReached: (max: number | 'unlimited') => void,
  ctx: TeamActionContext
) {
  try {
    ctx.setLoading(true);

    if (ctx.isAuthenticated) {
      const currentPlanInfo = ctx.subscriptionPlans.find((p) => p.slug === ctx.currentPlan);
      const maxMembers = currentPlanInfo?.limits.teamMembers || 1;

      if (maxMembers !== -1 && ctx.teamMembers.length >= maxMembers) {
        onLimitReached(maxMembers);
        return;
      }

      await teamApi.inviteTeamMember({
        email,
        role,
        permissions: []
      });

      await ctx.loadAccountData();
    } else {
      const currentPlanInfo = accountPlans.find((p) => p.id === ctx.currentPlan);
      const maxMembers = currentPlanInfo?.limits.teamMembers || 1;

      if (maxMembers !== 'unlimited' && ctx.teamMembers.length >= maxMembers) {
        onLimitReached(maxMembers);
        return;
      }

      const newMember: TeamMember = {
        id: Date.now().toString(),
        name: email.split('@')[0],
        email: email,
        role: role,
        joinedAt: new Date().toISOString(),
        status: 'invited'
      };

      ctx.saveTeamMembers([...ctx.teamMembers, newMember]);

      const newActivity: ActivityLog = {
        id: Date.now().toString(),
        userId: 'demo-user',
        type: 'share',
        description: `Mời ${email} tham gia team với vai trò ${role}`,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        entityType: 'team',
        entityId: null,
        metadata: { email, role },
        ipAddress: null,
        userAgent: null
      };
      ctx.saveActivities([newActivity, ...ctx.activities]);
    }

    onSuccess();
  } catch (err) {
    console.error('Error inviting team member:', err);
    ctx.setError(err instanceof Error ? err.message : 'Failed to invite team member');
  } finally {
    ctx.setLoading(false);
  }
}

export async function executeRemoveMember(
  memberId: string,
  ctx: Pick<
    TeamActionContext,
    'isAuthenticated' | 'teamMembers' | 'loadAccountData' | 'saveTeamMembers' | 'setLoading' | 'setError'
  >
) {
  try {
    ctx.setLoading(true);

    const member = ctx.teamMembers.find((m) => m.id === memberId);
    if (member?.role === 'owner') {
      alert('Không thể xóa chủ sở hữu');
      return;
    }

    if (window.confirm('Bạn có chắc muốn xóa thành viên này?')) {
      if (ctx.isAuthenticated) {
        await teamApi.removeTeamMember(memberId);
        await ctx.loadAccountData();
      } else {
        ctx.saveTeamMembers(ctx.teamMembers.filter((m) => m.id !== memberId));
      }
    }
  } catch (err) {
    console.error('Error removing team member:', err);
    ctx.setError(err instanceof Error ? err.message : 'Failed to remove team member');
  } finally {
    ctx.setLoading(false);
  }
}
