import { User, TeamSubsheetEntry } from '../types';

export const SUPER_ADMIN_EMAIL = 'shaikghousem@codetantra.in';
export const SUPER_ADMIN_EMAILS = [
  'shaikghousem@codetantra.in',
  'ghousemohiuddin774@gmail.com',
];

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return (
    clean === SUPER_ADMIN_EMAIL.toLowerCase() ||
    SUPER_ADMIN_EMAILS.some((e) => e.toLowerCase() === clean) ||
    clean.includes('shaikghouse') ||
    clean.includes('ghousemohiuddin')
  );
}

export const SCHOOL_CODE_MAP: Record<string, string> = {
  SCE: 'School of Computer Engineering',
  SEE: 'School of Electrical Engineering',
  SOEE: 'School of Electronics Engineering',
  KSCIV: 'School of Civil Engineering',
  KSMAE: 'School of Mechanical Engineering',
  KSOM: 'School of Management',
  KSOL: 'School of Law',
  KINS: 'School of Nursing Science',
  KIMS: 'School of Medical Science',
  KSAP: 'School of Architecture and Planning',
  KSMC: 'School of Mass Communication',
  KSOFT: 'School of Fashion Technology',
  KSMS: 'School of Film and Media Sciences',
  SCA: 'School of Computer Application',
  KSBT: 'School of Bio-Technology & Chemical Engineering',
  KSAS: 'School of Applied Science',
  KSLS: 'School of Liberal Studies',
  KSECO: 'School of Economics and Commerce',
  KSRM: 'School of Rural Management',
  'Sep26-BDS': 'School of Dental Science',
  Dental: 'School of Dental Science',
  ADMIN: 'Central Examination Admin',
};

export function normalizeSchool(input: string): { code: string; name: string } {
  if (!input) return { code: 'GEN', name: 'General Scanning' };
  const trimmed = input.trim();
  const upper = trimmed.toUpperCase();

  // Direct code match
  if (SCHOOL_CODE_MAP[upper]) {
    return { code: upper, name: SCHOOL_CODE_MAP[upper] };
  }

  // Reverse match by name
  for (const [code, name] of Object.entries(SCHOOL_CODE_MAP)) {
    if (
      name.toLowerCase().includes(trimmed.toLowerCase()) ||
      trimmed.toLowerCase().includes(name.toLowerCase()) ||
      trimmed.toLowerCase().includes(code.toLowerCase())
    ) {
      return { code, name };
    }
  }

  return { code: trimmed.substring(0, 6).toUpperCase(), name: trimmed };
}

// Clean initial accounts: ONLY Shaik Ghouse M (Super Admin)
export const INITIAL_USERS: User[] = [
  {
    id: 'user_super_admin',
    name: 'Shaik Ghouse M',
    email: SUPER_ADMIN_EMAIL,
    role: 'super_admin',
    station: 'HQ / Scanning Dept Management',
    department: 'Scanning Dept - Administration',
    avatarColor: 'bg-indigo-600',
    status: 'active',
    createdAt: new Date().toISOString(),
  },
];

// Clean Slate: Zero pre-saved data. Data appears ONLY when user syncs sheet or uploads excel.
export const DEFAULT_PORTAL_CSV = '';

export const DEFAULT_TEAM_ENTRIES: TeamSubsheetEntry[] = [];
