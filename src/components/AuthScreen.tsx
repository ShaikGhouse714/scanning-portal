'use client';

import React, { useState } from 'react';
import { User } from '../types';
import { SUPER_ADMIN_EMAIL } from '../lib/mockData';
import { registerUser, authenticateUser } from '../lib/storage';
import {
  Layers,
  ShieldCheck,
  Mail,
  User as UserIcon,
  Building2,
  ArrowRight,
  Hash,
  CheckCircle2,
} from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
}

type AuthStep = 'enter_email' | 'complete_profile';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [step, setStep] = useState<AuthStep>('enter_email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [scanningCenter, setScanningCenter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const cleanEmail = email.trim().toLowerCase();
  const isSuperAdminEmail = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();

  // STEP 1: Submit email — check if user exists or needs registration
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = authenticateUser(email);
      setIsLoading(false);

      if (res.success && res.user) {
        // Existing user — log in directly
        onLoginSuccess(res.user);
      } else if (res.error === 'No account found with this email. Please register your account.') {
        // New user — move to profile completion step
        setStep('complete_profile');
      } else {
        setError(res.error || 'Something went wrong. Please try again.');
      }
    }, 400);
  };

  // STEP 2: Submit name + scanning center — complete registration
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!isSuperAdminEmail && !scanningCenter.trim()) {
      setError('Please enter your scanning center number.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const station = isSuperAdminEmail
        ? 'HQ / Scanning Dept Management'
        : `Scanning Center ${scanningCenter.trim()}`;

      const res = registerUser(name, email, station);
      setIsLoading(false);

      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setError(res.error || 'Registration failed. Please try again.');
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-1 ring-white/10 mx-auto">
            <Layers className="w-7 h-7 text-white" />
          </div>
          <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            ScanTrack Enterprise
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Scanning Department · Script Intake &amp; Audit Portal
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center space-x-3 mb-6">
          <div className="flex items-center space-x-1.5">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all ${
              step === 'enter_email'
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-indigo-600/80 border-indigo-500 text-white'
            }`}>
              {step === 'complete_profile' ? <CheckCircle2 className="w-3.5 h-3.5" /> : '1'}
            </div>
            <span className={`text-xs font-medium ${step === 'enter_email' ? 'text-white' : 'text-indigo-400'}`}>
              Email
            </span>
          </div>
          <div className="w-10 h-px bg-slate-700" />
          <div className="flex items-center space-x-1.5">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all ${
              step === 'complete_profile'
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-slate-700 border-slate-600 text-slate-500'
            }`}>
              2
            </div>
            <span className={`text-xs font-medium ${step === 'complete_profile' ? 'text-white' : 'text-slate-600'}`}>
              Your Details
            </span>
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-800/90 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl border border-slate-700 sm:px-10">

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          {/* ── STEP 1: Enter Email ── */}
          {step === 'enter_email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-5">
              <div>
                <h3 className="text-white font-bold text-base mb-0.5">Welcome</h3>
                <p className="text-slate-400 text-xs">
                  Enter your email to sign in or create your account.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="yourname@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-sm pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Any email domain is accepted (e.g. gmail.com, company.in, etc.)
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-md transition-colors flex items-center justify-center space-x-1.5"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Quick Super Admin button */}
              <button
                type="button"
                onClick={() => {
                  setEmail(SUPER_ADMIN_EMAIL);
                  const res = authenticateUser(SUPER_ADMIN_EMAIL);
                  if (res.success && res.user) onLoginSuccess(res.user);
                }}
                className="w-full py-2 px-3 bg-slate-700/60 hover:bg-slate-700 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center space-x-2"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>1-Click Super Admin Access ({SUPER_ADMIN_EMAIL})</span>
              </button>
            </form>
          )}

          {/* ── STEP 2: Complete Profile (New Users Only) ── */}
          {step === 'complete_profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-5">
              <div>
                <h3 className="text-white font-bold text-base mb-0.5">Set Up Your Account</h3>
                <p className="text-slate-400 text-xs">
                  New account for <span className="text-indigo-300 font-semibold">{email}</span>. Enter your details to get started.
                </p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. Ravi Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-sm pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Scanning Center Number (for operators only) */}
              {!isSuperAdminEmail && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Scanning Center Number
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. SC-04, Center 7, Station B"
                      value={scanningCenter}
                      onChange={(e) => setScanningCenter(e.target.value)}
                      className="w-full text-sm pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Enter your assigned scanning center or station identifier.
                  </p>
                </div>
              )}

              {/* Role preview */}
              <div className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                isSuperAdminEmail
                  ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-200'
                  : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-200'
              }`}>
                {isSuperAdminEmail ? (
                  <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                ) : (
                  <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span>
                  {isSuperAdminEmail
                    ? 'You will be registered as Super Admin with full department oversight.'
                    : 'You will be registered as a Scanning Operator with daily log access.'}
                </span>
              </div>

              <div className="flex space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setStep('enter_email'); setError(null); }}
                  className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-md transition-colors flex items-center justify-center space-x-1.5"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Access Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 border-t border-slate-700/60 pt-4 text-center">
            <p className="text-[11px] text-slate-600">
              Scanning Dept · Authorized Personnel Only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
