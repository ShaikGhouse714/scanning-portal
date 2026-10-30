'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'indigo';
  badge?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  badge,
}) => {
  const variantStyles = {
    default: {
      bg: 'bg-white',
      border: 'border-slate-200',
      iconBg: 'bg-slate-100 text-slate-700',
      valueColor: 'text-slate-900',
    },
    indigo: {
      bg: 'bg-white',
      border: 'border-indigo-100 ring-1 ring-indigo-50',
      iconBg: 'bg-indigo-50 text-indigo-600',
      valueColor: 'text-indigo-950',
    },
    success: {
      bg: 'bg-white',
      border: 'border-emerald-100 ring-1 ring-emerald-50',
      iconBg: 'bg-emerald-50 text-emerald-600',
      valueColor: 'text-emerald-950',
    },
    warning: {
      bg: 'bg-amber-50/40',
      border: 'border-amber-200 ring-1 ring-amber-100',
      iconBg: 'bg-amber-100 text-amber-700',
      valueColor: 'text-amber-950',
    },
    danger: {
      bg: 'bg-rose-50/50',
      border: 'border-rose-200 ring-1 ring-rose-100',
      iconBg: 'bg-rose-100 text-rose-700',
      valueColor: 'text-rose-950',
    },
  }[variant];

  return (
    <div
      className={`rounded-xl p-5 border shadow-sm transition-all hover:shadow-md ${variantStyles.bg} ${variantStyles.border}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider uppercase text-slate-500">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl ${variantStyles.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${variantStyles.valueColor}`}>
          {value}
        </div>
        {badge && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {badge}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-500 line-clamp-1">{subtitle}</p>
      )}
    </div>
  );
};

