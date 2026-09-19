import React, { useState } from 'react';
import { 
  userApi, 
  customerApi, 
  quoteApi, 
  authApi, 
  tokenManager 
} from '../services/api';
import { useApi, useFormApi, usePaginatedApi, useFileUpload } from '../hooks/useApi';

// ============================================
// EXAMPLE COMPONENT USING NEW API SERVICE
// ============================================

const ApiUsageExample: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // ============================================
  // 1. AUTHENTICATION EXAMPLE
  // ============================================
  
  const {
    submit: login,
    isSubmitting: isLoggingIn,
    submitError: loginError,
    submitSuccess: loginSuccess
  } = useFormApi(
    async (email: string, password: string) => {
      const result = await authApi.login(email, password);
      
      // Store token and user data
      tokenManager.setToken(result.access_token);
      localStorage.setItem('auth_user', JSON.stringify(result.user));
      localStorage.setItem('auth_wallet', JSON.stringify(result.wallet));
      
      return result;
    },
    {
      onSuccess: (data) => {
        console.log('Login successful:', data);
        // Redirect to dashboard or update app state
      },
      onError: (error) => {
        console.error('Login failed:', error);
      }
    }
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  // ============================================
  // 2. USER PROFILE EXAMPLE
  // ============================================
  
  const {
    data: userProfile,
    loading: profileLoading,
    error: profileError,
    execute: loadProfile
  } = useApi(userApi.getProfile);

  const {
    submit: updateProfile,
    isSubmitting: isUpdatingProfile,
    submitError: updateProfileError,
    submitSuccess: updateProfileSuccess
  } = useFormApi(userApi.updateProfile, {
    onSuccess: () => {
      // Reload profile after update
      loadProfile();
    }
  });

  // ============================================
  // 3. CUSTOMER LIST WITH PAGINATION
  // ============================================
  
  const {
    data: customers,
    pagination,
    loading: customersLoading,
    error: customersError,
    loadMore,
    refresh: refreshCustomers,
    updateParams: updateCustomerParams
  } = usePaginatedApi(customerApi.getCustomers, {
    page: 1,
    limit: 20,
    search: ''
  });

  // ============================================
  // 4. CREATE CUSTOMER EXAMPLE
  // ============================================
  
  const {
    submit: createCustomer,
    isSubmitting: isCreatingCustomer,
    submitError: createCustomerError,
    submitSuccess: createCustomerSuccess
  } = useFormApi(customerApi.createCustomer, {
    onSuccess: () => {
      // Refresh customer list after creation
      refreshCustomers();
    }
  });

  const handleCreateCustomer = async () => {
    await createCustomer({
      name: 'Công ty ABC',
      email: 'abc@example.com',
      phone: '0123456789',
      address: '123 Đường ABC, TP.HCM'
    });
  };

  // ============================================
  // 5. FILE UPLOAD EXAMPLE
  // ============================================
  
  const {
    upload: uploadAvatar,
    loading: uploadLoading,
    error: uploadError,
    success: uploadSuccess,
    uploadProgress,
    uploadedFiles
  } = useFileUpload(
    async (file: File | File[]) => {
      // Handle both single file and array of files
      const singleFile = Array.isArray(file) ? file[0] : file;
      return await userApi.uploadAvatar(singleFile);
    }, 
    {
      onSuccess: (result) => {
        console.log('Avatar uploaded:', result);
        // Update user profile with new avatar URL
        updateProfile({ avatarUrl: result.avatarUrl });
      }
    }
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadAvatar(file);
    }
  };

  // ============================================
  // 6. QUOTE MANAGEMENT EXAMPLE
  // ============================================
  
  const {
    data: quotes,
    loading: quotesLoading,
    error: quotesError,
    execute: loadQuotes
  } = useApi(quoteApi.getQuotes);

  const {
    submit: createQuote,
    isSubmitting: isCreatingQuote,
    submitError: createQuoteError
  } = useFormApi(quoteApi.createQuote, {
    onSuccess: () => {
      loadQuotes(); // Reload quotes after creation
    }
  });

  const handleCreateQuote = async () => {
    if (customers.length === 0) {
      alert('Vui lòng tạo khách hàng trước');
      return;
    }

    await createQuote({
      customerId: customers[0].id,
      items: [
        {
          id: '1',
          description: 'In tem nhãn',
          quantity: 1000,
          unit: 'cái',
          unitPrice: 5000,
          total: 5000000
        }
      ],
      subtotal: 5000000,
      discountPercent: 0,
      discountAmount: 0,
      vatPercent: 10,
      vatAmount: 500000,
      total: 5500000,
      notes: 'Báo giá in tem nhãn'
    });
  };

  // ============================================
  // 7. ERROR HANDLING EXAMPLE
  // ============================================
  
  const {
    execute: testErrorHandling,
    loading: errorTestLoading,
    error: errorTestError
  } = useApi(
    async () => {
      // This will trigger a 404 error
      return await customerApi.getCustomer('non-existent-id');
    },
    {
      retries: 2,
      retryDelay: 1000,
      onError: (error) => {
        console.log('Error handled:', error);
      }
    }
  );

  // ============================================
  // RENDER COMPONENT
  // ============================================

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">API Usage Examples</h1>

      {/* Authentication Section */}
      <section className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">1. Authentication</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoggingIn}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            {isLoggingIn ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
        {loginError && <p className="text-red-500 mt-2">{loginError}</p>}
        {loginSuccess && <p className="text-green-500 mt-2">Đăng nhập thành công!</p>}
      </section>

      {/* User Profile Section */}
      <section className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">2. User Profile</h2>
        <button
          onClick={loadProfile}
          disabled={profileLoading}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50 mr-2"
        >
          {profileLoading ? 'Đang tải...' : 'Tải thông tin'}
        </button>
        <button
          onClick={() => updateProfile({ fullName: 'Tên mới' })}
          disabled={isUpdatingProfile}
          className="px-4 py-2 bg-yellow-500 text-white rounded disabled:opacity-50"
        >
          {isUpdatingProfile ? 'Đang cập nhật...' : 'Cập nhật tên'}
        </button>
        {profileError && <p className="text-red-500 mt-2">{profileError}</p>}
        {updateProfileSuccess && <p className="text-green-500 mt-2">Cập nhật thành công!</p>}
        {userProfile && (
          <div className="mt-4 p-2 bg-gray-100 rounded">
            <p><strong>Email:</strong> {userProfile.email}</p>
            <p><strong>Tên:</strong> {userProfile.fullName || 'Chưa có'}</p>
          </div>
        )}
      </section>

      {/* Customer Management Section */}
      <section className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">3. Customer Management</h2>
        <div className="space-x-2 mb-4">
          <button
            onClick={refreshCustomers}
            disabled={customersLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            {customersLoading ? 'Đang tải...' : 'Tải khách hàng'}
          </button>
          <button
            onClick={handleCreateCustomer}
            disabled={isCreatingCustomer}
            className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
          >
            {isCreatingCustomer ? 'Đang tạo...' : 'Tạo khách hàng'}
          </button>
          <button
            onClick={loadMore}
            disabled={customersLoading || !pagination.hasMore}
            className="px-4 py-2 bg-purple-500 text-white rounded disabled:opacity-50"
          >
            Tải thêm
          </button>
        </div>
        {customersError && <p className="text-red-500 mb-2">{customersError}</p>}
        {createCustomerSuccess && <p className="text-green-500 mb-2">Tạo khách hàng thành công!</p>}
        <div className="space-y-2">
          <p><strong>Tổng:</strong> {pagination.total} khách hàng</p>
          <p><strong>Đã tải:</strong> {customers.length} khách hàng</p>
          {customers.map((customer) => (
            <div key={customer.id} className="p-2 bg-gray-100 rounded">
              <p><strong>{customer.name}</strong> - {customer.email}</p>
            </div>
          ))}
        </div>
      </section>

      {/* File Upload Section */}
      <section className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">4. File Upload</h2>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          disabled={uploadLoading}
          className="mb-2"
        />
        {uploadLoading && (
          <div className="mb-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">Đang tải lên: {uploadProgress}%</p>
          </div>
        )}
        {uploadError && <p className="text-red-500">{uploadError}</p>}
        {uploadSuccess && <p className="text-green-500">Tải lên thành công!</p>}
      </section>

      {/* Quote Management Section */}
      <section className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">5. Quote Management</h2>
        <div className="space-x-2 mb-4">
          <button
            onClick={loadQuotes}
            disabled={quotesLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            {quotesLoading ? 'Đang tải...' : 'Tải báo giá'}
          </button>
          <button
            onClick={handleCreateQuote}
            disabled={isCreatingQuote}
            className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
          >
            {isCreatingQuote ? 'Đang tạo...' : 'Tạo báo giá'}
          </button>
        </div>
        {quotesError && <p className="text-red-500 mb-2">{quotesError}</p>}
        {createQuoteError && <p className="text-red-500 mb-2">{createQuoteError}</p>}
        {quotes && (
          <div className="space-y-2">
            <p><strong>Số báo giá:</strong> {Array.isArray(quotes) ? quotes.length : quotes.data?.length || 0}</p>
            {(Array.isArray(quotes) ? quotes : quotes.data || []).map((quote: any) => (
              <div key={quote.id} className="p-2 bg-gray-100 rounded">
                <p><strong>{quote.quoteNumber}</strong> - {quote.total.toLocaleString()} VND</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Error Handling Section */}
      <section className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">6. Error Handling</h2>
        <button
          onClick={testErrorHandling}
          disabled={errorTestLoading}
          className="px-4 py-2 bg-red-500 text-white rounded disabled:opacity-50"
        >
          {errorTestLoading ? 'Đang test...' : 'Test lỗi 404'}
        </button>
        {errorTestError && <p className="text-red-500 mt-2">{errorTestError}</p>}
      </section>

      {/* Token Info Section */}
      <section className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">7. Token Management</h2>
        <div className="space-y-2">
          <p><strong>Token có hợp lệ:</strong> {tokenManager.isTokenValid() ? 'Có' : 'Không'}</p>
          <p><strong>Token:</strong> {tokenManager.getToken()?.substring(0, 50)}...</p>
          <button
            onClick={() => {
              tokenManager.removeToken();
              window.location.reload();
            }}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            Xóa token
          </button>
        </div>
      </section>
    </div>
  );
};

export default ApiUsageExample;