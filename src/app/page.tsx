'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { User, DailyRecord } from '../types';
import { AVAILABLE_SCHOOLS } from '../lib/mockData';
import {
  getStoredUsers,
  saveStoredUsers,
  getStoredRecords,
  saveStoredRecords,
  getActiveUser,
  setActiveUser,
} from '../lib/storage';
import { Sidebar } from '../components/Sidebar';
import { AdminDashboard } from '../components/AdminDashboard';
import { OperatorPortal } from '../components/OperatorPortal';
import { UserManagementModal } from '../components/UserManagementModal';
import { RecordModal } from '../components/RecordModal';
import { AuthScreen } from '../components/AuthScreen';

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [activeTab, setActiveTab] = useState<string>('tracking');

  // Modals
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedRecordForModal, setSelectedRecordForModal] = useState<DailyRecord | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  // Sync data from server
  const syncFromServer = useCallback(async () => {
    try {
      const [recRes, userRes] = await Promise.all([
        fetch('/api/records', { cache: 'no-store' }),
        fetch('/api/users', { cache: 'no-store' }),
      ]);

      if (recRes.ok) {
        const recJson = await recRes.json();
        if (recJson.data) {
          setRecords(recJson.data);
          saveStoredRecords(recJson.data);
        }
      }

      if (userRes.ok) {
        const userJson = await userRes.json();
        if (userJson.data) {
          setUsers(userJson.data);
          saveStoredUsers(userJson.data);
        }
      }
    } catch (e) {
      console.warn('Server fetch error, using local fallback:', e);
    }
  }, []);

  // Initialize data on mount
  useEffect(() => {
    setIsClient(true);
    const localUsers = getStoredUsers();
    const localRecords = getStoredRecords();
    const active = getActiveUser();

    setUsers(localUsers);
    setRecords(localRecords);
    setCurrentUser(active);

    // Initial server fetch
    syncFromServer();

    // Auto-refresh polling every 4 seconds to sync any submissions from other devices/testers
    const interval = setInterval(() => {
      syncFromServer();
    }, 4000);

    return () => clearInterval(interval);
  }, [syncFromServer]);

  // Sign out
  const handleSignOut = () => {
    setCurrentUser(null);
    setActiveUser(null);
  };

  // Save record: updates local state + POST to server
  const handleSaveRecord = async (record: DailyRecord) => {
    // Optimistic UI update
    setRecords((prev) => {
      const index = prev.findIndex((r) => r.id === record.id);
      let updated: DailyRecord[];
      if (index >= 0) {
        updated = [...prev];
        updated[index] = record;
      } else {
        updated = [record, ...prev];
      }
      saveStoredRecords(updated);
      return updated;
    });

    try {
      await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      syncFromServer();
    } catch (err) {
      console.error('Failed to sync record to server:', err);
    }
  };

  // Delete record: local + server
  const handleDeleteRecord = async (id: string) => {
    setRecords((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      saveStoredRecords(updated);
      return updated;
    });

    try {
      await fetch(`/api/records?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      syncFromServer();
    } catch (err) {
      console.error('Failed to delete record on server:', err);
    }
  };

  // Save new user: local + server
  const handleSaveUser = async (newUser: User) => {
    setUsers((prev) => {
      const updated = [...prev, newUser];
      saveStoredUsers(updated);
      return updated;
    });

    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      syncFromServer();
    } catch (err) {
      console.error('Failed to save user to server:', err);
    }
  };

  // Toggle user status
  const handleToggleUserStatus = (userId: string) => {
    setUsers((prev) => {
      const updated = prev.map((u) => {
        if (u.id === userId) {
          return {
            ...u,
            status: (u.status === 'active' ? 'inactive' : 'active') as 'active' | 'inactive',
          };
        }
        return u;
      });
      saveStoredUsers(updated);
      return updated;
    });
  };

  // Admin adds new record
  const handleAdminAddNewRecord = () => {
    const operator = users.find((u) => u.role === 'operator') || currentUser || users[0];
    const newRecord: DailyRecord = {
      id: `rec_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      userId: operator.id,
      userName: operator.name,
      station: operator.station,
      school: AVAILABLE_SCHOOLS[0],
      receivedCount: 0,
      uploadedCount: 0,
      pendingCount: 0,
      completionRate: 100,
      status: 'completed',
      shift: 'Morning',
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSelectedRecordForModal(newRecord);
    setIsRecordModalOpen(true);
  };

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07090E]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-mono text-slate-400">Loading Exam Ops...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Auth Screen
  if (!currentUser) {
    return (
      <AuthScreen
        onLoginSuccess={async (user) => {
          setCurrentUser(user);
          setActiveUser(user);
          // Sync with server immediately
          try {
            await fetch('/api/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(user),
            });
            syncFromServer();
          } catch (e) {}
        }}
      />
    );
  }

  const isSuperAdmin = currentUser.role === 'super_admin';

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-200 flex font-sans">
      {/* Left Sidebar matching screenshot */}
      <Sidebar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSignOut={handleSignOut}
        onOpenUserModal={isSuperAdmin ? () => setIsUserModalOpen(true) : undefined}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen">
        <main className="flex-1 p-6 lg:p-8">
          {isSuperAdmin ? (
            <AdminDashboard
              records={records}
              users={users}
              onOpenUserModal={() => setIsUserModalOpen(true)}
              onEditRecord={(record) => {
                setSelectedRecordForModal(record);
                setIsRecordModalOpen(true);
              }}
              onDeleteRecord={handleDeleteRecord}
              onAddRecord={handleAdminAddNewRecord}
              onRefresh={syncFromServer}
            />
          ) : (
            <OperatorPortal
              currentUser={currentUser}
              records={records}
              onSaveRecord={handleSaveRecord}
            />
          )}
        </main>
      </div>

      {/* User Management Modal */}
      <UserManagementModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        users={users}
        onSaveUser={handleSaveUser}
        onToggleStatus={handleToggleUserStatus}
      />

      {/* Record Inspect / Edit Modal */}
      <RecordModal
        isOpen={isRecordModalOpen}
        onClose={() => {
          setIsRecordModalOpen(false);
          setSelectedRecordForModal(null);
        }}
        record={selectedRecordForModal}
        onSave={handleSaveRecord}
        isAdmin={isSuperAdmin}
      />
    </div>
  );
}
