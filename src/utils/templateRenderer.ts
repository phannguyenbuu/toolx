import { Quote, Invoice, formatVND, formatDate } from '../types/business';

interface TemplateData {
  // Common
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyTaxCode?: string;
  companyWebsite?: string;
  companyLogo?: string;
  
  // Quote specific
  quoteNumber?: string;
  
  // Invoice specific
  invoiceNumber?: string;
  
  // Customer
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerTaxCode?: string;
  customerCompany?: string;
  
  // Dates
  date?: string;
  createdAt?: string;
  validUntil?: string;
  dueDate?: string;
  
  // Items
  items?: any[];
  
  // Amounts
  subtotal?: string;
  discountPercent?: string;
  discountAmount?: string;
  vatPercent?: string;
  vatAmount?: string;
  total?: string;
  paidAmount?: string;
  remainingAmount?: string;
  
  // Status
  status?: string;
  
  // Notes
  notes?: string;
}

/**
 * Render template HTML with data
 */
export const renderTemplate = (html: string, data: TemplateData): string => {
  if (!html) return '';
  
  let result = html;
  
  // Replace simple variables {{variableName}}
  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = data[key as keyof TemplateData];
    return value !== undefined && value !== null ? String(value) : '';
  });
  
  // Replace items table {{#items}}...{{/items}}
  const itemsMatch = result.match(/\{\{#items\}\}([\s\S]*?)\{\{\/items\}\}/);
  if (itemsMatch && data.items) {
    const itemTemplate = itemsMatch[1];
    const itemsHtml = data.items.map((item, index) => {
      let itemHtml = itemTemplate;
      itemHtml = itemHtml.replace(/\{\{index\}\}/g, String(index + 1));
      itemHtml = itemHtml.replace(/\{\{description\}\}/g, item.description || '');
      itemHtml = itemHtml.replace(/\{\{specifications\}\}/g, item.specifications || '');
      itemHtml = itemHtml.replace(/\{\{quantity\}\}/g, String(item.quantity || 0));
      itemHtml = itemHtml.replace(/\{\{unitPrice\}\}/g, formatVND(item.unitPrice || 0));
      itemHtml = itemHtml.replace(/\{\{total\}\}/g, formatVND(item.total || 0));
      return itemHtml;
    }).join('');
    result = result.replace(/\{\{#items\}\}[\s\S]*?\{\{\/items\}\}/, itemsHtml);
  }
  
  return result;
};

/**
 * Prepare data for quote template
 */
export const prepareQuoteData = (quote: Quote, companyInfo: any): TemplateData => {
  return {
    // Company
    companyName: companyInfo?.name || '',
    companyAddress: companyInfo?.address || '',
    companyPhone: companyInfo?.phone || '',
    companyEmail: companyInfo?.email || '',
    companyTaxCode: companyInfo?.taxCode || '',
    companyWebsite: companyInfo?.website || '',
    companyLogo: companyInfo?.logo || '',
    
    // Quote
    quoteNumber: quote.quoteNumber,
    
    // Customer
    customerName: quote.customerName,
    customerEmail: quote.customerEmail || '',
    customerPhone: quote.customerPhone || '',
    customerAddress: quote.customerAddress || '',
    
    // Dates
    date: formatDate(quote.createdAt),
    createdAt: formatDate(quote.createdAt),
    validUntil: quote.validUntil ? formatDate(quote.validUntil) : '',
    
    // Items
    items: quote.items,
    
    // Amounts
    subtotal: formatVND(quote.subtotal),
    discountPercent: quote.discountPercent ? `${quote.discountPercent}%` : '0%',
    discountAmount: formatVND(quote.discountAmount || 0),
    vatPercent: quote.vatPercent ? `${quote.vatPercent}%` : '0%',
    vatAmount: formatVND(quote.vatAmount || 0),
    total: formatVND(quote.total),
    
    // Status
    status: quote.status,
    
    // Notes
    notes: quote.notes || '',
  };
};

/**
 * Prepare data for invoice template
 */
export const prepareInvoiceData = (invoice: Invoice, companyInfo: any): TemplateData => {
  return {
    // Company
    companyName: companyInfo?.name || '',
    companyAddress: companyInfo?.address || '',
    companyPhone: companyInfo?.phone || '',
    companyEmail: companyInfo?.email || '',
    companyTaxCode: companyInfo?.taxCode || '',
    companyWebsite: companyInfo?.website || '',
    companyLogo: companyInfo?.logo || '',
    
    // Invoice
    invoiceNumber: invoice.invoiceNumber,
    
    // Customer
    customerName: invoice.customerName,
    customerEmail: invoice.customerEmail || '',
    customerPhone: invoice.customerPhone || '',
    customerAddress: invoice.customerAddress || '',
    customerTaxCode: invoice.customerTaxCode || '',
    
    // Dates
    date: formatDate(invoice.createdAt),
    createdAt: formatDate(invoice.createdAt),
    dueDate: invoice.dueDate ? formatDate(invoice.dueDate) : '',
    
    // Items
    items: invoice.items,
    
    // Amounts
    subtotal: formatVND(invoice.subtotal),
    discountPercent: invoice.discountPercent ? `${invoice.discountPercent}%` : '0%',
    discountAmount: formatVND(invoice.discountAmount || 0),
    vatPercent: invoice.vatPercent ? `${invoice.vatPercent}%` : '0%',
    vatAmount: formatVND(invoice.vatAmount || 0),
    total: formatVND(invoice.total),
    paidAmount: formatVND(invoice.paidAmount || 0),
    remainingAmount: formatVND(invoice.remainingAmount || 0),
    
    // Status
    status: invoice.status,
    
    // Notes
    notes: invoice.notes || '',
  };
};

/**
 * Default quote template
 */
export const DEFAULT_QUOTE_TEMPLATE = `
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
  <!-- Header -->
  <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
    <h1 style="margin: 0; font-size: 28px; color: #333;">BÁO GIÁ</h1>
    <p style="margin: 5px 0; font-size: 14px; color: #666;">Số: <strong>{{quoteNumber}}</strong></p>
    <p style="margin: 5px 0; font-size: 14px; color: #666;">Ngày: {{date}}</p>
  </div>

  <!-- Company & Customer Info -->
  <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
    <div style="flex: 1;">
      <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Từ:</h3>
      <p style="margin: 0; font-weight: bold;">{{companyName}}</p>
      <p style="margin: 5px 0; font-size: 13px;">{{companyAddress}}</p>
      <p style="margin: 5px 0; font-size: 13px;">ĐT: {{companyPhone}}</p>
      <p style="margin: 5px 0; font-size: 13px;">Email: {{companyEmail}}</p>
    </div>
    <div style="flex: 1; text-align: right;">
      <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Đến:</h3>
      <p style="margin: 0; font-weight: bold;">{{customerName}}</p>
      <p style="margin: 5px 0; font-size: 13px;">{{customerPhone}}</p>
      <p style="margin: 5px 0; font-size: 13px;">{{customerAddress}}</p>
    </div>
  </div>

  <!-- Items Table -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <thead>
      <tr style="background-color: #f0f0f0;">
        <th style="border: 1px solid #ddd; padding: 10px; text-align: center; font-size: 13px;">STT</th>
        <th style="border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px;">Mô tả</th>
        <th style="border: 1px solid #ddd; padding: 10px; text-align: center; font-size: 13px;">SL</th>
        <th style="border: 1px solid #ddd; padding: 10px; text-align: right; font-size: 13px;">Đơn giá</th>
        <th style="border: 1px solid #ddd; padding: 10px; text-align: right; font-size: 13px;">Thành tiền</th>
      </tr>
    </thead>
    <tbody>
      {{#items}}
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 13px;">{{index}}</td>
        <td style="border: 1px solid #ddd; padding: 8px; font-size: 13px;">
          <div style="font-weight: 500;">{{description}}</div>
          <div style="font-size: 11px; color: #666;">{{specifications}}</div>
        </td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 13px;">{{quantity}}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-size: 13px;">{{unitPrice}}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: 500; font-size: 13px;">{{total}}</td>
      </tr>
      {{/items}}
    </tbody>
  </table>

  <!-- Totals -->
  <div style="text-align: right; margin-bottom: 30px;">
    <p style="margin: 5px 0; font-size: 14px;">Tạm tính: <strong>{{subtotal}}</strong></p>
    <p style="margin: 5px 0; font-size: 14px;">VAT ({{vatPercent}}): <strong>{{vatAmount}}</strong></p>
    <p style="margin: 10px 0; font-size: 18px; color: #d32f2f;"><strong>TỔNG CỘNG: {{total}}</strong></p>
  </div>

  <!-- Footer -->
  <div style="border-top: 2px solid #333; padding-top: 20px; text-align: center;">
    <p style="margin: 5px 0; font-size: 13px;">Cảm ơn quý khách đã tin tưởng sử dụng dịch vụ!</p>
    <p style="margin: 5px 0; font-size: 13px; font-weight: bold;">{{companyName}}</p>
    <p style="margin: 5px 0; font-size: 12px; color: #666;">{{companyAddress}}</p>
    <p style="margin: 5px 0; font-size: 12px; color: #666;">ĐT: {{companyPhone}} | Email: {{companyEmail}}</p>
  </div>
</div>
`.trim();

/**
 * Default invoice template
 */
export const DEFAULT_INVOICE_TEMPLATE = `
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
  <!-- Header -->
  <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
    <h1 style="margin: 0; font-size: 28px; color: #333;">HÓA ĐƠN</h1>
    <p style="margin: 5px 0; font-size: 14px; color: #666;">Số: <strong>{{invoiceNumber}}</strong></p>
    <p style="margin: 5px 0; font-size: 14px; color: #666;">Ngày: {{date}}</p>
  </div>

  <!-- Company & Customer Info -->
  <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
    <div style="flex: 1;">
      <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Từ:</h3>
      <p style="margin: 0; font-weight: bold;">{{companyName}}</p>
      <p style="margin: 5px 0; font-size: 13px;">{{companyAddress}}</p>
      <p style="margin: 5px 0; font-size: 13px;">ĐT: {{companyPhone}}</p>
      <p style="margin: 5px 0; font-size: 13px;">Email: {{companyEmail}}</p>
    </div>
    <div style="flex: 1; text-align: right;">
      <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Đến:</h3>
      <p style="margin: 0; font-weight: bold;">{{customerName}}</p>
      <p style="margin: 5px 0; font-size: 13px;">{{customerPhone}}</p>
      <p style="margin: 5px 0; font-size: 13px;">{{customerAddress}}</p>
    </div>
  </div>

  <!-- Items Table -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <thead>
      <tr style="background-color: #f0f0f0;">
        <th style="border: 1px solid #ddd; padding: 10px; text-align: center; font-size: 13px;">STT</th>
        <th style="border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px;">Mô tả</th>
        <th style="border: 1px solid #ddd; padding: 10px; text-align: center; font-size: 13px;">SL</th>
        <th style="border: 1px solid #ddd; padding: 10px; text-align: right; font-size: 13px;">Đơn giá</th>
        <th style="border: 1px solid #ddd; padding: 10px; text-align: right; font-size: 13px;">Thành tiền</th>
      </tr>
    </thead>
    <tbody>
      {{#items}}
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 13px;">{{index}}</td>
        <td style="border: 1px solid #ddd; padding: 8px; font-size: 13px;">
          <div style="font-weight: 500;">{{description}}</div>
          <div style="font-size: 11px; color: #666;">{{specifications}}</div>
        </td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 13px;">{{quantity}}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-size: 13px;">{{unitPrice}}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: 500; font-size: 13px;">{{total}}</td>
      </tr>
      {{/items}}
    </tbody>
  </table>

  <!-- Totals -->
  <div style="text-align: right; margin-bottom: 30px;">
    <p style="margin: 5px 0; font-size: 14px;">Tạm tính: <strong>{{subtotal}}</strong></p>
    <p style="margin: 5px 0; font-size: 14px;">VAT ({{vatPercent}}): <strong>{{vatAmount}}</strong></p>
    <p style="margin: 10px 0; font-size: 18px; color: #d32f2f;"><strong>TỔNG CỘNG: {{total}}</strong></p>
    <p style="margin: 5px 0; font-size: 13px; color: #666;">Đã thanh toán: {{paidAmount}}</p>
    <p style="margin: 5px 0; font-size: 14px; color: #f57c00;"><strong>Còn lại: {{remainingAmount}}</strong></p>
  </div>

  <!-- Footer -->
  <div style="border-top: 2px solid #333; padding-top: 20px; text-align: center;">
    <p style="margin: 5px 0; font-size: 13px;">Cảm ơn quý khách đã tin tưởng sử dụng dịch vụ!</p>
    <p style="margin: 5px 0; font-size: 13px; font-weight: bold;">{{companyName}}</p>
    <p style="margin: 5px 0; font-size: 12px; color: #666;">{{companyAddress}}</p>
    <p style="margin: 5px 0; font-size: 12px; color: #666;">ĐT: {{companyPhone}} | Email: {{companyEmail}}</p>
  </div>
</div>
`.trim();
