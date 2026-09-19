/**
 * Transaction Type Guards & Validators
 * 
 * Validate transaction data from API before using in app
 * Prevents runtime errors from invalid data
 */

// ==================== TYPES ====================

export type TransactionType = 'TOPUP' | 'UPGRADE' | 'PURCHASE' | 'REFUND';
export type TransactionStatus = 'COMPLETED' | 'PENDING' | 'FAILED';

export interface ValidatedTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  status: TransactionStatus;
  createdAt: string;
  metadata?: Record<string, any>;
}

// ==================== CONSTANTS ====================

export const VALID_TRANSACTION_TYPES: readonly TransactionType[] = [
  'TOPUP',
  'UPGRADE', 
  'PURCHASE',
  'REFUND',
] as const;

export const VALID_TRANSACTION_STATUSES: readonly TransactionStatus[] = [
  'COMPLETED',
  'PENDING',
  'FAILED',
] as const;

// ==================== TYPE GUARDS ====================

/**
 * Check if value is valid transaction type
 */
export const isValidTransactionType = (value: any): value is TransactionType => {
  return typeof value === 'string' && 
    VALID_TRANSACTION_TYPES.includes(value.toUpperCase() as TransactionType);
};

/**
 * Check if value is valid transaction status
 */
export const isValidTransactionStatus = (value: any): value is TransactionStatus => {
  return typeof value === 'string' && 
    VALID_TRANSACTION_STATUSES.includes(value.toUpperCase() as TransactionStatus);
};

/**
 * Normalize transaction type (handle case variations)
 */
export const normalizeTransactionType = (value: any): TransactionType | null => {
  if (!value || typeof value !== 'string') return null;
  
  const normalized = value.toUpperCase() as TransactionType;
  return isValidTransactionType(normalized) ? normalized : null;
};

/**
 * Normalize transaction status
 */
export const normalizeTransactionStatus = (value: any): TransactionStatus | null => {
  if (!value || typeof value !== 'string') return null;
  
  const normalized = value.toUpperCase() as TransactionStatus;
  return isValidTransactionStatus(normalized) ? normalized : null;
};

// ==================== VALIDATORS ====================

export interface ValidationError {
  field: string;
  message: string;
  value: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  data?: ValidatedTransaction;
}

/**
 * Validate transaction object from API
 */
export const validateTransaction = (data: any): ValidationResult => {
  const errors: ValidationError[] = [];

  // Required fields
  if (!data?.id) {
    errors.push({ field: 'id', message: 'Missing transaction ID', value: data?.id });
  }

  if (!data?.userId) {
    errors.push({ field: 'userId', message: 'Missing user ID', value: data?.userId });
  }

  // Validate type
  const type = normalizeTransactionType(data?.type);
  if (!type) {
    errors.push({ 
      field: 'type', 
      message: `Invalid transaction type. Expected: ${VALID_TRANSACTION_TYPES.join(', ')}`, 
      value: data?.type 
    });
  }

  // Validate status
  const status = normalizeTransactionStatus(data?.status);
  if (!status) {
    errors.push({ 
      field: 'status', 
      message: `Invalid transaction status. Expected: ${VALID_TRANSACTION_STATUSES.join(', ')}`, 
      value: data?.status 
    });
  }

  // Validate amount
  if (typeof data?.amount !== 'number' || isNaN(data.amount)) {
    errors.push({ field: 'amount', message: 'Invalid amount', value: data?.amount });
  }

  // Validate balances
  if (typeof data?.balanceBefore !== 'number' || isNaN(data.balanceBefore)) {
    errors.push({ field: 'balanceBefore', message: 'Invalid balance before', value: data?.balanceBefore });
  }

  if (typeof data?.balanceAfter !== 'number' || isNaN(data.balanceAfter)) {
    errors.push({ field: 'balanceAfter', message: 'Invalid balance after', value: data?.balanceAfter });
  }

  // Validate createdAt
  if (!data?.createdAt || isNaN(Date.parse(data.createdAt))) {
    errors.push({ field: 'createdAt', message: 'Invalid date', value: data?.createdAt });
  }

  // If validation failed
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Return validated data
  return {
    valid: true,
    errors: [],
    data: {
      id: data.id,
      userId: data.userId,
      type: type!,
      amount: data.amount,
      balanceBefore: data.balanceBefore,
      balanceAfter: data.balanceAfter,
      description: data.description || '',
      status: status!,
      createdAt: data.createdAt,
      metadata: data.metadata || {},
    },
  };
};

/**
 * Validate array of transactions
 */
export const validateTransactions = (
  data: any[]
): { valid: ValidatedTransaction[]; invalid: any[] } => {
  const valid: ValidatedTransaction[] = [];
  const invalid: any[] = [];

  for (const item of data) {
    const result = validateTransaction(item);
    if (result.valid && result.data) {
      valid.push(result.data);
    } else {
      console.error('Invalid transaction:', result.errors);
      invalid.push({ data: item, errors: result.errors });
    }
  }

  return { valid, invalid };
};

// ==================== HELPERS ====================

/**
 * Get transaction type label (for UI)
 */
export const getTransactionTypeLabel = (type: TransactionType): string => {
  const labels: Record<TransactionType, string> = {
    TOPUP: 'Nạp tiền',
    UPGRADE: 'Nâng cấp',
    PURCHASE: 'Mua hàng',
    REFUND: 'Hoàn tiền',
  };
  return labels[type] || type;
};

/**
 * Get transaction status label (for UI)
 */
export const getTransactionStatusLabel = (status: TransactionStatus): string => {
  const labels: Record<TransactionStatus, string> = {
    COMPLETED: 'Hoàn thành',
    PENDING: 'Đang xử lý',
    FAILED: 'Thất bại',
  };
  return labels[status] || status;
};

/**
 * Get transaction status color (for UI)
 */
export const getTransactionStatusColor = (status: TransactionStatus): string => {
  const colors: Record<TransactionStatus, string> = {
    COMPLETED: 'green',
    PENDING: 'yellow',
    FAILED: 'red',
  };
  return colors[status] || 'gray';
};

// ==================== EXPORTS ====================

export default {
  isValidTransactionType,
  isValidTransactionStatus,
  normalizeTransactionType,
  normalizeTransactionStatus,
  validateTransaction,
  validateTransactions,
  getTransactionTypeLabel,
  getTransactionStatusLabel,
  getTransactionStatusColor,
  VALID_TRANSACTION_TYPES,
  VALID_TRANSACTION_STATUSES,
};
