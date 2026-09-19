# PATCH: Add Loading States

## Simple Loading Component

### Create: src/components/Loading.tsx
```typescript
import { Loader2 } from 'lucide-react';

export const Loading = ({ text = 'Đang tải...' }) => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="animate-spin mr-2" size={20} />
    <span>{text}</span>
  </div>
);

export const LoadingOverlay = ({ text = 'Đang xử lý...' }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 flex items-center gap-3">
      <Loader2 className="animate-spin" size={24} />
      <span className="font-medium">{text}</span>
    </div>
  </div>
);
```

## Usage

### In lists
```typescript
{loading ? <Loading /> : <DataList />}
```

### In modals
```typescript
{isProcessing && <LoadingOverlay text="Đang lưu..." />}
```

Simple but effective!
