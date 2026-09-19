/**
 * Customer Data Validation
 * 
 * Validate customer data before saving to database
 * Prevent duplicate customers and invalid data
 */

// ==================== TYPES ====================

export interface CustomerValidationError {
  field: string;
  message: string;
}

export interface CustomerValidationResult {
  valid: boolean;
  errors: CustomerValidationError[];
}

// ==================== VALIDATORS ====================

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  if (!email) return true; // Email is optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (Vietnamese format)
 */
export const isValidPhone = (phone: string): boolean => {
  if (!phone) return true; // Phone is optional
  
  // Remove spaces, dashes, parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Vietnamese phone: 10-11 digits, starts with 0
  const phoneRegex = /^0\d{9,10}$/;
  return phoneRegex.test(cleaned);
};

/**
 * Validate tax code (Vietnamese format)
 */
export const isValidTaxCode = (taxCode: string): boolean => {
  if (!taxCode) return true; // Tax code is optional
  
  // Vietnamese tax code: 10 or 13 digits
  const taxCodeRegex = /^\d{10}(\d{3})?$/;
  return taxCodeRegex.test(taxCode.replace(/[\s\-]/g, ''));
};

/**
 * Normalize phone number
 */
export const normalizePhone = (phone: string): string => {
  if (!phone) return '';
  return phone.replace(/[\s\-\(\)]/g, '');
};

/**
 * Normalize tax code
 */
export const normalizeTaxCode = (taxCode: string): string => {
  if (!taxCode) return '';
  return taxCode.replace(/[\s\-]/g, '');
};

/**
 * Validate customer data
 */
export const validateCustomer = (data: {
  name: string;
  email?: string;
  phone?: string;
  taxCode?: string;
  company?: string;
  address?: string;
}): CustomerValidationResult => {
  const errors: CustomerValidationError[] = [];

  // Required: Name
  if (!data.name || data.name.trim().length === 0) {
    errors.push({
      field: 'name',
      message: 'Tên khách hàng là bắt buộc',
    });
  } else if (data.name.trim().length < 2) {
    errors.push({
      field: 'name',
      message: 'Tên khách hàng phải có ít nhất 2 ký tự',
    });
  } else if (data.name.trim().length > 200) {
    errors.push({
      field: 'name',
      message: 'Tên khách hàng không được quá 200 ký tự',
    });
  }

  // Optional: Email
  if (data.email && !isValidEmail(data.email)) {
    errors.push({
      field: 'email',
      message: 'Email không hợp lệ. VD: example@domain.com',
    });
  }

  // Optional: Phone
  if (data.phone && !isValidPhone(data.phone)) {
    errors.push({
      field: 'phone',
      message: 'Số điện thoại không hợp lệ. VD: 0901234567',
    });
  }

  // Optional: Tax Code
  if (data.taxCode && !isValidTaxCode(data.taxCode)) {
    errors.push({
      field: 'taxCode',
      message: 'Mã số thuế không hợp lệ. Phải có 10 hoặc 13 chữ số',
    });
  }

  // Optional: Company
  if (data.company && data.company.length > 200) {
    errors.push({
      field: 'company',
      message: 'Tên công ty không được quá 200 ký tự',
    });
  }

  // Optional: Address
  if (data.address && data.address.length > 500) {
    errors.push({
      field: 'address',
      message: 'Địa chỉ không được quá 500 ký tự',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Check for duplicate customer
 */
export const checkDuplicateCustomer = (
  newCustomer: { email?: string; phone?: string },
  existingCustomers: Array<{ id: string; email?: string; phone?: string }>,
  excludeId?: string
): { isDuplicate: boolean; duplicateField?: string; duplicateId?: string } => {
  // Check email duplicate
  if (newCustomer.email) {
    const duplicate = existingCustomers.find(
      (c) => c.id !== excludeId && 
             c.email && 
             c.email.toLowerCase() === newCustomer.email!.toLowerCase()
    );
    if (duplicate) {
      return {
        isDuplicate: true,
        duplicateField: 'email',
        duplicateId: duplicate.id,
      };
    }
  }

  // Check phone duplicate
  if (newCustomer.phone) {
    const normalizedNewPhone = normalizePhone(newCustomer.phone);
    const duplicate = existingCustomers.find(
      (c) => c.id !== excludeId && 
             c.phone && 
             normalizePhone(c.phone) === normalizedNewPhone
    );
    if (duplicate) {
      return {
        isDuplicate: true,
        duplicateField: 'phone',
        duplicateId: duplicate.id,
      };
    }
  }

  return { isDuplicate: false };
};

/**
 * Sanitize customer data before saving
 */
export const sanitizeCustomerData = (data: {
  name: string;
  email?: string;
  phone?: string;
  taxCode?: string;
  company?: string;
  address?: string;
  notes?: string;
}): typeof data => {
  return {
    name: data.name.trim(),
    email: data.email?.trim().toLowerCase() || '',
    phone: normalizePhone(data.phone || ''),
    taxCode: normalizeTaxCode(data.taxCode || ''),
    company: data.company?.trim() || '',
    address: data.address?.trim() || '',
    notes: data.notes?.trim() || '',
  };
};

// ==================== HELPERS ====================

/**
 * Format phone number for display (Vietnamese format)
 */
export const formatPhoneDisplay = (phone: string): string => {
  if (!phone) return '';
  const cleaned = normalizePhone(phone);
  
  // Format: 0901 234 567
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  
  // Format: 0901 234 5678
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  
  return cleaned;
};

/**
 * Format tax code for display
 */
export const formatTaxCodeDisplay = (taxCode: string): string => {
  if (!taxCode) return '';
  const cleaned = normalizeTaxCode(taxCode);
  
  // Format: 0123456789 or 0123456789-001
  if (cleaned.length === 13) {
    return `${cleaned.slice(0, 10)}-${cleaned.slice(10)}`;
  }
  
  return cleaned;
};

/**
 * Get validation error message for field
 */
export const getFieldError = (
  errors: CustomerValidationError[],
  field: string
): string | undefined => {
  return errors.find((e) => e.field === field)?.message;
};

// ==================== EXPORTS ====================

export default {
  isValidEmail,
  isValidPhone,
  isValidTaxCode,
  normalizePhone,
  normalizeTaxCode,
  validateCustomer,
  checkDuplicateCustomer,
  sanitizeCustomerData,
  formatPhoneDisplay,
  formatTaxCodeDisplay,
  getFieldError,
};
