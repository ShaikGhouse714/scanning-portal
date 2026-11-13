'use client';

import { LucideIcon } from 'lucide-react';

export type ToggleTone = 'default' | 'purple' | 'emerald' | 'amber' | 'rose' | 'sky';

export interface SegmentedToggleOption<T extends string = string> {
  value: T;
  label: string;
  count?: number | string;
  icon?: LucideIcon;
  tone?: ToggleTone;
  title?: string;
}

interface SegmentedToggleProps<T extends string = string> {
  value: T;
  options: SegmentedToggleOption<T>[];
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  wrap?: boolean;
  className?: string;
  fullWidth?: boolean;
}

const ACTIVE_TONE_CLASSES: Record<ToggleTone, string> = {
  default: 'bg-white text-black border-white shadow-sm font-semibold',
  purple: 'bg-purple-500/20 text-purple-200 border-purple-500/45 shadow-sm font-semibold',
  emerald: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/45 shadow-sm font-semibold',
  amber: 'bg-amber-400 text-black border-amber-300 shadow-sm font-bold',
  rose: 'bg-rose-500/20 text-rose-200 border-rose-500/45 shadow-sm font-semibold',
  sky: 'bg-sky-500/20 text-sky-200 border-sky-500/45 shadow-sm font-semibold',
};

const INACTIVE_TONE_CLASSES: Record<ToggleTone, string> = {
  default: 'text-zinc-400 hover:text-white hover:bg-zinc-900/90 border-transparent',
  purple: 'text-zinc-400 hover:text-purple-200 hover:bg-purple-500/10 border-transparent',
  emerald: 'text-zinc-400 hover:text-emerald-200 hover:bg-emerald-500/10 border-transparent',
  amber: 'text-zinc-400 hover:text-amber-200 hover:bg-amber-500/10 border-transparent',
  rose: 'text-zinc-400 hover:text-rose-200 hover:bg-rose-500/10 border-transparent',
  sky: 'text-zinc-400 hover:text-sky-200 hover:bg-sky-500/10 border-transparent',
};

/**
 * Shared dark segmented pill toggle used across dashboards, filters, and modal views.
 */
export function SegmentedToggle<T extends string = string>({
  value,
  options,
  onChange,
  size = 'md',
  wrap = false,
  className = '',
  fullWidth = false,
}: SegmentedToggleProps<T>) {
  const containerPadding = size === 'sm' ? 'p-0.5 rounded-lg' : 'p-1 rounded-xl';
  const itemPadding = size === 'sm' ? 'px-2.5 py-1 text-[11px] rounded-md' : 'px-3 py-1.5 text-xs rounded-lg';

  return (
    <div
      role="tablist"
      className={`bg-black border border-[#27272a] ${containerPadding} ${
        fullWidth ? 'flex w-full' : 'inline-flex'
      } ${wrap ? 'flex-wrap gap-1' : 'items-center gap-0.5'} ${className}`}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        const tone: ToggleTone = opt.tone || 'default';
        const Icon = opt.icon;
        const isLightActive = tone === 'default' || tone === 'amber';

        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.value)}
            title={opt.title}
            className={`${itemPadding} ${
              fullWidth ? 'flex-1 justify-center' : ''
            } border inline-flex items-center space-x-1.5 font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 whitespace-nowrap ${
              isActive ? ACTIVE_TONE_CLASSES[tone] : INACTIVE_TONE_CLASSES[tone]
            }`}
          >
            {Icon && (
              <Icon
                className={`w-3.5 h-3.5 shrink-0 ${
                  isActive && isLightActive ? 'text-black' : isActive ? 'text-current' : 'text-zinc-500'
                }`}
              />
            )}
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                  isActive
                    ? isLightActive
                      ? 'bg-black/10 text-black font-bold'
                      : 'bg-black/30 text-current font-semibold'
                    : 'bg-zinc-900 text-zinc-400'
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
