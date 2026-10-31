'use client';

import React, { useState } from 'react';
import { User } from '../types';
import { SUPER_ADMIN_EMAIL, INITIAL_USERS } from '../lib/mockData';
import { getStoredUsers } from '../lib/storage';
import { Layers, ShieldCheck, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState(SUPER_ADMIN_EMAIL);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const cleanEmail = email.trim().toLowerCase();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Check if Super Admin
      if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
        setIsLoading(false);
        onLoginSuccess(INITIAL_USERS[0]);
        return;
      }

      // 2. Check server / stored authorized accounts added by admin
      const res = await fetch('/api/users', { cache: 'no-store' });
      let usersList: User[] = getStoredUsers();
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) usersList = json.data;
      }

      const match = usersList.find((u) => u.email.toLowerCase() === cleanEmail);
      if (match) {
        if (match.status === 'inactive') {
          setIsLoading(false);
          setError('This account has been deactivated by the Administrator.');
          return;
        }
        setIsLoading(false);
        onLoginSuccess(match);
        return;
      }

      setIsLoading(false);
      setError(
        'Access Restricted: Self-registration is disabled. Only the Administrator can create authorized accounts.'
      );
    } catch {
      if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
        setIsLoading(false);
        onLoginSuccess(INITIAL_USERS[0]);
      } else {
        setIsLoading(false);
        setError('Connection error. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#141822] border border-[#232936] flex items-center justify-center shadow-md mx-auto">
            <Layers className="w-6 h-6 text-slate-200" />
          </div>
          <h2 className="mt-4 text-xl sm:text-2xl font-bold tracking-tight text-white">
            ScanTrack Portal
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Scanning Intake &amp; Central Portal Reconciliation System
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0E121A] py-8 px-6 sm:px-8 border border-[#1E2430] rounded-2xl shadow-2xl space-y-6">
          <div className="text-center pb-2 border-b border-[#1A202C]">
            <h3 className="text-sm font-semibold text-white flex items-center justify-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Admin Authentication</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Sign in with your authorized admin email address
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Authorized Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="shaikghousem@codetantra.in"
                className="w-full text-xs px-3.5 py-2.5 bg-[#121620] border border-[#212836] rounded-xl text-white font-mono focus:outline-none focus:border-slate-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-[#1E2536] hover:bg-[#283248] text-white text-xs font-semibold rounded-xl border border-[#303D57] transition-all flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
            >
              <span>{isLoading ? 'Verifying Credentials...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Quick 1-click Admin button */}
            <button
              type="button"
              onClick={() => {
                setEmail(SUPER_ADMIN_EMAIL);
                onLoginSuccess(INITIAL_USERS[0]);
              }}
              className="w-full py-2 px-4 bg-[#141822] hover:bg-[#1A202E] text-slate-300 hover:text-white text-xs rounded-xl border border-[#232A3B] transition-all flex items-center justify-center space-x-2"
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Quick Login as Shaik Ghouse (Admin)</span>
            </button>
          </form>

          <div className="pt-2 border-t border-[#1A202C] text-center">
            <span className="text-[10px] text-slate-500 font-mono">
              Protected Single-Admin Environment • Cross-Device Reconciler
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
