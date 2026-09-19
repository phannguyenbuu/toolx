# PATCH: QuotesPage Variable Replacement

## File: src/components/business/QuotesPage.tsx

### Step 1: Add imports (after line 11)
```typescript
import { replaceVariables } from '../../utils/templateVariables';
import DOMPurify from 'dompurify';
```

### Step 2: Add variable replacement logic (after line 480 - inside QuotePreviewModal)

Replace this section:
```typescript
}> = ({ isOpen, onClose, quote, config }) => {
  if (!isOpen || !quote) return null;

  return (
```

With:
```typescript
}> = ({ isOpen, onClose, quote, config }) => {
  if (!isOpen || !quote) return null;

  // Prepare variable data
  const variableData = {
    companyName: config.company?.name || '',
    companyAddress: config.company?.address || '',
    companyPhone: config.company?.phone || '',
    companyEmail: config.company?.email || '',
    companyWebsite: config.company?.website || '',
    companyTaxCode: config.company?.taxCode || '',
    customerName: quote.customerName,
    customerEmail: quote.customerEmail || '',
    customerPhone: quote.customerPhone || '',
    customerAddress: quote.customerAddress || '',
    quoteNumber: quote.quoteNumber,
    date: formatDate(quote.createdAt),
    validUntil: formatDate(quote.validUntil),
    subtotal: formatVND(quote.subtotal),
    discountPercent: `${quote.discountPercent}%`,
    discountAmount: formatVND(quote.discountAmount),
    vatPercent: `${quote.vatPercent}%`,
    vatAmount: formatVND(quote.vatAmount),
    total: formatVND(quote.total),
  };

  // Replace variables and sanitize
  const headerHtml = DOMPurify.sanitize(replaceVariables(config.header || '', variableData));
  const footerHtml = DOMPurify.sanitize(replaceVariables(config.footer || '', variableData));

  return (
```

### Step 3: Update header render (around line 570)

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

### Step 4: Update footer render (around line 680)

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

## Installation Required

```bash
npm install dompurify @types/dompurify
```

## Testing

1. Vào "Thông tin xưởng in" → "Header & Footer"
2. Thêm variables vào header: `<p>Kính gửi: {{customerName}}</p>`
3. Lưu lại
4. Vào "Báo giá" → Tạo báo giá mới
5. Preview → Kiểm tra {{customerName}} đã được thay thế chưa

## Expected Result

- ✅ Variables được replace với data thực tế
- ✅ HTML được sanitize (no XSS)
- ✅ Fallback nếu variable không có giá trị
