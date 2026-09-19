# ✅ Hoàn thành: Thay Chứng nhận bằng % Thuế

## Thay đổi chính

### 1. Xóa "Chứng nhận" khỏi Năng lực sản xuất
- ❌ Đã xóa trường "Chứng nhận" khỏi UI
- ❌ Đã xóa `certifications` khỏi database schema

### 2. Thêm "% Thuế" vào Thông tin cơ bản
- ✅ Thêm input "% Thuế mặc định" (0-100, có thập phân)
- ✅ Giá trị mặc định: 10%
- ✅ Lưu vào `BusinessInfo.taxPercent` (frontend)
- ✅ Lưu vào `defaultVatPercent` (database)

### 3. Kết nối với Báo giá/Hóa đơn
- ✅ % Thuế tự động áp dụng cho `defaultVatPercent` trong báo giá
- ✅ % Thuế tự động áp dụng cho `defaultVatPercent` trong hóa đơn
- ✅ Mỗi báo giá/hóa đơn vẫn có thể override riêng

## Cách hoạt động

**Frontend:**
- `BusinessInfo.taxPercent` lưu % thuế trong state
- Khi load: đọc từ `dbConfig.quote.defaultVatPercent`
- Khi save: ghi vào `defaultVatPercent` trong business_configs

**Database:**
- Không tạo cột mới `tax_percent` trong `business_configs`
- Sử dụng lại cột `default_vat_percent` đã có sẵn
- Xóa cột `certifications` khỏi `print_shops`

## Cách sử dụng

1. Vào **Account Dashboard** → **Thông tin xưởng in**
2. Nhập "% Thuế mặc định" (VD: 10)
3. Lưu thông tin
4. Tạo báo giá/hóa đơn mới → % VAT sẽ tự động = % Thuế đã cài đặt

## Migration Database

```bash
cd /root/toolxprint
./apply-tax-percent-migration.sh
```

## Files đã sửa

- `src/components/account/types.ts`
- `src/components/account/BusinessTab.tsx`
- `src/components/account/modals/EditBusinessModal.tsx`
- `src/components/account/constants.ts`
- `src/components/account/useAccountData.ts`
- `src/types/api.ts`
- `supabase-migration-business-config.sql`
- `supabase-migration-tax-percent.sql` (new)
- `apply-tax-percent-migration.sh` (new)

✅ Build thành công, không có lỗi TypeScript  
✅ Đã fix lỗi "Could not find the 'tax_percent' column"
