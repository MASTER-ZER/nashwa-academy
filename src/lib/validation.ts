import { z } from 'zod';

export const GroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  time: z.string(),
  days: z.array(z.string()),
  academicYear: z.enum(['FIRST_SEC', 'SECOND_SEC', 'THIRD_SEC']).optional().default('FIRST_SEC'),
  maxStudents: z.number().optional().default(35),
});

export const StudentSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  phone: z.string(),
  parentName: z.string(),
  parentPhone: z.string(),
  address: z.string().optional().default(''),
  groupId: z.string(),
  academicYear: z.enum(['FIRST_SEC', 'SECOND_SEC', 'THIRD_SEC']).optional().default('FIRST_SEC'),
  status: z.enum(['ACTIVE', 'PENDING', 'REJECTED']).optional().default('PENDING'),
  notes: z.string().optional(),
  registeredAt: z.string().optional(),
});

export const AttendanceRecordSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  studentId: z.string(),
  groupId: z.string(),
  scannedAt: z.string(),
  status: z.enum(['ATTENDED', 'ABSENT', 'LATE', 'MAKEUP']),
  deviceId: z.string().optional().default('main-kiosk'),
  synced: z.boolean().optional().default(true),
});

export const SubscriptionSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  month: z.string(),
  amount: z.number(),
  isPaid: z.boolean(),
  paidAt: z.string().optional(),
  receivedBy: z.string().optional(),
});

export const ExamSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
  totalScore: z.number().optional(),
  maxScore: z.number().optional(),
  academicYear: z.enum(['FIRST_SEC', 'SECOND_SEC', 'THIRD_SEC']).optional(),
  groupId: z.string().optional(),
});

export const ExamResultSchema = z.object({
  id: z.string(),
  examId: z.string(),
  studentId: z.string(),
  score: z.number(),
  feedback: z.string().optional(),
  parentNotified: z.boolean().optional().default(false),
  studentNotified: z.boolean().optional().default(false),
  gradedAt: z.string().optional(),
});

export const SystemSettingsSchema = z.object({
  teacherName: z.string().optional().default('مس نشوى'),
  subjectName: z.string().optional().default('العلوم المتكاملة'),
  academicYearLabel: z.string().optional().default('الصف الأول الثانوي'),
  subscriptionPrice: z.number().optional().default(250),
  adminPasscode: z.string().optional().default('2026'),
  assistantPhone: z.string().optional().default('01012345678'),
  centerLocation: z.string().optional().default('سنتر الأوائل - قاعة 1'),
  telegramBotToken: z.string().optional().default(''),
  telegramAdminChatId: z.string().optional().default(''),
});

export const SessionSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  title: z.string(),
  date: z.string(),
  time: z.string(),
});

export const SystemBackupSchema = z.object({
  groups: z.array(GroupSchema).optional().default([]),
  students: z.array(StudentSchema).optional().default([]),
  sessions: z.array(SessionSchema).optional().default([]),
  attendance: z.array(AttendanceRecordSchema).optional().default([]),
  subscriptions: z.array(SubscriptionSchema).optional().default([]),
  exams: z.array(ExamSchema).optional().default([]),
  examResults: z.array(ExamResultSchema).optional().default([]),
  settings: SystemSettingsSchema.optional(),
  version: z.string().optional().default('1.0.0'),
  lastBackup: z.string().optional(),
});

export function validateBackupFile(jsonData: unknown) {
  return SystemBackupSchema.safeParse(jsonData);
}
