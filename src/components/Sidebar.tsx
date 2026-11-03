'use client';

import React, { useState } from 'react';
import { User } from '../types';
import {
  Layers,
  LayoutDashboard,
  Users2,
  FileSpreadsheet,
  Link2,
  UserPlus,
  LogOut,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';

interface SidebarProps {
  currentUser: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSignOut: () => void;
  onOpenAccountModal?: () => void;
  netDiscrepancy?: number;
  isSyncing?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onSignOut,
  onOpenAccountModal,
  netDiscrepancy = 0,
  isSyncing = false,
}) => {
  const isSuperAdmin = currentUser.role === 'super_admin';
  const [isNavExpanded, setIsNavExpanded] = useState<boolean>(false);

  // Sub-navigation Items that elaborate downwards when Scanning Ops is clicked
  const subNavItems = [
    {
      id: 'teammates',
      label: 'Team Subsheets Status',
      icon: Users2,
      allowedRoles: ['super_admin'],
    },
    {
      id: 'portal_exams',
      label: 'Post Exam Schedules',
      icon: FileSpreadsheet,
      allowedRoles: ['super_admin'],
    },
    {
      id: 'data_sources',
      label: 'Data Sources & Live Sync',
      icon: Link2,
      allowedRoles: ['super_admin', 'admin', 'operator'],
    },
  ].filter((item) => item.allowedRoles.includes(currentUser.role));

  const isMainTabActive = activeTab === 'reconciliation';

  return (
    <aside className="w-64 bg-[#000000] border-r border-[#222222] flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none font-sans">
      {/* Top Header */}
      <div>
        <div className="h-16 px-4 flex items-center border-b border-[#222222] bg-[#000000]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#09090b] border border-[#27272a] flex items-center justify-center p-1.5 shadow-sm">
              <svg className="w-5 h-5" viewBox="0 0 64 64" fill="none">
                <rect x="14" y="33" width="9" height="18" rx="4.5" fill="#FFFFFF" />
                <rect x="27" y="23" width="9" height="28" rx="4.5" fill="#A1A1AA" />
                <rect x="40" y="13" width="9" height="38" rx="4.5" fill="#52525B" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-sm text-white tracking-tight block leading-tight">
                Scanning Ops
              </span>
              <span className="text-[10px] text-zinc-400 font-mono block leading-tight mt-0.5">
                Exam Ops Reconciler
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Section with Downward Elaborating Toggles */}
        <nav className="p-3 space-y-1.5">
          {/* Main Display Tab: Scanning Ops */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('reconciliation');
              setIsNavExpanded((prev) => !prev);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              isMainTabActive
                ? 'bg-white text-black shadow-md border border-white'
                : 'text-zinc-300 hover:text-white hover:bg-[#121214] border border-[#27272a]'
            }`}
          >
            <div className="flex items-center space-x-3">
              <LayoutDashboard
                className={`w-4 h-4 shrink-0 ${isMainTabActive ? 'text-black' : 'text-zinc-400'}`}
              />
              <span className="font-bold">Scanning Ops</span>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {netDiscrepancy > 0 && (
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                    isMainTabActive
                      ? 'bg-black text-white'
                      : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                  }`}
                >
                  +{netDiscrepancy}
                </span>
              )}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setIsNavExpanded((prev) => !prev);
                }}
                className={`p-0.5 rounded transition-transform duration-200 ${
                  isNavExpanded ? 'rotate-180' : ''
                }`}
                title={isNavExpanded ? 'Collapse' : 'Elaborate options'}
              >
                <ChevronDown
                  className={`w-3.5 h-3.5 ${isMainTabActive ? 'text-black' : 'text-zinc-400'}`}
                />
              </div>
            </div>
          </button>

          {/* Downward Elaborating Sub-Toggles (only opens when clicked) */}
          {isNavExpanded && (
            <div className="pt-1.5 pl-3 space-y-1 border-l-2 border-zinc-800 ml-4 animate-in fade-in slide-in-from-top-1 duration-150">
              {subNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-white text-black font-semibold shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-[#121214]'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-black' : 'text-zinc-500'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                  </button>
                );
              })}

              {/* Admin User Access & Roles inside the elaborated list */}
              {isSuperAdmin && onOpenAccountModal && (
                <button
                  type="button"
                  onClick={onOpenAccountModal}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-[#121214] transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <span className="truncate">User Access &amp; Roles</span>
                </button>
              )}
            </div>
          )}
        </nav>
      </div>

      {/* Bottom Profile Section */}
      <div className="p-3 border-t border-[#222222] space-y-2 bg-[#000000]">
        <div className="p-2.5 rounded-xl bg-[#09090b] border border-[#222222] flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-[#18181b] border border-[#2e2e33] flex items-center justify-center text-xs font-bold text-white">
            {currentUser.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {currentUser.name}
            </p>
            <p className="text-[11px] text-zinc-400 truncate font-mono">
              {isSuperAdmin ? 'Super Admin' : 'Basic Admin'}
            </p>
          </div>
        </div>

        <button
          onClick={onSignOut}
          className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg hover:text-white hover:bg-[#18181b] text-zinc-400 text-xs transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
};
