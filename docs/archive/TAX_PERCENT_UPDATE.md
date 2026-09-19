# Cập nhật: Thay Chứng nhận bằng % Thuế

**Ngày:** 2026-03-02  
**Yêu cầu:** Xóa "Chứng nhận" khỏi Năng lực sản xuất và thêm "% Thuế" vào thông tin cơ bản, kết nối với báo giá/hóa đơn

## Các thay đổi đã thực hiện

### 1. Database Schema
- ✅ Xóa cột `certifications` khỏi bảng `print_shops`
- ✅ Thêm cột `tax_percent` (DECIMAL 5,2, mặc định 10) vào bảng `print_shops`
- ✅ Tạo migration script: `supabase-migration-tax-percent.sql`
- ✅ Tạo apply script: `apply-tax-percent-migration.sh`

### 2. TypeScript Types
- ✅ `src/components/account/types.ts`: Thay `certifications: string[]` bằng `taxPercent: number`
- ✅ `src/types/api.ts`: Thay `certifications: any[]` bằng `taxPercent: number`

### 3. Frontend Components

#### BusinessTab.tsx
- ✅ Xóa state `newCertification`
- ✅ Xóa các hàm `addCertification()` và `removeCertification()`
- ✅ Xóa phần UI "Chứng nhận" (input + tags)
- ✅ Thêm input "% Thuế mặc định" vào thông tin cơ bản
- ✅ Cập nhật `handleFieldChange()` để hỗ trợ `number` type
- ✅ Cập nhật `handleSave()` để lưu `taxPercent` thay vì `certifications`
- ✅ Kết nối `taxPercent` với `defaultVatPercent` trong quote/invoice config

#### EditBusinessModal.tsx
- ✅ Xóa state `newCertification`
- ✅ Xóa các hàm `addCertification()` và `removeCertification()`
- ✅ Xóa phần UI "Chứng nhận"

### 4. Data & Constants
- ✅ `src/components/account/constants.ts`: Thay certifications bằng `taxPercent: 10`
- ✅ `src/components/account/useAccountData.ts`: Thay certifications bằng `taxPercent: 10`

## Kết nối với Báo giá/Hóa đơn

% Thuế được lưu trong `BusinessInfo.taxPercent` sẽ tự động được sử dụng làm giá trị mặc định cho:
- `quote.defaultVatPercent` - % thuế mặc định cho báo giá
- `invoice.defaultVatPercent` - % thuế mặc định cho hóa đơn

Khi người dùng thay đổi % Thuế trong thông tin xưởng in, giá trị này sẽ được áp dụng cho tất cả báo giá và hóa đơn mới.

## Cách apply migration

```bash
cd /root/toolxprint
./apply-tax-percent-migration.sh
```

## Testing

1. Mở trang Account Dashboard
2. Vào tab "Thông tin xưởng in"
3. Kiểm tra:
   - ✅ Không còn trường "Chứng nhận" trong phần Năng lực sản xuất
   - ✅ Có trường "% Thuế mặc định" trong thông tin cơ bản
   - ✅ Giá trị mặc định là 10
4. Thay đổi % Thuế và lưu
5. Tạo báo giá/hóa đơn mới và kiểm tra % VAT mặc định

## Files đã thay đổi

```
src/components/account/types.ts
src/components/account/BusinessTab.tsx
src/components/account/modals/EditBusinessModal.tsx
src/components/account/constants.ts
src/components/account/useAccountData.ts
src/types/api.ts
supabase-migration-business-config.sql
supabase-migration-tax-percent.sql (new)
apply-tax-percent-migration.sh (new)
```

## Notes

- % Thuế có thể là số thập phân (VD: 10.5)
- Giá trị min: 0, max: 100
- Mỗi báo giá/hóa đơn vẫn có thể override % thuế riêng
- Migration script an toàn, sử dụng `IF EXISTS` và `IF NOT EXISTS`
