export type UserRole = 'super_admin' | 'operator';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  station: string;
  department: string;
  avatarColor: string;
  status: 'active' | 'inactive';
}

export type RecordStatus = 'completed' | 'pending_backlog' | 'over_uploaded';

export interface DailyRecord {
  id: string;
  date: string; // YYYY-MM-DD
  userId: string;
  userName: string;
  station: string;
  receivedCount: number;
  uploadedCount: number;
  pendingCount: number; // receivedCount - uploadedCount
  completionRate: number; // (uploadedCount / receivedCount) * 100
  status: RecordStatus;
  notes?: string;
  shift?: 'Morning' | 'Afternoon' | 'Night' | 'Full Day';
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentMetrics {
  totalReceived: number;
  totalUploaded: number;
  totalPending: number;
  overallCompletionRate: number;
  totalRecords: number;
  discrepancyCount: number;
}

