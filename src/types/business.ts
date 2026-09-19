// ============================================
// BUSINESS MODULE - SHARED TYPES
// ============================================

// --- CUSTOMER ---
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  taxCode?: string;
  notes?: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

// --- QUOTE (Báo giá) ---
export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface QuoteItem {
  id: string;
  description: string;
  specifications: string; // Kích thước, loại giấy, etc.
  quantity: number;
  unitPrice: number;
  total: number;
  notes?: string;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  items: QuoteItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  vatPercent: number;
  vatAmount: number;
  total: number;
  status: QuoteStatus;
  createdAt: string;
  validUntil: string;
  sentAt?: string;
  acceptedAt?: string;
  notes?: string;
  // Converted to invoice
  invoiceId?: string;
}

// --- INVOICE (Hóa đơn) ---
export type InvoiceStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface InvoiceItem {
  id: string;
  description: string;
  specifications: string;
  quantity: number;
  unitPrice: number;
  total: number;
  notes?: string;
}

export interface InvoicePayment {
  id: string;
  amount: number;
  method: 'cash' | 'transfer' | 'card' | 'other';
  date: string;
  notes?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerTaxCode?: string;
  items: InvoiceItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  vatPercent: number;
  vatAmount: number;
  total: number;
  payments: InvoicePayment[];
  paidAmount: number;
  remainingAmount: number;
  status: InvoiceStatus;
  createdAt: string;
  dueDate: string;
  paidAt?: string;
  notes?: string;
  // Reference
  quoteId?: string;
  quoteNumber?: string;
}

// --- BUSINESS CONFIG ---
export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  taxCode?: string;
  bankAccount?: string;
  bankName?: string;
  bankBranch?: string;
  logo?: string;
}

export interface DocumentConfig {
  header: string;
  footer: string;
  defaultVatPercent: number;
  defaultValidityDays: number;
  defaultPaymentDays: number;
  numberPrefix: string;
  nextNumber: number;
}

export interface BusinessConfig {
  company: CompanyInfo;
  quote: DocumentConfig;
  invoice: DocumentConfig;
}

// --- PRICE CALCULATOR ORDER (for import) ---
export interface PriceCalculatorOrder {
  id: number;
  timestamp: string;
  inputs: {
    width: string;
    height: string;
    quantity: string;
    printSides: number;
    lamination: string;
  };
  result: {
    machineName: string;
    paperDisplay: string;
    paperSize: string;
    ups: number;
    costs: {
      total: number;
      paper: number;
      print: number;
      lamination: number;
      extras: number;
    };
  };
  finishings: Array<{ name: string; price: string }>;
  quoteText: string;
  status: string;
}

// --- DATABASE ---
export interface BusinessDatabase {
  customers: Customer[];
  quotes: Quote[];
  invoices: Invoice[];
  config: BusinessConfig;
  lastUpdated: string;
}

// --- DEFAULT CONFIG ---
export const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: 'CÔNG TY IN ẤN ABC',
  address: '123 Đường XYZ, Quận 1, TP. Hồ Chí Minh',
  phone: '028 1234 5678',
  email: 'info@abc-print.com',
  website: 'www.abc-print.com',
  taxCode: '0123456789',
  bankAccount: '1234567890',
  bankName: 'Vietcombank',
};

export const DEFAULT_QUOTE_CONFIG: DocumentConfig = {
  header: `<div>
<h3 style="margin: 0; font-weight: bold; font-size: 16px;">Xưởng In Demo</h3>
<p style="margin: 2px 0; font-size: 13px;">123 Đường ABC, Quận 1, TP.HCM</p>
<p style="margin: 2px 0; font-size: 13px;">ĐT: 0901234567 | Email: demo@labeldesigner.vn</p>
</div>`,
  footer: `<div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
<p style="margin: 5px 0; font-size: 13px;">Cảm ơn quý khách đã tin tưởng sử dụng dịch vụ!</p>
<p style="margin: 5px 0; font-size: 13px; font-weight: bold;">Xưởng In Demo</p>
<p style="margin: 5px 0; font-size: 12px; color: #666;">ĐT: 0901234567 | Email: demo@labeldesigner.vn</p>
</div>`,
  defaultVatPercent: 10,
  defaultValidityDays: 15,
  defaultPaymentDays: 14,
  numberPrefix: 'BG',
  nextNumber: 1,
};

export const DEFAULT_INVOICE_CONFIG: DocumentConfig = {
  header: `<div>
<h3 style="margin: 0; font-weight: bold; font-size: 16px;">Xưởng In Demo</h3>
<p style="margin: 2px 0; font-size: 13px;">123 Đường ABC, Quận 1, TP.HCM</p>
<p style="margin: 2px 0; font-size: 13px;">ĐT: 0901234567 | Email: demo@labeldesigner.vn</p>
</div>`,
  footer: `<div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
<p style="margin: 5px 0; font-size: 13px;">Cảm ơn quý khách đã tin tưởng sử dụng dịch vụ!</p>
<p style="margin: 5px 0; font-size: 13px; font-weight: bold;">Xưởng In Demo</p>
<p style="margin: 5px 0; font-size: 12px; color: #666;">ĐT: 0901234567 | Email: demo@labeldesigner.vn</p>
</div>`,
  defaultVatPercent: 10,
  defaultValidityDays: 30,
  defaultPaymentDays: 14,
  numberPrefix: 'HD',
  nextNumber: 1,
};

export const DEFAULT_BUSINESS_CONFIG: BusinessConfig = {
  company: DEFAULT_COMPANY_INFO,
  quote: DEFAULT_QUOTE_CONFIG,
  invoice: DEFAULT_INVOICE_CONFIG,
};

// --- HELPERS ---
export const formatVND = (n: number): string => 
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

export const formatDate = (date: string): string => 
  new Date(date).toLocaleDateString('vi-VN');

export const formatDateTime = (date: string): string => 
  new Date(date).toLocaleString('vi-VN');

export const generateId = (): string => 
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const getQuoteStatusConfig = (status: QuoteStatus) => {
  const configs = {
    DRAFT: { label: 'Nháp', color: 'slate', icon: 'Clock' },
    SENT: { label: 'Đã gửi', color: 'blue', icon: 'Send' },
    ACCEPTED: { label: 'Đã chấp nhận', color: 'green', icon: 'CheckCircle' },
    REJECTED: { label: 'Từ chối', color: 'red', icon: 'XCircle' },
    EXPIRED: { label: 'Hết hạn', color: 'gray', icon: 'Clock' },
  };
  return configs[status];
};

export const getInvoiceStatusConfig = (status: InvoiceStatus) => {
  const configs = {
    UNPAID: { label: 'Chưa thanh toán', color: 'red', icon: 'AlertCircle' },
    PARTIAL: { label: 'Thanh toán một phần', color: 'amber', icon: 'Clock' },
    PAID: { label: 'Đã thanh toán', color: 'green', icon: 'CheckCircle' },
    OVERDUE: { label: 'Quá hạn', color: 'red', icon: 'AlertTriangle' },
    CANCELLED: { label: 'Đã hủy', color: 'gray', icon: 'XCircle' },
  };
  return configs[status];
};
