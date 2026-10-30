'use client';

import React, { useState } from 'react';
import { User } from '../types';
import { ShieldCheck, User as UserIcon, RefreshCw, ChevronDown, CheckCircle2, AlertTriangle, Layers, Building2 } from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  allUsers: User[];
  onSelectUser: (user: User) => void;
  onResetData: () => void;
  pendingCountTotal: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  allUsers,
  onSelectUser,
  onResetData,
  pendingCountTotal,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isSuperAdmin = currentUser.role === 'super_admin';

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Department Branding */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20 ring-1 ring-white/10">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">ScanTrack</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Scanning Dept
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Daily Script Intake &amp; Upload Audit System
              </p>
            </div>
          </div>

          {/* Center Info / Discrepancy Indicator */}
          {pendingCountTotal > 0 && (
            <div className="hidden md:flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>
                <strong>{pendingCountTotal}</strong> scripts pending upload across dept
              </span>
            </div>
          )}

          {/* Right: Role Switcher & User Profile */}
          <div className="flex items-center space-x-3">
            {/* Quick Role Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700/80 transition-colors px-3 py-1.5 rounded-lg border border-slate-700 text-sm text-slate-200 shadow-sm"
                title="Switch active user to test Super Admin or Operator experience"
              >
                <span className="text-xs text-slate-400">View as:</span>
                <span className="font-medium text-white">{currentUser.name}</span>
                <span
                  className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    isSuperAdmin
                      ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/40'
                      : 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {isSuperAdmin ? 'Admin' : 'Operator'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 z-20 py-2 divide-y divide-slate-700/60 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Role Switcher (Hierarchy Test)
                    </div>

                    <div className="py-1">
                      {allUsers.map((user) => {
                        const isCurrent = user.id === currentUser.id;
                        return (
                          <button
                            key={user.id}
                            onClick={() => {
                              onSelectUser(user);
                              setDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm flex items-start space-x-2.5 transition-colors ${
                              isCurrent
                                ? 'bg-indigo-600/20 text-white'
                                : 'text-slate-200 hover:bg-slate-700/50'
                            }`}
                          >
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5 ${user.avatarColor}`}
                            >
                              {user.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium truncate">{user.name}</p>
                                <span
                                  className={`text-[10px] uppercase font-semibold px-1 rounded ${
                                    user.role === 'super_admin'
                                      ? 'text-indigo-300 bg-indigo-900/50'
                                      : 'text-emerald-300 bg-emerald-900/50'
                                  }`}
                                >
                                  {user.role === 'super_admin' ? 'Admin' : 'Operator'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 truncate">{user.station}</p>
                            </div>
                            {isCurrent && (
                              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 self-center" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="p-2">
                      <button
                        onClick={() => {
                          if (confirm('Reset to default initial demonstration records?')) {
                            onResetData();
                            setDropdownOpen(false);
                          }
                        }}
                        className="w-full text-left px-2 py-1.5 text-xs text-slate-400 hover:text-amber-300 flex items-center space-x-2 rounded hover:bg-slate-700/40 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reset Demo Seed Data</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

