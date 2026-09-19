# Fix: Cannot read properties of undefined (reading 'length')

## Vấn đề
Lỗi xảy ra khi code cố đọc `.length` hoặc `.map()` của `equipment` khi nó là `undefined`.

## Nguyên nhân
- `businessInfo` được truyền vào có thể không có trường `equipment`
- Khi khởi tạo state, không có giá trị mặc định cho `equipment` và `taxPercent`
- Các hàm `map()`, `filter()` được gọi trực tiếp trên `editData.equipment` mà không kiểm tra undefined

## Giải pháp

### 1. Khởi tạo state với giá trị mặc định
```typescript
const [editData, setEditData] = useState<BusinessInfo>({
  ...businessInfo,
  equipment: businessInfo.equipment || [],
  taxPercent: businessInfo.taxPercent || 10,
});
```

### 2. Thêm safe check cho tất cả operations
```typescript
// Render
{(editData.equipment || []).map((eq, idx) => ...)}

// Add
equipment: [...(editData.equipment || []), newEquipment.trim()]

// Remove
equipment: (editData.equipment || []).filter((_, i) => i !== idx)
```

## Files đã sửa
- `src/components/account/BusinessTab.tsx`
  - useState: thêm default values
  - useEffect: thêm default values
  - equipment.map(): thêm `|| []`
  - addEquipment(): thêm `|| []`
  - removeEquipment(): thêm `|| []`
  
- `src/components/account/modals/EditBusinessModal.tsx`
  - useState: thêm default values
  - useEffect: thêm default values
  - equipment.map(): thêm `|| []`
  - addEquipment(): thêm `|| []`
  - removeEquipment(): thêm `|| []`

## Kết quả
✅ Không còn lỗi "Cannot read properties of undefined"
✅ `equipment` luôn là mảng, có thể dùng `.map()`, `.filter()` an toàn
✅ `taxPercent` luôn có giá trị mặc định là 10
✅ Code defensive, không crash khi data không đầy đủ
