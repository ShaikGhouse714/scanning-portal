'use client';

import React, { useState } from 'react';
import { User } from '../types';
import { SUPER_ADMIN_EMAIL, SUPER_ADMIN_EMAILS, isSuperAdminEmail, INITIAL_USERS } from '../lib/mockData';
import { getStoredUsers, saveStoredUsers, setActiveUser } from '../lib/storage';
import { ShieldCheck, ArrowRight, UserPlus, LogIn, Sparkles, Building, Mail, User as UserIcon } from 'lucide-react';

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
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  
  // Sign In State
  const [signInEmail, setSignInEmail] = useState('');
  
  // Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regStation, setRegStation] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Handle Sign In with Google
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const cleanEmail = signInEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your Google account email.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Super Admin Check
      if (isSuperAdminEmail(cleanEmail)) {
        setIsLoading(false);
        const superAdminUser = {
          ...INITIAL_USERS[0],
          email: cleanEmail,
        };
        setActiveUser(superAdminUser);
        onLoginSuccess(superAdminUser);
        return;
      }

      // 2. Fetch live users from server
      const res = await fetch(`/api/users?t=${Date.now()}`, { cache: 'no-store' });
      let usersList: User[] = getStoredUsers();
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) usersList = json.data;
      }

      const match = usersList.find((u) => u.email.toLowerCase().trim() === cleanEmail);

      if (match) {
        if (match.status === 'inactive') {
          setIsLoading(false);
          setError('This account has been deactivated by Super Administrator (Shaik Ghouse M).');
          return;
        }
        setIsLoading(false);
        setActiveUser(match);
        onLoginSuccess(match);
        return;
      }

      // 3. Not registered -> Switch to Register mode with email pre-filled
      setIsLoading(false);
      setRegEmail(cleanEmail);
      setMode('register');
      setNotice('This Google account is not registered yet. Please enter your name and station below to register as Basic Admin.');
    } catch {
      setIsLoading(false);
      setError('Connection error. Please try again.');
    }
  };

  // Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const cleanName = regName.trim();
    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanStation = regStation.trim();

    if (!cleanName || cleanName.length < 2) {
      setError('Please provide your full legal or display name.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid Google account email.');
      return;
    }

    setIsLoading(true);

    try {
      const isSuper = isSuperAdminEmail(cleanEmail);

      // Check if user already exists
      const res = await fetch(`/api/users?t=${Date.now()}`, { cache: 'no-store' });
      let usersList: User[] = getStoredUsers();
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) usersList = json.data;
      }

      const existing = usersList.find((u) => u.email.toLowerCase().trim() === cleanEmail);
      if (existing) {
        setIsLoading(false);
        setActiveUser(existing);
        onLoginSuccess(existing);
        return;
      }

      // Create new user profile as Basic Admin ('admin')
      const newUser: User = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: cleanName,
        email: cleanEmail,
        role: isSuper ? 'super_admin' : 'admin', // Default role is strictly Basic Admin
        station: cleanStation || 'Station Admin Center',
        department: 'Scanning Dept - Partner Operations',
        avatarColor: isSuper ? 'bg-cyan-600' : 'bg-indigo-600',
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      // Save to cloud server store
      const saveRes = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      let savedUser = newUser;
      if (saveRes.ok) {
        const json = await saveRes.json();
        if (json.data) savedUser = json.data;
      }

      // Save to local storage
      const localUsers = getStoredUsers();
      if (!localUsers.some((u) => u.email.toLowerCase() === cleanEmail)) {
        saveStoredUsers([savedUser, ...localUsers]);
      }

      setIsLoading(false);
      setActiveUser(savedUser);
      onLoginSuccess(savedUser);
    } catch {
      setIsLoading(false);
      setError('Failed to complete registration. Please check connection and try again.');
    }
  };

  // Quick Sign In for Super Admin Shaik Ghouse
  const handleQuickSuperAdmin = () => {
    const superAdmin = INITIAL_USERS[0];
    setActiveUser(superAdmin);
    onLoginSuccess(superAdmin);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-white selection:text-black">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Brand Header with 3-bar metric icon */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#09090b] border border-[#27272a] flex items-center justify-center shadow-2xl mx-auto p-2">
            <svg className="w-8 h-8" viewBox="0 0 64 64" fill="none">
              <rect x="13" y="34" width="10" height="22" rx="5" fill="#FFFFFF" />
              <rect x="27" y="22" width="10" height="34" rx="5" fill="#A1A1AA" />
              <rect x="41" y="10" width="10" height="46" rx="5" fill="#71717A" />
            </svg>
          </div>
          <h2 className="mt-3 text-xl sm:text-2xl font-bold tracking-tight text-white">
            Scanning Ops Portal
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Intake Verification, Post-Exam Reconciliation &amp; Result Ops Network
          </p>
        </div>

        {/* Auth Container Card */}
        <div className="bg-[#09090b] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden font-sans">
          {/* Clean Segmented Mode Switcher */}
          <div className="p-3 pb-0">
            <div className="grid grid-cols-2 p-1 rounded-xl bg-[#000000] border border-[#27272a]">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setNotice(null);
                }}
                className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
                  mode === 'signin'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
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
                  setNotice(null);
                }}
                className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
                  mode === 'register'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register Account</span>
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-5">
            {/* Notifications and Alerts */}
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 leading-relaxed animate-in fade-in">
                {error}
              </div>
            )}

            {notice && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 leading-relaxed animate-in fade-in">
                {notice}
              </div>
            )}

            {/* TAB 1: SIGN IN */}
            {mode === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Google Account Email</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="e.g. yourname@gmail.com"
                    className="w-full text-xs px-3.5 py-2.5 bg-[#000000] border border-[#27272a] rounded-xl text-white font-mono focus:outline-none focus:border-white transition-all placeholder-zinc-600"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Enter the Google email you registered with.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-white hover:bg-zinc-200 text-black font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <GoogleIcon />
                  <span>{isLoading ? 'Checking Access...' : 'Sign In using Google Account'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setRegEmail(signInEmail);
                      setMode('register');
                    }}
                    className="text-xs text-zinc-400 hover:text-white underline underline-offset-4 transition-colors"
                  >
                    Don&apos;t have an account yet? Register here
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: REGISTER ACCOUNT */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                {/* Information Card */}
                <div className="p-3 rounded-xl bg-[#000000] border border-[#27272a] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                      Assigned Access
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-200 border border-zinc-700 font-semibold">
                      Basic Admin
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    New registrants receive <strong>Basic Admin</strong> privileges for Scanning, Eval, and Result Ops. The Super Admin (Shaik Ghouse M) can promote accounts in the admin console.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center space-x-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Your Full Name</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Arun Kumar"
                    className="w-full text-xs px-3.5 py-2.5 bg-[#000000] border border-[#27272a] rounded-xl text-white font-sans focus:outline-none focus:border-white transition-all placeholder-zinc-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Google Account Email</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="yourname@gmail.com"
                    className="w-full text-xs px-3.5 py-2.5 bg-[#000000] border border-[#27272a] rounded-xl text-white font-mono focus:outline-none focus:border-white transition-all placeholder-zinc-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center space-x-1.5">
                    <Building className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Station / Center / College (Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={regStation}
                    onChange={(e) => setRegStation(e.target.value)}
                    placeholder="e.g. KIIT University - Station 1"
                    className="w-full text-xs px-3.5 py-2.5 bg-[#000000] border border-[#27272a] rounded-xl text-white font-sans focus:outline-none focus:border-white transition-all placeholder-zinc-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-white hover:bg-zinc-200 text-black font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <GoogleIcon />
                  <span>{isLoading ? 'Creating Account...' : 'Register with Google Account'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setSignInEmail(regEmail);
                      setMode('signin');
                    }}
                    className="text-xs text-zinc-400 hover:text-white underline underline-offset-4 transition-colors"
                  >
                    Already registered? Sign In here
                  </button>
                </div>
              </form>
            )}

            {/* Quick Access for Super Admin (Shaik Ghouse M) */}
            <div className="pt-4 border-t border-[#222222] space-y-2">
              <button
                type="button"
                onClick={handleQuickSuperAdmin}
                className="w-full py-2 px-3 bg-[#121214] hover:bg-zinc-800 border border-[#27272a] text-zinc-300 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Super Admin Quick Sign In (Shaik Ghouse M)</span>
              </button>
              <div className="text-center">
                <span className="text-[10px] text-zinc-500 font-mono block">
                  Permissions &amp; account promotions managed by Super Administrator.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
