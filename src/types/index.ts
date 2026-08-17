export type AcademicYear = 'FIRST_SEC' | 'SECOND_SEC' | 'THIRD_SEC';

export type StudentStatus = 'PENDING' | 'ACTIVE' | 'ARCHIVED';

export interface Group {
  id: string;
  name: string; // e.g. "مجموعة الأحد والثلاثاء - 1:00 ظهرًا"
  time: string; // e.g. "01:00 PM"
  days: string[]; // e.g. ["الأحد", "الثلاثاء"]
  academicYear: AcademicYear;
  maxStudents?: number;
}

export interface Student {
  id: string;
  code: string; // e.g. "101"
  name: string; // e.g. "إياد محمد نجاح"
  phone: string; // e.g. "01012345678"
  parentName: string; // e.g. "محمد نجاح"
  parentPhone: string; // e.g. "01187654321"
  address: string; // e.g. "شارع الجمهورية - المنصورة"
  academicYear: AcademicYear;
  groupId: string;
  status: StudentStatus;
  registeredAt: string;
  notes?: string;
}

export interface Session {
  id: string;
  groupId: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  groupId: string;
  scannedAt: string; // ISO string
  status: 'ATTENDED' | 'MAKEUP' | 'LATE';
  deviceId?: string;
  synced: boolean;
}

export interface Subscription {
  id: string;
  studentId: string;
  month: string; // e.g. "2026-10" or "أكتوبر 2026"
  amount: number;
  isPaid: boolean;
  paidAt?: string;
  receivedBy?: string;
}

export interface Exam {
  id: string;
  title: string; // e.g. "اختبار الباب الأول - العلوم المتكاملة"
  totalScore: number; // e.g. 20
  date: string;
  academicYear: AcademicYear;
  groupId?: string; // Optional: specific to a group or all
}

export interface ExamResult {
  id: string;
  examId: string;
  studentId: string;
  score: number;
  feedback?: string;
  parentNotified: boolean;
  studentNotified: boolean;
  gradedAt: string;
}

export interface SystemData {
  groups: Group[];
  students: Student[];
  sessions: Session[];
  attendance: AttendanceRecord[];
  subscriptions: Subscription[];
  exams: Exam[];
  examResults: ExamResult[];
  lastBackupDate?: string;
}
