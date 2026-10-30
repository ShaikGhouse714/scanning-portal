import fs from 'fs';
import path from 'path';
import { User, DailyRecord } from '../types';
import { SUPER_ADMIN_EMAIL, INITIAL_USERS } from './mockData';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');

// In-memory fallback in case of read-only environments
let inMemoryUsers: User[] = [...INITIAL_USERS];
let inMemoryRecords: DailyRecord[] = [];

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('Could not create data dir:', err);
  }
}

export function getServerUsers(): User[] {
  ensureDataDir();
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed: User[] = JSON.parse(data);
      // Ensure Shaik Ghouse is always present as Super Admin
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
    console.warn('Error reading users file, falling back to memory store:', err);
    return inMemoryUsers;
  }
}

export function saveServerUsers(users: User[]): void {
  ensureDataDir();
  inMemoryUsers = users;
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error saving users file:', err);
  }
}

export function addServerUser(user: User): User {
  const users = getServerUsers();
  const cleanEmail = user.email.toLowerCase().trim();
  const existing = users.find((u) => u.email.toLowerCase().trim() === cleanEmail);
  if (existing) {
    return existing;
  }
  const updated = [user, ...users];
  saveServerUsers(updated);
  return user;
}

export function getServerRecords(): DailyRecord[] {
  ensureDataDir();
  try {
    if (fs.existsSync(RECORDS_FILE)) {
      const data = fs.readFileSync(RECORDS_FILE, 'utf-8');
      const parsed: DailyRecord[] = JSON.parse(data);
      inMemoryRecords = parsed;
      return parsed;
    } else {
      saveServerRecords([]);
      return [];
    }
  } catch (err) {
    console.warn('Error reading records file, falling back to memory store:', err);
    return inMemoryRecords;
  }
}

export function saveServerRecords(records: DailyRecord[]): void {
  ensureDataDir();
  inMemoryRecords = records;
  try {
    fs.writeFileSync(RECORDS_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error saving records file:', err);
  }
}

export function saveOrUpdateServerRecord(record: DailyRecord): DailyRecord {
  const records = getServerRecords();
  const index = records.findIndex((r) => r.id === record.id);
  let updated: DailyRecord[];
  if (index >= 0) {
    updated = [...records];
    updated[index] = record;
  } else {
    updated = [record, ...records];
  }
  saveServerRecords(updated);
  return record;
}

export function deleteServerRecord(id: string): void {
  const records = getServerRecords();
  const updated = records.filter((r) => r.id !== id);
  saveServerRecords(updated);
}
