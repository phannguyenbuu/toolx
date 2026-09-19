# PATCH: BusinessTab - Add Variables Helper

## File: src/components/account/BusinessTab.tsx

### Step 1: Add import (after line 10)
```typescript
import { VariablesHelper } from '../VariablesHelper';
```

### Step 2: Add VariablesHelper UI (trong document config section, sau line ~900)

Thêm sau phần "Display Settings":

```typescript
{/* Variables Helper */}
<div className="bg-white rounded-xl border p-5">
  <VariablesHelper type={previewType} />
</div>
```

### Vị trí chính xác:
Tìm đoạn code:
```typescript
<p className="text-xs text-gray-500 text-center">
  💡 Tick chọn các thông tin muốn hiển thị trên báo giá/hóa đơn
</p>
```

Thêm ngay sau đó:

```typescript
{/* Variables Helper */}
<div className="mt-4">
  <VariablesHelper type={previewType} />
</div>
```

## Result

User sẽ thấy:
- ✅ Danh sách đầy đủ variables
- ✅ Phân loại theo category (Công ty, Khách hàng, Chứng từ, Tài chính)
- ✅ Search & filter
- ✅ Click để copy vào clipboard
- ✅ Examples cho mỗi variable
- ✅ Hướng dẫn sử dụng

## Screenshot Expected

```
┌─────────────────────────────────────────┐
│ 📝 Biến có sẵn              25 biến     │
├─────────────────────────────────────────┤
│ [Search...] [Filter ▼]                  │
├─────────────────────────────────────────┤
│ 💡 Cách sử dụng:                        │
│ • Click vào biến để copy                │
│ • Paste vào editor: Ctrl+V             │
│ • Biến sẽ tự động thay thế khi in       │
├─────────────────────────────────────────┤
│ 🏢 THÔNG TIN CÔNG TY                    │
│ ┌─────────────────────────────────────┐ │
│ │ {{companyName}}          ✓ Đã copy  │ │
│ │ Tên công ty                          │ │
│ │ Tên xưởng in                         │ │
│ │ VD: Xưởng In ABC                     │ │
│ └─────────────────────────────────────┘ │
│ ...                                     │
└─────────────────────────────────────────┘
```
