export interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'operator';
  station?: string;
  department: string;
  avatarColor: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface PortalExamSlot {
  scheduleId: string;
  name: string;
  groups: string;
  scheduleTime: string;
  examCycle: string;
  schoolCode: string;
  schoolName: string;
  courseCode: string;
  courseTitle: string;
  semester: string;
  programme: string;
  completed: number;
  started: number;
  notStarted: number;
  date: string;
}

export interface TeamSubsheetEntry {
  id: string;
  teammateName: string;
  date: string;
  school: string;
  schoolCode: string;
  receivedCount: number;
  scannedCount: number;
  shift?: string;
  notes?: string;
}

export interface ReconciledDateSchool {
  key: string; // date_schoolCode
  date: string;
  schoolCode: string;
  schoolName: string;
  teamReceived: number;
  portalCompleted: number;
  discrepancy: number; // teamReceived - portalCompleted (Discrepancy between Physical Received & Portal Completed)
  teamScanned: number; // backward compatibility
  discrepancyScannedVsPortal: number; // backward compatibility
  discrepancyReceivedVsScanned: number; // backward compatibility
  status: 'matched' | 'portal_backlog' | 'portal_exceeds' | 'pending_scan' | 'portal_only' | 'team_only';
  teammates: string[];
  portalSlotsCount: number;
  portalSlots: PortalExamSlot[];
  teamEntries: TeamSubsheetEntry[];
}

export interface TeammateSummary {
  name: string;
  totalReceived: number;
  totalScanned: number;
  schoolsCovered: string[];
  datesActive: string[];
  entriesCount: number;
  entries: TeamSubsheetEntry[];
}

export interface ReconciliationMetrics {
  totalTeamReceived: number;
  totalPortalCompleted: number;
  netDiscrepancy: number; // totalTeamReceived - totalPortalCompleted
  matchedBatchesCount: number;
  discrepancyBatchesCount: number;
  totalTeammatesCount: number;
  totalSchoolsCount: number;
  totalDatesCount: number;
  totalTeamScanned: number; // backward compatibility
}
