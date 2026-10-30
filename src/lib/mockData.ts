import { User, DailyRecord } from '../types';

export const SUPER_ADMIN_EMAIL = 'shaikghousem@codetantra.in';

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
