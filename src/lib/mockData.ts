import { User } from '../types';

export const SUPER_ADMIN_EMAIL = 'shaikghousem@codetantra.in';

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

// Reference Portal Data provided by the user
export const DEFAULT_PORTAL_CSV = `Schedule Id,Name,Groups,Schedule Time,ExamCycle,SchoolCode,CourseCode,CourseTitle,Semester,Programme,Completed,Started,Not Started,Actions
4295,SEP26_KIMS_MBBS_2nd Professional_Pathology-I,Sep26_KIMS_MBBS_2nd_Professional,Start Time2026-09-01 10:30End Time2026-09-01 12:30Entry Stop Time2026-09-01 12:30Duration120 minutes,SEP26,KIMS,-,Pathology-I,2nd Professional,MBBS,242,0,8,ResultsConfigure Results VisibilityAssign Evaluators
4296,SEP26_KIMS_MBBS_2nd Professional_Pathology-II,Sep26_KIMS_MBBS_2nd_Professional,Start Time2026-09-03 10:30End Time2026-09-03 12:30Entry Stop Time2026-09-03 12:30Duration120 minutes,SEP26,KIMS,-,Pathology-II,2nd Professional,MBBS,242,0,8,ResultsConfigure Results VisibilityAssign Evaluators
3874,CS30001: Design and Analysis of Algorithms [SEP26_MIDSEM_SCE_SEM5],SCE_CS30001_2026-09-07_09:30_santwana.sagnikafcs@kiit.ac.in,Start Time2026-09-07 09:30End Time2026-09-07 11:00Entry Stop Time2026-09-07 11:00Duration90 minutes,SEP26_MIDSEM,SCE,CS30001,Design and Analysis of Algorithms,Sem5,B.Tech,137,0,3,ResultsConfigure Results VisibilityAssign Evaluators
3875,CS30001: Design and Analysis of Algorithms [SEP26_MIDSEM_SCE_SEM5],SCE_CS30001_2026-09-07_09:30_shaswati.patrafcs@kiit.ac.in,Start Time2026-09-07 09:30End Time2026-09-07 11:00Entry Stop Time2026-09-07 11:00Duration90 minutes,SEP26_MIDSEM,SCE,CS30001,Design and Analysis of Algorithms,Sem5,B.Tech,133,0,6,ResultsConfigure Results VisibilityAssign Evaluators
3876,CS30001: Design and Analysis of Algorithms [SEP26_MIDSEM_SCE_SEM5],SCE_CS30001_2026-09-07_09:30_ajay.anandfcs@kiit.ac.in,Start Time2026-09-07 09:30End Time2026-09-07 11:00Entry Stop Time2026-09-07 11:00Duration90 minutes,SEP26_MIDSEM,SCE,CS30001,Design and Analysis of Algorithms,Sem5,B.Tech,66,0,0,ResultsConfigure Results VisibilityAssign Evaluators
3877,CS30001: Design and Analysis of Algorithms [SEP26_MIDSEM_SCE_SEM5],SCE_CS30001_2026-09-07_09:30_bsahoofcs@kiit.ac.in,Start Time2026-09-07 09:30End Time2026-09-07 11:00Entry Stop Time2026-09-07 11:00Duration90 minutes,SEP26_MIDSEM,SCE,CS30001,Design and Analysis of Algorithms,Sem5,B.Tech,136,0,4,ResultsConfigure Results VisibilityAssign Evaluators
3878,CS30001: Design and Analysis of Algorithms [SEP26_MIDSEM_SCE_SEM5],SCE_CS30001_2026-09-07_09:30_parthasarathi.paulfcs@kiit.ac.in,Start Time2026-09-07 09:30End Time2026-09-07 11:00Entry Stop Time2026-09-07 11:00Duration90 minutes,SEP26_MIDSEM,SCE,CS30001,Design and Analysis of Algorithms,Sem5,B.Tech,62,0,1,ResultsConfigure Results VisibilityAssign Evaluators
3879,CS30001: Design and Analysis of Algorithms [SEP26_MIDSEM_SCE_SEM5],SCE_CS30001_2026-09-07_09:30_pratyusa.mukherjeefcs@kiit.ac.in,Start Time2026-09-07 09:30End Time2026-09-07 11:00Entry Stop Time2026-09-07 11:00Duration90 minutes,SEP26_MIDSEM,SCE,CS30001,Design and Analysis of Algorithms,Sem5,B.Tech,139,0,0,ResultsConfigure Results VisibilityAssign Evaluators
3880,CS30001: Design and Analysis of Algorithms [SEP26_MIDSEM_SCE_SEM5],SCE_CS30001_2026-09-07_09:30_pkandulafcs@kiit.ac.in,Start Time2026-09-07 09:30End Time2026-09-07 11:00Entry Stop Time2026-09-07 11:00Duration90 minutes,SEP26_MIDSEM,SCE,CS30001,Design and Analysis of Algorithms,Sem5,B.Tech,117,0,0,ResultsConfigure Results VisibilityAssign Evaluators
4198,EE31001: Transmission and Distribution of Electric Power [SEP26_MIDSEM_SEE_SEM5],SEE_EE31001_2026-09-07_09:30_ssamalfel@kiit.ac.in,Start Time2026-09-07 09:30End Time2026-09-07 11:00Entry Stop Time2026-09-07 11:00Duration90 minutes,SEP26_MIDSEM,SEE,EE31001,Transmission and Distribution of Electric Power,Sem5,B. Tech. in Electrical Engg.,35,0,2,ResultsConfigure Results VisibilityAssign Evaluators
4199,EE31001: Transmission and Distribution of Electric Power [SEP26_MIDSEM_SEE_SEM5],SEE_EE31001_2026-09-07_09:30_sghatakfel@kiit.ac.in,Start Time2026-09-07 09:30End Time2026-09-07 11:00Entry Stop Time2026-09-07 11:00Duration90 minutes,SEP26_MIDSEM,SEE,EE31001,Transmission and Distribution of Electric Power,Sem5,B. Tech. in Electrical Engg.,39,0,2,ResultsConfigure Results VisibilityAssign Evaluators
4375,CE30001: CONCRETE STRUCTURE DESIGN [SEP26_MIDSEM_KSCIV_SEM5],KSCIV_CE30001_2026-09-07_09:30_nmoharanafce@kiit.ac.in,Start Time2026-09-07 09:30End Time2026-09-07 11:00Entry Stop Time2026-09-07 11:00Duration90 minutes,SEP26_MIDSEM,KSCIV,CE30001,CONCRETE STRUCTURE DESIGN,Sem5,BTECH,48,0,4,ResultsConfigure Results VisibilityAssign Evaluators
4460,ME30003: Heat Transfer [SEP26_MIDSEM_KSMAE_SEM5],KSMAE_ME30003_2026-09-07_09:30_sknayakfme@kiit.ac.in,Start Time2026-09-07 09:30End Time2026-09-07 11:00Entry Stop Time2026-09-07 11:00Duration90 minutes,SEP26_MIDSEM,KSMAE,ME30003,Heat Transfer,Sem5,B.Tech. (Mechanical),47,0,5,ResultsConfigure Results VisibilityAssign Evaluators
3651,BM60101: OB [SEP26_MIDSEM_KSOM_SEM1],BM60101_2026-09-07_09:30_ipseeta@ksom.ac.in,Start Time2026-09-07 09:30End Time2026-09-07 12:30Entry Stop Time2026-09-07 12:30Duration90 minutes,SEP26_MIDSEM,KSOM,BM60101,OB,Sem1,MBA,340,0,7,ResultsConfigure Results VisibilityAssign Evaluators
4567,CS30001: Design and Analysis of Algorithms [SEP26_MIDSEM_SOEE_SEM5],SOEE_CS30001_2026-09-07_09:30_proshikshya.mukherjee@kiit.ac.in,Start Time2026-09-07 09:30End Time2026-09-07 12:30Entry Stop Time2026-09-07 12:30Duration90 minutes,SEP26_MIDSEM,SOEE,CS30001,Design and Analysis of Algorithms,Sem5,B.Tech,123,0,3,ResultsConfigure Results VisibilityAssign Evaluators
4319,LW11001: English - 1 [SEP26_MIDSEM_KSOL_SEM1],KSOL_LW11001_2026-09-07_10:00_sudeshna.chaudhurifhu@kiit.ac.in,Start Time2026-09-07 10:00End Time2026-09-07 11:30Entry Stop Time2026-09-07 11:30Duration60 minutes,SEP26_MIDSEM,KSOL,LW11001,English - 1,Sem1,B.A.LL.B.,113,0,0,ResultsConfigure Results VisibilityAssign Evaluators
4959,HE71001: Law and Ethics in Public Healthcare [SEP26_MIDSEM_KINS_SEM3],KINS_HE71001_2026-09-07_10:00_pratap.jenafph@kiit.ac.in,Start Time2026-09-07 10:00End Time2026-09-07 13:00Entry Stop Time2026-09-07 13:00Duration120 minutes,SEP26_MIDSEM,KINS,HE71001,Law and Ethics in Public Healthcare,Sem3,Master of Public health,11,0,1,ResultsConfigure Results VisibilityAssign Evaluators
3914,HS30101: Engineering Economics [SEP26_MIDSEM_SCE_SEM5],SCE_HS30101_2026-09-08_09:30_smrutirekha.mohantyfhu@kiit.ac.in,Start Time2026-09-08 09:30End Time2026-09-08 11:00Entry Stop Time2026-09-08 11:00Duration90 minutes,SEP26_MIDSEM,SCE,HS30101,Engineering Economics,Sem5,B.Tech,206,0,3,ResultsConfigure Results VisibilityAssign Evaluators
3915,HS30101: Engineering Economics [SEP26_MIDSEM_SCE_SEM5],SCE_HS30101_2026-09-08_09:30_gayatri.nayakfcm@kiit.ac.in,Start Time2026-09-08 09:30End Time2026-09-08 11:00Entry Stop Time2026-09-08 11:00Duration90 minutes,SEP26_MIDSEM,SCE,HS30101,Engineering Economics,Sem5,B.Tech,333,0,5,ResultsConfigure Results VisibilityAssign Evaluators
3926,CS31001: Software Engineering [SEP26_MIDSEM_SCE_SEM5],SCE_CS31001_2026-09-09_09:30_sswainfcs@kiit.ac.in,Start Time2026-09-09 09:30End Time2026-09-09 11:00Entry Stop Time2026-09-09 11:00Duration90 minutes,SEP26_MIDSEM,SCE,CS31001,Software Engineering,Sem5,B.Tech,140,0,1,ResultsConfigure Results VisibilityAssign Evaluators
3963,CS30003: Computer Networks [SEP26_MIDSEM_SCE_SEM5],SCE_CS30003_2026-09-10_09:30_sushruta.mishrafcs@kiit.ac.in,Start Time2026-09-10 09:30End Time2026-09-10 11:00Entry Stop Time2026-09-10 11:00Duration90 minutes,SEP26_MIDSEM,SCE,CS30003,Computer Networks,Sem5,B.Tech,135,0,4,ResultsConfigure Results VisibilityAssign Evaluators
3997,CS30005: High Performance Computing [SEP26_MIDSEM_SCE_SEM5],SCE_CS30005_2026-09-11_09:30_sbidisha688@gmail.com,Start Time2026-09-11 09:30End Time2026-09-11 11:00Entry Stop Time2026-09-11 11:00Duration90 minutes,SEP26_MIDSEM,SCE,CS30005,High Performance Computing,Sem5,B.Tech,132,0,6,ResultsConfigure Results VisibilityAssign Evaluators
4042,CS30011: Computational Intelligence [SEP26_MIDSEM_SCE_SEM5],SCE_CS30011_2026-09-12_09:30_debanjan.pathakfcs@kiit.ac.in,Start Time2026-09-12 09:30End Time2026-09-12 11:00Entry Stop Time2026-09-12 11:00Duration90 minutes,SEP26_MIDSEM,SCE,CS30011,Computational Intelligence,Sem5,B.Tech,123,0,11,ResultsConfigure Results VisibilityAssign Evaluators
5234,RM5451: Rural Production and Livelihood [SEP26_MIDSEM_KSRM_SEM1],KSRM_RM5451_2026-09-16_10:30_srilata@ksrm.ac.in,Start Time2026-09-16 10:30End Time2026-09-16 12:00Entry Stop Time2026-09-16 12:00Duration60 minutes,SEP26_MIDSEM,KSRM,RM5451,Rural Production and Livelihood,Sem1,MBA (Agribusiness Management),62,0,1,ResultsConfigure Results VisibilityAssign Evaluators
5293,BIOC135: Applied Biochemistry [SEP26_ENDSEM_KINS_SEM2],KINS_BIOC135_2026-09-21_10:00_sumit.jhajharia@kims.ac.in,Start Time2026-09-21 10:00End Time2026-09-21 12:00Entry Stop Time2026-09-21 12:00Duration180 minutes,SEP26_ENDSEM,KINS,BIOC135,Applied Biochemistry,Sem2,B.Sc. Nursing,50,0,0,ResultsConfigure Results VisibilityAssign Evaluators
5307,BDS-General Human Anatomy-GHA 1001_Section-A,Sep26_Dental,Start Time2026-09-21 10:30End Time2026-09-21 12:30Entry Stop Time2026-09-21 12:30Duration120 minutes,Sep26-BDS,-,GHA 1001,General Human Anatomy,-,BDS,101,0,0,ResultsConfigure Results VisibilityAssign Evaluators
5309,BDS-General Human Physiology-GHPB 1002_Section-A,Sep26_Dental,Start Time2026-09-22 10:30End Time2026-09-22 12:30Entry Stop Time2026-09-22 12:30Duration120 minutes,Sep26-BDS,-,GHPB 1002,General Human Physiology,-,BDS,100,0,1,ResultsConfigure Results VisibilityAssign Evaluators
5311,BDS-Dental Anatomy Embryology & Oral Histology-DAEOH 1003_Section-A,Sep26_Dental,Start Time2026-09-23 10:30End Time2026-09-23 12:30Entry Stop Time2026-09-23 12:30Duration120 minutes,Sep26-BDS,-,DAEOH 1003,Dental Anatomy Embryology & Oral Histology,-,BDS,101,0,0,ResultsConfigure Results VisibilityAssign Evaluators
5298,N-NF(I&II)125: Nursing Foundation (I & II) Incl Health Assessment Module [SEP26_ENDSEM_KINS_SEM2],KINS_N-NF(I&II)125_2026-09-24_10:00_acoe.nursing@kiit.ac.in,Start Time2026-09-24 10:00End Time2026-09-24 12:00Entry Stop Time2026-09-24 12:00Duration180 minutes,SEP26_ENDSEM,KINS,N-NF(I&II)125,Nursing Foundation (I & II) Incl Health Assessment Module,Sem2,B.Sc. Nursing,201,0,0,ResultsConfigure Results VisibilityAssign Evaluators
5267,RM6114: Rural Finance and Commercial Banking [SEP26_MIDSEM_KSRM_SEM3],KSRM_RM6114_2026-09-25_10:30_srilata@ksrm.ac.in,Start Time2026-09-25 10:30End Time2026-09-25 12:30Entry Stop Time2026-09-25 12:30Duration120 minutes,SEP26_MIDSEM,KSRM,RM6114,Rural Finance and Commercial Banking,Sem3,MBA in Rural Management,74,0,3,ResultsConfigure Results VisibilityAssign Evaluators
5302,NMLE330: Nursing Management & Leadership [SEP26_ENDSEM_KINS_SEM6],KINS_NMLE330_2026-09-26_10:00_monalisa.mall@kins.ac.in,Start Time2026-09-26 10:00End Time2026-09-26 12:00Entry Stop Time2026-09-26 12:00Duration180 minutes,SEP26_ENDSEM,KINS,NMLE330,Nursing Management & Leadership,Sem6,B.Sc. Nursing,89,0,0,ResultsConfigure Results VisibilityAssign Evaluators
5283,NS5001: Nursing Education [SEP26_ENDSEM_KINS_SEM1],KINS_NS5001_2026-09-28_10:00_acoe.nursing@kiit.ac.in,Start Time2026-09-28 10:00End Time2026-09-28 12:00Entry Stop Time2026-09-28 12:00Duration180 minutes,SEP26_ENDSEM,KINS,NS5001,Nursing Education,Sem1,M.Sc,32,0,1,ResultsConfigure Results VisibilityAssign Evaluators
5271,RM6111: Micro Finance [SEP26_MIDSEM_KSRM_SEM3],KSRM_RM6111_2026-09-29_10:30_priyanka.mishrafar@kiit.ac.in,Start Time2026-09-29 10:30End Time2026-09-29 12:30Entry Stop Time2026-09-29 12:30Duration120 minutes,SEP26_MIDSEM,KSRM,RM6111,Micro Finance,Sem3,MBA in Rural Management,73,0,4,ResultsConfigure Results VisibilityAssign Evaluators`;

// Sample team Google Sheet data with subsheets corresponding to teammates
export const DEFAULT_TEAM_ENTRIES = [
  // Subsheet 1: Shaik Ghouse (Team Lead / Operator 1)
  {
    id: 'entry_1',
    teammateName: 'Shaik Ghouse',
    date: '2026-09-01',
    school: 'Kalinga Institute of Medical Sciences',
    schoolCode: 'KIMS',
    receivedCount: 250,
    scannedCount: 242,
    shift: 'Morning',
    notes: 'MBBS Pathology session 1',
  },
  {
    id: 'entry_2',
    teammateName: 'Shaik Ghouse',
    date: '2026-09-07',
    school: 'School of Computer Engineering',
    schoolCode: 'SCE',
    receivedCount: 800,
    scannedCount: 780,
    shift: 'Full Day',
    notes: 'CS30001 DAA morning batch',
  },
  {
    id: 'entry_3',
    teammateName: 'Shaik Ghouse',
    date: '2026-09-08',
    school: 'School of Computer Engineering',
    schoolCode: 'SCE',
    receivedCount: 550,
    scannedCount: 539,
    shift: 'Morning',
    notes: 'Engineering Economics batch',
  },

  // Subsheet 2: Ramesh Kumar (Operator 2)
  {
    id: 'entry_4',
    teammateName: 'Ramesh Kumar',
    date: '2026-09-07',
    school: 'School of Electrical Engineering',
    schoolCode: 'SEE',
    receivedCount: 80,
    scannedCount: 74,
    shift: 'Morning',
    notes: 'EE31001 Transmission batch',
  },
  {
    id: 'entry_5',
    teammateName: 'Ramesh Kumar',
    date: '2026-09-07',
    school: 'School of Civil Engineering',
    schoolCode: 'KSCIV',
    receivedCount: 50,
    scannedCount: 48,
    shift: 'Morning',
    notes: 'Concrete structure batch',
  },
  {
    id: 'entry_6',
    teammateName: 'Ramesh Kumar',
    date: '2026-09-09',
    school: 'School of Computer Engineering',
    schoolCode: 'SCE',
    receivedCount: 145,
    scannedCount: 140,
    shift: 'Morning',
    notes: 'Software Engineering batch',
  },

  // Subsheet 3: Priya Sharma (Operator 3)
  {
    id: 'entry_7',
    teammateName: 'Priya Sharma',
    date: '2026-09-07',
    school: 'School of Management',
    schoolCode: 'KSOM',
    receivedCount: 350,
    scannedCount: 340,
    shift: 'Morning',
    notes: 'MBA OB slot',
  },
  {
    id: 'entry_8',
    teammateName: 'Priya Sharma',
    date: '2026-09-07',
    school: 'School of Law',
    schoolCode: 'KSOL',
    receivedCount: 120,
    scannedCount: 113,
    shift: 'Morning',
    notes: 'BA.LLB English 1',
  },
  {
    id: 'entry_9',
    teammateName: 'Priya Sharma',
    date: '2026-09-10',
    school: 'School of Computer Engineering',
    schoolCode: 'SCE',
    receivedCount: 140,
    scannedCount: 135,
    shift: 'Morning',
    notes: 'Computer Networks slot',
  },

  // Subsheet 4: Mohit Patel (Operator 4)
  {
    id: 'entry_10',
    teammateName: 'Mohit Patel',
    date: '2026-09-11',
    school: 'School of Computer Engineering',
    schoolCode: 'SCE',
    receivedCount: 135,
    scannedCount: 132,
    shift: 'Morning',
    notes: 'HPC paper ingestion',
  },
  {
    id: 'entry_11',
    teammateName: 'Mohit Patel',
    date: '2026-09-21',
    school: 'School of Nursing Science',
    schoolCode: 'KINS',
    receivedCount: 55,
    scannedCount: 50,
    shift: 'Morning',
    notes: 'Biochemistry nursing intake',
  },
  {
    id: 'entry_12',
    teammateName: 'Mohit Patel',
    date: '2026-09-21',
    school: 'School of Dental Science',
    schoolCode: 'Sep26-BDS',
    receivedCount: 105,
    scannedCount: 101,
    shift: 'Morning',
    notes: 'Dental Anatomy section A',
  },
];
