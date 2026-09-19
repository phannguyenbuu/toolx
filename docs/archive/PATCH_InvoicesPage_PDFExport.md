# PATCH: Add PDF Export to InvoicesPage

## File: src/components/business/InvoicesPage.tsx

### Step 1: Import
```typescript
import { exportToPDF } from '../../utils/pdfExport';
```

### Step 2: Add handler in InvoicePreviewModal
```typescript
const handleExportPDF = async () => {
  try {
    await exportToPDF('invoice-print-inner', {
      filename: `${invoice.invoiceNumber}.pdf`,
      margin: 8,
      format: 'a4',
    });
  } catch (error) {
    alert('Không thể xuất PDF. Vui lòng thử lại.');
  }
};
```

### Step 3: Add button (next to "In" button)
```typescript
<button onClick={handleExportPDF} className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
  <Download size={16} /> Tải PDF
</button>
```

Done!
