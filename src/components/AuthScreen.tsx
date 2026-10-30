'use client';

import React, { useState } from 'react';
import { User } from '../types';
import { SUPER_ADMIN_EMAIL } from '../lib/mockData';
import { registerUser, authenticateUser } from '../lib/storage';
import {
  Layers,
  Mail,
  User as UserIcon,
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

  // STEP 1: Check email
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
        onLoginSuccess(res.user);
      } else if (res.error === 'No account found with this email. Please register your account.') {
        setStep('complete_profile');
      } else {
        setError(res.error || 'Authentication failure.');
      }
    }, 300);
  };

  // STEP 2: Name + Center registration
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!scanningCenter.trim() && !isSuperAdminEmail) {
      setError('Please enter your scanning center number (e.g. Center 03).');
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
        setError(res.error || 'Registration failed.');
      }
    }, 300);
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
            Scanning Department Script Intake &amp; Audit Platform
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center space-x-3 mb-6 text-xs">
          <div className="flex items-center space-x-1.5">
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold border ${
                step === 'enter_email'
                  ? 'bg-[#1C2332] border-[#2D384F] text-white'
                  : 'bg-[#121620] border-[#1E2430] text-slate-400'
              }`}
            >
              {step === 'complete_profile' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : '1'}
            </div>
            <span className={step === 'enter_email' ? 'text-white font-medium' : 'text-slate-500'}>
              Email
            </span>
          </div>
          <div className="w-6 h-px bg-[#1E2430]" />
          <div className="flex items-center space-x-1.5">
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold border ${
                step === 'complete_profile'
                  ? 'bg-[#1C2332] border-[#2D384F] text-white'
                  : 'bg-[#121620] border-[#1E2430] text-slate-600'
              }`}
            >
              2
            </div>
            <span className={step === 'complete_profile' ? 'text-white font-medium' : 'text-slate-600'}>
              Center Details
            </span>
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-[#0E121A] py-8 px-6 shadow-2xl rounded-2xl border border-[#1E2430] sm:px-10">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* STEP 1: Enter Email Only */}
          {step === 'enter_email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <h3 className="text-white font-semibold text-sm">
                  Sign In to Scanning Portal
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Enter your email address to continue to your workstation.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="e.g. operator@company.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-[#121620] border border-[#212836] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-slate-400 transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Any email domain is supported.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-[#1E2536] hover:bg-[#283248] disabled:opacity-50 text-white text-xs font-semibold rounded-xl border border-[#303D57] transition-all flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: Name + Scanning Center */}
          {step === 'complete_profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <h3 className="text-white font-semibold text-sm">
                  Complete Your Profile
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  First-time access for <span className="text-white font-medium">{email}</span>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Your Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. Ramesh Chandra"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-[#121620] border border-[#212836] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              {!isSuperAdminEmail && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Scanning Center Number / Station
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Center 04, Station B"
                      value={scanningCenter}
                      onChange={(e) => setScanningCenter(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2.5 bg-[#121620] border border-[#212836] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Specify your scanning workstation number.
                  </p>
                </div>
              )}

              <div className="flex space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep('enter_email');
                    setError(null);
                  }}
                  className="px-3.5 py-2.5 bg-[#141822] hover:bg-[#1E2433] text-slate-300 text-xs rounded-xl border border-[#242C3D] transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2.5 px-4 bg-[#1E2536] hover:bg-[#283248] disabled:opacity-50 text-white text-xs font-semibold rounded-xl border border-[#303D57] transition-all flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Enter Workstation</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 border-t border-[#1A202C] pt-4 text-center">
            <p className="text-[11px] text-slate-500">
              Scanning Department Portal • Authorized Access
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
