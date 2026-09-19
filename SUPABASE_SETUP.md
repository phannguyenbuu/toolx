# 🔄 SUPABASE SETUP GUIDE

## ⚠️ QUAN TRỌNG: Dự án sử dụng Supabase

Tất cả patches và implementations đã được cập nhật để tương thích với Supabase backend.

---

## 📋 BƯỚC 1: APPLY DATABASE MIGRATION

### Option A: Qua Supabase Dashboard (Khuyến nghị)

1. Vào Supabase Dashboard: https://app.supabase.com
2. Chọn project của bạn
3. Vào **SQL Editor**
4. Copy nội dung file `supabase-migration-business-config.sql`
5. Paste và click **Run**

### Option B: Qua Supabase CLI

```bash
# Install Supabase CLI (nếu chưa có)
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Run migration
supabase db push
```

### Verify Migration

```sql
-- Check tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('print_shops', 'business_config');

-- Check columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'business_config';
```

---

## 📋 BƯỚC 2: UPDATE SUPABASE CLIENT

### File: `src/services/supabase.ts`

Verify Supabase client đã được config đúng:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### File: `.env`

Verify environment variables:

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

---

## 📋 BƯỚC 3: INSTALL DEPENDENCIES

```bash
cd /root/toolxprint

# Install required packages
npm install dompurify @types/dompurify

# Verify Supabase client (should already be installed)
npm list @supabase/supabase-js
```

---

## 📋 BƯỚC 4: APPLY CODE PATCHES

### 4.1 Variable Replacement System

```bash
# Apply patches in order:
cat PATCH_QuotesPage_Variables.md
cat PATCH_InvoicesPage_Variables.md
cat PATCH_BusinessTab_VariablesHelper.md
```

### 4.2 Supabase API Integration

File đã tồn tại và hoạt động:
- ✅ `src/services/businessApi.ts`
- ✅ `src/hooks/useBusinessDatabaseApi.ts`
- ✅ `src/services/api.ts`

**Không cần sửa gì thêm** - Chỉ cần apply migration!

---

## 📋 BƯỚC 5: TEST

### 5.1 Test Database Connection

```typescript
// Test trong browser console
import { supabase } from './services/supabase';

// Test read
const { data, error } = await supabase
  .from('business_config')
  .select('*')
  .single();

console.log('Config:', data, error);

// Test write
const { data: updated, error: updateError } = await supabase
  .from('business_config')
  .upsert({
    user_id: 'YOUR_USER_ID',
    quote_header: '<p>Test header</p>'
  })
  .select()
  .single();

console.log('Updated:', updated, updateError);
```

### 5.2 Test Full Flow

1. **Login** vào app
2. Vào **"Thông tin xưởng in"** → **"Header & Footer"**
3. Thêm header: `<p>Công ty: {{companyName}}</p>`
4. Click **"Lưu thay đổi"**
5. Check Supabase Dashboard → Table `business_config` → Verify data saved
6. Vào **"Báo giá"** → Tạo báo giá mới
7. Click **Preview** → Verify `{{companyName}}` đã được thay thế

---

## 🔍 TROUBLESHOOTING

### Issue: "relation business_config does not exist"

**Solution:** Migration chưa chạy. Apply `supabase-migration-business-config.sql`

### Issue: "permission denied for table business_config"

**Solution:** RLS policies chưa được tạo. Check migration đã chạy đầy đủ.

### Issue: "Cannot read properties of null"

**Solution:** User chưa có record trong `business_config`. Function `get_or_create_business_config()` sẽ tự tạo.

### Issue: Images không lưu được

**Solution:** 
1. Check column `quote_header_image` exists
2. Verify data type là TEXT (có thể chứa base64)
3. Check size limit (Supabase default: 1MB per field)

---

## 📊 DATABASE SCHEMA

### Table: `business_config`

```sql
CREATE TABLE business_config (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL,
  
  -- Quote templates
  quote_header TEXT,
  quote_footer TEXT,
  quote_header_image TEXT,  -- ✅ NEW: Store images
  quote_footer_image TEXT,  -- ✅ NEW: Store images
  
  -- Invoice templates
  invoice_header TEXT,
  invoice_footer TEXT,
  invoice_header_image TEXT,  -- ✅ NEW: Store images
  invoice_footer_image TEXT,  -- ✅ NEW: Store images
  
  -- Settings
  display_settings JSONB,
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Table: `print_shops`

```sql
CREATE TABLE print_shops (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo TEXT,  -- ✅ Store logo
  bank_account TEXT,
  bank_name TEXT,
  -- ... other fields
);
```

---

## ✅ CHECKLIST

- [ ] Migration applied successfully
- [ ] Tables `business_config` and `print_shops` exist
- [ ] RLS policies working
- [ ] Supabase client connected
- [ ] Dependencies installed
- [ ] Code patches applied
- [ ] Test flow completed
- [ ] Variables replacement working
- [ ] Images saving to database

---

## 🚀 NEXT STEPS

After completing setup:
1. ✅ Phase 1.1 DONE - Variable Replacement
2. ✅ Phase 1.2 DONE - Save Images (via migration)
3. ⏳ Phase 1.3 - HTML Sanitization (already in patches)
4. ⏳ Phase 1.4 - Transaction Validation
5. ⏳ Phase 1.5 - Customer Validation

---

**Last Updated:** 2026-03-01 13:49  
**Backend:** Supabase PostgreSQL  
**Status:** Ready for deployment
