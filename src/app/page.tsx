'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, PortalExamSlot, TeamSubsheetEntry } from '../types';
import {
  getStoredUsers,
  saveStoredUsers,
  getActiveUser,
  setActiveUser,
  getStoredTeamEntries,
  saveStoredTeamEntries,
  getStoredPortalSlots,
  saveStoredPortalSlots,
  getStoredSheetUrl,
  saveStoredSheetUrl,
  getStoredSheetNames,
  saveStoredSheetNames,
  getLastSyncTime,
  setLastSyncTime,
} from '../lib/storage';
import {
  parsePortalData,
  parseTeamGoogleSheet,
  reconcileIntakeVsPortal,
} from '../lib/excelParser';
import { SUPER_ADMIN_EMAIL } from '../lib/mockData';
import { Sidebar } from '../components/Sidebar';
import { ReconciliationDashboard } from '../components/ReconciliationDashboard';
import { UserManagementModal } from '../components/UserManagementModal';
import { AuthScreen } from '../components/AuthScreen';

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<string>('reconciliation');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);

  // Core Data Stores (Clean Slate: Zero pre-saved data)
  const [teamEntries, setTeamEntries] = useState<TeamSubsheetEntry[]>([]);
  const [portalSlots, setPortalSlots] = useState<PortalExamSlot[]>([]);
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [lastSyncedTime, setLastSyncedTimeState] = useState<string>('Ready to sync');

  // Initialize data on mount
  useEffect(() => {
    setIsClient(true);
    const active = getActiveUser();
    const storedUsers = getStoredUsers();
    const storedUrl = getStoredSheetUrl();

    setCurrentUser(active);
    setUsers(storedUsers);
    setGoogleSheetUrl(storedUrl);

    // CLEAN SLATE ON LINK OPEN: Do NOT store or restore previous data on mount!
    // Must be completely empty until user clicks "Sync Sheet Data" or uploads Excel.
    setTeamEntries([]);
    setPortalSlots([]);
    setSheetNames([]);
    setLastSyncedTimeState('Ready to sync');

    // Only sync registered users across devices so Super Admin can manage team access
    (async () => {
      try {
        const userRes = await fetch(`/api/users?t=${Date.now()}`, { cache: 'no-store' });
        if (userRes.ok) {
          const uJson = await userRes.json();
          if (Array.isArray(uJson.data) && uJson.data.length > 0) {
            setUsers(uJson.data);
            saveStoredUsers(uJson.data);
          }
        }
      } catch (e) {
        console.warn('User sync error:', e);
      }
    })();
  }, []);

  // Compute live reconciliation (Passing sheetNames so all teammate cards are generated even if empty!)
  const { matrix, teammates, metrics } = useMemo(() => {
    return reconcileIntakeVsPortal(teamEntries, portalSlots, sheetNames);
  }, [teamEntries, portalSlots, sheetNames]);

  // Refresh users list from cloud
  const handleRefreshUsers = useCallback(async () => {
    try {
      const res = await fetch(`/api/users?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { Pragma: 'no-cache', 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          setUsers(json.data);
          saveStoredUsers(json.data);
        }
      }
    } catch (e) {
      console.warn('Failed to refresh users:', e);
    }
  }, []);

  // Sync with live Google Sheet (Publish to web URL in XLSX format)
  const handleSyncGoogleSheet = useCallback(async () => {
    if (!googleSheetUrl.trim()) {
      setActiveTab('data_sources');
      alert(
        'Please enter your published Google Sheet URL first in the "Data Sources" section.'
      );
      return;
    }

    setIsSyncing(true);

    try {
      const res = await fetch('/api/sync-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: googleSheetUrl }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        alert(
          json.message ||
            'Failed to sync with Google Sheet. Make sure the sheet is published to the web in XLSX format.'
        );
        setIsSyncing(false);
        return;
      }

      const newEntries: TeamSubsheetEntry[] = json.data;
      const discoveredSheets: string[] = json.sheetNames || [];

      setTeamEntries(newEntries);
      saveStoredTeamEntries(newEntries);

      if (discoveredSheets.length > 0) {
        setSheetNames(discoveredSheets);
        saveStoredSheetNames(discoveredSheets);
      }

      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const timeMsg = `Synced at ${nowStr}`;
      setLastSyncedTimeState(timeMsg);
      setLastSyncTime(timeMsg);

      // Save to server store
      await fetch('/api/team-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: newEntries,
          sheetUrl: googleSheetUrl,
          sheetNames: discoveredSheets,
        }),
      });

      alert(
        `Google Sheet synchronized successfully! Generated cards for ${discoveredSheets.length} teammate subsheet(s) and loaded ${newEntries.length} entries.`
      );
    } catch (err) {
      console.error('Google Sheet sync error:', err);
      alert('Network error while syncing Google Sheet. Please check the URL.');
    } finally {
      setIsSyncing(false);
    }
  }, [googleSheetUrl]);

  // Upload Portal Excel / CSV File
  const handleUploadPortalFile = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const parsedSlots = parsePortalData(arrayBuffer);

      if (parsedSlots.length === 0) {
        alert('Could not find valid exam schedule rows in this file. Please verify the format.');
        return;
      }

      setPortalSlots(parsedSlots);
      saveStoredPortalSlots(parsedSlots);

      // Sync to server
      await fetch('/api/portal-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: parsedSlots }),
      });

      alert(`Portal file uploaded! Successfully extracted ${parsedSlots.length} exam slots.`);
    } catch (e) {
      console.error('Failed to parse portal file:', e);
      alert('Error parsing portal file: ' + String(e));
    }
  };

  // Upload Team Google Sheet File directly (.xlsx)
  const handleUploadTeamSheetFile = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const { teammateEntries, sheetNames: discoveredSheets } = parseTeamGoogleSheet(arrayBuffer);

      if (discoveredSheets.length === 0) {
        alert('No subsheets found in the uploaded workbook.');
        return;
      }

      setTeamEntries(teammateEntries);
      saveStoredTeamEntries(teammateEntries);

      setSheetNames(discoveredSheets);
      saveStoredSheetNames(discoveredSheets);

      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const timeMsg = `Uploaded at ${nowStr}`;
      setLastSyncedTimeState(timeMsg);
      setLastSyncTime(timeMsg);

      // Sync to server
      await fetch('/api/team-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: teammateEntries, sheetNames: discoveredSheets }),
      });

      alert(
        `Team sheet uploaded! Generated cards for ${discoveredSheets.length} teammate subsheet(s) (${discoveredSheets.join(', ')}) with ${teammateEntries.length} entries.`
      );
    } catch (e) {
      console.error('Failed to parse team sheet:', e);
      alert('Error parsing team sheet: ' + String(e));
    }
  };

  // Clear all data (Reset to clean slate)
  const handleClearAllData = () => {
    if (!confirm('Are you sure you want to clear all synced Google Sheet data and uploaded portal exam slots?')) {
      return;
    }
    setPortalSlots([]);
    saveStoredPortalSlots([]);

    setTeamEntries([]);
    saveStoredTeamEntries([]);

    setSheetNames([]);
    saveStoredSheetNames([]);

    setLastSyncedTimeState('Ready to sync');
    setLastSyncTime('Ready to sync');

    fetch('/api/portal-slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slots: [] }),
    }).catch(() => {});

    fetch('/api/team-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: [], sheetNames: [] }),
    }).catch(() => {});
  };

  // Update Google Sheet URL
  const handleUpdateSheetUrl = (url: string) => {
    setGoogleSheetUrl(url);
    saveStoredSheetUrl(url);
    fetch('/api/team-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetUrl: url }),
    }).catch(() => {});
  };

  // Admin Account Creation
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
    } catch (e) {}
  };

  // Toggle user active status
  const handleToggleUserStatus = async (userId: string) => {
    let newStatus: 'active' | 'inactive' = 'active';
    setUsers((prev) => {
      const updated = prev.map((u) => {
        if (u.id === userId) {
          newStatus = (u.status === 'active' ? 'inactive' : 'active') as 'active' | 'inactive';
          return {
            ...u,
            status: newStatus,
          };
        }
        return u;
      });
      saveStoredUsers(updated);
      return updated;
    });

    try {
      await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, status: newStatus }),
      });
    } catch (e) {
      console.warn('Failed to toggle status on server:', e);
    }
  };

  // Promote / Demote user role (Basic Admin <-> Super Admin)
  const handleUpdateUserRole = async (userId: string, newRole: 'super_admin' | 'admin') => {
    setUsers((prev) => {
      const updated = prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u));
      saveStoredUsers(updated);
      return updated;
    });

    // If updating current user's role, update state
    if (currentUser && currentUser.id === userId) {
      setCurrentUser((prev) => (prev ? { ...prev, role: newRole } : null));
    }

    try {
      await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, role: newRole }),
      });
    } catch (e) {
      console.warn('Failed to update role on server:', e);
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setActiveUser(null);
  };

  const isSuperAdmin =
    currentUser?.role === 'super_admin' ||
    currentUser?.email.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase();

  // Enforce access control: Basic admins can ONLY access 'reconciliation' and 'data_sources'
  useEffect(() => {
    if (currentUser && !isSuperAdmin) {
      if (activeTab === 'teammates' || activeTab === 'portal_exams') {
        setActiveTab('reconciliation');
      }
    }
  }, [currentUser, isSuperAdmin, activeTab]);

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-mono text-zinc-400">Loading Scanning Ops...</p>
        </div>
      </div>
    );
  }

  // Not signed in -> Show Clean Google Sign In Screen
  if (!currentUser) {
    return (
      <AuthScreen
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setActiveUser(user);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] text-zinc-200 flex font-sans">
      {/* Sidebar */}
      <Sidebar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSignOut={handleSignOut}
        onOpenAccountModal={
          isSuperAdmin
            ? () => {
                handleRefreshUsers();
                setIsAccountModalOpen(true);
              }
            : undefined
        }
        netDiscrepancy={metrics.netDiscrepancy}
        isSyncing={isSyncing}
      />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen">
        <main className="flex-1 p-6 lg:p-8">
          <ReconciliationDashboard
            matrix={matrix}
            teammates={teammates}
            metrics={metrics}
            portalSlots={portalSlots}
            teamEntries={teamEntries}
            googleSheetUrl={googleSheetUrl}
            onUpdateSheetUrl={handleUpdateSheetUrl}
            onSyncGoogleSheet={handleSyncGoogleSheet}
            onUploadPortalFile={handleUploadPortalFile}
            onUploadTeamSheetFile={handleUploadTeamSheetFile}
            onResetToDemoData={handleClearAllData}
            isSyncing={isSyncing}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            lastSyncedTime={lastSyncedTime}
            sheetNames={sheetNames}
          />
        </main>
      </div>

      {/* Admin User Management Modal - Only for Super Admin */}
      {isSuperAdmin && (
        <UserManagementModal
          isOpen={isAccountModalOpen}
          onClose={() => setIsAccountModalOpen(false)}
          users={users}
          onSaveUser={handleSaveUser}
          onToggleStatus={handleToggleUserStatus}
          onUpdateRole={handleUpdateUserRole}
          onRefreshUsers={handleRefreshUsers}
        />
      )}
    </div>
  );
}
