# API Service Documentation

## 📋 Tổng quan

File `services/api.ts` cung cấp một API client production-ready với Axios, bao gồm:

- ✅ Tự động đính kèm Bearer Token
- ✅ Interceptors xử lý lỗi thông minh
- ✅ Type safety với TypeScript
- ✅ Retry mechanism
- ✅ Request/Response logging
- ✅ Token management
- ✅ Error handling tiếng Việt

## 🚀 Cài đặt

```bash
npm install axios
```

## ⚙️ Cấu hình Environment Variables

Tạo file `.env` với các biến sau:

```env
# API Configuration
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_PYTHON_API_URL=https://python-api.yourdomain.com
REACT_APP_SOCKET_URL=https://socket.yourdomain.com
REACT_APP_ADMIN_URL=https://admin.yourdomain.com

# Request Settings
REACT_APP_API_TIMEOUT=30000
REACT_APP_MAX_FILE_SIZE=10485760
REACT_APP_MAX_FILES_COUNT=10

# Pagination
REACT_APP_DEFAULT_PAGE_SIZE=20
REACT_APP_MAX_PAGE_SIZE=100

# Cache & Retry
REACT_APP_CACHE_DURATION=300000
REACT_APP_MAX_RETRIES=3
REACT_APP_RETRY_DELAY=1000
```

## 📖 Cách sử dụng cơ bản

### 1. Authentication

```typescript
import { authApi, tokenManager } from '../services/api';

// Đăng nhập
const loginUser = async (email: string, password: string) => {
  try {
    const result = await authApi.login(email, password);
    
    // Lưu token
    tokenManager.setToken(result.access_token);
    localStorage.setItem('auth_user', JSON.stringify(result.user));
    
    return result;
  } catch (error) {
    console.error('Login failed:', error.message);
  }
};

// Đăng xuất
const logoutUser = async () => {
  await authApi.logout();
  tokenManager.removeToken();
};
```

### 2. User Management

```typescript
import { userApi } from '../services/api';

// Lấy thông tin user
const getUserProfile = async () => {
  const profile = await userApi.getProfile();
  return profile;
};

// Cập nhật profile
const updateUserProfile = async (data: { fullName?: string; phone?: string }) => {
  const updatedProfile = await userApi.updateProfile(data);
  return updatedProfile;
};

// Upload avatar
const uploadUserAvatar = async (file: File) => {
  const result = await userApi.uploadAvatar(file);
  return result.avatarUrl;
};
```

### 3. Business Management

```typescript
import { customerApi, quoteApi, invoiceApi } from '../services/api';

// Quản lý khách hàng
const getCustomers = async (params?: { page?: number; limit?: number; search?: string }) => {
  const customers = await customerApi.getCustomers(params);
  return customers;
};

const createCustomer = async (customerData: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}) => {
  const newCustomer = await customerApi.createCustomer(customerData);
  return newCustomer;
};

// Quản lý báo giá
const createQuote = async (quoteData: {
  customerId: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  notes?: string;
}) => {
  const newQuote = await quoteApi.createQuote(quoteData);
  return newQuote;
};

// Chuyển báo giá thành hóa đơn
const convertQuoteToInvoice = async (quoteId: string) => {
  const invoice = await quoteApi.convertToInvoice(quoteId);
  return invoice;
};
```

## 🎣 Sử dụng với React Hooks

### 1. Hook cơ bản

```typescript
import { useApi } from '../hooks/useApi';
import { userApi } from '../services/api';

const UserProfile: React.FC = () => {
  const {
    data: profile,
    loading,
    error,
    execute: loadProfile
  } = useApi(userApi.getProfile);

  useEffect(() => {
    loadProfile();
  }, []);

  if (loading) return <div>Đang tải...</div>;
  if (error) return <div>Lỗi: {error}</div>;

  return (
    <div>
      <h1>{profile?.fullName}</h1>
      <p>{profile?.email}</p>
    </div>
  );
};
```

### 2. Form submission hook

```typescript
import { useFormApi } from '../hooks/useApi';
import { customerApi } from '../services/api';

const CreateCustomerForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const {
    submit: createCustomer,
    isSubmitting,
    submitError,
    submitSuccess
  } = useFormApi(customerApi.createCustomer, {
    onSuccess: () => {
      setFormData({ name: '', email: '', phone: '' });
      alert('Tạo khách hàng thành công!');
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCustomer(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Tên khách hàng"
        required
      />
      <input
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Email"
        type="email"
      />
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Đang tạo...' : 'Tạo khách hàng'}
      </button>
      {submitError && <p className="error">{submitError}</p>}
      {submitSuccess && <p className="success">Tạo thành công!</p>}
    </form>
  );
};
```

### 3. Paginated data hook

```typescript
import { usePaginatedApi } from '../hooks/useApi';
import { customerApi } from '../services/api';

const CustomerList: React.FC = () => {
  const {
    data: customers,
    pagination,
    loading,
    error,
    loadMore,
    refresh,
    updateParams
  } = usePaginatedApi(customerApi.getCustomers, {
    page: 1,
    limit: 20
  });

  const handleSearch = (search: string) => {
    updateParams({ search });
  };

  return (
    <div>
      <input
        placeholder="Tìm kiếm khách hàng..."
        onChange={(e) => handleSearch(e.target.value)}
      />
      
      {customers.map(customer => (
        <div key={customer.id}>
          <h3>{customer.name}</h3>
          <p>{customer.email}</p>
        </div>
      ))}
      
      {pagination.hasMore && (
        <button onClick={loadMore} disabled={loading}>
          {loading ? 'Đang tải...' : 'Tải thêm'}
        </button>
      )}
      
      <p>Đã tải: {customers.length} / {pagination.total}</p>
    </div>
  );
};
```

### 4. File upload hook

```typescript
import { useFileUpload } from '../hooks/useApi';
import { userApi } from '../services/api';

const AvatarUpload: React.FC = () => {
  const {
    upload,
    loading,
    error,
    success,
    uploadProgress,
    uploadedFiles
  } = useFileUpload(userApi.uploadAvatar, {
    onSuccess: (result) => {
      console.log('Avatar uploaded:', result.avatarUrl);
    }
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await upload(file);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={loading}
      />
      
      {loading && (
        <div>
          <div className="progress-bar">
            <div style={{ width: `${uploadProgress}%` }} />
          </div>
          <p>Đang tải lên: {uploadProgress}%</p>
        </div>
      )}
      
      {error && <p className="error">{error}</p>}
      {success && <p className="success">Tải lên thành công!</p>}
    </div>
  );
};
```

## 🔧 Advanced Features

### 1. Custom interceptors

```typescript
import apiClient from '../services/api';

// Thêm custom request interceptor
apiClient.interceptors.request.use((config) => {
  // Thêm custom headers
  config.headers['X-Custom-Header'] = 'custom-value';
  return config;
});

// Thêm custom response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Xử lý response thành công
    return response;
  },
  (error) => {
    // Xử lý lỗi custom
    if (error.response?.status === 429) {
      // Rate limiting
      console.log('Too many requests, please wait...');
    }
    return Promise.reject(error);
  }
);
```

### 2. Token refresh

```typescript
import { authApi, tokenManager } from '../services/api';

// Auto refresh token khi hết hạn
const setupTokenRefresh = () => {
  setInterval(async () => {
    if (tokenManager.getToken() && !tokenManager.isTokenValid()) {
      try {
        const result = await authApi.refreshToken();
        tokenManager.setToken(result.access_token);
      } catch (error) {
        // Token refresh failed, redirect to login
        tokenManager.removeToken();
        window.location.href = '/login';
      }
    }
  }, 60000); // Check every minute
};
```

### 3. Request caching

```typescript
import { useState, useEffect } from 'react';

const useApiCache = <T>(
  apiFunction: () => Promise<T>,
  cacheKey: string,
  cacheDuration: number = 5 * 60 * 1000 // 5 minutes
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cachedData = localStorage.getItem(`cache_${cacheKey}`);
    const cachedTime = localStorage.getItem(`cache_time_${cacheKey}`);
    
    if (cachedData && cachedTime) {
      const age = Date.now() - parseInt(cachedTime);
      if (age < cacheDuration) {
        setData(JSON.parse(cachedData));
        return;
      }
    }

    // Cache expired or doesn't exist, fetch new data
    setLoading(true);
    apiFunction()
      .then((result) => {
        setData(result);
        localStorage.setItem(`cache_${cacheKey}`, JSON.stringify(result));
        localStorage.setItem(`cache_time_${cacheKey}`, Date.now().toString());
      })
      .finally(() => setLoading(false));
  }, [apiFunction, cacheKey, cacheDuration]);

  return { data, loading };
};
```

## 🚨 Error Handling

### 1. Global error handler

```typescript
// Lắng nghe auth logout event
window.addEventListener('auth:logout', () => {
  // Redirect to login page
  window.location.href = '/login';
});

// Custom error boundary
class ApiErrorBoundary extends React.Component {
  componentDidCatch(error: Error) {
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      tokenManager.removeToken();
      window.location.href = '/login';
    }
  }
}
```

### 2. Retry mechanism

```typescript
import { useApi } from '../hooks/useApi';

const ComponentWithRetry: React.FC = () => {
  const { data, loading, error, execute } = useApi(
    someApiFunction,
    {
      retries: 3,
      retryDelay: 1000,
      onError: (error) => {
        console.log('API call failed after retries:', error);
      }
    }
  );

  return (
    <div>
      {error && (
        <div>
          <p>Lỗi: {error}</p>
          <button onClick={execute}>Thử lại</button>
        </div>
      )}
    </div>
  );
};
```

## 📊 Monitoring & Debugging

### 1. Request logging

```typescript
// Enable trong development
if (process.env.NODE_ENV === 'development') {
  // Logs sẽ tự động hiển thị trong console
  // 🚀 API Request: GET /user/profile
  // ✅ API Response: GET /user/profile
  // ❌ API Error: GET /user/profile
}
```

### 2. Performance monitoring

```typescript
import { useApi } from '../hooks/useApi';

const ComponentWithMetrics: React.FC = () => {
  const { execute } = useApi(
    async () => {
      const startTime = performance.now();
      const result = await someApiFunction();
      const endTime = performance.now();
      
      console.log(`API call took ${endTime - startTime} milliseconds`);
      return result;
    }
  );
};
```

## 🔒 Security Best Practices

1. **Token Storage**: Tokens được lưu trong localStorage, cân nhắc sử dụng httpOnly cookies cho production
2. **HTTPS Only**: Luôn sử dụng HTTPS trong production
3. **Token Expiry**: Kiểm tra token expiry và auto refresh
4. **Input Validation**: Validate dữ liệu trước khi gửi API
5. **Error Messages**: Không expose sensitive information trong error messages

## 📝 Migration từ hệ thống cũ

### 1. Thay thế fetch calls

```typescript
// Cũ
const response = await fetch('/api/users', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
const users = await response.json();

// Mới
const users = await userApi.getProfile();
```

### 2. Thay thế error handling

```typescript
// Cũ
try {
  const response = await fetch('/api/users');
  if (!response.ok) {
    throw new Error('API call failed');
  }
  const users = await response.json();
} catch (error) {
  console.error(error);
}

// Mới
const { data: users, error } = useApi(userApi.getProfile);
```

## 🎯 Best Practices

1. **Sử dụng TypeScript**: Luôn define types cho API responses
2. **Error Handling**: Xử lý lỗi ở component level
3. **Loading States**: Hiển thị loading indicators
4. **Caching**: Cache data khi có thể để giảm API calls
5. **Pagination**: Sử dụng pagination cho large datasets
6. **Debouncing**: Debounce search inputs
7. **Optimistic Updates**: Update UI trước khi API response về

## 🔗 Tài liệu tham khảo

- [Axios Documentation](https://axios-http.com/docs/intro)
- [React Query](https://tanstack.com/query/latest) - Alternative for complex state management
- [SWR](https://swr.vercel.app/) - Alternative for data fetching