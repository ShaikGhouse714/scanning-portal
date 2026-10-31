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
  getLastSyncTime,
  setLastSyncTime,
  createAccountByAdmin,
} from '../lib/storage';
import {
  parsePortalData,
  parseTeamGoogleSheet,
  reconcileIntakeVsPortal,
} from '../lib/excelParser';
import {
  DEFAULT_TEAM_ENTRIES,
  DEFAULT_PORTAL_CSV,
  INITIAL_USERS,
} from '../lib/mockData';
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

  // Core Data Stores
  const [teamEntries, setTeamEntries] = useState<TeamSubsheetEntry[]>([]);
  const [portalSlots, setPortalSlots] = useState<PortalExamSlot[]>([]);
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>('');
  const [lastSyncedTime, setLastSyncedTimeState] = useState<string>('Ready to sync');

  // Initialize data on mount
  useEffect(() => {
    setIsClient(true);
    const active = getActiveUser();
    const storedUsers = getStoredUsers();
    const storedTeam = getStoredTeamEntries();
    const storedPortal = getStoredPortalSlots();
    const storedUrl = getStoredSheetUrl();
    const lastTime = getLastSyncTime();

    setCurrentUser(active);
    setUsers(storedUsers);
    setTeamEntries(storedTeam);
    setPortalSlots(storedPortal);
    setGoogleSheetUrl(storedUrl);
    setLastSyncedTimeState(lastTime);

    // Initial server fetch to sync across devices
    (async () => {
      try {
        const [teamRes, portalRes, userRes] = await Promise.all([
          fetch('/api/team-entries', { cache: 'no-store' }),
          fetch('/api/portal-slots', { cache: 'no-store' }),
          fetch('/api/users', { cache: 'no-store' }),
        ]);

        if (teamRes.ok) {
          const tJson = await teamRes.json();
          if (Array.isArray(tJson.data) && tJson.data.length > 0) {
            setTeamEntries(tJson.data);
            saveStoredTeamEntries(tJson.data);
          }
          if (tJson.sheetUrl) {
            setGoogleSheetUrl(tJson.sheetUrl);
            saveStoredSheetUrl(tJson.sheetUrl);
          }
        }

        if (portalRes.ok) {
          const pJson = await portalRes.json();
          if (Array.isArray(pJson.data) && pJson.data.length > 0) {
            setPortalSlots(pJson.data);
            saveStoredPortalSlots(pJson.data);
          }
        }

        if (userRes.ok) {
          const uJson = await userRes.json();
          if (Array.isArray(uJson.data) && uJson.data.length > 0) {
            setUsers(uJson.data);
            saveStoredUsers(uJson.data);
          }
        }
      } catch (e) {
        console.warn('Initial server sync using local store:', e);
      }
    })();
  }, []);

  // Compute live reconciliation
  const { matrix, teammates, metrics } = useMemo(() => {
    return reconcileIntakeVsPortal(teamEntries, portalSlots);
  }, [teamEntries, portalSlots]);

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
      setTeamEntries(newEntries);
      saveStoredTeamEntries(newEntries);

      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const timeMsg = `Synced at ${nowStr}`;
      setLastSyncedTimeState(timeMsg);
      setLastSyncTime(timeMsg);

      // Save to server store
      await fetch('/api/team-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: newEntries, sheetUrl: googleSheetUrl }),
      });

      alert(
        `Google Sheet synchronized successfully! Loaded ${json.sheetNames?.length || 0} teammate subsheet(s) and ${newEntries.length} entries.`
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

      alert(
        `Portal file uploaded! Successfully extracted ${parsedSlots.length} exam slots.`
      );
    } catch (e) {
      console.error('Failed to parse portal file:', e);
      alert('Error parsing portal file: ' + String(e));
    }
  };

  // Upload Team Google Sheet File directly (.xlsx)
  const handleUploadTeamSheetFile = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const { teammateEntries, sheetNames } = parseTeamGoogleSheet(arrayBuffer);

      if (teammateEntries.length === 0) {
        alert(
          'No valid subsheet rows found. Ensure each tab has columns like Date, School, Received, Scanned.'
        );
        return;
      }

      setTeamEntries(teammateEntries);
      saveStoredTeamEntries(teammateEntries);

      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const timeMsg = `Uploaded at ${nowStr}`;
      setLastSyncedTimeState(timeMsg);
      setLastSyncTime(timeMsg);

      // Sync to server
      await fetch('/api/team-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: teammateEntries }),
      });

      alert(
        `Team sheet uploaded! Loaded ${sheetNames.length} teammate subsheet(s) (${sheetNames.join(', ')}) with ${teammateEntries.length} total entries.`
      );
    } catch (e) {
      console.error('Failed to parse team sheet:', e);
      alert('Error parsing team sheet: ' + String(e));
    }
  };

  // Reset to reference Demo Data
  const handleResetToDemoData = () => {
    const demoPortal = parsePortalData(DEFAULT_PORTAL_CSV);
    const demoTeam = [...DEFAULT_TEAM_ENTRIES];

    setPortalSlots(demoPortal);
    saveStoredPortalSlots(demoPortal);

    setTeamEntries(demoTeam);
    saveStoredTeamEntries(demoTeam);

    setLastSyncedTimeState('Loaded Demo Data');
    setLastSyncTime('Loaded Demo Data');

    fetch('/api/portal-slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slots: demoPortal }),
    }).catch(() => {});

    fetch('/api/team-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: demoTeam }),
    }).catch(() => {});

    alert('Loaded reference portal exam slots and sample team subsheets!');
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

  const handleSignOut = () => {
    setCurrentUser(null);
    setActiveUser(null);
  };

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07090E]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-mono text-slate-400">Loading ScanTrack Reconciler...</p>
        </div>
      </div>
    );
  }

  // Not signed in -> Show Admin Auth Screen
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
    <div className="min-h-screen bg-[#07090E] text-slate-200 flex font-sans">
      {/* Sidebar */}
      <Sidebar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSignOut={handleSignOut}
        onOpenAccountModal={() => setIsAccountModalOpen(true)}
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
            onResetToDemoData={handleResetToDemoData}
            isSyncing={isSyncing}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            lastSyncedTime={lastSyncedTime}
          />
        </main>
      </div>

      {/* Admin User Management Modal */}
      <UserManagementModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        users={users}
        onSaveUser={handleSaveUser}
        onToggleStatus={handleToggleUserStatus}
      />
    </div>
  );
}
