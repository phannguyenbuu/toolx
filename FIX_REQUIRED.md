# 🔴 CRITICAL FIX REQUIRED

## Errors:

1. ❌ **Team Members Error:**
   ```
   Could not find a relationship between 'team_members' and 'profiles'
   ```

2. ❌ **Wallet API Error:**
   ```
   500 Internal Server Error on /api/wallet/topup
   ```

## Root Cause:

Database missing `team_members` and `wallets` tables.

---

## ✅ Solution:

### Apply Migration SQL

**File:** `supabase-migration-team-wallet.sql`

**Method 1: Supabase Studio (Recommended)**

1. Open: http://157.66.80.125:8000
2. Go to **SQL Editor**
3. Copy entire content from `supabase-migration-team-wallet.sql`
4. Click **Run**
5. Verify: Check if tables created

**Method 2: psql Command Line**

```bash
# If you have psql access
psql -h 157.66.80.125 -p 5432 -U postgres -d postgres < supabase-migration-team-wallet.sql
```

**Method 3: Supabase CLI**

```bash
# If you have Supabase CLI
supabase db push
```

---

## What This Migration Creates:

### Tables:
- ✅ `team_members` - Team collaboration
- ✅ `wallets` - User wallet system
- ✅ `wallet_transactions` - Transaction history
- ✅ `subscription_plans` - Subscription tiers
- ✅ `user_subscriptions` - User active plans

### Functions:
- `create_user_wallet()` - Auto-create wallet on signup
- `wallet_topup()` - Add funds
- `wallet_payment()` - Deduct funds

### Sample Data:
- 4 subscription plans (Free, Basic, Pro, Enterprise)

---

## After Migration:

1. **Refresh browser** - Clear cache (Ctrl+Shift+R)
2. **Check errors** - Should be gone
3. **Test features:**
   - Team tab should load
   - Wallet should show balance
   - Account page should work

---

## Verification:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('team_members', 'wallets', 'wallet_transactions');

-- Should return 3 rows
```

---

## Need Help?

If migration fails:
1. Check Supabase logs
2. Verify postgres connection
3. Check if `update_updated_at_column()` function exists (from base schema)

---

**Status:** ⚠️ PENDING - Migration not applied yet
**Priority:** 🔴 CRITICAL
**Impact:** Team features and wallet system not working
