'use client';

import React, { useState } from 'react';
import { User } from '../types';
import { SUPER_ADMIN_EMAIL } from '../lib/mockData';
import { registerUser, authenticateUser } from '../lib/storage';
import {
  Cpu,
  Mail,
  User as UserIcon,
  ArrowRight,
  Hash,
  CheckCircle2,
  ScanLine,
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

  // STEP 1: Verify email
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Enter your authorized email address.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = authenticateUser(email);
      setIsLoading(false);

      if (res.success && res.user) {
        // Known user (or Super Admin) -> Proceed directly to portal
        onLoginSuccess(res.user);
      } else if (res.error === 'No account found with this email. Please register your account.') {
        // First-time operator -> Next step: Name & Scanning Center Number
        setStep('complete_profile');
      } else {
        setError(res.error || 'Authentication failure.');
      }
    }, 350);
  };

  // STEP 2: Name + Scanning Center registration
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!scanningCenter.trim() && !isSuperAdminEmail) {
      setError('Please provide your Scanning Center Number (e.g. Center 3, SC-02).');
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
    }, 350);
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Futuristic Background Grid & Ambient Glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0e1a30_1px,transparent_1px),linear-gradient(to_bottom,#0e1a30_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-35 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        {/* Holographic Header */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-blue-600/30 to-[#0B1528] border border-cyan-400/40 flex items-center justify-center shadow-xl shadow-cyan-500/15 mx-auto backdrop-blur-md">
              <ScanLine className="w-8 h-8 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <h2 className="mt-4 text-2xl font-black tracking-widest text-white font-mono uppercase">
            SCANTRACK <span className="text-cyan-400">//</span> PORTAL
          </h2>
          <p className="mt-1 text-xs font-mono text-cyan-300/60 tracking-wider uppercase">
            Scanning Department Intake &amp; Audit Platform
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center space-x-3 mb-6 font-mono text-xs">
          <div className="flex items-center space-x-1.5">
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold border ${
                step === 'enter_email'
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                  : 'bg-cyan-950 border-cyan-800 text-cyan-400'
              }`}
            >
              {step === 'complete_profile' ? <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> : '01'}
            </div>
            <span className={step === 'enter_email' ? 'text-cyan-300 font-bold' : 'text-slate-500'}>
              AUTHENTICATE
            </span>
          </div>
          <div className="w-8 h-px bg-cyan-900/60" />
          <div className="flex items-center space-x-1.5">
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold border ${
                step === 'complete_profile'
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-600'
              }`}
            >
              02
            </div>
            <span className={step === 'complete_profile' ? 'text-cyan-300 font-bold' : 'text-slate-600'}>
              CENTER PROFILE
            </span>
          </div>
        </div>

        {/* Cyber Card */}
        <div className="bg-[#0A1122]/90 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl border border-cyan-900/50 sm:px-10 relative">
          <div className="absolute top-0 left-0 w-8 h-[2px] bg-cyan-400" />
          <div className="absolute top-0 right-0 w-8 h-[2px] bg-cyan-400" />

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
              ⚠️ {error}
            </div>
          )}

          {/* STEP 1: Enter Email Only */}
          {step === 'enter_email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-5">
              <div>
                <h3 className="text-white font-bold text-sm font-mono tracking-wide">
                  SYSTEM IDENTIFICATION
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Enter your email address to access your assigned scanning portal.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono text-cyan-300/80 uppercase tracking-wider mb-1.5">
                  Account Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-cyan-500/70 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="operator@company.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs font-mono pl-9 pr-3 py-3 bg-[#050A16] border border-cyan-900/60 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 font-mono">
                  Accepts institutional and corporate domains.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-mono font-bold tracking-wider uppercase rounded-xl shadow-lg shadow-cyan-600/20 transition-all flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>CONTINUE TO WORKSTATION</span>
                    <ArrowRight className="w-3.5 h-3.5 text-cyan-200" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: Name + Scanning Center Number */}
          {step === 'complete_profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-5">
              <div>
                <h3 className="text-white font-bold text-sm font-mono tracking-wide">
                  WORKSTATION REGISTRATION
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  First-time access detected for <span className="text-cyan-400 font-mono">{email}</span>.
                </p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-mono text-cyan-300/80 uppercase tracking-wider mb-1.5">
                  Operator Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-cyan-500/70 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. Ramesh Chandra"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs font-mono pl-9 pr-3 py-3 bg-[#050A16] border border-cyan-900/60 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                  />
                </div>
              </div>

              {/* Scanning Center Number */}
              <div>
                <label className="block text-xs font-mono text-cyan-300/80 uppercase tracking-wider mb-1.5">
                  Scanning Center Number / Identifier
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-cyan-500/70 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Center 04, Station 2, SC-08"
                    value={scanningCenter}
                    onChange={(e) => setScanningCenter(e.target.value)}
                    className="w-full text-xs font-mono pl-9 pr-3 py-3 bg-[#050A16] border border-cyan-900/60 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 font-mono">
                  Your daily logs will be associated with this scanning center.
                </p>
              </div>

              <div className="flex space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep('enter_email');
                    setError(null);
                  }}
                  className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-mono rounded-xl border border-slate-800 transition-colors"
                >
                  BACK
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-mono font-bold tracking-wider uppercase rounded-xl shadow-lg shadow-cyan-600/20 transition-all flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>ACTIVATE &amp; ENTER WORKSTATION</span>
                      <ArrowRight className="w-3.5 h-3.5 text-cyan-200" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 border-t border-cyan-950/80 pt-4 text-center">
            <p className="text-[10px] font-mono text-slate-500 tracking-wider">
              CENTRAL COMMAND PROTOCOL · KIIT SCANNING DEPARTMENT
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
