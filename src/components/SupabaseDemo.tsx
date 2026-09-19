import React from 'react';
import { useAuth } from './SupabaseAuthProvider';
import { SupabaseAuthForm } from './SupabaseAuthForm';
import { SupabaseDataTable } from './SupabaseDataTable';

export const SupabaseDemo: React.FC = () => {
  const { user, loading, signOut } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return <SupabaseAuthForm onSuccess={() => window.location.reload()} />;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2>Xin chào, {user.email}</h2>
          <p>User ID: {user.id}</p>
        </div>
        <button
          onClick={signOut}
          style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Đăng xuất
        </button>
      </div>

      <hr />

      {/* Example: Hiển thị data từ table */}
      {/* <SupabaseDataTable table="your_table_name" columns={['id', 'name', 'created_at']} /> */}
      
      <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h3>Supabase đã sẵn sàng!</h3>
        <p>Uncomment DataTable component ở trên để hiển thị data từ Supabase.</p>
        <p>Hoặc import các helper functions để sử dụng:</p>
        <pre style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
{`import { getAll, create, update } from './services/supabaseHelpers';

// Lấy data
const { data } = await getAll('products');

// Tạo mới
await create('products', { name: 'Product 1' });`}
        </pre>
      </div>
    </div>
  );
};
