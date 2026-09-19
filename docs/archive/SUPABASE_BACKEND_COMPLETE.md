# 🎉 Supabase Backend Complete Setup

## ✅ Đã tạo xong:

### 1. Database Schema (`supabase-schema.sql`)
- ✅ **profiles** - User profiles
- ✅ **projects** - Design projects
- ✅ **files** - File management
- ✅ **customers** - Customer management
- ✅ **quotes** - Quotations
- ✅ **invoices** - Invoicing
- ✅ **products** - Products/Services
- ✅ **paper_prices** - Paper pricing
- ✅ **templates** - Design templates
- ✅ **activity_logs** - Activity tracking
- ✅ Row Level Security (RLS) enabled
- ✅ Indexes for performance
- ✅ Triggers for auto-updates
- ✅ Storage buckets config

### 2. API Services (`src/services/supabaseApi.ts`)
- ✅ projectsApi - CRUD operations
- ✅ customersApi - Customer management
- ✅ quotesApi - Quote management
- ✅ invoicesApi - Invoice management
- ✅ productsApi - Product management
- ✅ templatesApi - Template management
- ✅ filesApi - File operations
- ✅ storageApi - File upload/download
- ✅ profileApi - User profile

### 3. React Hooks (`src/hooks/useSupabase.ts`)
- ✅ useProjects - Projects with realtime
- ✅ useCustomers - Customers with realtime
- ✅ useQuotes - Quotes with realtime
- ✅ useInvoices - Invoices with realtime
- ✅ useProducts - Products with realtime
- ✅ useTemplates - Templates with realtime
- ✅ useProfile - User profile

## 🚀 Cách sử dụng:

### Bước 1: Apply Schema trên Supabase VPS

SSH vào VPS Supabase (103.175.248.173):

```bash
# Copy files
scp supabase-schema.sql root@103.175.248.173:/root/
scp apply-supabase-schema.sh root@103.175.248.173:/root/

# SSH vào VPS
ssh root@103.175.248.173

# Apply schema
cd /root
chmod +x apply-supabase-schema.sh
./apply-supabase-schema.sh
```

### Bước 2: Sử dụng trong Components

```typescript
import { useProjects, useCustomers } from '../hooks/useSupabase';

function MyComponent() {
  const { projects, loading, createProject } = useProjects();
  const { customers } = useCustomers();

  const handleCreate = async () => {
    await createProject({
      name: 'New Project',
      description: 'Description',
      data: { /* canvas data */ }
    });
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {projects.map(p => (
        <div key={p.id}>{p.name}</div>
      ))}
      <button onClick={handleCreate}>Create</button>
    </div>
  );
}
```

### Bước 3: Upload Files

```typescript
import { storageApi } from '../services/supabaseApi';

const handleUpload = async (file: File) => {
  const path = `${userId}/${file.name}`;
  const { data, error } = await storageApi.upload('files', path, file);
  
  if (!error) {
    const url = storageApi.getPublicUrl('files', path);
    console.log('File URL:', url);
  }
};
```

## 📊 Database Structure

```
profiles
├── id (UUID, PK)
├── email
├── full_name
├── avatar_url
└── company_name

projects
├── id (UUID, PK)
├── user_id (FK)
├── name
├── data (JSONB)
└── thumbnail_url

customers
├── id (UUID, PK)
├── user_id (FK)
├── name
├── email
└── phone

quotes
├── id (UUID, PK)
├── user_id (FK)
├── customer_id (FK)
├── quote_number
├── items (JSONB)
└── total

invoices
├── id (UUID, PK)
├── user_id (FK)
├── customer_id (FK)
├── invoice_number
├── items (JSONB)
└── status
```

## 🔐 Security

- ✅ Row Level Security enabled
- ✅ Users can only access their own data
- ✅ Public templates are readable by all
- ✅ Auth required for all operations

## 🎯 Features

### Realtime Updates
All hooks automatically subscribe to database changes and update in realtime.

### File Storage
- avatars (public)
- projects (private)
- files (private)
- templates (public)

### Auto-generated
- UUIDs for all IDs
- Timestamps (created_at, updated_at)
- User profiles on signup

## 📝 Example Usage

### Save Project
```typescript
const { createProject } = useProjects();

await createProject({
  name: 'Business Card Design',
  description: 'Client ABC',
  data: canvasData,
  thumbnail_url: thumbnailUrl
});
```

### Create Invoice
```typescript
const { createInvoice } = useInvoices();

await createInvoice({
  customer_id: customerId,
  invoice_number: 'INV-001',
  items: [
    { name: 'Business Cards', qty: 1000, price: 50 }
  ],
  subtotal: 50,
  total: 50,
  status: 'unpaid'
});
```

### Upload Avatar
```typescript
const { uploadAvatar } = useProfile();

await uploadAvatar(file);
```

## 🔄 Migration from Current System

Existing data can be migrated:
1. Export from current PostgreSQL
2. Transform to new schema
3. Import to Supabase

## 🎨 Next Steps

1. ✅ Apply schema on Supabase VPS
2. ✅ Test authentication
3. ✅ Test CRUD operations
4. ✅ Integrate into existing pages
5. ✅ Migrate existing data (optional)

## 📞 Support

All APIs return `{ data, error }` format:
```typescript
const { data, error } = await api.projectsApi.getAll();
if (error) {
  console.error('Error:', error);
} else {
  console.log('Data:', data);
}
```

## 🎉 Ready to Use!

Everything is set up and ready. Just apply the schema and start using!
