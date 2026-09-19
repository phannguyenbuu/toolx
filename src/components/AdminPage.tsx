import React from 'react';
import { AdminUtiDashboard } from './AdminUtiDashboard';

interface AdminPageProps {
  onClose?: () => void;
  onNavigateToClient?: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onClose, onNavigateToClient }) => {
  return (
    <AdminUtiDashboard
      onClose={onClose}
      onNavigateToClient={onNavigateToClient || onClose}
    />
  );
};

export default AdminPage;
