'use client';

import React, { useState, useEffect } from 'react';
import { User, DailyRecord } from '../types';
import {
  getStoredUsers,
  saveStoredUsers,
  getStoredRecords,
  saveStoredRecords,
  getActiveUser,
  setActiveUser,
  resetDemoData,
  computeStatus,
} from '../lib/storage';
import { Navbar } from '../components/Navbar';
import { AdminDashboard } from '../components/AdminDashboard';
import { OperatorPortal } from '../components/OperatorPortal';
import { UserManagementModal } from '../components/UserManagementModal';
import { RecordModal } from '../components/RecordModal';

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [records, setRecords] = useState<DailyRecord[]>([]);

  // Modals
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedRecordForModal, setSelectedRecordForModal] = useState<DailyRecord | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  // Initialize data on client mount
  useEffect(() => {
    setIsClient(true);
    const loadedUsers = getStoredUsers();
    const loadedRecords = getStoredRecords();
    const active = getActiveUser();

    setUsers(loadedUsers);
    setRecords(loadedRecords);
    setCurrentUser(active);
  }, []);

  // Update active user & save
  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    setActiveUser(user);
  };

  // Save or update a daily record
  const handleSaveRecord = (record: DailyRecord) => {
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
  };

  // Delete a record
  const handleDeleteRecord = (id: string) => {
    setRecords((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      saveStoredRecords(updated);
      return updated;
    });
  };

  // Save new user or update
  const handleSaveUser = (newUser: User) => {
    setUsers((prev) => {
      const updated = [...prev, newUser];
      saveStoredUsers(updated);
      return updated;
    });
  };

  // Toggle user active status
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

  // Reset to initial seed demo data
  const handleResetData = () => {
    const { users: newUsers, records: newRecords } = resetDemoData();
    setUsers(newUsers);
    setRecords(newRecords);
    setCurrentUser(newUsers[0]);
  };

  // Handle Add Record from Admin view
  const handleAdminAddNewRecord = () => {
    const operator = users.find((u) => u.role === 'operator') || users[0];
    const newRecord: DailyRecord = {
      id: `rec_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      userId: operator.id,
      userName: operator.name,
      station: operator.station,
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

  // Calculate total pending scripts across all records
  const totalPendingAcrossDept = records.reduce((acc, r) => acc + Math.max(0, r.pendingCount), 0);

  if (!isClient || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Loading Scanning Portal...
          </p>
        </div>
      </div>
    );
  }

  const isSuperAdmin = currentUser.role === 'super_admin';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navigation Header */}
      <Navbar
        currentUser={currentUser}
        allUsers={users}
        onSelectUser={handleSelectUser}
        onResetData={handleResetData}
        pendingCountTotal={totalPendingAcrossDept}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          />
        ) : (
          <OperatorPortal
            currentUser={currentUser}
            records={records}
            onSaveRecord={handleSaveRecord}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            ScanTrack Enterprise Portal • Scanning Department Audit &amp; Reconciliation System
          </p>
          <p className="text-slate-400">
            Deployed on Vercel • Next.js App Router
          </p>
        </div>
      </footer>

      {/* Super Admin User & Station Management Modal */}
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
