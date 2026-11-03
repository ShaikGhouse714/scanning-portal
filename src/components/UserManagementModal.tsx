'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { X, UserPlus, Power, ShieldCheck, Crown, Shield, RefreshCw } from 'lucide-react';
import { SUPER_ADMIN_EMAIL } from '../lib/mockData';
import { CustomDropdown } from './CustomDropdown';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onSaveUser: (user: User) => void;
  onToggleStatus: (userId: string) => void;
  onUpdateRole: (userId: string, newRole: 'super_admin' | 'admin') => void;
  onRefreshUsers?: () => Promise<void>;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  users: propUsers,
  onSaveUser,
  onToggleStatus,
  onUpdateRole,
  onRefreshUsers,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'super_admin' | 'admin'>('admin');
  const [station, setStation] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localUsers, setLocalUsers] = useState<User[]>(propUsers);

  // Sync propUsers to local state
  useEffect(() => {
    setLocalUsers(propUsers);
  }, [propUsers]);

  // Fetch live users from server whenever modal opens
  const fetchLiveUsers = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (onRefreshUsers) {
        await onRefreshUsers();
      } else {
        const res = await fetch(`/api/users?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { Pragma: 'no-cache', 'Cache-Control': 'no-cache' },
        });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.data) && json.data.length > 0) {
            setLocalUsers(json.data);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to refresh users:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefreshUsers]);

  useEffect(() => {
    if (isOpen) {
      fetchLiveUsers();
    }
  }, [isOpen, fetchLiveUsers]);

  if (!isOpen) return null;

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      station: station.trim() || 'Partner Admin Station',
      department: 'Scanning Dept',
      avatarColor: role === 'super_admin' ? 'bg-cyan-600' : 'bg-indigo-600',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    onSaveUser(newUser);
    setLocalUsers((prev) => [...prev, newUser]);
    setName('');
    setEmail('');
    setStation('');
    setShowAddForm(false);
  };

  const displayUsers = localUsers.length > 0 ? localUsers : propUsers;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-sans animate-fadeIn">
      <div className="bg-[#0E121A] rounded-2xl shadow-2xl border border-[#1E2430] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-[#0B0E14]">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-zinc-300" />
              <span>Admin Account &amp; Access Controls</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Only you (Admin) can add or manage accounts for this portal.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchLiveUsers}
              disabled={isRefreshing}
              title="Refresh live user registrations"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1A2230] transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1A2230] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-200">
                Authorized Accounts ({displayUsers.length})
              </span>
              {isRefreshing && (
                <span className="text-[10px] text-cyan-400 font-mono animate-pulse">
                  Syncing live...
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={fetchLiveUsers}
                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-zinc-900 hover:bg-[#1A2230] text-zinc-300 text-xs rounded-lg border border-zinc-800 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#1B2230] hover:bg-[#252E40] text-slate-200 text-xs font-medium rounded-lg border border-[#2B3548] shadow-sm transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{showAddForm ? 'Cancel' : 'Add New Account'}</span>
              </button>
            </div>
          </div>

          {/* Add User Drawer */}
          {showAddForm && (
            <form
              onSubmit={handleCreateUser}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3"
            >
              <div className="text-xs font-semibold text-slate-200">
                Grant Access to a Team Member
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-[#0E121A] border border-zinc-800 rounded-lg text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. ramesh@codetantra.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-[#0E121A] border border-zinc-800 rounded-lg text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Assigned Role</label>
                  <CustomDropdown
                    value={role}
                    options={[
                      {
                        value: 'admin',
                        label: 'Basic Admin (Intake & Live Sync)',
                        badge: 'Scoped',
                        badgeColor: 'bg-indigo-500/20 text-indigo-300',
                      },
                      {
                        value: 'super_admin',
                        label: 'Super Admin (Full Console)',
                        badge: 'Master',
                        badgeColor: 'bg-amber-500/20 text-amber-300',
                      },
                    ]}
                    onChange={(val) => setRole(val as any)}
                    className="w-full"
                    minMenuWidth="w-full"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Station / Center</label>
                  <input
                    type="text"
                    placeholder="e.g. Scanning Station 2"
                    value={station}
                    onChange={(e) => setStation(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-[#0E121A] border border-zinc-800 rounded-lg text-white focus:outline-none"
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
            {displayUsers.map((u) => {
              const isOwner = u.email.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase();
              const isSuper = u.role === 'super_admin' || isOwner;

              return (
                <div
                  key={u.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-zinc-900 border border-[#1E2430] hover:border-[#273244] transition-all gap-3"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-[#18202E] border border-[#28354A] flex items-center justify-center font-bold text-white text-xs">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-white">{u.name}</span>
                        {isOwner ? (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-white border border-zinc-700">
                            Owner / Super Admin
                          </span>
                        ) : isSuper ? (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Super Admin
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Basic Admin
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                        {u.email} • {u.station || 'Partner Station'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {/* Role Promotion / Demotion for non-owner accounts */}
                    {!isOwner && (
                      <>
                        {u.role === 'admin' ? (
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateRole(u.id, 'super_admin');
                              setLocalUsers((prev) =>
                                prev.map((item) =>
                                  item.id === u.id ? { ...item, role: 'super_admin' } : item
                                )
                              );
                            }}
                            title="Promote to Super Admin"
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-medium transition-all flex items-center space-x-1"
                          >
                            <Crown className="w-3.5 h-3.5 text-amber-400" />
                            <span>Promote to Super Admin</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateRole(u.id, 'admin');
                              setLocalUsers((prev) =>
                                prev.map((item) =>
                                  item.id === u.id ? { ...item, role: 'admin' } : item
                                )
                              );
                            }}
                            title="Demote to Basic Admin"
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-[#202737] text-zinc-300 border border-zinc-700 font-medium transition-all flex items-center space-x-1"
                          >
                            <Shield className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Demote to Basic Admin</span>
                          </button>
                        )}
                      </>
                    )}

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        u.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-zinc-500'
                      }`}
                    >
                      {u.status === 'active' ? 'Active' : 'Inactive'}
                    </span>

                    {!isOwner && (
                      <button
                        onClick={() => {
                          onToggleStatus(u.id);
                          setLocalUsers((prev) =>
                            prev.map((item) =>
                              item.id === u.id
                                ? { ...item, status: item.status === 'active' ? 'inactive' : 'active' }
                                : item
                            )
                          );
                        }}
                        title="Toggle Active Status"
                        className="p-1.5 text-zinc-500 hover:text-white rounded hover:bg-[#1C2433] transition-colors"
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
