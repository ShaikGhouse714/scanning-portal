'use client';

import React, { useState } from 'react';
import { User } from '../types';
import { SUPER_ADMIN_EMAIL, INITIAL_USERS } from '../lib/mockData';
import { getStoredUsers, saveStoredUsers } from '../lib/storage';
import { Layers, ShieldCheck, ArrowRight, Lock, UserPlus, LogIn, Shield, Sparkles } from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
}

const GoogleIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  // Default to Sign Up so new visitors are asked to sign up using Google account
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [station, setStation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const cleanEmail = email.trim().toLowerCase();

  // Handle Google Sign Up (New users join as Basic Admin)
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);

    if (!cleanEmail || !name.trim()) {
      setError('Please enter your Google account email and your Full Name.');
      return;
    }

    setIsLoading(true);

    try {
      const isSuper = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();

      // Check if user already exists
      const checkRes = await fetch('/api/users', { cache: 'no-store' });
      if (checkRes.ok) {
        const json = await checkRes.json();
        if (Array.isArray(json.data)) {
          const existing = json.data.find(
            (u: User) => u.email.toLowerCase() === cleanEmail
          );
          if (existing) {
            setIsLoading(false);
            onLoginSuccess(existing);
            return;
          }
        }
      }

      // Create new user (Non-owner accounts are strictly 'admin' = Basic Admin)
      const newUser: User = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: name.trim(),
        email: cleanEmail,
        role: isSuper ? 'super_admin' : 'admin',
        station: station.trim() || (isSuper ? 'HQ / Scanning Ops' : 'Partner Admin Station'),
        department: 'Scanning Dept',
        avatarColor: isSuper ? 'bg-cyan-600' : 'bg-indigo-600',
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      // 1. Save to server store so Super Admin sees them
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

      // 2. Save to local storage
      const localUsers = getStoredUsers();
      if (!localUsers.some((u) => u.email.toLowerCase() === cleanEmail)) {
        saveStoredUsers([savedUser, ...localUsers]);
      }

      setIsLoading(false);
      onLoginSuccess(savedUser);
    } catch (err) {
      setIsLoading(false);
      setError('Error creating account on server. Please try again.');
    }
  };

  // Handle Google Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);

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

      // 2. Fetch server accounts
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
          setError('This account has been deactivated by the Super Administrator.');
          return;
        }
        setIsLoading(false);
        onLoginSuccess(match);
        return;
      }

      // Not registered yet -> Switch to Sign Up tab with prefilled email
      setIsLoading(false);
      setMode('signup');
      setInfoMsg(
        `No account found for "${cleanEmail}". Please enter your name below to complete your Google Sign Up as Basic Admin.`
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
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col justify-center py-10 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#121A2E] to-[#18233C] border border-[#232F4D] flex items-center justify-center shadow-lg mx-auto">
            <Layers className="w-6 h-6 text-cyan-400" />
          </div>
          <h2 className="mt-3 text-xl sm:text-2xl font-bold tracking-tight text-white">
            ScanTrack Portal
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Scanning Department Intake &amp; Portal Reconciliation Network
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0E121A] py-7 px-6 sm:px-8 border border-[#1E2430] rounded-2xl shadow-2xl space-y-5">
          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-[#121622] p-1 border border-[#1F2636]">
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
                setInfoMsg(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                mode === 'signup'
                  ? 'bg-cyan-950/40 text-cyan-300 shadow border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Sign Up with Google</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
                setInfoMsg(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                mode === 'signin'
                  ? 'bg-[#1C2333] text-white shadow border border-[#2B3548]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In with Google</span>
            </button>
          </div>

          <div className="text-center pb-2 border-b border-[#1A202C]">
            <h3 className="text-xs font-semibold text-white flex items-center justify-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>
                {mode === 'signup'
                  ? 'Sign Up using Google Account'
                  : 'Sign In using Google Account'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {mode === 'signup'
                ? 'New team members sign up here as Basic Admin'
                : 'Enter your registered Google email to access portal'}
            </p>
          </div>

          {infoMsg && (
            <div className="p-3 bg-cyan-950/30 border border-cyan-500/30 rounded-xl text-xs text-cyan-300 leading-relaxed flex items-start space-x-2">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 leading-relaxed">
              {error}
            </div>
          )}

          {/* SIGN UP FORM (DEFAULT) */}
          {mode === 'signup' ? (
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Google Account Email <span className="text-rose-400">*</span>
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

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name <span className="text-rose-400">*</span>
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

              {/* Role Scope Notice */}
              <div className="p-2.5 rounded-xl bg-[#121622] border border-[#1F2636] text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center space-x-1.5 text-cyan-300 font-semibold text-xs">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Assigned Role: Basic Admin</span>
                </div>
                <p>
                  New accounts are granted access to <strong>Intake vs Portal Matrix</strong> and <strong>Data Sources &amp; Live Sync</strong>.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <GoogleIcon />
                <span>{isLoading ? 'Registering with Google...' : 'Sign Up with Google Account'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setError(null);
                    setInfoMsg(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white underline font-medium"
                >
                  Already signed up? Sign In with Google
                </button>
              </div>
            </form>
          ) : (
            /* SIGN IN FORM */
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Registered Google Account Email
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
                <GoogleIcon />
                <span>{isLoading ? 'Verifying...' : 'Sign In with Google Account'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                    setInfoMsg(null);
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium"
                >
                  New team member? Sign Up with Google Account
                </button>
              </div>
            </form>
          )}

          {/* Quick One-Click Super Admin Login for Shaik Ghouse */}
          <div className="pt-2 border-t border-[#1A202C]">
            <button
              type="button"
              onClick={() => {
                setEmail(SUPER_ADMIN_EMAIL);
                onLoginSuccess(INITIAL_USERS[0]);
              }}
              className="w-full py-2 px-3 bg-[#131722] hover:bg-[#1A202E] text-slate-300 hover:text-white text-xs rounded-xl border border-[#232A3B] transition-all flex items-center justify-center space-x-2"
            >
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Quick Login: Shaik Ghouse (Super Admin)</span>
            </button>
          </div>

          <div className="text-center">
            <span className="text-[10px] text-slate-500 font-mono">
              Protected Google Authentication • Managed by Shaik Ghouse (Super Admin)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
