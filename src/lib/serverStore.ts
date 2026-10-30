import fs from 'fs';
import path from 'path';
import os from 'os';
import { User, DailyRecord, RecordStatus } from '@/types';
import { SUPER_ADMIN_EMAIL, INITIAL_USERS } from '@/lib/mockData';

let cachedDataDir: string | null = null;

function getDataDir(): string {
  if (cachedDataDir) return cachedDataDir;
  const localDir = path.join(process.cwd(), 'data');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    // Test write permission
    const testFile = path.join(localDir, '.write-test');
    fs.writeFileSync(testFile, 'ok', 'utf-8');
    fs.unlinkSync(testFile);
    cachedDataDir = localDir;
    return localDir;
  } catch {
    const tmpDir = path.join(os.tmpdir(), 'scantrack_data');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    cachedDataDir = tmpDir;
    return tmpDir;
  }
}

function getUsersFilePath(): string {
  return path.join(getDataDir(), 'users.json');
}

function getRecordsFilePath(): string {
  return path.join(getDataDir(), 'records.json');
}

// In-memory fallback singleton
let inMemoryUsers: User[] = [...INITIAL_USERS];
let inMemoryRecords: DailyRecord[] = [];

export function computeServerStatus(received: number, uploaded: number): RecordStatus {
  if (uploaded === received) return 'completed';
  if (uploaded < received) return 'pending_backlog';
  return 'over_uploaded';
}

export function getServerUsers(): User[] {
  try {
    const filePath = getUsersFilePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed: User[] = JSON.parse(data);
      const hasAdmin = parsed.some(
        (u) => u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
      );
      if (!hasAdmin) {
        parsed.unshift(INITIAL_USERS[0]);
        saveServerUsers(parsed);
      }
      inMemoryUsers = parsed;
      return parsed;
    } else {
      saveServerUsers(INITIAL_USERS);
      return INITIAL_USERS;
    }
  } catch (err) {
    console.warn('Error reading users file, using memory store:', err);
    return inMemoryUsers;
  }
}

export function saveServerUsers(users: User[]): void {
  inMemoryUsers = users;
  try {
    const filePath = getUsersFilePath();
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error saving users file:', err);
  }
}

export function addServerUser(user: User): User {
  const users = getServerUsers();
  const cleanEmail = user.email.toLowerCase().trim();
  const index = users.findIndex((u) => u.email.toLowerCase().trim() === cleanEmail);
  let updated: User[];
  if (index >= 0) {
    updated = [...users];
    // Keep admin role protected
    const role = users[index].role === 'super_admin' ? 'super_admin' : user.role;
    updated[index] = {
      ...updated[index],
      ...user,
      role,
    };
  } else {
    updated = [user, ...users];
  }
  saveServerUsers(updated);
  return index >= 0 ? updated[index] : user;
}

export function getServerRecords(): DailyRecord[] {
  try {
    const filePath = getRecordsFilePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed: DailyRecord[] = JSON.parse(data);
      inMemoryRecords = parsed;
      return parsed;
    } else {
      saveServerRecords([]);
      return [];
    }
  } catch (err) {
    console.warn('Error reading records file, using memory store:', err);
    return inMemoryRecords;
  }
}

export function saveServerRecords(records: DailyRecord[]): void {
  inMemoryRecords = records;
  try {
    const filePath = getRecordsFilePath();
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error saving records file:', err);
  }
}

export function saveOrUpdateServerRecord(record: DailyRecord): DailyRecord {
  const records = getServerRecords();
  const index = records.findIndex(
    (r) =>
      r.id === record.id ||
      (r.userId === record.userId && r.date === record.date && r.school === record.school)
  );
  let updated: DailyRecord[];
  if (index >= 0) {
    updated = [...records];
    updated[index] = {
      ...records[index],
      ...record,
      updatedAt: new Date().toISOString(),
    };
  } else {
    updated = [record, ...records];
  }
  saveServerRecords(updated);
  return index >= 0 ? updated[index] : record;
}

export function deleteServerRecord(id: string): void {
  const records = getServerRecords();
  const updated = records.filter((r) => r.id !== id);
  saveServerRecords(updated);
}
