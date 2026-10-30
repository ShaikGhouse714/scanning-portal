'use client';

import React, { useState } from 'react';
import { User } from '../types';
import { X, UserPlus, Power, ShieldCheck, Building2 } from 'lucide-react';

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
  const [centerNumber, setCenterNumber] = useState('');

  if (!isOpen) return null;

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const newUser: User = {
      id: `user_${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      role: 'operator',
      station: `Scanning Center ${centerNumber.trim() || 'General'}`,
      department: 'Scanning Dept',
      avatarColor: 'bg-slate-700',
      status: 'active',
    };

    onSaveUser(newUser);
    setName('');
    setEmail('');
    setCenterNumber('');
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-sans">
      <div className="bg-[#0E121A] rounded-2xl shadow-2xl border border-[#1E2430] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#1A202C] flex items-center justify-between bg-[#0B0E14]">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>Scanning Centers &amp; Operator Directory</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Super Admin Directory: Manage scanning workstations and operator access.
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
              Active Centers &amp; Staff ({users.length})
            </span>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#1B2230] hover:bg-[#252E40] text-slate-200 text-xs font-medium rounded-lg border border-[#2B3548] shadow-sm transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Cancel' : 'Add Operator'}</span>
            </button>
          </div>

          {/* Add User Drawer */}
          {showAddForm && (
            <form
              onSubmit={handleCreateUser}
              className="bg-[#121620] border border-[#212836] rounded-xl p-4 space-y-3"
            >
              <div className="text-xs font-semibold text-slate-200">
                Register Scanning Operator
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Chandra"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-[#0E121A] border border-[#283244] rounded-lg text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="ramesh@company.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-[#0E121A] border border-[#283244] rounded-lg text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Center Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Center 05"
                    value={centerNumber}
                    onChange={(e) => setCenterNumber(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-[#0E121A] border border-[#283244] rounded-lg text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium bg-[#1E2536] text-white rounded-lg hover:bg-[#283248] border border-[#303D57]"
                >
                  Save Operator
                </button>
              </div>
            </form>
          )}

          {/* Directory list */}
          <div className="border border-[#1E2430] rounded-xl overflow-hidden divide-y divide-[#1A202C]">
            {users.map((user) => {
              const isAdmin = user.role === 'super_admin';
              return (
                <div
                  key={user.id}
                  className="p-3.5 flex items-center justify-between hover:bg-[#121620] transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-[#181F2C] border border-[#263246] flex items-center justify-center text-xs font-bold text-slate-200">
                      {isAdmin ? <ShieldCheck className="w-4 h-4 text-slate-300" /> : user.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-white">{user.name}</span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                            isAdmin
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isAdmin ? 'SUPER ADMIN' : 'OPERATOR'}
                        </span>
                        {user.status === 'inactive' && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-950/40 text-rose-400">
                            INACTIVE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                        <span>{user.email}</span>
                        <span>•</span>
                        <span className="text-slate-300 font-medium">{user.station}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onToggleStatus(user.id)}
                      disabled={isAdmin}
                      title={
                        isAdmin
                          ? 'Super Admin cannot be deactivated'
                          : user.status === 'active'
                          ? 'Deactivate'
                          : 'Activate'
                      }
                      className={`p-2 rounded-lg text-xs font-medium border transition-colors ${
                        user.status === 'active'
                          ? 'text-emerald-400 border-emerald-900/50 bg-emerald-950/30'
                          : 'text-slate-500 border-slate-800 bg-slate-900'
                      } disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#1A202C] bg-[#0B0E14] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1B2230] hover:bg-[#252E40] text-slate-200 text-xs font-medium rounded-lg border border-[#2B3548]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
