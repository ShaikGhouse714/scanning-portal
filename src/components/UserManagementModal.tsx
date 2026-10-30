'use client';

import React, { useState } from 'react';
import { User } from '../types';
import { X, UserPlus, Power, ShieldCheck, Hash } from 'lucide-react';

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
      avatarColor: 'bg-cyan-600',
      status: 'active',
    };

    onSaveUser(newUser);
    setName('');
    setEmail('');
    setCenterNumber('');
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-mono">
      <div className="bg-[#091122] rounded-2xl shadow-2xl border border-cyan-900/60 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-cyan-950 flex items-center justify-between bg-[#060C1A]">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <span>SCANNING CENTERS &amp; OPERATOR DIRECTORY</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Super Admin Control: Monitor active centers and operator workstations.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
              REGISTERED WORKSTATIONS ({users.length})
            </span>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'CANCEL' : 'ADD OPERATOR'}</span>
            </button>
          </div>

          {/* Add User Drawer */}
          {showAddForm && (
            <form
              onSubmit={handleCreateUser}
              className="bg-[#050A16] border border-cyan-900/60 rounded-xl p-4 space-y-3"
            >
              <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                REGISTER SCANNING CENTER OPERATOR
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
                    className="w-full text-xs px-3 py-2 bg-[#091122] border border-cyan-950 rounded-lg text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="ramesh@kiit.ac.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-[#091122] border border-cyan-950 rounded-lg text-white focus:outline-none focus:border-cyan-400"
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
                    className="w-full text-xs px-3 py-2 bg-[#091122] border border-cyan-950 rounded-lg text-white focus:outline-none focus:border-cyan-400"
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
                  className="px-3 py-1.5 text-xs font-bold bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 shadow-sm"
                >
                  Register Center
                </button>
              </div>
            </form>
          )}

          {/* Directory list */}
          <div className="border border-cyan-950 rounded-xl overflow-hidden divide-y divide-cyan-950/70">
            {users.map((user) => {
              const isAdmin = user.role === 'super_admin';
              return (
                <div
                  key={user.id}
                  className="p-3.5 flex items-center justify-between hover:bg-[#060C1A] transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                        isAdmin ? 'bg-cyan-600 ring-1 ring-cyan-400/50' : 'bg-slate-800'
                      }`}
                    >
                      {isAdmin ? <ShieldCheck className="w-4 h-4 text-cyan-200" /> : user.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-white">{user.name}</span>
                        <span
                          className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                            isAdmin
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {isAdmin ? 'SUPER ADMIN' : 'OPERATOR'}
                        </span>
                        {user.status === 'inactive' && (
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-rose-950/40 text-rose-400 border border-rose-900/60">
                            INACTIVE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                        <span>{user.email}</span>
                        <span>•</span>
                        <span className="text-cyan-400/80 font-bold">{user.station}</span>
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
                          ? 'text-emerald-400 border-emerald-900/50 bg-emerald-950/30 hover:bg-emerald-950/60'
                          : 'text-slate-500 border-slate-800 bg-slate-900 hover:bg-slate-800'
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
        <div className="px-6 py-3 border-t border-cyan-950 bg-[#060C1A] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg shadow-sm"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
