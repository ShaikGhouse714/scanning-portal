'use client';

import React, { useState } from 'react';
import { User } from '../types';
import { SUPER_ADMIN_EMAIL, INITIAL_USERS } from '../lib/mockData';
import { getStoredUsers, saveStoredUsers } from '../lib/storage';
import { Layers, ShieldCheck, ArrowRight, Lock, UserPlus, LogIn, CheckCircle2, Shield } from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [station, setStation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const cleanEmail = email.trim().toLowerCase();

  // Handle Sign In with Google Account
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cleanEmail) {
      setError('Please enter your Google Account email.');
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

      // 2. Check server / stored authorized accounts
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

      // Not found -> Suggest registration
      setIsLoading(false);
      setError(
        'Account not found. Please click "Register Partner Account" below to register using your Google account.'
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

  // Handle Partner Registration with Google Account
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !cleanEmail) {
      setError('Please provide your Full Name and Google Account email.');
      return;
    }

    setIsLoading(true);

    try {
      const isSuper = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();

      const newUser: User = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: name.trim(),
        email: cleanEmail,
        role: isSuper ? 'super_admin' : 'admin', // Partners default to Basic Admin ('admin')
        station: station.trim() || (isSuper ? 'HQ / Scanning Ops' : 'Partner Admin Station'),
        department: 'Scanning Dept',
        avatarColor: isSuper ? 'bg-cyan-600' : 'bg-indigo-600',
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      // 1. Save to server store
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      let savedUser = newUser;
      if (res.ok) {
        const json = await res.json();
        if (json.data) savedUser = json.data;
      }

      // 2. Save locally
      const localUsers = getStoredUsers();
      if (!localUsers.some((u) => u.email.toLowerCase() === cleanEmail)) {
        saveStoredUsers([savedUser, ...localUsers]);
      }

      setIsLoading(false);
      onLoginSuccess(savedUser);
    } catch (err) {
      setIsLoading(false);
      setError('Failed to register account on server. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#121A2E] to-[#18233C] border border-[#232F4D] flex items-center justify-center shadow-lg mx-auto">
            <Layers className="w-6 h-6 text-cyan-400" />
          </div>
          <h2 className="mt-3 text-xl sm:text-2xl font-bold tracking-tight text-white">
            ScanTrack Core Portal
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Scanning Department Intake &amp; Portal Reconciliation Network
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0E121A] py-7 px-6 sm:px-8 border border-[#1E2430] rounded-2xl shadow-2xl space-y-5">
          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-[#121622] p-1 border border-[#1F2636]">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                mode === 'signin'
                  ? 'bg-[#1C2333] text-white shadow border border-[#2B3548]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                mode === 'register'
                  ? 'bg-cyan-950/40 text-cyan-300 shadow border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register Partner</span>
            </button>
          </div>

          <div className="text-center pb-2 border-b border-[#1A202C]">
            <h3 className="text-xs font-semibold text-white flex items-center justify-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>
                {mode === 'signin'
                  ? 'Admin & Partner Google Sign-In'
                  : 'Register New Partner (Basic Admin)'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {mode === 'signin'
                ? 'Sign in using your Google account email'
                : 'Enter your details to register as a Basic Admin'}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 leading-relaxed">
              {error}
            </div>
          )}

          {/* SIGN IN FORM */}
          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Google Account Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full text-xs px-3.5 py-2.5 bg-[#121620] border border-[#212836] rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500/60 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-[#1E2536] hover:bg-[#283248] text-white text-xs font-semibold rounded-xl border border-[#303D57] transition-all flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
              >
                <span>{isLoading ? 'Verifying Account...' : 'Sign In with Google Account'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium"
                >
                  First time? Register your partner Google account
                </button>
              </div>

              {/* Quick 1-click Super Admin button */}
              <button
                type="button"
                onClick={() => {
                  setEmail(SUPER_ADMIN_EMAIL);
                  onLoginSuccess(INITIAL_USERS[0]);
                }}
                className="w-full py-2 px-4 bg-[#141822] hover:bg-[#1A202E] text-slate-300 hover:text-white text-xs rounded-xl border border-[#232A3B] transition-all flex items-center justify-center space-x-2"
              >
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Quick Login as Shaik Ghouse (Super Admin)</span>
              </button>
            </form>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full text-xs px-3.5 py-2.5 bg-[#121620] border border-[#212836] rounded-xl text-white focus:outline-none focus:border-cyan-500/60 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Google Account Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ramesh@gmail.com"
                  className="w-full text-xs px-3.5 py-2.5 bg-[#121620] border border-[#212836] rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500/60 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Scanning Center / Station <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={station}
                  onChange={(e) => setStation(e.target.value)}
                  placeholder="e.g. Center Station 1"
                  className="w-full text-xs px-3.5 py-2.5 bg-[#121620] border border-[#212836] rounded-xl text-white focus:outline-none focus:border-cyan-500/60 transition-all"
                />
              </div>

              {/* Access Notice Badge */}
              <div className="p-2.5 rounded-xl bg-[#121622] border border-[#1F2636] text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center space-x-1.5 text-cyan-300 font-semibold text-xs">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Basic Admin Role</span>
                </div>
                <p>
                  You will have access to <strong>Intake vs Portal Matrix</strong> and <strong>Data Sources &amp; Live Sync</strong>.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{isLoading ? 'Creating Account...' : 'Register & Access Platform'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setError(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white underline font-medium"
                >
                  Already registered? Back to Sign In
                </button>
              </div>
            </form>
          )}

          <div className="pt-2 border-t border-[#1A202C] text-center">
            <span className="text-[10px] text-slate-500 font-mono">
              Role-Based Access Control • Managed by Shaik Ghouse (Super Admin)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
