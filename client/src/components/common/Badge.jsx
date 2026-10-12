import React from 'react';
import clsx from 'clsx';

const STATUS_STYLES = {
  // Quotation Statuses
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SENT: 'bg-blue-50 text-blue-700 border-blue-200',
  ACCEPTED: 'bg-green-100 text-green-800 border-green-300 font-semibold',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  EXPIRED: 'bg-gray-100 text-gray-500 border-gray-200',

  // Lead Statuses
  NEW: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  CONTACTED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  QUOTATION_SENT: 'bg-purple-50 text-purple-700 border-purple-200',
  NEGOTIATING: 'bg-orange-50 text-orange-700 border-orange-200',
  CONVERTED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  LOST: 'bg-red-50 text-red-600 border-red-200',

  // Priorities
  LOW: 'bg-slate-100 text-slate-600 border-slate-200',
  MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
  HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
  URGENT: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',

  // Roles
  SUPER_ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
  BUSINESS_OWNER: 'bg-blue-100 text-blue-800 border-blue-200',
  SALES_MANAGER: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  SALES_REP: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  INVENTORY_MANAGER: 'bg-amber-100 text-amber-800 border-amber-200',
};

export function Badge({ status, label, className = '' }) {
  const normalized = String(status || '').toUpperCase();
  const style = STATUS_STYLES[normalized] || 'bg-slate-100 text-slate-700 border-slate-200';
  const displayLabel = label || normalized.replace(/_/g, ' ');

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border tracking-wide',
        style,
        className
      )}
    >
      {displayLabel}
    </span>
  );
}
