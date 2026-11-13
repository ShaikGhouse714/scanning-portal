'use client';

import React, { useState, useEffect } from 'react';
import { User } from '../types';
import {
  LayoutDashboard,
  Users2,
  FileSpreadsheet,
  Link2,
  ChevronDown,
  Filter,
  Home,
  Clock,
  Crown,
  ShieldCheck,
  GraduationCap,
  LogOut,
  LucideIcon,
} from 'lucide-react';

interface SidebarProps {
  currentUser: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSignOut: () => void;
  onOpenAccountModal?: () => void;
  usersCount?: number;
  netDiscrepancy?: number;
  isSyncing?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onSignOut,
  onOpenAccountModal,
  usersCount = 0,
  netDiscrepancy = 0,
}) => {
  const isSuperAdmin = currentUser.role === 'super_admin';
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    scanning: false,
    eval: false,
    result: false,
  });

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

  // Sub-navigation Items that elaborate downwards when Eval Ops is clicked
  const evalSubNavItems = [
    {
      id: 'eval_ops',
      label: 'Evaluation Assignment',
      icon: FileSpreadsheet,
      allowedRoles: ['super_admin', 'admin', 'operator'],
    },
    {
      id: 'eval_schedule_extractor',
      label: 'Schedule ID Extractor',
      icon: Filter,
      allowedRoles: ['super_admin', 'admin', 'operator'],
    },
    {
      id: 'chief_eval_extractor',
      label: 'Chief Evaluator Extractor',
      icon: ShieldCheck,
      allowedRoles: ['super_admin', 'admin', 'operator'],
    },
    {
      id: 'eval_school_dashboard',
      label: 'School-wise Dashboard',
      icon: GraduationCap,
      allowedRoles: ['super_admin', 'admin', 'operator'],
    },
  ].filter((item) => item.allowedRoles.includes(currentUser.role));

  // Sub-navigation Items that elaborate downwards when Result Ops is clicked
  const resultSubNavItems = [
    {
      id: 'result_ops',
      label: 'Result & Re-eval Tracker',
      icon: Clock,
      allowedRoles: ['super_admin', 'admin', 'operator'],
    },
  ].filter((item) => item.allowedRoles.includes(currentUser.role));

  const isMainTabActive = activeTab === 'reconciliation';
  const isScanningGroupActive =
    isMainTabActive || subNavItems.some((item) => item.id === activeTab);
  const isEvalTabActive = evalSubNavItems.some((item) => item.id === activeTab);
  const isResultTabActive = resultSubNavItems.some((item) => item.id === activeTab);

  // Auto-open the matching accordion group whenever external navigation triggers a sub-tab
  useEffect(() => {
    if (isScanningGroupActive && activeTab !== 'reconciliation') {
      setExpandedGroups((prev) => ({ ...prev, scanning: true }));
    } else if (isEvalTabActive) {
      setExpandedGroups((prev) => ({ ...prev, eval: true }));
    } else if (isResultTabActive) {
      setExpandedGroups((prev) => ({ ...prev, result: true }));
    }
  }, [activeTab, isScanningGroupActive, isEvalTabActive, isResultTabActive]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  interface NavGroupConfig {
    key: string;
    label: string;
    icon: LucideIcon;
    isHeaderActive: boolean;
    isGroupOpen: boolean;
    defaultTab: string;
    items: { id: string; label: string; icon: LucideIcon }[];
    badgeCount?: number;
  }

  const navGroups: NavGroupConfig[] = [
    {
      key: 'scanning',
      label: 'Scanning Ops',
      icon: LayoutDashboard,
      isHeaderActive: isMainTabActive,
      isGroupOpen: expandedGroups.scanning,
      defaultTab: 'reconciliation',
      items: subNavItems,
      badgeCount: netDiscrepancy > 0 ? netDiscrepancy : undefined,
    },
    {
      key: 'eval',
      label: 'Eval Ops',
      icon: FileSpreadsheet,
      isHeaderActive: isEvalTabActive,
      isGroupOpen: expandedGroups.eval,
      defaultTab: 'eval_ops',
      items: evalSubNavItems,
    },
    {
      key: 'result',
      label: 'Result Ops',
      icon: Clock,
      isHeaderActive: isResultTabActive,
      isGroupOpen: expandedGroups.result,
      defaultTab: 'result_ops',
      items: resultSubNavItems,
    },
  ];

  return (
    <aside className="w-64 bg-[#000000] border-r border-[#27272a] flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none font-sans">
      {/* Top Header */}
      <div>
        <button
          type="button"
          onClick={() => setActiveTab('intro')}
          className="w-full h-16 px-4 flex items-center text-left border-b border-[#27272a] bg-[#000000] hover:bg-[#09090b] transition-colors"
          title="Return to Welcome Greetings"
        >
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#09090b] border border-[#27272a] flex items-center justify-center p-1.5 shadow-sm">
              <svg className="w-5 h-5" viewBox="0 0 64 64" fill="none">
                <rect x="13" y="34" width="10" height="22" rx="5" fill="#FFFFFF" />
                <rect x="27" y="22" width="10" height="34" rx="5" fill="#A1A1AA" />
                <rect x="41" y="10" width="10" height="46" rx="5" fill="#71717A" />
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
        </button>

        {/* Navigation Section with Clean Sibling Accordion Toggles */}
        <nav className="p-3 space-y-1.5">
          {/* Welcome Overview Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('intro')}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'intro'
                ? 'bg-white text-black shadow-md border border-white'
                : 'text-zinc-300 hover:text-white hover:bg-[#121214] border border-transparent'
            }`}
          >
            <Home
              className={`w-4 h-4 shrink-0 ${activeTab === 'intro' ? 'text-black' : 'text-zinc-400'}`}
            />
            <span className="font-bold">Welcome Overview</span>
          </button>

          {navGroups.map((group) => {
            const GroupIcon = group.icon;
            return (
              <div key={group.key} className="space-y-1">
                <div
                  className={`flex items-center rounded-xl border transition-all overflow-hidden ${
                    group.isHeaderActive
                      ? 'bg-white text-black shadow-md border-white'
                      : 'text-zinc-300 hover:text-white hover:bg-[#121214] border-[#27272a]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const inGroup =
                        group.defaultTab === activeTab ||
                        group.items.some((item) => item.id === activeTab);
                      if (group.key === 'scanning' || !inGroup) {
                        setActiveTab(group.defaultTab);
                      }
                      toggleGroup(group.key);
                    }}
                    className="flex-1 flex items-center justify-between pl-3.5 pr-1.5 py-2.5 text-xs font-semibold text-left"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <GroupIcon
                        className={`w-4 h-4 shrink-0 ${
                          group.isHeaderActive ? 'text-black' : 'text-zinc-400'
                        }`}
                      />
                      <span className="font-bold truncate">{group.label}</span>
                    </div>

                    {group.badgeCount !== undefined && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${
                          group.isHeaderActive
                            ? 'bg-black text-white'
                            : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                        }`}
                      >
                        +{group.badgeCount}
                      </span>
                    )}
                  </button>

                  {group.items.length > 0 && (
                    <button
                      type="button"
                      aria-label={group.isGroupOpen ? `Collapse ${group.label}` : `Expand ${group.label}`}
                      aria-expanded={group.isGroupOpen}
                      onClick={() => toggleGroup(group.key)}
                      title={group.isGroupOpen ? 'Collapse options' : 'Expand options'}
                      className={`p-2 mr-1 rounded-lg transition-colors ${
                        group.isHeaderActive
                          ? 'hover:bg-black/10 text-black'
                          : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          group.isGroupOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  )}
                </div>

                {group.isGroupOpen && group.items.length > 0 && (
                  <div className="pt-1 pl-3 space-y-1 border-l-2 border-zinc-800 ml-4 animate-in fade-in slide-in-from-top-1 duration-150">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;
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
                            <ItemIcon
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isActive ? 'text-black' : 'text-zinc-500'
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile Section */}
      <div className="p-3 border-t border-[#27272a] space-y-2 bg-[#000000]">
        <div className="p-2.5 rounded-xl bg-[#09090b] border border-[#27272a] flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-[#18181b] border border-[#2e2e33] flex items-center justify-center text-xs font-bold text-white shrink-0">
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {currentUser.name}
            </p>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                  isSuperAdmin
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                }`}
              >
                {isSuperAdmin ? 'Super Admin' : 'Basic Admin'}
              </span>
            </div>
          </div>
        </div>

        {/* Super Admin Quick Manage Button */}
        {isSuperAdmin && onOpenAccountModal && (
          <button
            type="button"
            onClick={onOpenAccountModal}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#09090b] hover:bg-[#121214] text-zinc-300 hover:text-white text-xs border border-[#27272a] transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-semibold">Promote / Manage Users</span>
            </div>
            <span className="text-[10px] font-mono text-amber-400 font-bold">
              {usersCount}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={onSignOut}
          className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg hover:text-white hover:bg-[#121214] text-zinc-400 text-xs transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
};
