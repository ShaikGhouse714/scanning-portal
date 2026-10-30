'use client';

import React, { useState } from 'react';
import { User } from '../types';
import { SUPER_ADMIN_EMAIL } from '../lib/mockData';
import { registerUser, authenticateUser } from '../lib/storage';
import { Layers, ShieldCheck, User as UserIcon, Lock, Mail, Building2, CheckCircle2, ArrowRight } from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [station, setStation] = useState('Station 1 - High Speed Scanner');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const cleanEmail = email.trim().toLowerCase();
  const isSuperAdminEmail = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    const res = authenticateUser(email);
    if (res.success && res.user) {
      onLoginSuccess(res.user);
    } else {
      setError(res.error || 'Authentication failed. Please check your email or register.');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !name.trim()) {
      setError('Please provide both your name and email address.');
      return;
    }

    const res = registerUser(
      name,
      email,
      isSuperAdminEmail ? 'HQ / Scanning Dept Management' : station,
      password
    );

    if (res.success && res.user) {
      onLoginSuccess(res.user);
    } else {
      setError(res.error || 'Registration failed.');
    }
  };

  const handleQuickAdminLogin = () => {
    setEmail(SUPER_ADMIN_EMAIL);
    const res = authenticateUser(SUPER_ADMIN_EMAIL);
    if (res.success && res.user) {
      onLoginSuccess(res.user);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        {/* Brand Header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-1 ring-white/10 mx-auto">
            <Layers className="w-7 h-7 text-white" />
          </div>
          <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            ScanTrack Enterprise
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Scanning Department Intake &amp; Discrepancy Tracking Portal
          </p>
        </div>

        {/* Card */}
        <div className="mt-8 bg-slate-800/90 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl border border-slate-700 sm:px-10">
          {/* Mode Switch Tabs */}
          <div className="flex rounded-xl bg-slate-900/80 p-1 mb-6 border border-slate-700/60">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(false);
                setError(null);
              }}
              className={`w-1/2 py-2 text-xs font-bold rounded-lg transition-all ${
                !isRegisterMode
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(true);
                setError(null);
              }}
              className={`w-1/2 py-2 text-xs font-bold rounded-lg transition-all ${
                isRegisterMode
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Register New User
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          {!isRegisterMode ? (
            /* Sign In Form */
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. shaikghousem@codetantra.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="Enter password (default: password123)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center justify-center space-x-1.5"
              >
                <span>Enter Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* Quick Super Admin Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleQuickAdminLogin}
                  className="w-full py-2 px-3 bg-slate-700/60 hover:bg-slate-700 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center space-x-2"
                >
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>1-Click Sign In as Super Admin ({SUPER_ADMIN_EMAIL})</span>
                </button>
              </div>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shaik Ghouse M or Staff Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Address (Any Domain Supported)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="name@anydomain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Dynamic Role Badge */}
              {isSuperAdminEmail ? (
                <div className="p-3 bg-indigo-500/20 border border-indigo-500/40 rounded-xl text-xs text-indigo-200 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>
                    <strong>Super Admin Detected:</strong> You will have master company dashboard oversight and access controls.
                  </span>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Assigned Scanner Station / Hardware
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. Station A - Canon DR-G2140"
                      value={station}
                      onChange={(e) => setStation(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Role: Basic User (Scanning Operator — Daywise Received &amp; Upload Logging).
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Create Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center justify-center space-x-1.5"
              >
                <span>Register &amp; Access Platform</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          <div className="mt-6 border-t border-slate-700/60 pt-4 text-center">
            <p className="text-[11px] text-slate-500">
              Company Branch: <strong>Scanning Dept</strong> • Authorized Personnel Only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
