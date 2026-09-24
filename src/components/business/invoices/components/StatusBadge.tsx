import React from 'react';
import { AlertCircle, Clock, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { InvoiceStatus, getInvoiceStatusConfig } from '../../../../types/business';

interface StatusBadgeProps {
  status: InvoiceStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = getInvoiceStatusConfig(status);

  if (!config) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
        <AlertCircle size={12} />
        {status || 'Unknown'}
      </span>
    );
  }

  const colorClasses = {
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
    green: 'bg-green-100 text-green-700',
    gray: 'bg-gray-100 text-gray-700',
  };

  const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
    AlertCircle,
    Clock,
    CheckCircle,
    AlertTriangle,
    X,
  };
  const Icon = iconMap[config.icon] || AlertCircle;

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${colorClasses[config.color as keyof typeof colorClasses] || 'bg-gray-100 text-gray-700'}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
};
