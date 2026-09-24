import React from 'react';
import { Clock, Send, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { QuoteStatus, getQuoteStatusConfig } from '../../../../types/business';

interface StatusBadgeProps {
  status: QuoteStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = getQuoteStatusConfig(status);

  if (!config) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
        <Clock size={12} />
        {status || 'Unknown'}
      </span>
    );
  }

  const colorClasses = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-700',
  };

  const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
    Clock,
    Send,
    CheckCircle,
    XCircle,
    AlertTriangle,
  };
  const Icon = iconMap[config.icon] || Clock;

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${colorClasses[config.color as keyof typeof colorClasses] || 'bg-gray-100 text-gray-700'}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
};
