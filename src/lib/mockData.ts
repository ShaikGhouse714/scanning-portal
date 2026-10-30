import { User, DailyRecord } from '../types';

export const SUPER_ADMIN_EMAIL = 'shaikghousem@codetantra.in';

export const AVAILABLE_SCHOOLS = [
  'School of Applied Science',
  'School of Architecture and Planning',
  'School of Bio-Technology & Chemical Engineering',
  'School of Civil Engineeing',
  'School of Computer Application',
  'School of Computer Engineering',
  'School of Dental Science',
  'School of Design',
  'School of Economics and Commerce',
  'School of Electrical Engineering',
  'School of Electronics Engineering',
  'School of Fashion Technology',
  'School of Film and Media Sciences',
  'School of Mass Communication',
  'School of Law',
  'School of Liberal Studies',
  'School of Managment',
  'School of Mechanical and Aerospace Engneering',
  'School of Medical Science',
  'School of Nursing Science',
  'School of Publich Health',
  'School of Rural Management',
] as const;

export type SchoolName = typeof AVAILABLE_SCHOOLS[number];

export const INITIAL_USERS: User[] = [
  {
    id: 'user_super_admin',
    name: 'Shaik Ghouse M',
    email: SUPER_ADMIN_EMAIL,
    password: 'password123',
    role: 'super_admin',
    station: 'HQ / Scanning Dept Management',
    department: 'Scanning Dept - Administration',
    avatarColor: 'bg-indigo-600',
    status: 'active',
    createdAt: new Date().toISOString(),
  },
];

// Clean start: zero dummy records
export const INITIAL_RECORDS: DailyRecord[] = [];
