import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../components/auth';
import { PrintConfigProvider } from '../contexts/PrintConfigContext';
import { AppLayout } from './AppLayout';

export function AppWithAuth() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PrintConfigProvider>
          <Toaster position="top-right" />
          <AppLayout />
        </PrintConfigProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default AppWithAuth;
