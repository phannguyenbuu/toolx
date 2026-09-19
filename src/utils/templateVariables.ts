/**
 * Template Variables System
 * 
 * Hệ thống biến động cho Header/Footer trong Báo giá và Hóa đơn
 * Sử dụng: {{variableName}} trong HTML template
 */

// ==================== TYPE DEFINITIONS ====================

export interface VariableDefinition {
  key: string;
  label: string;
  description: string;
  example: string;
  category: 'company' | 'customer' | 'document' | 'financial';
}

export interface VariableData {
  [key: string]: string | number | undefined | null;
}

// ==================== VARIABLE DEFINITIONS ====================

export const COMPANY_VARIABLES: VariableDefinition[] = [
  {
    key: 'companyName',
    label: 'Tên công ty',
    description: 'Tên xưởng in',
    example: 'Xưởng In ABC',
    category: 'company',
  },
  {
    key: 'companyAddress',
    label: 'Địa chỉ công ty',
    description: 'Địa chỉ đầy đủ',
    example: '123 Đường ABC, Q.1, TP.HCM',
    category: 'company',
  },
  {
    key: 'companyPhone',
    label: 'Điện thoại công ty',
    description: 'Số điện thoại liên hệ',
    example: '0901234567',
    category: 'company',
  },
  {
    key: 'companyEmail',
    label: 'Email công ty',
    description: 'Email liên hệ',
    example: 'contact@xuongin.vn',
    category: 'company',
  },
  {
    key: 'companyWebsite',
    label: 'Website công ty',
    description: 'Địa chỉ website',
    example: 'https://xuongin.vn',
    category: 'company',
  },
  {
    key: 'companyTaxCode',
    label: 'Mã số thuế',
    description: 'Mã số thuế công ty',
    example: '0123456789',
    category: 'company',
  },
];

export const CUSTOMER_VARIABLES: VariableDefinition[] = [
  {
    key: 'customerName',
    label: 'Tên khách hàng',
    description: 'Tên người/công ty',
    example: 'Công ty XYZ',
    category: 'customer',
  },
  {
    key: 'customerEmail',
    label: 'Email khách hàng',
    description: 'Email liên hệ',
    example: 'customer@company.com',
    category: 'customer',
  },
  {
    key: 'customerPhone',
    label: 'Điện thoại khách hàng',
    description: 'Số điện thoại',
    example: '0987654321',
    category: 'customer',
  },
  {
    key: 'customerAddress',
    label: 'Địa chỉ khách hàng',
    description: 'Địa chỉ đầy đủ',
    example: '456 Đường XYZ, Q.2',
    category: 'customer',
  },
  {
    key: 'customerTaxCode',
    label: 'MST khách hàng',
    description: 'Mã số thuế',
    example: '9876543210',
    category: 'customer',
  },
];

export const QUOTE_DOCUMENT_VARIABLES: VariableDefinition[] = [
  {
    key: 'quoteNumber',
    label: 'Số báo giá',
    description: 'Mã số báo giá',
    example: 'BG-2024-001',
    category: 'document',
  },
  {
    key: 'date',
    label: 'Ngày lập',
    description: 'Ngày tạo báo giá',
    example: '01/03/2024',
    category: 'document',
  },
  {
    key: 'validUntil',
    label: 'Hiệu lực đến',
    description: 'Ngày hết hạn',
    example: '15/03/2024',
    category: 'document',
  },
];

export const INVOICE_DOCUMENT_VARIABLES: VariableDefinition[] = [
  {
    key: 'invoiceNumber',
    label: 'Số hóa đơn',
    description: 'Mã số hóa đơn',
    example: 'HD-2024-001',
    category: 'document',
  },
  {
    key: 'date',
    label: 'Ngày lập',
    description: 'Ngày tạo hóa đơn',
    example: '01/03/2024',
    category: 'document',
  },
  {
    key: 'dueDate',
    label: 'Hạn thanh toán',
    description: 'Ngày đến hạn',
    example: '08/03/2024',
    category: 'document',
  },
];

export const FINANCIAL_VARIABLES: VariableDefinition[] = [
  {
    key: 'subtotal',
    label: 'Tạm tính',
    description: 'Tổng trước thuế',
    example: '1,350,000đ',
    category: 'financial',
  },
  {
    key: 'discountPercent',
    label: 'Phần trăm giảm giá',
    description: 'Tỷ lệ % giảm',
    example: '10%',
    category: 'financial',
  },
  {
    key: 'discountAmount',
    label: 'Tiền giảm giá',
    description: 'Số tiền giảm',
    example: '135,000đ',
    category: 'financial',
  },
  {
    key: 'vatPercent',
    label: 'Phần trăm VAT',
    description: 'Tỷ lệ % VAT',
    example: '10%',
    category: 'financial',
  },
  {
    key: 'vatAmount',
    label: 'Tiền VAT',
    description: 'Số tiền VAT',
    example: '121,500đ',
    category: 'financial',
  },
  {
    key: 'total',
    label: 'Tổng cộng',
    description: 'Tổng thanh toán',
    example: '1,336,500đ',
    category: 'financial',
  },
  {
    key: 'paidAmount',
    label: 'Đã thanh toán',
    description: 'Số tiền đã trả (Invoice)',
    example: '500,000đ',
    category: 'financial',
  },
  {
    key: 'remainingAmount',
    label: 'Còn lại',
    description: 'Số tiền còn nợ (Invoice)',
    example: '836,500đ',
    category: 'financial',
  },
];

// ==================== COMBINED VARIABLES ====================

export const QUOTE_VARIABLES: VariableDefinition[] = [
  ...COMPANY_VARIABLES,
  ...CUSTOMER_VARIABLES,
  ...QUOTE_DOCUMENT_VARIABLES,
  ...FINANCIAL_VARIABLES,
];

export const INVOICE_VARIABLES: VariableDefinition[] = [
  ...COMPANY_VARIABLES,
  ...CUSTOMER_VARIABLES,
  ...INVOICE_DOCUMENT_VARIABLES,
  ...FINANCIAL_VARIABLES,
];

// ==================== HELPER FUNCTIONS ====================

/**
 * Replace variables trong HTML template
 * 
 * @param template - HTML string chứa {{variables}}
 * @param data - Object chứa giá trị thực tế
 * @returns HTML string đã được replace
 * 
 * @example
 * const html = replaceVariables(
 *   '<p>Kính gửi: {{customerName}}</p>',
 *   { customerName: 'Công ty ABC' }
 * );
 * // Result: '<p>Kính gửi: Công ty ABC</p>'
 */
export const replaceVariables = (
  template: string,
  data: VariableData
): string => {
  if (!template) return '';
  
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = data[key];
    
    // Nếu không có giá trị, giữ nguyên placeholder
    if (value === undefined || value === null) {
      return match;
    }
    
    // Convert sang string
    return String(value);
  });
};

/**
 * Get danh sách variables theo category
 */
export const getVariablesByCategory = (
  variables: VariableDefinition[],
  category: VariableDefinition['category']
): VariableDefinition[] => {
  return variables.filter(v => v.category === category);
};

/**
 * Get variable definition by key
 */
export const getVariableDefinition = (
  variables: VariableDefinition[],
  key: string
): VariableDefinition | undefined => {
  return variables.find(v => v.key === key);
};

/**
 * Validate template - check for invalid variables
 */
export const validateTemplate = (
  template: string,
  allowedVariables: VariableDefinition[]
): { valid: boolean; invalidVariables: string[] } => {
  const allowedKeys = new Set(allowedVariables.map(v => v.key));
  const usedVariables = template.match(/\{\{(\w+)\}\}/g) || [];
  
  const invalidVariables = usedVariables
    .map(v => v.replace(/\{\{|\}\}/g, ''))
    .filter(key => !allowedKeys.has(key));
  
  return {
    valid: invalidVariables.length === 0,
    invalidVariables: Array.from(new Set(invalidVariables)),
  };
};

/**
 * Get list of used variables in template
 */
export const getUsedVariables = (template: string): string[] => {
  const matches = template.match(/\{\{(\w+)\}\}/g) || [];
  return Array.from(new Set(
    matches.map(v => v.replace(/\{\{|\}\}/g, ''))
  ));
};

// ==================== EXPORTS ====================

export default {
  QUOTE_VARIABLES,
  INVOICE_VARIABLES,
  COMPANY_VARIABLES,
  CUSTOMER_VARIABLES,
  QUOTE_DOCUMENT_VARIABLES,
  INVOICE_DOCUMENT_VARIABLES,
  FINANCIAL_VARIABLES,
  replaceVariables,
  getVariablesByCategory,
  getVariableDefinition,
  validateTemplate,
  getUsedVariables,
};
