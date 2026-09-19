# PATCH: Replace alert() with Toast

## Install
```bash
npm install react-hot-toast
```

## File: src/App.tsx (or main component)

### Add Toaster (in render)
```typescript
import { Toaster } from 'react-hot-toast';

// In return:
<>
  <Toaster position="top-right" />
  {/* rest of app */}
</>
```

## Usage Examples

### Replace alert() with toast
```typescript
// Before:
alert('Đã lưu thành công!');

// After:
import toast from 'react-hot-toast';
toast.success('Đã lưu thành công!');
```

### Error
```typescript
toast.error('Có lỗi xảy ra!');
```

### Loading
```typescript
const toastId = toast.loading('Đang xử lý...');
// ... do work
toast.success('Hoàn thành!', { id: toastId });
```

### With action
```typescript
toast.success('Đã xóa!', {
  action: {
    label: 'Hoàn tác',
    onClick: () => console.log('Undo'),
  },
});
```

Apply to all files with alert()!
