'use client';

import React from 'react';
import { User } from '../types';
import { LogOut, ShieldAlert, Cpu, Radio, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  onSignOut: () => void;
  pendingCountTotal: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSignOut,
  pendingCountTotal,
}) => {
  const isSuperAdmin = currentUser.role === 'super_admin';

  return (
    <header className="bg-[#080E1E]/95 backdrop-blur-md border-b border-cyan-900/40 sticky top-0 z-50 shadow-2xl shadow-cyan-950/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Department Branding */}
          <div className="flex items-center space-x-3.5">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 via-blue-600/30 to-indigo-950/40 border border-cyan-400/40 flex items-center justify-center shadow-lg shadow-cyan-500/10">
                <Cpu className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base sm:text-lg tracking-widest text-white font-mono">
                  SCANTRACK
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 tracking-wider">
                  v2.4 // {isSuperAdmin ? 'SUPER ADMIN' : 'OPERATOR'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono tracking-wide hidden sm:block">
                SCANNING DEPT · INTAKE &amp; DISCREPANCY AUDIT NETWORK
              </p>
            </div>
          </div>

          {/* Center Info / Discrepancy Indicator */}
          {pendingCountTotal > 0 && isSuperAdmin && (
            <div className="hidden md:flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>
                <strong>{pendingCountTotal}</strong> SCRIPTS PENDING UPLOAD
              </span>
            </div>
          )}

          {/* Right: User Identity Profile (LOCKED - NO ROLE SWITCHING) */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-[#0F1B33]/80 border border-cyan-500/20 shadow-inner">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm font-mono ${
                  isSuperAdmin ? 'bg-cyan-600 text-cyan-100 ring-1 ring-cyan-400/50' : 'bg-slate-700 text-slate-200'
                }`}
              >
                {isSuperAdmin ? <ShieldCheck className="w-4 h-4 text-cyan-200" /> : currentUser.name.charAt(0)}
              </div>
              <div className="text-left">
                <div className="font-bold text-xs text-white leading-tight flex items-center space-x-1">
                  <span>{currentUser.name}</span>
                </div>
                <div className="text-[10px] font-mono text-cyan-400/80 leading-tight">
                  {currentUser.station}
                </div>
              </div>
              <span
                className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  isSuperAdmin
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-700/60 text-slate-300 border border-slate-600'
                }`}
              >
                {isSuperAdmin ? 'COMMAND' : 'STATION'}
              </span>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={onSignOut}
              title="Sign Out"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-500/50 transition-all shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400 hover:text-rose-400" />
              <span className="hidden sm:inline">DISCONNECT</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
