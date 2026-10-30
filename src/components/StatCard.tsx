'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'indigo' | 'cyan';
  badge?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'cyan',
  badge,
}) => {
  const isAlert = variant === 'warning' || variant === 'danger';
  const isSuccess = variant === 'success';

  return (
    <div
      className={`rounded-2xl p-5 border bg-[#091122] transition-all hover:border-cyan-500/50 relative overflow-hidden font-mono shadow-xl ${
        isAlert
          ? 'border-rose-500/30 bg-gradient-to-b from-rose-950/20 to-[#091122]'
          : isSuccess
          ? 'border-emerald-500/30 bg-gradient-to-b from-emerald-950/15 to-[#091122]'
          : 'border-cyan-900/40 bg-[#091122]'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">
          {title}
        </span>
        <div
          className={`p-2 rounded-xl border ${
            isAlert
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              : isSuccess
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
          }`}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <div
          className={`text-2xl sm:text-3xl font-black tracking-tight ${
            isAlert ? 'text-rose-400' : isSuccess ? 'text-emerald-400' : 'text-white'
          }`}
        >
          {value}
        </div>
        {badge && (
          <span
            className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
              isAlert
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                : isSuccess
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
            }`}
          >
            {badge}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-[11px] text-slate-400 line-clamp-1 font-mono tracking-tight">{subtitle}</p>
      )}
    </div>
  );
};
