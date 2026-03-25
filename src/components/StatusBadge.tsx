import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';
import type { ItemStatus } from '@/types/database';

interface StatusBadgeProps {
  status: ItemStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  isOverdue?: boolean;
}

const statusConfig = {
  ok: {
    icon: CheckCircle,
    label: 'OK',
    className: 'status-ok',
  },
  attention: {
    icon: AlertTriangle,
    label: 'ATENÇÃO',
    className: 'status-attention',
  },
  missing: {
    icon: XCircle,
    label: 'FALTANDO',
    className: 'status-missing',
  },
  preparing: {
    icon: Clock,
    label: 'EM PREPARO',
    className: 'status-preparing',
  },
};

const sizeConfig = {
  sm: 'text-xs px-2 py-1',
  md: 'text-sm px-3 py-1.5',
  lg: 'text-base px-4 py-2',
};

export function StatusBadge({ status, size = 'md', showLabel = true, isOverdue = false }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`
        status-badge ${config.className} ${sizeConfig[size]}
        ${isOverdue ? 'pulse-overdue status-overdue' : ''}
        ${status === 'missing' && !isOverdue ? 'pulse-alert' : ''}
      `}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />
      {showLabel && <span>{isOverdue ? 'SLA ESTOURADO' : config.label}</span>}
    </motion.span>
  );
}
