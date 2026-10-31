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
  ChevronLeft,
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
  const navItems = [
    {
      id: 'reconciliation',
      label: 'Intake vs Portal Matrix',
      icon: LayoutDashboard,
      badge: netDiscrepancy > 0 ? `+${netDiscrepancy}` : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    },
    {
      id: 'teammates',
      label: 'Team Subsheets Status',
      icon: Users2,
    },
    {
      id: 'portal_exams',
      label: 'Portal Exam Schedules',
      icon: FileSpreadsheet,
    },
    {
      id: 'data_sources',
      label: 'Data Sources & Live Sync',
      icon: Link2,
    },
  ];

  return (
    <aside className="w-64 bg-[#0A0D14] border-r border-[#1B202A] flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none font-sans">
      {/* Top Header */}
      <div>
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#1B202A]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#141822] border border-[#232936] flex items-center justify-center">
              <Layers className="w-4 h-4 text-slate-200" />
            </div>
            <div>
              <span className="font-semibold text-sm text-slate-100 tracking-tight block leading-tight">
                ScanTrack
              </span>
              <span className="text-[10px] text-slate-500 font-mono block leading-tight">
                Exam Ops Reconciler
              </span>
            </div>
          </div>
          <button
            title="Collapse"
            className="w-7 h-7 rounded-md hover:bg-[#181E29] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#181E2B] text-white shadow-sm border border-[#273142]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#121620]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`}
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

          {/* Admin Account Management */}
          {onOpenAccountModal && (
            <button
              onClick={onOpenAccountModal}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-[#121620] transition-all"
            >
              <UserPlus className="w-4 h-4 text-slate-500" />
              <span>Manage Accounts</span>
            </button>
          )}
        </nav>
      </div>

      {/* Bottom Profile Section matching screenshot */}
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
              Platform Admin
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
