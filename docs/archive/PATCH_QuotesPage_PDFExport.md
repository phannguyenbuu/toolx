# PATCH: Add PDF Export to QuotesPage

## Install
```bash
npm install html2pdf.js
```

## File: src/components/business/QuotesPage.tsx

### Step 1: Import (after line 11)
```typescript
import { exportToPDF } from '../../utils/pdfExport';
```

### Step 2: Add handler in QuotePreviewModal (after line 480)
```typescript
const handleExportPDF = async () => {
  try {
    await exportToPDF('quote-print-inner', {
      filename: `${quote.quoteNumber}.pdf`,
      margin: 8,
      format: 'a4',
      orientation: 'portrait',
    });
  } catch (error) {
    console.error('Export failed:', error);
    alert('Không thể xuất PDF. Vui lòng thử lại.');
  }
};
```

### Step 3: Add button (find "In" button around line 540)
Replace:
```typescript
<button onClick={() => window.print()} className="...">
  <Printer size={16} /> In
</button>
```

With:
```typescript
<button onClick={() => window.print()} className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
  <Printer size={16} /> In
</button>
<button onClick={handleExportPDF} className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
  <Download size={16} /> Tải PDF
</button>
```

## Test
1. Vào Báo giá → Preview
2. Click "Tải PDF"
3. Check file downloaded

Done!
