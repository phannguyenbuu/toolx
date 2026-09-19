# PATCH: BusinessTab - Add Templates

## File: src/components/account/BusinessTab.tsx

### Import (after line 10)
```typescript
import { HEADER_TEMPLATES, FOOTER_TEMPLATES } from '../../data/documentTemplates';
```

### Add template selector (before header editor, around line 900)
```typescript
{/* Template Selector */}
<div className="mb-3">
  <label className="text-xs font-bold text-gray-500 mb-1 block">
    Chọn mẫu có sẵn:
  </label>
  <select 
    onChange={(e) => {
      const template = HEADER_TEMPLATES.find(t => t.id === e.target.value);
      if (template) handleDocumentChange('header', template.html);
    }}
    className="w-full px-3 py-2 border rounded-lg text-sm"
  >
    <option value="">-- Chọn mẫu header --</option>
    {HEADER_TEMPLATES.map(t => (
      <option key={t.id} value={t.id}>{t.name}</option>
    ))}
  </select>
</div>
```

### Same for footer (before footer editor)
```typescript
<div className="mb-3">
  <label className="text-xs font-bold text-gray-500 mb-1 block">
    Chọn mẫu có sẵn:
  </label>
  <select 
    onChange={(e) => {
      const template = FOOTER_TEMPLATES.find(t => t.id === e.target.value);
      if (template) handleDocumentChange('footer', template.html);
    }}
    className="w-full px-3 py-2 border rounded-lg text-sm"
  >
    <option value="">-- Chọn mẫu footer --</option>
    {FOOTER_TEMPLATES.map(t => (
      <option key={t.id} value={t.id}>{t.name}</option>
    ))}
  </select>
</div>
```

Done! 10 templates ready.
