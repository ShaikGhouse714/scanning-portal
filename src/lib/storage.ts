'use client';

import {
  User,
  PortalExamSlot,
  TeamSubsheetEntry,
  ReconciledDateSchool,
} from '../types';
import {
  INITIAL_USERS,
  SUPER_ADMIN_EMAIL,
  DEFAULT_TEAM_ENTRIES,
  DEFAULT_PORTAL_CSV,
} from './mockData';
import { parsePortalData } from './excelParser';

// Storage keys bumped to v4 to guarantee complete clean slate (no pre-saved mock data)
const USERS_STORAGE_KEY = 'scantrack_users_v4';
const CURRENT_USER_KEY = 'scantrack_active_user_v4';
const TEAM_ENTRIES_KEY = 'scantrack_team_entries_v4';
const PORTAL_SLOTS_KEY = 'scantrack_portal_slots_v4';
const GOOGLE_SHEET_URL_KEY = 'scantrack_sheet_url_v4';
const SHEET_NAMES_KEY = 'scantrack_sheet_names_v4';
const LAST_SYNCED_KEY = 'scantrack_last_synced_v4';

// 1. User Management (Only Admin Shaik Ghouse + registered accounts)
export function getStoredUsers(): User[] {
  if (typeof window === 'undefined') return INITIAL_USERS;
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    const users: User[] = JSON.parse(raw);
    if (!Array.isArray(users) || users.length === 0) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }

    // Filter out old legacy mock users (like mock operators from older versions)
    // Only genuine accounts and Shaik Ghouse M are kept
    const legacyMockIds = new Set(['user_tester_1', 'user_tester_2', 'user_tester_3', 'user_admin_2']);
    const filtered = users.filter((u) => !legacyMockIds.has(u.id));

    const hasAdmin = filtered.some(
      (u) => u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
    );
    if (!hasAdmin) {
      filtered.unshift(INITIAL_USERS[0]);
    }

    // Ensure Shaik Ghouse is always super_admin
    const normalized = filtered.map((u) =>
      u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
        ? { ...u, role: 'super_admin' as const }
        : u
    );

    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return INITIAL_USERS;
  }
}

export function saveStoredUsers(users: User[]): void {
  if (typeof window === 'undefined') return;
  try {
    // Ensure Super Admin is always present
    const hasAdmin = users.some(
      (u) => u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
    );
    const toSave = hasAdmin ? users : [INITIAL_USERS[0], ...users];
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error('Failed to save users', e);
  }
}

export function getActiveUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (raw) {
      const parsed: User = JSON.parse(raw);
      const allUsers = getStoredUsers();
      const matched = allUsers.find(
        (u) =>
          u.id === parsed.id || u.email.toLowerCase() === parsed.email.toLowerCase()
      );
      return matched || parsed;
    }
  } catch {}
  return null;
}

export function setActiveUser(user: User | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (e) {
    console.error('Failed to set active user', e);
  }
}

// Admin adding team accounts from their side
export function createAccountByAdmin(
  name: string,
  email: string,
  role: 'super_admin' | 'admin' = 'admin',
  station: string = 'Partner Station'
): { success: boolean; user?: User; error?: string } {
  const users = getStoredUsers();
  const cleanEmail = email.trim().toLowerCase();

  if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
    return { success: false, error: 'An account with this email already exists.' };
  }

  const newUser: User = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    email: cleanEmail,
    role,
    station: station.trim() || 'Partner Station',
    department: 'Scanning Dept',
    avatarColor: role === 'super_admin' ? 'bg-cyan-600' : 'bg-indigo-600',
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  const updated = [...users, newUser];
  saveStoredUsers(updated);
  return { success: true, user: newUser };
}

// 2. Team Subsheet Entries Storage (Clean Slate: Empty by default)
export function getStoredTeamEntries(): TeamSubsheetEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TEAM_ENTRIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredTeamEntries(entries: TeamSubsheetEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TEAM_ENTRIES_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error('Failed to save team entries', e);
  }
}

// 3. Portal Exam Slots Storage (Clean Slate: Empty by default)
export function getStoredPortalSlots(): PortalExamSlot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PORTAL_SLOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredPortalSlots(slots: PortalExamSlot[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PORTAL_SLOTS_KEY, JSON.stringify(slots));
  } catch (e) {
    console.error('Failed to save portal slots', e);
  }
}

// 4. Saved Google Sheet URL & Subsheet Names (Clean Slate: Empty by default)
export function getStoredSheetUrl(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(GOOGLE_SHEET_URL_KEY) || '';
}

export function saveStoredSheetUrl(url: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GOOGLE_SHEET_URL_KEY, url);
}

export function getStoredSheetNames(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SHEET_NAMES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredSheetNames(names: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SHEET_NAMES_KEY, JSON.stringify(names));
  } catch (e) {
    console.error('Failed to save sheet names', e);
  }
}

// 5. Last Sync Timestamp
export function getLastSyncTime(): string {
  if (typeof window === 'undefined') return 'Ready to sync';
  return localStorage.getItem(LAST_SYNCED_KEY) || 'Ready to sync';
}

export function setLastSyncTime(timeStr: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_SYNCED_KEY, timeStr);
}

// 6. Export Reconciled Data to CSV
export function exportReconciliationToCSV(
  matrix: ReconciledDateSchool[],
  fileName: string = 'ScanTrack_Reconciliation_Audit.csv'
) {
  const headers = [
    'Date',
    'School Code',
    'School Name',
    'Physical Received by Team',
    'Portal Completed Count',
    'Variance (Received - Portal)',
    'Status',
    'Teammates Involved',
    'Portal Exam Slots Count',
  ];

  const rows = matrix.map((m) => [
    m.date,
    m.schoolCode,
    `"${(m.schoolName || '').replace(/"/g, '""')}"`,
    m.teamReceived,
    m.portalCompleted,
    m.discrepancy,
    m.status.toUpperCase(),
    `"${m.teammates.join(', ')}"`,
    m.portalSlotsCount,
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportPortalSlotsToCSV(
  slots: PortalExamSlot[],
  fileName: string = 'Portal_Exam_Schedules.csv'
) {
  const headers = [
    'Schedule ID',
    'Date',
    'School Code',
    'School Name',
    'Course Code',
    'Course Title',
    'Programme',
    'Semester',
    'Completed',
    'Not Started',
    'Status',
  ];

  const rows = slots.map((s) => [
    s.scheduleId,
    s.date,
    s.schoolCode,
    `"${(s.schoolName || '').replace(/"/g, '""')}"`,
    s.courseCode,
    `"${(s.courseTitle || '').replace(/"/g, '""')}"`,
    `"${(s.programme || '').replace(/"/g, '""')}"`,
    s.semester || '',
    s.completed,
    s.notStarted,
    Number(s.completed) === 0 ? 'NOT SCANNED YET' : 'SCANNED',
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
