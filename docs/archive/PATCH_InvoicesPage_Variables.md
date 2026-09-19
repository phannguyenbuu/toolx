# PATCH: InvoicesPage Variable Replacement

## File: src/components/business/InvoicesPage.tsx

### Step 1: Add imports (after line 12)
```typescript
import { replaceVariables } from '../../utils/templateVariables';
import DOMPurify from 'dompurify';
```

### Step 2: Add variable replacement logic (inside InvoicePreviewModal, after line ~590)

Replace this section:
```typescript
}> = ({ isOpen, onClose, invoice, config }) => {
  if (!isOpen || !invoice) return null;

  return (
```

With:
```typescript
}> = ({ isOpen, onClose, invoice, config }) => {
  if (!isOpen || !invoice) return null;

  // Prepare variable data
  const variableData = {
    companyName: config.company?.name || '',
    companyAddress: config.company?.address || '',
    companyPhone: config.company?.phone || '',
    companyEmail: config.company?.email || '',
    companyWebsite: config.company?.website || '',
    companyTaxCode: config.company?.taxCode || '',
    customerName: invoice.customerName,
    customerEmail: invoice.customerEmail || '',
    customerPhone: invoice.customerPhone || '',
    customerAddress: invoice.customerAddress || '',
    invoiceNumber: invoice.invoiceNumber,
    date: formatDate(invoice.createdAt),
    dueDate: invoice.dueDate ? formatDate(invoice.dueDate) : '',
    subtotal: formatVND(invoice.subtotal),
    discountPercent: `${invoice.discountPercent}%`,
    discountAmount: formatVND(invoice.discountAmount),
    vatPercent: `${invoice.vatPercent}%`,
    vatAmount: formatVND(invoice.vatAmount),
    total: formatVND(invoice.total),
    paidAmount: formatVND(invoice.paidAmount),
    remainingAmount: formatVND(invoice.total - invoice.paidAmount),
  };

  // Replace variables and sanitize
  const headerHtml = DOMPurify.sanitize(replaceVariables(config.header || '', variableData));
  const footerHtml = DOMPurify.sanitize(replaceVariables(config.footer || '', variableData));

  return (
```

### Step 3: Update header render

Replace:
```typescript
{config.header ? (
  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: config.header }} />
) : (
```

With:
```typescript
{headerHtml ? (
  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: headerHtml }} />
) : (
```

### Step 4: Update footer render

Replace:
```typescript
{config.footer && (
  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: config.footer }} />
)}
```

With:
```typescript
{footerHtml && (
  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: footerHtml }} />
)}
```

## Testing

1. Vào "Thông tin xưởng in" → "Header & Footer" → Tab "Hóa đơn"
2. Thêm variables: `<p>Số hóa đơn: {{invoiceNumber}}</p><p>Còn lại: {{remainingAmount}}</p>`
3. Lưu lại
4. Vào "Hóa đơn" → Tạo hóa đơn mới
5. Preview → Kiểm tra variables đã được thay thế

## Expected Result

- ✅ Variables được replace với data thực tế
- ✅ HTML được sanitize
- ✅ Hiển thị đúng số tiền còn lại (remainingAmount)
