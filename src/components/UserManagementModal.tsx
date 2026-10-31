'use client';

import React, { useState } from 'react';
import { User } from '../types';
import { X, UserPlus, Power, ShieldCheck, UserCheck, Trash2 } from 'lucide-react';
import { SUPER_ADMIN_EMAIL } from '../lib/mockData';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onSaveUser: (user: User) => void;
  onToggleStatus: (userId: string) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  onSaveUser,
  onToggleStatus,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'operator'>('operator');
  const [station, setStation] = useState('');

  if (!isOpen) return null;

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      station: station.trim() || 'Central Scanning Dept',
      department: 'Scanning Dept',
      avatarColor: role === 'admin' ? 'bg-indigo-600' : 'bg-slate-700',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    onSaveUser(newUser);
    setName('');
    setEmail('');
    setStation('');
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-sans animate-fadeIn">
      <div className="bg-[#0E121A] rounded-2xl shadow-2xl border border-[#1E2430] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#1A202C] flex items-center justify-between bg-[#0B0E14]">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-slate-300" />
              <span>Admin Account &amp; Access Controls</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Only you (Admin) can add or manage accounts for this portal.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1A2230] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200">
              Authorized Accounts ({users.length})
            </span>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#1B2230] hover:bg-[#252E40] text-slate-200 text-xs font-medium rounded-lg border border-[#2B3548] shadow-sm transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Cancel' : 'Add New Account'}</span>
            </button>
          </div>

          {/* Add User Drawer */}
          {showAddForm && (
            <form
              onSubmit={handleCreateUser}
              className="bg-[#121620] border border-[#212836] rounded-xl p-4 space-y-3"
            >
              <div className="text-xs font-semibold text-slate-200">
                Grant Access to a Team Member
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-[#0E121A] border border-[#212836] rounded-lg text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. ramesh@codetantra.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-[#0E121A] border border-[#212836] rounded-lg text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 bg-[#0E121A] border border-[#212836] rounded-lg text-white focus:outline-none"
                  >
                    <option value="operator">Operator (Read-Only / Scanning)</option>
                    <option value="admin">Admin (Full Access)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Station / Center</label>
                  <input
                    type="text"
                    placeholder="e.g. Scanning Station 2"
                    value={station}
                    onChange={(e) => setStation(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-[#0E121A] border border-[#212836] rounded-lg text-white focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1E2536] hover:bg-[#283248] text-white text-xs font-semibold rounded-lg border border-[#303D57] transition-all"
                >
                  Save Account
                </button>
              </div>
            </form>
          )}

          {/* User List */}
          <div className="space-y-2">
            {users.map((u) => {
              const isSuper = u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
              return (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-[#121620] border border-[#1E2430] hover:border-[#273244] transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-[#18202E] border border-[#28354A] flex items-center justify-center font-bold text-white text-xs">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-white">{u.name}</span>
                        {isSuper ? (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Super Admin
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {u.role.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {u.email} • {u.station || 'General'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        u.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {u.status === 'active' ? 'Active' : 'Inactive'}
                    </span>

                    {!isSuper && (
                      <button
                        onClick={() => onToggleStatus(u.id)}
                        title="Toggle Status"
                        className="p-1.5 text-slate-500 hover:text-white rounded hover:bg-[#1C2433] transition-colors"
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
