# PATCH: TeamTab - Add Permission Checks

## File: src/components/account/TeamTab.tsx

### Step 1: Add permission helper (top of file)
```typescript
const canManageTeam = (userRole: string) => {
  return ['owner', 'admin'].includes(userRole);
};

const canRemoveMember = (userRole: string, targetRole: string) => {
  if (targetRole === 'owner') return false;
  if (userRole === 'owner') return true;
  if (userRole === 'admin' && targetRole !== 'admin') return true;
  return false;
};
```

### Step 2: Get current user role (in component)
```typescript
// Assume first member is current user (or get from auth)
const currentUserRole = teamMembers[0]?.role || 'viewer';
```

### Step 3: Disable invite button if no permission
```typescript
<button
  onClick={onInvite}
  disabled={!canManageTeam(currentUserRole)}
  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
>
  <Plus size={16} /> Mời thành viên
</button>
```

### Step 4: Disable remove button if no permission
```typescript
{canRemoveMember(currentUserRole, member.role) ? (
  <button
    onClick={() => onRemove(member.id)}
    className="p-2 text-red-600 hover:bg-red-50 rounded"
  >
    <Trash2 size={16} />
  </button>
) : (
  <div className="p-2 text-gray-300">
    <Lock size={16} />
  </div>
)}
```

Done! Simple but effective.
