'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { X, UserPlus, Power, ShieldCheck, Crown, Shield, RefreshCw, Trash2, Mail, Building, User as UserIcon } from 'lucide-react';
import { SUPER_ADMIN_EMAIL, isSuperAdminEmail } from '../lib/mockData';
import { CustomDropdown } from './CustomDropdown';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onSaveUser: (user: User) => void;
  onToggleStatus: (userId: string) => void;
  onUpdateRole: (userId: string, newRole: 'super_admin' | 'admin') => void;
  onDeleteUser?: (userId: string) => void;
  onRefreshUsers?: () => Promise<void>;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  users: propUsers,
  onSaveUser,
  onToggleStatus,
  onUpdateRole,
  onDeleteUser,
  onRefreshUsers,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'super_admin' | 'admin'>('admin');
  const [station, setStation] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localUsers, setLocalUsers] = useState<User[]>(propUsers);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Sync propUsers to local state
  useEffect(() => {
    setLocalUsers(propUsers);
  }, [propUsers]);

  // Fetch live users from server whenever modal opens
  const fetchLiveUsers = useCallback(async () => {
    setIsRefreshing(true);
    setActionNotice(null);
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
    setActionNotice(`Account created for ${newUser.name} (${role === 'super_admin' ? 'Super Admin' : 'Basic Admin'})`);
    setName('');
    setEmail('');
    setStation('');
    setShowAddForm(false);
  };

  const handlePromoteOrDemote = (user: User, newRole: 'super_admin' | 'admin') => {
    onUpdateRole(user.id, newRole);
    setLocalUsers((prev) =>
      prev.map((item) => (item.id === user.id ? { ...item, role: newRole } : item))
    );
    setActionNotice(
      newRole === 'super_admin'
        ? `✓ ${user.name} promoted to Super Admin successfully!`
        : `✓ ${user.name} changed to Basic Admin.`
    );
  };

  const handleDelete = async (user: User) => {
    if (!window.confirm(`Are you sure you want to remove account ${user.name} (${user.email})?`)) {
      return;
    }
    if (onDeleteUser) {
      onDeleteUser(user.id);
    } else {
      try {
        await fetch(`/api/users?id=${user.id}`, { method: 'DELETE' });
      } catch (e) {
        console.warn('Delete failed:', e);
      }
    }
    setLocalUsers((prev) => prev.filter((u) => u.id !== user.id));
    setActionNotice(`Account ${user.name} removed.`);
  };

  const displayUsers = localUsers.length > 0 ? localUsers : propUsers;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-sans animate-in fade-in duration-150">
      <div className="bg-[#09090b] rounded-2xl shadow-2xl border border-[#27272a] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#222222] flex items-center justify-between bg-[#000000]">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-white" />
              <span>Team Accounts &amp; Access Controls</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Super Admin Management Console • Review registered users and promote to Super Admin.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchLiveUsers}
              disabled={isRefreshing}
              title="Refresh live user registrations"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-white' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {actionNotice && (
            <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white leading-relaxed flex items-center justify-between">
              <span>{actionNotice}</span>
              <button
                type="button"
                onClick={() => setActionNotice(null)}
                className="text-zinc-400 hover:text-white text-[11px]"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-white">
                Registered Team Members ({displayUsers.length})
              </span>
              {isRefreshing && (
                <span className="text-[10px] text-zinc-400 font-mono animate-pulse">
                  Syncing live...
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={fetchLiveUsers}
                className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-[#000000] hover:bg-zinc-800 text-zinc-300 text-xs rounded-xl border border-[#27272a] transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-zinc-200 text-black text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{showAddForm ? 'Cancel' : 'Add Account'}</span>
              </button>
            </div>
          </div>

          {/* Add User Drawer */}
          {showAddForm && (
            <form
              onSubmit={handleCreateUser}
              className="bg-[#000000] border border-[#27272a] rounded-xl p-4 space-y-3 animate-in fade-in"
            >
              <div className="text-xs font-bold text-white">
                Authorize a Team Member Manually
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
                    className="w-full text-xs px-3 py-2 bg-[#09090b] border border-[#27272a] rounded-xl text-white focus:outline-none focus:border-white"
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
                    className="w-full text-xs px-3 py-2 bg-[#09090b] border border-[#27272a] rounded-xl text-white font-mono focus:outline-none focus:border-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Initial Role</label>
                  <CustomDropdown
                    value={role}
                    options={[
                      {
                        value: 'admin',
                        label: 'Basic Admin (Scanning, Eval, Result Ops)',
                        badge: 'Default',
                        badgeColor: 'bg-zinc-800 text-zinc-300',
                      },
                      {
                        value: 'super_admin',
                        label: 'Super Admin (Full Console & User Admin)',
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
                    placeholder="e.g. KIIT University - Station 2"
                    value={station}
                    onChange={(e) => setStation(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-[#09090b] border border-[#27272a] rounded-xl text-white focus:outline-none focus:border-white"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-bold rounded-xl transition-all"
                >
                  Save Account
                </button>
              </div>
            </form>
          )}

          {/* User List */}
          <div className="space-y-2.5">
            {displayUsers.map((u) => {
              const isOwner =
                u.email.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase() ||
                isSuperAdminEmail(u.email);
              const isSuper = u.role === 'super_admin' || isOwner;

              return (
                <div
                  key={u.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-[#000000] border border-[#27272a] hover:border-zinc-600 transition-all gap-3"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#18181b] border border-[#27272a] flex items-center justify-center font-bold text-white text-xs shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="text-xs font-bold text-white">{u.name}</span>
                        {isOwner ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white text-black font-bold">
                            Owner / Super Admin
                          </span>
                        ) : isSuper ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold flex items-center space-x-1">
                            <Crown className="w-2.5 h-2.5" />
                            <span>Super Admin</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 font-semibold">
                            Basic Admin
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate">
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
                            onClick={() => handlePromoteOrDemote(u, 'super_admin')}
                            title="Promote this user to Super Admin"
                            className="text-xs px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold transition-all flex items-center space-x-1.5"
                          >
                            <Crown className="w-3.5 h-3.5 text-amber-400" />
                            <span>Promote to Super Admin</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handlePromoteOrDemote(u, 'admin')}
                            title="Demote this user to Basic Admin"
                            className="text-xs px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 font-semibold transition-all flex items-center space-x-1.5"
                          >
                            <Shield className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Demote to Basic Admin</span>
                          </button>
                        )}
                      </>
                    )}

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        u.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {u.status === 'active' ? 'Active' : 'Inactive'}
                    </span>

                    {!isOwner && (
                      <>
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
                          title={u.status === 'active' ? 'Deactivate account' : 'Activate account'}
                          className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(u)}
                          title="Delete account"
                          className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
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
