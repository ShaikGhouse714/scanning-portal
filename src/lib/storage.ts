'use client';

import { User, DailyRecord, DepartmentMetrics, RecordStatus } from '../types';
import { INITIAL_USERS, INITIAL_RECORDS, SUPER_ADMIN_EMAIL } from './mockData';

const USERS_STORAGE_KEY = 'scantrack_users_v2';
const RECORDS_STORAGE_KEY = 'scantrack_records_v2';
const CURRENT_USER_KEY = 'scantrack_active_user_v2';

export function getStoredUsers(): User[] {
  if (typeof window === 'undefined') return INITIAL_USERS;
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    const users: User[] = JSON.parse(raw);
    // Ensure Super Admin email is always present and has role super_admin
    const hasAdmin = users.some(u => u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());
    if (!hasAdmin) {
      users.unshift(INITIAL_USERS[0]);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    }
    return users;
  } catch {
    return INITIAL_USERS;
  }
}

export function saveStoredUsers(users: User[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save users', e);
  }
}

export function getStoredRecords(): DailyRecord[] {
  if (typeof window === 'undefined') return INITIAL_RECORDS;
  try {
    const raw = localStorage.getItem(RECORDS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(INITIAL_RECORDS));
      return INITIAL_RECORDS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_RECORDS;
  }
}

export function saveStoredRecords(records: DailyRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save records', e);
  }
}

export function getActiveUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (raw) {
      const parsed: User = JSON.parse(raw);
      const allUsers = getStoredUsers();
      const matched = allUsers.find(u => u.id === parsed.id || u.email.toLowerCase() === parsed.email.toLowerCase());
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

export function registerUser(
  name: string,
  email: string,
  station: string = 'General Scanning Station',
  password?: string
): { success: boolean; user?: User; error?: string } {
  const users = getStoredUsers();
  const cleanEmail = email.trim().toLowerCase();
  
  if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
    return { success: false, error: 'An account with this email address already exists. Please sign in.' };
  }

  const isSuperAdminEmail = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();
  const colors = ['bg-indigo-600', 'bg-emerald-600', 'bg-blue-600', 'bg-purple-600', 'bg-amber-600', 'bg-teal-600'];
  const avatarColor = isSuperAdminEmail ? 'bg-indigo-600' : colors[Math.floor(Math.random() * colors.length)];

  const newUser: User = {
    id: `user_${Date.now()}`,
    name: name.trim(),
    email: email.trim(),
    password: password || 'password123',
    role: isSuperAdminEmail ? 'super_admin' : 'operator',
    station: isSuperAdminEmail ? 'Central Management / HQ' : station.trim(),
    department: 'Scanning Dept',
    avatarColor,
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  const updatedUsers = [...users, newUser];
  saveStoredUsers(updatedUsers);
  return { success: true, user: newUser };
}

export function authenticateUser(email: string): { success: boolean; user?: User; error?: string } {
  const users = getStoredUsers();
  const cleanEmail = email.trim().toLowerCase();
  const matched = users.find(u => u.email.toLowerCase() === cleanEmail);

  if (matched) {
    if (matched.status === 'inactive') {
      return { success: false, error: 'This user account is currently deactivated. Please contact Super Admin.' };
    }
    return { success: true, user: matched };
  }

  // If email matches super admin email but was somehow deleted, restore it
  if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
    const adminUser: User = {
      ...INITIAL_USERS[0],
      email: SUPER_ADMIN_EMAIL,
    };
    saveStoredUsers([adminUser, ...users]);
    return { success: true, user: adminUser };
  }

  return { success: false, error: 'No account found with this email. Please register your account.' };
}

export function computeStatus(received: number, uploaded: number): RecordStatus {
  if (uploaded === received) return 'completed';
  if (uploaded < received) return 'pending_backlog';
  return 'over_uploaded';
}

export function calculateMetrics(records: DailyRecord[]): DepartmentMetrics {
  const totalReceived = records.reduce((acc, r) => acc + (Number(r.receivedCount) || 0), 0);
  const totalUploaded = records.reduce((acc, r) => acc + (Number(r.uploadedCount) || 0), 0);
  const totalPending = records.reduce((acc, r) => acc + Math.max(0, (Number(r.pendingCount) || 0)), 0);
  const discrepancyCount = records.filter(r => r.pendingCount !== 0).length;
  const overallCompletionRate = totalReceived > 0 
    ? Math.min(100, Number(((totalUploaded / totalReceived) * 100).toFixed(1)))
    : 100;

  return {
    totalReceived,
    totalUploaded,
    totalPending,
    overallCompletionRate,
    totalRecords: records.length,
    discrepancyCount,
  };
}

export function exportRecordsToCSV(records: DailyRecord[]): void {
  const headers = [
    'Date',
    'School',
    'Operator',
    'Station',
    'Shift',
    'Received Count',
    'Uploaded Count',
    'Pending Count',
    'Completion %',
    'Status',
    'Notes / Backlog Reason',
  ];

  const rows = records.map(r => [
    `"${r.date}"`,
    `"${(r.school || 'General').replace(/"/g, '""')}"`,
    `"${r.userName.replace(/"/g, '""')}"`,
    `"${r.station.replace(/"/g, '""')}"`,
    `"${r.shift || 'General'}"`,
    r.receivedCount,
    r.uploadedCount,
    r.pendingCount,
    `"${r.completionRate.toFixed(1)}%"`,
    `"${r.status === 'completed' ? '100% Uploaded' : r.status === 'pending_backlog' ? 'Pending Backlog' : 'Over-Uploaded'}"`,
    `"${(r.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `scanning_dept_audit_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function resetDemoData(): { users: User[]; records: DailyRecord[] } {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(INITIAL_RECORDS));
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(INITIAL_USERS[0]));
  }
  return { users: INITIAL_USERS, records: INITIAL_RECORDS };
}
