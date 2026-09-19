# PATCH: useAccountData - Transaction Validation

## File: src/components/account/useAccountData.ts

### Problem:
```typescript
// Line 87-92 - UNSAFE CASTING
const mappedTransactions: Transaction[] = transactionsData.data.map((apiTx: ApiTransaction) => ({
  ...apiTx,
  date: apiTx.createdAt,
  type: apiTx.type.toLowerCase() as Transaction['type'], // ❌ No validation!
  status: apiTx.status.toLowerCase() as Transaction['status'] // ❌ No validation!
}));
```

**Issues:**
- No validation before casting
- If API returns invalid type → app crashes
- No error handling
- No logging

---

## Solution:

### Step 1: Add import (after line 10)

```typescript
import { validateTransactions, getTransactionTypeLabel, getTransactionStatusLabel } from '../../utils/transactionValidation';
```

### Step 2: Replace transaction mapping (line 85-93)

**Replace this:**
```typescript
// Load transactions
const transactionsData = await walletApi.getTransactions({ limit: 50 });
// Map API transactions to local format
const mappedTransactions: Transaction[] = transactionsData.data.map((apiTx: ApiTransaction) => ({
  ...apiTx,
  date: apiTx.createdAt, // Add date field from createdAt
  type: apiTx.type.toLowerCase() as Transaction['type'], // Convert to lowercase
  status: apiTx.status.toLowerCase() as Transaction['status'] // Convert to lowercase
}));
setTransactions(mappedTransactions);
```

**With this:**
```typescript
// Load transactions with validation
const transactionsData = await walletApi.getTransactions({ limit: 50 });

// Validate transactions before using
const { valid: validTransactions, invalid: invalidTransactions } = validateTransactions(
  transactionsData.data
);

// Log invalid transactions
if (invalidTransactions.length > 0) {
  console.error('Invalid transactions detected:', invalidTransactions);
  // Optional: Send to error tracking service
}

// Map validated transactions to local format
const mappedTransactions: Transaction[] = validTransactions.map((validTx) => ({
  id: validTx.id,
  userId: validTx.userId,
  type: validTx.type.toLowerCase() as Transaction['type'],
  amount: validTx.amount,
  balanceBefore: validTx.balanceBefore,
  balanceAfter: validTx.balanceAfter,
  description: validTx.description,
  metadata: validTx.metadata || {},
  date: validTx.createdAt,
  createdAt: validTx.createdAt,
  status: validTx.status.toLowerCase() as Transaction['status'],
}));

setTransactions(mappedTransactions);

// Show warning if some transactions were invalid
if (invalidTransactions.length > 0) {
  console.warn(`${invalidTransactions.length} invalid transactions were filtered out`);
}
```

---

## Benefits:

✅ **Type Safety:** Validates before casting  
✅ **Error Handling:** Gracefully handles invalid data  
✅ **Logging:** Tracks invalid transactions  
✅ **No Crashes:** Filters out bad data instead of crashing  
✅ **Debugging:** Easy to identify data issues

---

## Testing:

### Test 1: Valid Data
```typescript
// API returns valid data
{
  type: 'TOPUP',
  status: 'COMPLETED',
  amount: 100000
}
// ✅ Should work normally
```

### Test 2: Invalid Type
```typescript
// API returns invalid type
{
  type: 'INVALID_TYPE',  // ❌ Not in VALID_TRANSACTION_TYPES
  status: 'COMPLETED',
  amount: 100000
}
// ✅ Should be filtered out + logged
```

### Test 3: Case Variations
```typescript
// API returns lowercase
{
  type: 'topup',  // Will be normalized to 'TOPUP'
  status: 'completed',  // Will be normalized to 'COMPLETED'
  amount: 100000
}
// ✅ Should work (normalized)
```

### Test 4: Missing Fields
```typescript
// API returns incomplete data
{
  type: 'TOPUP',
  // Missing status, amount, etc.
}
// ✅ Should be filtered out + logged with specific errors
```

---

## Expected Console Output:

### When all valid:
```
✅ Loaded 10 transactions
```

### When some invalid:
```
❌ Invalid transactions detected: [
  {
    data: { type: 'INVALID', ... },
    errors: [
      { field: 'type', message: 'Invalid transaction type...', value: 'INVALID' }
    ]
  }
]
⚠️ 1 invalid transactions were filtered out
✅ Loaded 9 valid transactions
```

---

## Rollback:

If issues occur, revert to original code:
```typescript
const mappedTransactions: Transaction[] = transactionsData.data.map((apiTx: ApiTransaction) => ({
  ...apiTx,
  date: apiTx.createdAt,
  type: apiTx.type.toLowerCase() as Transaction['type'],
  status: apiTx.status.toLowerCase() as Transaction['status']
}));
```

---

## Related Files:

- ✅ `src/utils/transactionValidation.ts` (already created)
- ⏳ `src/components/account/useAccountData.ts` (apply this patch)
- ⏳ Test in browser console

---

**Priority:** HIGH  
**Impact:** Prevents app crashes from bad API data  
**Effort:** 5 minutes to apply
