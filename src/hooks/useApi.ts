import { useState, useCallback, useRef, useEffect } from 'react';
import { AxiosError } from 'axios';

// ============================================
// API HOOK TYPES
// ============================================

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  success: boolean;
}

interface UseApiOptions {
  immediate?: boolean; // Execute immediately on mount
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  retries?: number;
  retryDelay?: number;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: any[]) => Promise<T>;
  reset: () => void;
  cancel: () => void;
}

// ============================================
// MAIN API HOOK
// ============================================

export function useApi<T = any>(
  apiFunction: (...args: any[]) => Promise<T>,
  options: UseApiOptions = {}
): UseApiReturn<T> {
  const {
    immediate = false,
    onSuccess,
    onError,
    retries = 0,
    retryDelay = 1000,
  } = options;

  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
    success: false,
  });

  const cancelTokenRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (cancelTokenRef.current) {
        cancelTokenRef.current.abort();
      }
    };
  }, []);

  const execute = useCallback(
    async (...args: any[]): Promise<T> => {
      // Cancel previous request
      if (cancelTokenRef.current) {
        cancelTokenRef.current.abort();
      }

      // Create new cancel token
      cancelTokenRef.current = new AbortController();

      if (!mountedRef.current) return Promise.reject(new Error('Component unmounted'));

      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        success: false,
      }));

      let attempt = 0;
      const maxAttempts = retries + 1;

      while (attempt < maxAttempts) {
        try {
          const result = await apiFunction(...args);

          if (!mountedRef.current) return result;

          setState({
            data: result,
            loading: false,
            error: null,
            success: true,
          });

          onSuccess?.(result);
          return result;
        } catch (error: any) {
          attempt++;

          // Don't retry if request was cancelled
          if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
            if (!mountedRef.current) return Promise.reject(error);
            
            setState(prev => ({
              ...prev,
              loading: false,
            }));
            return Promise.reject(error);
          }

          // If this was the last attempt, handle the error
          if (attempt >= maxAttempts) {
            if (!mountedRef.current) return Promise.reject(error);

            const errorMessage = getErrorMessage(error);
            
            setState({
              data: null,
              loading: false,
              error: errorMessage,
              success: false,
            });

            onError?.(errorMessage);
            return Promise.reject(error);
          }

          // Wait before retrying
          if (retryDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          }
        }
      }

      return Promise.reject(new Error('Max retries exceeded'));
    },
    [apiFunction, onSuccess, onError, retries, retryDelay]
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      success: false,
    });
  }, []);

  const cancel = useCallback(() => {
    if (cancelTokenRef.current) {
      cancelTokenRef.current.abort();
    }
  }, []);

  // Execute immediately if requested
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return {
    ...state,
    execute,
    reset,
    cancel,
  };
}

// ============================================
// SPECIALIZED API HOOKS
// ============================================

// Hook for paginated data
export function usePaginatedApi<T = any>(
  apiFunction: (params: any) => Promise<{ data: T[]; total: number; page: number; limit: number }>,
  initialParams: any = {}
) {
  const [params, setParams] = useState(initialParams);
  const [allData, setAllData] = useState<T[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    hasMore: false,
  });

  const { data, loading, error, execute } = useApi(apiFunction, {
    onSuccess: (result: { data: T[]; total: number; page: number; limit: number }) => {
      if (params.page === 1) {
        setAllData(result.data);
      } else {
        setAllData((prev: T[]) => [...prev, ...result.data]);
      }
      
      setPagination({
        total: result.total,
        page: result.page,
        limit: result.limit,
        hasMore: result.data.length === result.limit,
      });
    },
  });

  const loadMore = useCallback(() => {
    if (!loading && pagination.hasMore) {
      setParams((prev: any) => ({ ...prev, page: prev.page + 1 }));
    }
  }, [loading, pagination.hasMore]);

  const refresh = useCallback(() => {
    setParams((prev: any) => ({ ...prev, page: 1 }));
    setAllData([]);
  }, []);

  const updateParams = useCallback((newParams: any) => {
    setParams((prev: any) => ({ ...prev, ...newParams, page: 1 }));
    setAllData([]);
  }, []);

  useEffect(() => {
    execute(params);
  }, [params, execute]);

  return {
    data: allData,
    pagination,
    loading,
    error,
    loadMore,
    refresh,
    updateParams,
  };
}

// Hook for form submissions
export function useFormApi<T = any>(
  apiFunction: (...args: any[]) => Promise<T>,
  options: UseApiOptions = {}
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const { execute } = useApi(apiFunction, {
    ...options,
    onSuccess: (data) => {
      setSubmitSuccess(true);
      setSubmitError(null);
      options.onSuccess?.(data);
    },
    onError: (error) => {
      setSubmitError(error);
      setSubmitSuccess(false);
      options.onError?.(error);
    },
  });

  const submit = useCallback(async (...args: any[]) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const result = await execute(...args);
      return result;
    } finally {
      setIsSubmitting(false);
    }
  }, [execute]);

  const resetForm = useCallback(() => {
    setSubmitError(null);
    setSubmitSuccess(false);
  }, []);

  return {
    submit,
    isSubmitting,
    submitError,
    submitSuccess,
    resetForm,
  };
}

// Hook for file uploads
export function useFileUpload(
  uploadFunction: (file: File | File[]) => Promise<any>,
  options: UseApiOptions = {}
) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);

  const { execute, loading, error, success } = useApi(uploadFunction, {
    ...options,
    onSuccess: (result) => {
      setUploadedFiles(Array.isArray(result) ? result : [result]);
      setUploadProgress(100);
      options.onSuccess?.(result);
    },
    onError: (error) => {
      setUploadProgress(0);
      options.onError?.(error);
    },
  });

  const upload = useCallback(async (files: File | File[]) => {
    setUploadProgress(0);
    setUploadedFiles([]);
    
    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const result = await execute(files);
      clearInterval(progressInterval);
      return result;
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  }, [execute]);

  const reset = useCallback(() => {
    setUploadProgress(0);
    setUploadedFiles([]);
  }, []);

  return {
    upload,
    loading,
    error,
    success,
    uploadProgress,
    uploadedFiles,
    reset,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getErrorMessage(error: any): string {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (error?.response?.status) {
    switch (error.response.status) {
      case 400:
        return 'Yêu cầu không hợp lệ.';
      case 401:
        return 'Phiên đăng nhập đã hết hạn.';
      case 403:
        return 'Bạn không có quyền truy cập.';
      case 404:
        return 'Không tìm thấy dữ liệu.';
      case 422:
        return 'Dữ liệu không hợp lệ.';
      case 500:
        return 'Lỗi máy chủ.';
      default:
        return 'Có lỗi xảy ra.';
    }
  }
  
  return 'Có lỗi xảy ra. Vui lòng thử lại.';
}

// Export utility functions
export { getErrorMessage };