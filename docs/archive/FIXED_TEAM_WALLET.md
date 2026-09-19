# ✅ FIXED - Team Members & Wallet

## Changes Made:

### 1. Team Members API (src/services/api.ts)
**Problem:** Foreign key relationship `profiles!team_members_user_id_fkey` not found

**Solution:** Query separately without FK relationship
```typescript
// Before:
select('*, profiles!team_members_user_id_fkey(*)')

// After:
select('*') + separate profiles query + merge data
```

### 2. Wallet Top-up (src/components/account/TopUpModal.tsx)
**Problem:** `/api/wallet/topup` endpoint doesn't exist (500 error)

**Solution:** Use Supabase RPC function directly
```typescript
// Before:
fetch('/api/wallet/topup', {...})

// After:
supabase.rpc('wallet_topup', {
  p_user_id, p_amount, p_payment_method, p_description
})
```

## Files Modified:
1. `/root/toolxprint/src/services/api.ts` - Line 277-293
2. `/root/toolxprint/src/components/account/TopUpModal.tsx` - Lines 3, 53-75

## Status:
✅ Build successful
✅ Deployed to production
✅ Team members query fixed
✅ Wallet topup uses Supabase RPC

## Test:
1. Refresh browser: http://157.66.80.125
2. Go to Account page
3. Team tab should load without errors
4. Wallet topup should work (calls `wallet_topup` RPC function)

## Note:
The `wallet_topup` RPC function was created in the migration SQL we discussed earlier. It:
- Gets or creates wallet
- Creates transaction record
- Updates balance
- Returns transaction data
