import fs from 'fs';
import path from 'path';
import os from 'os';
import { User, PortalExamSlot, TeamSubsheetEntry } from '@/types';
import { SUPER_ADMIN_EMAIL, INITIAL_USERS } from '@/lib/mockData';

// Persistent Cloud Storage Endpoints (Shared across all Vercel Serverless Lambdas and devices)
const USERS_BLOB_URL = 'https://superjsonblob.com/api/jsonBlob/6028245c-08b1-46d7-a46b-e0c36f950259';
const DATA_BLOB_URL = 'https://superjsonblob.com/api/jsonBlob/79fd8b99-4369-4a38-84a0-5d18c592eaa6';

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

// In-memory fallbacks: Clean Slate (Zero Pre-Saved Data)
let inMemoryUsers: User[] = [...INITIAL_USERS];
let inMemoryTeamEntries: TeamSubsheetEntry[] = [];
let inMemoryPortalSlots: PortalExamSlot[] = [];
let inMemorySheetUrl: string = '';
let inMemorySheetNames: string[] = [];

// ==========================================
// 1. Cross-Device Cloud-Synchronized Users
// ==========================================

export async function getServerUsers(): Promise<User[]> {
  try {
    // Attempt to pull latest registered users from shared cloud blob
    const res = await fetch(USERS_BLOB_URL, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3500),
    });

    if (res.ok) {
      const json = await res.json();
      const rawUsers: User[] = Array.isArray(json)
        ? json
        : Array.isArray(json?.users)
        ? json.users
        : [];

      if (rawUsers.length > 0) {
        // Guarantee Super Admin Shaik Ghouse is always present and has role super_admin
        const hasOwner = rawUsers.some(
          (u) => u.email.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase()
        );

        let merged = [...rawUsers];
        if (!hasOwner) {
          merged.unshift(INITIAL_USERS[0]);
        }

        merged = merged.map((u) =>
          u.email.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase()
            ? { ...u, role: 'super_admin' as const }
            : u
        );

        inMemoryUsers = merged;
        saveLocalUsers(merged);
        return merged;
      }
    }
  } catch (err) {
    // Fall back to local disk / in-memory cache if cloud request times out or is offline
  }

  // Fallback to disk or in-memory
  try {
    const filePath = getFilePath('users.json');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed: User[] = JSON.parse(data);
      const hasAdmin = parsed.some(
        (u) => u.email.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase()
      );
      if (!hasAdmin) {
        parsed.unshift(INITIAL_USERS[0]);
      }
      inMemoryUsers = parsed;
      return parsed;
    }
  } catch {}

  return inMemoryUsers;
}

function saveLocalUsers(users: User[]): void {
  try {
    fs.writeFileSync(getFilePath('users.json'), JSON.stringify(users, null, 2), 'utf-8');
  } catch {}
}

async function syncUsersToCloud(users: User[]): Promise<void> {
  try {
    await fetch(USERS_BLOB_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ users }),
      signal: AbortSignal.timeout(4000),
    });
  } catch (err) {
    console.warn('Could not sync users to cloud blob:', err);
  }
}

export async function addServerUser(user: User): Promise<User> {
  const users = await getServerUsers();
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

  inMemoryUsers = updated;
  saveLocalUsers(updated);
  await syncUsersToCloud(updated);

  return index >= 0 ? updated[index] : user;
}

export async function updateServerUser(idOrEmail: string, updates: Partial<User>): Promise<User | null> {
  const users = await getServerUsers();
  const cleanKey = idOrEmail.toLowerCase().trim();
  const index = users.findIndex(
    (u) => u.id === idOrEmail || u.email.toLowerCase().trim() === cleanKey
  );
  if (index === -1) return null;

  const isSuperOwner = users[index].email.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase();
  const finalRole = isSuperOwner ? 'super_admin' : (updates.role || users[index].role);

  const updatedUser: User = {
    ...users[index],
    ...updates,
    role: finalRole,
  };

  users[index] = updatedUser;
  inMemoryUsers = users;
  saveLocalUsers(users);
  await syncUsersToCloud(users);

  return updatedUser;
}

// ==========================================
// 2. Team Subsheet Entries (Clean Slate: 0 by default)
// ==========================================

export async function getServerTeamEntries(): Promise<TeamSubsheetEntry[]> {
  try {
    const res = await fetch(DATA_BLOB_URL, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.teamEntries)) {
        inMemoryTeamEntries = data.teamEntries;
        return inMemoryTeamEntries;
      }
    }
  } catch {}

  try {
    const filePath = getFilePath('team_entries.json');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      inMemoryTeamEntries = JSON.parse(data);
      return inMemoryTeamEntries;
    }
  } catch {}

  return inMemoryTeamEntries;
}

export async function saveServerTeamEntries(entries: TeamSubsheetEntry[]): Promise<void> {
  inMemoryTeamEntries = entries;
  try {
    fs.writeFileSync(getFilePath('team_entries.json'), JSON.stringify(entries, null, 2), 'utf-8');
  } catch {}

  // Sync to cloud data blob
  try {
    const currentData = await fetch(DATA_BLOB_URL, { signal: AbortSignal.timeout(2500) })
      .then((r) => r.json())
      .catch(() => ({}));
    await fetch(DATA_BLOB_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...currentData, teamEntries: entries }),
      signal: AbortSignal.timeout(3500),
    });
  } catch {}
}

// ==========================================
// 3. Portal Exam Slots (Clean Slate: 0 by default)
// ==========================================

export async function getServerPortalSlots(): Promise<PortalExamSlot[]> {
  try {
    const res = await fetch(DATA_BLOB_URL, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.portalSlots)) {
        inMemoryPortalSlots = data.portalSlots;
        return inMemoryPortalSlots;
      }
    }
  } catch {}

  try {
    const filePath = getFilePath('portal_slots.json');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      inMemoryPortalSlots = JSON.parse(data);
      return inMemoryPortalSlots;
    }
  } catch {}

  return inMemoryPortalSlots;
}

export async function saveServerPortalSlots(slots: PortalExamSlot[]): Promise<void> {
  inMemoryPortalSlots = slots;
  try {
    fs.writeFileSync(getFilePath('portal_slots.json'), JSON.stringify(slots, null, 2), 'utf-8');
  } catch {}

  // Sync to cloud data blob
  try {
    const currentData = await fetch(DATA_BLOB_URL, { signal: AbortSignal.timeout(2500) })
      .then((r) => r.json())
      .catch(() => ({}));
    await fetch(DATA_BLOB_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...currentData, portalSlots: slots }),
      signal: AbortSignal.timeout(3500),
    });
  } catch {}
}

// ==========================================
// 4. Google Sheet URL & Sheet Names
// ==========================================

export async function getServerSheetUrl(): Promise<string> {
  try {
    const res = await fetch(DATA_BLOB_URL, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof data?.sheetUrl === 'string') {
        inMemorySheetUrl = data.sheetUrl;
        return inMemorySheetUrl;
      }
    }
  } catch {}

  try {
    const filePath = getFilePath('sheet_url.txt');
    if (fs.existsSync(filePath)) {
      inMemorySheetUrl = fs.readFileSync(filePath, 'utf-8').trim();
      return inMemorySheetUrl;
    }
  } catch {}

  return inMemorySheetUrl;
}

export async function saveServerSheetUrl(url: string): Promise<void> {
  inMemorySheetUrl = url;
  try {
    fs.writeFileSync(getFilePath('sheet_url.txt'), url, 'utf-8');
  } catch {}

  try {
    const currentData = await fetch(DATA_BLOB_URL, { signal: AbortSignal.timeout(2500) })
      .then((r) => r.json())
      .catch(() => ({}));
    await fetch(DATA_BLOB_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...currentData, sheetUrl: url }),
      signal: AbortSignal.timeout(3500),
    });
  } catch {}
}

export async function getServerSheetNames(): Promise<string[]> {
  try {
    const res = await fetch(DATA_BLOB_URL, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.sheetNames)) {
        inMemorySheetNames = data.sheetNames;
        return inMemorySheetNames;
      }
    }
  } catch {}

  try {
    const filePath = getFilePath('sheet_names.json');
    if (fs.existsSync(filePath)) {
      inMemorySheetNames = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return inMemorySheetNames;
    }
  } catch {}

  return inMemorySheetNames;
}

export async function saveServerSheetNames(names: string[]): Promise<void> {
  inMemorySheetNames = names;
  try {
    fs.writeFileSync(getFilePath('sheet_names.json'), JSON.stringify(names, null, 2), 'utf-8');
  } catch {}

  try {
    const currentData = await fetch(DATA_BLOB_URL, { signal: AbortSignal.timeout(2500) })
      .then((r) => r.json())
      .catch(() => ({}));
    await fetch(DATA_BLOB_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...currentData, sheetNames: names }),
      signal: AbortSignal.timeout(3500),
    });
  } catch {}
}
