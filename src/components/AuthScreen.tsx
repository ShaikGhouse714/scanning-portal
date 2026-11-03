'use client';

import React, { useState } from 'react';
import { User } from '../types';
import { SUPER_ADMIN_EMAIL, INITIAL_USERS } from '../lib/mockData';
import { getStoredUsers, saveStoredUsers } from '../lib/storage';
import { ShieldCheck, ArrowRight } from 'lucide-react';

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

// Format readable name from email prefix (e.g. ghousemohiuddin774@gmail.com -> Ghouse Mohiuddin)
function formatNameFromEmail(email: string): string {
  const handle = email.split('@')[0] || 'Team Member';
  const clean = handle.replace(/[0-9_.-]+/g, ' ').trim();
  if (!clean) return handle;
  return clean
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const cleanEmail = email.trim().toLowerCase();

  // Unified Google Sign In
  const handleGoogleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cleanEmail) {
      setError('Please enter your Google account email.');
      return;
    }

    setIsLoading(true);

    try {
      const isSuper = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();

      // 1. If Super Admin Shaik Ghouse, log in immediately
      if (isSuper) {
        setIsLoading(false);
        onLoginSuccess(INITIAL_USERS[0]);
        return;
      }

      // 2. Check if user already exists on the server
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

      // 3. New User: Automatically register as Basic Admin ('admin')
      const derivedName = formatNameFromEmail(cleanEmail);
      const newUser: User = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: derivedName,
        email: cleanEmail,
        role: 'admin', // New users are strictly Basic Admin
        station: 'Partner Admin Station',
        department: 'Scanning Dept',
        avatarColor: 'bg-indigo-600',
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      // Save to server store
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
      onLoginSuccess(savedUser);
    } catch {
      setIsLoading(false);
      setError('Connection error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Brand Header with 3-bar metric icon */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#09090b] border border-zinc-800 flex items-center justify-center shadow-xl mx-auto p-2">
            <svg className="w-8 h-8" viewBox="0 0 64 64" fill="none">
              <rect x="13" y="34" width="10" height="22" rx="5" fill="#00A3FF" />
              <rect x="27" y="22" width="10" height="34" rx="5" fill="#6E44FF" />
              <rect x="41" y="10" width="10" height="46" rx="5" fill="#9E00FF" />
            </svg>
          </div>
          <h2 className="mt-3 text-xl sm:text-2xl font-bold tracking-tight text-white">
            Scanning Ops
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Intake Verification &amp; Portal Reconciliation Network
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#09090b] py-8 px-6 sm:px-8 border border-zinc-800 rounded-2xl shadow-2xl space-y-5">
          <div className="text-center pb-2 border-b border-zinc-800">
            <h3 className="text-xs font-semibold text-white flex items-center justify-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Sign In using Google Account</span>
            </h3>
            <p className="text-[11px] text-zinc-400 mt-1">
              Enter your Google email to access the portal
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 leading-relaxed">
              {error}
            </div>
          )}

          {/* SINGLE CLEAN GOOGLE SIGN IN FORM */}
          <form onSubmit={handleGoogleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Google Account Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@gmail.com"
                className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono focus:outline-none focus:border-white transition-all placeholder-zinc-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-white hover:bg-zinc-200 text-black font-bold text-xs font-semibold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <GoogleIcon />
              <span>{isLoading ? 'Authenticating...' : 'Sign In using Google'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="pt-2 border-t border-zinc-800 text-center">
            <span className="text-[10px] text-zinc-500 font-mono block">
              New team members are assigned Basic Admin automatically.
            </span>
            <span className="text-[10px] text-zinc-600 font-mono block mt-0.5">
              Role permissions managed by Super Admin (Shaik Ghouse M).
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
