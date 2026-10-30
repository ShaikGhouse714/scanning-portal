'use client';

import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { X, UserPlus, Shield, User as UserIcon, Check, Power } from 'lucide-react';

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
  const [station, setStation] = useState('Station E - Mobile Flatbed');
  const [role, setRole] = useState<UserRole>('operator');

  if (!isOpen) return null;

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const colors = ['bg-indigo-600', 'bg-emerald-600', 'bg-blue-600', 'bg-purple-600', 'bg-amber-600', 'bg-rose-600'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newUser: User = {
      id: `user_${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      role,
      station: station.trim(),
      department: 'Scanning Dept',
      avatarColor: randomColor,
      status: 'active',
    };

    onSaveUser(newUser);
    setName('');
    setEmail('');
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              <span>Scanning Department Hierarchy &amp; Access</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Super Admin Control: Manage scanning operators, workstations, and permissions.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Add user action banner */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800">
              Department Personnel ({users.length})
            </span>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-sm transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Cancel' : 'Add New Operator'}</span>
            </button>
          </div>

          {/* Add User Form Drawer */}
          {showAddForm && (
            <form
              onSubmit={handleCreateUser}
              className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4 space-y-3 animate-in fade-in"
            >
              <div className="text-xs font-semibold text-indigo-900 uppercase tracking-wider">
                Create New Scanning Operator
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Jonathan Bell"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Company Email</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g., j.bell@company.internal"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Station / Scanner</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Station E - Fujitsu fi-7160"
                    value={station}
                    onChange={(e) => setStation(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Role Hierarchy</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="operator">Basic User (Scanning Operator - Daywise Logging Only)</option>
                    <option value="super_admin">Super Admin (Full Oversight &amp; Audit Access)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm"
                >
                  Confirm &amp; Add Member
                </button>
              </div>
            </form>
          )}

          {/* User List Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {users.map((user) => {
              const isAdmin = user.role === 'super_admin';
              return (
                <div
                  key={user.id}
                  className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white ${user.avatarColor}`}
                    >
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-slate-900">{user.name}</span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            isAdmin
                              ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                              : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isAdmin ? 'Super Admin' : 'Scanning Operator'}
                        </span>
                        {user.status === 'inactive' && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                        <span>{user.email}</span>
                        <span>•</span>
                        <span className="text-slate-600 font-medium">{user.station}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onToggleStatus(user.id)}
                      disabled={user.id === 'user_admin'}
                      title={
                        user.id === 'user_admin'
                          ? 'Super Admin cannot be deactivated'
                          : user.status === 'active'
                          ? 'Deactivate User'
                          : 'Activate User'
                      }
                      className={`p-2 rounded-lg text-xs font-medium border transition-colors ${
                        user.status === 'active'
                          ? 'text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                          : 'text-slate-500 border-slate-200 bg-slate-100 hover:bg-slate-200'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
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
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

