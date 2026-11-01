'use client';

import React from 'react';
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

  // Navigation Items - Filtered based on role permissions
  // Basic Admin only gets Intake vs Portal and Data Sources
  const allNavItems = [
    {
      id: 'reconciliation',
      label: 'Intake vs Portal Matrix',
      icon: LayoutDashboard,
      badge: netDiscrepancy > 0 ? `+${netDiscrepancy}` : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      allowedRoles: ['super_admin', 'admin', 'operator'],
    },
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
  ];

  const navItems = allNavItems.filter((item) => item.allowedRoles.includes(currentUser.role));

  return (
    <aside className="w-64 bg-[#0A0D14] border-r border-[#1B202A] flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none font-sans">
      {/* Top Header */}
      <div>
        <div className="h-16 px-4 flex items-center border-b border-[#18202E] bg-[#080B12]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#0F1424] border border-[#1F2942] flex items-center justify-center p-1.5 shadow-md shadow-black/40">
              <svg className="w-5 h-5" viewBox="0 0 64 64" fill="none">
                <rect x="13" y="34" width="10" height="22" rx="5" fill="#00A3FF" />
                <rect x="27" y="22" width="10" height="34" rx="5" fill="#6E44FF" />
                <rect x="41" y="10" width="10" height="46" rx="5" fill="#9E00FF" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-sm text-white tracking-tight block leading-tight">
                Scanning Tracker
              </span>
              <span className="text-[10px] text-cyan-400 font-mono block leading-tight mt-0.5">
                Exam Ops Reconciler
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all relative overflow-hidden ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/15 via-[#161F32] to-[#121828] text-white shadow-md border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-[#111726] border border-transparent'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 inset-y-1 w-1 bg-cyan-400 rounded-r-full" />
                )}
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Admin Account Management: Strictly for Super Admin */}
          {isSuperAdmin && onOpenAccountModal && (
            <button
              onClick={onOpenAccountModal}
              className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-[#111726] transition-all border border-transparent"
            >
              <UserPlus className="w-4 h-4 text-cyan-400" />
              <span>User Access &amp; Roles</span>
            </button>
          )}
        </nav>
      </div>

      {/* Bottom Profile Section */}
      <div className="p-3 border-t border-[#1B202A] space-y-2">
        <div className="p-2.5 rounded-xl bg-[#11151F] border border-[#1E2532] flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-[#1F2636] border border-[#2D364A] flex items-center justify-center text-xs font-bold text-slate-200">
            {currentUser.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-100 truncate">
              {currentUser.name}
            </p>
            <p className="text-[11px] text-slate-400 truncate font-mono">
              {isSuperAdmin ? 'Super Admin' : 'Basic Admin'}
            </p>
          </div>
        </div>

        <button
          onClick={onSignOut}
          className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg hover:text-rose-300 hover:bg-rose-950/20 text-slate-400 text-xs transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
};
