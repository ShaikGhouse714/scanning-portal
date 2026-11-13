'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, X, LucideIcon } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  badgeColor?: string;
}

interface CustomDropdownProps {
  id?: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  icon?: LucideIcon;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  minMenuWidth?: string;
  size?: 'sm' | 'md' | 'lg';
  menuAlign?: 'left' | 'right';
  searchable?: boolean;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  id,
  value,
  options,
  onChange,
  icon: Icon,
  placeholder = 'Select option',
  className = '',
  buttonClassName = '',
  minMenuWidth = 'min-w-[220px]',
  size = 'md',
  menuAlign = 'left',
  searchable,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const showSearch = searchable ?? options.length > 7;

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Focus search input when menu opens
  useEffect(() => {
    if (isOpen && showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen, showSearch]);

  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value);
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q)) ||
        (opt.badge && opt.badge.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  const sizeClasses =
    size === 'sm'
      ? 'px-2.5 py-1.5 rounded-lg text-xs'
      : size === 'lg'
      ? 'px-3.5 py-2.5 rounded-xl text-sm font-semibold'
      : 'px-3 py-1.5 rounded-xl text-xs font-medium';

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between space-x-2 transition-all border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 ${sizeClasses} ${
          isOpen
            ? 'bg-zinc-900 border-zinc-500 text-white shadow-md'
            : 'bg-[#09090b] hover:bg-[#121214] border-[#27272a] hover:border-zinc-600 text-zinc-200'
        } ${buttonClassName}`}
      >
        <div className="flex items-center space-x-2 min-w-0 truncate">
          {Icon && <Icon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
          <span className={`truncate ${selectedOption ? '' : 'text-zinc-500'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute ${menuAlign === 'right' ? 'right-0' : 'left-0'} mt-1.5 z-50 ${minMenuWidth} bg-[#09090b] border border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden animate-fadeIn`}
        >
          {/* Optional Search bar for large option sets */}
          {showSearch && (
            <div className="p-2 border-b border-[#27272a] bg-black">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter options..."
                  className="w-full text-[11px] pl-7 pr-7 py-1.5 bg-[#121214] border border-[#27272a] rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    aria-label="Clear filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-center text-[11px] text-zinc-500 font-mono">
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-white text-black font-semibold'
                        : 'text-zinc-300 hover:text-white hover:bg-[#121214]'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="truncate">{opt.label}</div>
                      {opt.sublabel && (
                        <div
                          className={`text-[10px] truncate font-mono ${
                            isSelected ? 'text-zinc-600' : 'text-zinc-500'
                          }`}
                        >
                          {opt.sublabel}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {opt.badge && (
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                            isSelected
                              ? 'bg-black/10 text-black border-black/15 font-bold'
                              : opt.badgeColor || 'bg-zinc-900 text-zinc-300 border-zinc-700'
                          }`}
                        >
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-black" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

