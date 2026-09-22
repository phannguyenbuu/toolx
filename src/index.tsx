import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Bỏ qua các lỗi AbortError từ Web Locks API (Supabase lock steal) tránh bật overlay lỗi đỏ
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (
      reason?.name === 'AbortError' ||
      (typeof reason?.message === 'string' && reason.message.includes('steal')) ||
      (typeof reason === 'string' && reason.includes('steal'))
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
console.log('API URL:', process.env.REACT_APP_API_URL);

// Tự động reload trang khi phát hiện thay đổi mã nguồn trong môi trường dev (khắc phục Fast Refresh không tương thích React 19)
if (process.env.NODE_ENV === 'development' && (module as any).hot) {
  let isHmrUpdating = false;
  (module as any).hot.addStatusHandler((status: string) => {
    if (status === 'check' || status === 'prepare' || status === 'apply') {
      isHmrUpdating = true;
    } else if (status === 'idle' && isHmrUpdating) {
      isHmrUpdating = false;
      console.log('[HMR] Module updated, auto-reloading page...');
      window.location.reload();
    }
  });
}

