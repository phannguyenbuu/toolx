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
