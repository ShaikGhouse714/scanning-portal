'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Modals
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedRecordForModal, setSelectedRecordForModal] = useState<DailyRecord | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  const isReconcilingRef = useRef(false);

  // Sync data from server with two-way reconciliation
  const syncFromServer = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [recRes, userRes] = await Promise.all([
        fetch('/api/records', { cache: 'no-store' }),
        fetch('/api/users', { cache: 'no-store' }),
      ]);

      let serverRecords: DailyRecord[] = [];
      let serverUsers: User[] = [];

      if (recRes.ok) {
        const recJson = await recRes.json();
        if (Array.isArray(recJson.data)) {
          serverRecords = recJson.data;
          setRecords(serverRecords);
          saveStoredRecords(serverRecords);
        }
      }

      if (userRes.ok) {
        const userJson = await userRes.json();
        if (Array.isArray(userJson.data)) {
          serverUsers = userJson.data;
          setUsers(serverUsers);
          saveStoredUsers(serverUsers);
        }
      }

      // Check if local device has records not yet known to server (offline healing)
      if (!isReconcilingRef.current) {
        isReconcilingRef.current = true;
        const localRecs = getStoredRecords();
        for (const lr of localRecs) {
          const existsOnServer = serverRecords.some((sr) => sr.id === lr.id);
          if (!existsOnServer && lr.id) {
            try {
              await fetch('/api/records', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(lr),
              });
            } catch {}
          }
        }
        isReconcilingRef.current = false;
      }
    } catch (e) {
      console.warn('Server fetch error, using local fallback:', e);
    } finally {
      setIsSyncing(false);
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

    if (active) {
      setActiveTab(active.role === 'super_admin' ? 'dashboard' : 'intake');
    }

    // Initial server fetch
    syncFromServer();

    // Auto-refresh polling every 3 seconds for instant multi-device reflection
    const interval = setInterval(() => {
      syncFromServer();
    }, 3000);

    return () => clearInterval(interval);
  }, [syncFromServer]);

  // Adjust active tab when switching user role
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'super_admin') {
        if (activeTab === 'intake' || activeTab === 'my_logs' || activeTab === 'tracking') {
          setActiveTab('dashboard');
        }
      } else {
        if (
          activeTab === 'dashboard' ||
          activeTab === 'schools' ||
          activeTab === 'audit_log' ||
          activeTab === 'tracking'
        ) {
          setActiveTab('intake');
        }
      }
    }
  }, [currentUser, activeTab]);

  // Sign out
  const handleSignOut = () => {
    setCurrentUser(null);
    setActiveUser(null);
    setActiveTab('dashboard');
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
          <p className="text-xs font-mono text-slate-400">Loading ScanTrack Ops...</p>
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
          setActiveTab(user.role === 'super_admin' ? 'dashboard' : 'intake');
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
              isSyncing={isSyncing}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          ) : (
            <OperatorPortal
              currentUser={currentUser}
              records={records}
              onSaveRecord={handleSaveRecord}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
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
