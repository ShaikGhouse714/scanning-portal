import fs from 'fs';
import path from 'path';
import os from 'os';
import { User, PortalExamSlot, TeamSubsheetEntry } from '@/types';
import { SUPER_ADMIN_EMAIL, INITIAL_USERS, DEFAULT_TEAM_ENTRIES, DEFAULT_PORTAL_CSV } from '@/lib/mockData';
import { parsePortalData } from './excelParser';

let cachedDataDir: string | null = null;

function getDataDir(): string {
  if (cachedDataDir) return cachedDataDir;
  const localDir = path.join(process.cwd(), 'data');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
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

function getFilePath(filename: string): string {
  return path.join(getDataDir(), filename);
}

// In-memory singletons
let inMemoryUsers: User[] = [...INITIAL_USERS];
let inMemoryTeamEntries: TeamSubsheetEntry[] = [...DEFAULT_TEAM_ENTRIES];
let inMemoryPortalSlots: PortalExamSlot[] = parsePortalData(DEFAULT_PORTAL_CSV);
let inMemorySheetUrl: string = '';

// 1. Users
export function getServerUsers(): User[] {
  try {
    const filePath = getFilePath('users.json');
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
  } catch {
    return inMemoryUsers;
  }
}

export function saveServerUsers(users: User[]): void {
  inMemoryUsers = users;
  try {
    fs.writeFileSync(getFilePath('users.json'), JSON.stringify(users, null, 2), 'utf-8');
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

// 2. Team Subsheet Entries
export function getServerTeamEntries(): TeamSubsheetEntry[] {
  try {
    const filePath = getFilePath('team_entries.json');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed: TeamSubsheetEntry[] = JSON.parse(data);
      inMemoryTeamEntries = parsed;
      return parsed;
    } else {
      saveServerTeamEntries(DEFAULT_TEAM_ENTRIES);
      return DEFAULT_TEAM_ENTRIES;
    }
  } catch {
    return inMemoryTeamEntries;
  }
}

export function saveServerTeamEntries(entries: TeamSubsheetEntry[]): void {
  inMemoryTeamEntries = entries;
  try {
    fs.writeFileSync(getFilePath('team_entries.json'), JSON.stringify(entries, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error saving team entries:', err);
  }
}

// 3. Portal Slots
export function getServerPortalSlots(): PortalExamSlot[] {
  try {
    const filePath = getFilePath('portal_slots.json');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed: PortalExamSlot[] = JSON.parse(data);
      inMemoryPortalSlots = parsed;
      return parsed;
    } else {
      const initial = parsePortalData(DEFAULT_PORTAL_CSV);
      saveServerPortalSlots(initial);
      return initial;
    }
  } catch {
    return inMemoryPortalSlots;
  }
}

export function saveServerPortalSlots(slots: PortalExamSlot[]): void {
  inMemoryPortalSlots = slots;
  try {
    fs.writeFileSync(getFilePath('portal_slots.json'), JSON.stringify(slots, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error saving portal slots:', err);
  }
}

// 4. Sheet URL
export function getServerSheetUrl(): string {
  try {
    const filePath = getFilePath('sheet_url.txt');
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8').trim();
    }
    return inMemorySheetUrl;
  } catch {
    return inMemorySheetUrl;
  }
}

export function saveServerSheetUrl(url: string): void {
  inMemorySheetUrl = url;
  try {
    fs.writeFileSync(getFilePath('sheet_url.txt'), url, 'utf-8');
  } catch (err) {
    console.warn('Error saving sheet URL:', err);
  }
}
