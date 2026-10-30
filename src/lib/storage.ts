'use client';

import { User, DailyRecord, DepartmentMetrics, RecordStatus } from '../types';
import { INITIAL_USERS, INITIAL_RECORDS } from './mockData';

const USERS_STORAGE_KEY = 'scantrack_users_v1';
const RECORDS_STORAGE_KEY = 'scantrack_records_v1';
const CURRENT_USER_KEY = 'scantrack_active_user_v1';

export function getStoredUsers(): User[] {
  if (typeof window === 'undefined') return INITIAL_USERS;
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return JSON.parse(raw);
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

export function getActiveUser(): User {
  if (typeof window === 'undefined') return INITIAL_USERS[0];
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const user = INITIAL_USERS.find(u => u.id === parsed.id) || parsed;
      return user;
    }
  } catch {}
  return INITIAL_USERS[0]; // Default to Super Admin
}

export function setActiveUser(user: User): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to set active user', e);
  }
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

