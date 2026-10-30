'use client';

import React from 'react';
import { User } from '../types';
import {
  ShieldCheck,
  Calendar,
  QrCode,
  FileSpreadsheet,
  Clock,
  Sliders,
  LogOut,
  ChevronLeft,
  GraduationCap,
  Sun,
  FileText,
  Users,
} from 'lucide-react';

interface SidebarProps {
  currentUser: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSignOut: () => void;
  onOpenUserModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onSignOut,
  onOpenUserModal,
}) => {
  const isSuperAdmin = currentUser.role === 'super_admin';

  const adminNavItems = [
    { id: 'validator', label: 'Validator', icon: ShieldCheck },
    { id: 'scheduling', label: 'Scheduling', icon: Calendar },
    { id: 'qr_data', label: 'QR Data Preparation', icon: QrCode },
    { id: 'tracking', label: 'Post Exam Tracking', icon: FileSpreadsheet },
    { id: 'audit_log', label: 'Audit log', icon: Clock },
    { id: 'view_config', label: 'View Config', icon: Sliders },
  ];

  const operatorNavItems = [
    { id: 'tracking', label: 'Post Exam Intake', icon: FileSpreadsheet },
    { id: 'my_logs', label: 'My Submissions', icon: Clock },
  ];

  const navItems = isSuperAdmin ? adminNavItems : operatorNavItems;

  return (
    <aside className="w-64 bg-[#0B0E14] border-r border-[#1B202A] flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none">
      {/* Top Header */}
      <div>
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#1B202A]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#151A24] border border-[#232936] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-slate-200" />
            </div>
            <span className="font-semibold text-sm text-slate-100 tracking-tight">
              Exam Ops
            </span>
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
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#181E2B] text-white shadow-sm border border-[#273142]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#121620]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-white' : 'text-slate-500'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Quick link for Centers & Operators directory for Admin */}
          {isSuperAdmin && onOpenUserModal && (
            <button
              onClick={onOpenUserModal}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-[#121620] transition-all"
            >
              <Users className="w-4 h-4 text-slate-500" />
              <span>Scanning Centers</span>
            </button>
          )}
        </nav>
      </div>

      {/* Bottom Profile & Actions */}
      <div className="p-3 border-t border-[#1B202A] space-y-2">
        {/* User Card */}
        <div className="p-2.5 rounded-xl bg-[#11151F] border border-[#1E2532] flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-[#1F2636] border border-[#2D364A] flex items-center justify-center text-xs font-bold text-slate-200">
            {currentUser.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-100 truncate">
              {currentUser.name}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {isSuperAdmin ? 'Platform Admin' : currentUser.station}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-1 space-y-0.5 text-xs text-slate-400">
          <button
            onClick={() => {}}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg hover:text-slate-200 hover:bg-[#121620] transition-colors"
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Light mode</span>
          </button>
          <button
            onClick={onSignOut}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg hover:text-rose-300 hover:bg-rose-950/20 text-slate-400 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
