import { Student, Group, Session, AttendanceRecord, Subscription, Exam, ExamResult, SystemData } from '@/types';
import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEY = 'nashwa_academy_db_v3';

// Default initial seed data
const INITIAL_GROUPS: Group[] = [
  {
    id: 'grp-1',
    name: 'مجموعة (1) - الأحد والثلاثاء | 1:00 ظهرًا',
    time: '01:00 PM',
    days: ['الأحد', 'الثلاثاء'],
    academicYear: 'FIRST_SEC',
    maxStudents: 35,
  },
  {
    id: 'grp-2',
    name: 'مجموعة (2) - الأحد والثلاثاء | 3:00 عصرًا',
    time: '03:00 PM',
    days: ['الأحد', 'الثلاثاء'],
    academicYear: 'FIRST_SEC',
    maxStudents: 35,
  },
  {
    id: 'grp-3',
    name: 'مجموعة (3) - السبت والأربعاء | 2:00 ظهرًا',
    time: '02:00 PM',
    days: ['السبت', 'الأربعاء'],
    academicYear: 'FIRST_SEC',
    maxStudents: 35,
  },
];

const INITIAL_STUDENTS: Student[] = [
  {
    id: 'std-101',
    code: '101',
    name: 'إياد محمد نجاح',
    phone: '01012345678',
    parentName: 'محمد نجاح',
    parentPhone: '01198765432',
    address: 'شارع الجمهورية - المنصورة',
    academicYear: 'FIRST_SEC',
    groupId: 'grp-1',
    status: 'ACTIVE',
    registeredAt: '2026-08-10T10:00:00Z',
  },
  {
    id: 'std-102',
    code: '102',
    name: 'أحمد محمود عبد الفتاح',
    phone: '01223344556',
    parentName: 'محمود عبد الفتاح',
    parentPhone: '01099887766',
    address: 'شارع البحر - طلخا',
    academicYear: 'FIRST_SEC',
    groupId: 'grp-1',
    status: 'ACTIVE',
    registeredAt: '2026-08-11T12:00:00Z',
  },
  {
    id: 'std-103',
    code: '103',
    name: 'سارة طارق إبراهيم',
    phone: '01555443322',
    parentName: 'طارق إبراهيم',
    parentPhone: '01233445566',
    address: 'شارع الجيش - المنصورة',
    academicYear: 'FIRST_SEC',
    groupId: 'grp-2',
    status: 'ACTIVE',
    registeredAt: '2026-08-12T14:00:00Z',
  },
  {
    id: 'std-104',
    code: '104',
    name: 'عمر خالد الدسوقي',
    phone: '01066778899',
    parentName: 'خالد الدسوقي',
    parentPhone: '01122334455',
    address: 'سندوب - المنصورة',
    academicYear: 'FIRST_SEC',
    groupId: 'grp-1',
    status: 'PENDING',
    registeredAt: '2026-08-17T09:30:00Z',
  },
];

const INITIAL_SUBSCRIPTIONS: Subscription[] = [
  {
    id: 'sub-101-oct',
    studentId: 'std-101',
    month: 'أكتوبر 2026',
    amount: 250,
    isPaid: true,
    paidAt: '2026-10-01T15:30:00Z',
    receivedBy: 'مس نشوى',
  },
  {
    id: 'sub-102-oct',
    studentId: 'std-102',
    month: 'أكتوبر 2026',
    amount: 250,
    isPaid: false,
  },
  {
    id: 'sub-103-oct',
    studentId: 'std-103',
    month: 'أكتوبر 2026',
    amount: 250,
    isPaid: true,
    paidAt: '2026-10-02T16:00:00Z',
    receivedBy: 'السكرتير',
  },
];

const INITIAL_EXAMS: Exam[] = [
  {
    id: 'ex-1',
    title: 'اختبار الباب الأول: الكيمياء ومركز العلوم',
    totalScore: 20,
    date: '2026-10-15',
    academicYear: 'FIRST_SEC',
  },
];

const INITIAL_EXAM_RESULTS: ExamResult[] = [
  {
    id: 'res-1',
    examId: 'ex-1',
    studentId: 'std-101',
    score: 19,
    feedback: 'ممتاز جداً وإجابات نموذجية 🌟',
    parentNotified: false,
    studentNotified: false,
    gradedAt: '2026-10-16T10:00:00Z',
  },
  {
    id: 'res-2',
    examId: 'ex-1',
    studentId: 'std-102',
    score: 14,
    feedback: 'جيد، برجاء مراجعة مسائل التحويلات',
    parentNotified: false,
    studentNotified: false,
    gradedAt: '2026-10-16T10:05:00Z',
  },
];

// --- DB Data Mappers (camelCase <-> snake_case) ---
function studentToDb(s: Student) {
  return {
    id: s.id,
    code: s.code,
    name: s.name,
    phone: s.phone,
    parent_name: s.parentName,
    parent_phone: s.parentPhone,
    address: s.address || '',
    academic_year: s.academicYear || 'FIRST_SEC',
    group_id: s.groupId || null,
    status: s.status || 'PENDING',
    registered_at: s.registeredAt || new Date().toISOString(),
  };
}

function dbToStudent(row: any): Student {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    phone: row.phone,
    parentName: row.parent_name || '',
    parentPhone: row.parent_phone || '',
    address: row.address || '',
    academicYear: row.academic_year || 'FIRST_SEC',
    groupId: row.group_id || 'grp-1',
    status: row.status || 'PENDING',
    registeredAt: row.registered_at || new Date().toISOString(),
  };
}

function attendanceToDb(a: AttendanceRecord) {
  return {
    id: a.id,
    session_id: a.sessionId,
    student_id: a.studentId,
    group_id: a.groupId,
    scanned_at: a.scannedAt,
    status: a.status,
    device_id: a.deviceId || 'kiosk',
    synced: true,
  };
}

function dbToAttendance(row: any): AttendanceRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    studentId: row.student_id,
    groupId: row.group_id,
    scannedAt: row.scanned_at,
    status: row.status,
    deviceId: row.device_id,
    synced: true,
  };
}

function subscriptionToDb(s: Subscription) {
  return {
    id: s.id,
    student_id: s.studentId,
    month: s.month,
    amount: s.amount,
    is_paid: s.isPaid,
    paid_at: s.paidAt || null,
    received_by: s.receivedBy || null,
  };
}

function dbToSubscription(row: any): Subscription {
  return {
    id: row.id,
    studentId: row.student_id,
    month: row.month,
    amount: Number(row.amount),
    isPaid: Boolean(row.is_paid),
    paidAt: row.paid_at || undefined,
    receivedBy: row.received_by || undefined,
  };
}

class StorageService {
  private listeners: Set<() => void> = new Set();
  private isSupabaseSyncing: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.syncFromSupabase();
      
      // Auto sync when window gains focus
      window.addEventListener('focus', () => {
        this.syncFromSupabase();
      });
    }
  }

  private isClient(): boolean {
    return typeof window !== 'undefined';
  }

  // Sync latest cloud data from Supabase
  public async syncFromSupabase() {
    if (!supabase || this.isSupabaseSyncing) return;
    this.isSupabaseSyncing = true;
    try {
      const [
        { data: groupsData },
        { data: studentsData },
        { data: sessionsData },
        { data: attendanceData },
        { data: subscriptionsData },
        { data: examsData },
        { data: resultsData },
      ] = await Promise.all([
        supabase.from('groups').select('*'),
        supabase.from('students').select('*'),
        supabase.from('sessions').select('*'),
        supabase.from('attendance').select('*'),
        supabase.from('subscriptions').select('*'),
        supabase.from('exams').select('*'),
        supabase.from('exam_results').select('*'),
      ]);

      const localData = this.getData();

      const merged: SystemData = {
        groups: groupsData && groupsData.length > 0
          ? groupsData.map((g: any) => ({
              id: g.id,
              name: g.name,
              time: g.time,
              days: g.days || [],
              academicYear: g.academic_year || 'FIRST_SEC',
              maxStudents: g.max_students || 35,
            }))
          : localData.groups,
        students: studentsData && studentsData.length > 0
          ? studentsData.map(dbToStudent)
          : localData.students,
        sessions: sessionsData && sessionsData.length > 0
          ? sessionsData.map((s: any) => ({
              id: s.id,
              groupId: s.group_id,
              title: s.title,
              date: s.date,
              time: s.time,
            }))
          : localData.sessions,
        attendance: attendanceData ? attendanceData.map(dbToAttendance) : localData.attendance,
        subscriptions: subscriptionsData ? subscriptionsData.map(dbToSubscription) : localData.subscriptions,
        exams: examsData && examsData.length > 0
          ? examsData.map((e: any) => ({
              id: e.id,
              title: e.title,
              totalScore: Number(e.total_score),
              date: e.date,
              academicYear: e.academic_year,
            }))
          : localData.exams,
        examResults: resultsData && resultsData.length > 0
          ? resultsData.map((r: any) => ({
              id: r.id,
              examId: r.exam_id,
              studentId: r.student_id,
              score: Number(r.score),
              feedback: r.feedback,
              parentNotified: Boolean(r.parent_notified),
              studentNotified: Boolean(r.student_notified),
              gradedAt: r.graded_at,
            }))
          : localData.examResults,
      };

      this.saveData(merged, false);
    } catch (e) {
      console.warn('Supabase sync warning:', e);
    } finally {
      this.isSupabaseSyncing = false;
    }
  }

  public getData(): SystemData {
    if (!this.isClient()) {
      return {
        groups: INITIAL_GROUPS,
        students: INITIAL_STUDENTS,
        sessions: [],
        attendance: [],
        subscriptions: INITIAL_SUBSCRIPTIONS,
        exams: INITIAL_EXAMS,
        examResults: INITIAL_EXAM_RESULTS,
      };
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Error parsing stored data', e);
      }
    }

    const initial: SystemData = {
      groups: INITIAL_GROUPS,
      students: INITIAL_STUDENTS,
      sessions: [
        {
          id: 'sess-today',
          groupId: 'grp-1',
          title: 'حصة مراجعة الباب الأول',
          date: new Date().toISOString().split('T')[0],
          time: '01:00 PM',
        }
      ],
      attendance: [],
      subscriptions: INITIAL_SUBSCRIPTIONS,
      exams: INITIAL_EXAMS,
      examResults: INITIAL_EXAM_RESULTS,
    };

    this.saveData(initial, false);
    return initial;
  }

  public saveData(data: SystemData, syncToCloud: boolean = true) {
    if (this.isClient()) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      this.notifyListeners();
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((l) => l());
  }

  // --- Student Methods ---
  public registerStudent(student: Omit<Student, 'id' | 'code' | 'status' | 'registeredAt'>): Student {
    const data = this.getData();
    const existingCodes = data.students.map((s) => parseInt(s.code, 10)).filter((n) => !isNaN(n));
    const nextCodeNum = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 101;
    const newStudent: Student = {
      ...student,
      id: `std-${Date.now()}`,
      code: String(nextCodeNum),
      status: 'PENDING',
      registeredAt: new Date().toISOString(),
    };

    data.students.push(newStudent);
    this.saveData(data);

    // Save to Supabase Cloud immediately
    if (supabase) {
      supabase.from('students').insert(studentToDb(newStudent)).then(({ error }) => {
        if (error) console.error('Supabase registerStudent error:', error);
      });
    }

    return newStudent;
  }

  public approveStudent(studentId: string, customGroupId?: string): Student | null {
    const data = this.getData();
    const student = data.students.find((s) => s.id === studentId);
    if (!student) return null;

    student.status = 'ACTIVE';
    if (customGroupId) student.groupId = customGroupId;

    const currentMonth = 'أكتوبر 2026';
    let sub = data.subscriptions.find((s) => s.studentId === student.id && s.month === currentMonth);
    if (!sub) {
      sub = {
        id: `sub-${student.id}-${Date.now()}`,
        studentId: student.id,
        month: currentMonth,
        amount: 250,
        isPaid: false,
      };
      data.subscriptions.push(sub);
    }

    this.saveData(data);

    // Push update to Supabase Cloud immediately
    if (supabase) {
      supabase.from('students').update({
        status: 'ACTIVE',
        group_id: student.groupId,
        approved_at: new Date().toISOString(),
      }).eq('id', student.id).then(({ error }) => {
        if (error) console.error('Supabase approveStudent error:', error);
      });

      if (sub) {
        supabase.from('subscriptions').upsert(subscriptionToDb(sub), { onConflict: 'id' }).then(({ error }) => {
          if (error) console.error('Supabase sub upsert error:', error);
        });
      }
    }

    return student;
  }

  public rejectStudent(studentId: string) {
    const data = this.getData();
    data.students = data.students.filter((s) => s.id !== studentId);
    this.saveData(data);

    if (supabase) {
      supabase.from('students').delete().eq('id', studentId).then(({ error }) => {
        if (error) console.error('Supabase rejectStudent error:', error);
      });
    }
  }

  public updateStudent(studentId: string, updates: Partial<Student>): Student | null {
    const data = this.getData();
    const index = data.students.findIndex((s) => s.id === studentId);
    if (index === -1) return null;

    data.students[index] = { ...data.students[index], ...updates };
    this.saveData(data);

    if (supabase) {
      supabase.from('students').update(studentToDb(data.students[index])).eq('id', studentId).then(({ error }) => {
        if (error) console.error('Supabase updateStudent error:', error);
      });
    }

    return data.students[index];
  }

  // --- Attendance Scanner & Idempotent Conflict Resolution ---
  public scanAttendance(params: {
    scannedCode: string;
    activeGroupId: string;
    activeSessionId?: string;
    deviceId?: string;
  }): {
    success: boolean;
    type: 'SUCCESS_PAID' | 'SUCCESS_UNPAID' | 'ALREADY_RECORDED' | 'NOT_FOUND' | 'INACTIVE';
    student?: Student;
    record?: AttendanceRecord;
    subscriptionPaid?: boolean;
    currentMonth?: string;
  } {
    const data = this.getData();
    const code = params.scannedCode.trim();

    const student = data.students.find(
      (s) => s.code === code || s.id === code || s.phone === code
    );

    if (!student) {
      // Trigger background sync in case student was added from another device
      this.syncFromSupabase();
      return { success: false, type: 'NOT_FOUND' };
    }

    if (student.status !== 'ACTIVE') {
      return { success: false, type: 'INACTIVE', student };
    }

    // Determine current session
    let sessionId = params.activeSessionId;
    const todayStr = new Date().toISOString().split('T')[0];
    if (!sessionId) {
      let session = data.sessions.find((s) => s.groupId === params.activeGroupId && s.date === todayStr);
      if (!session) {
        session = {
          id: `sess-${params.activeGroupId}-${todayStr}`,
          groupId: params.activeGroupId,
          title: `حصة ${todayStr}`,
          date: todayStr,
          time: '00:00',
        };
        data.sessions.push(session);
        if (supabase) {
          supabase.from('sessions').upsert({
            id: session.id,
            group_id: session.groupId,
            title: session.title,
            date: session.date,
            time: session.time,
          }, { onConflict: 'id' }).then(({ error }) => {
            if (error) console.error('Supabase session upsert error:', error);
          });
        }
      }
      sessionId = session.id;
    }

    const currentMonth = 'أكتوبر 2026';
    const sub = data.subscriptions.find((s) => s.studentId === student.id && s.month === currentMonth);
    const isPaid = sub ? sub.isPaid : false;

    // Check if student already attended in this session
    const existing = data.attendance.find(
      (a) => a.sessionId === sessionId && a.studentId === student.id
    );

    if (existing) {
      return {
        success: true,
        type: 'ALREADY_RECORDED',
        student,
        record: existing,
        subscriptionPaid: isPaid,
        currentMonth,
      };
    }

    // New attendance record
    const newRecord: AttendanceRecord = {
      id: `att-${sessionId}-${student.id}-${Date.now()}`,
      sessionId: sessionId,
      studentId: student.id,
      groupId: student.groupId,
      scannedAt: new Date().toISOString(),
      status: student.groupId === params.activeGroupId ? 'ATTENDED' : 'MAKEUP',
      deviceId: params.deviceId || 'main-kiosk',
      synced: true,
    };

    data.attendance.push(newRecord);
    this.saveData(data);

    // Save to Supabase Cloud
    if (supabase) {
      supabase.from('attendance').insert(attendanceToDb(newRecord)).then(({ error }) => {
        if (error) console.error('Supabase attendance insert error:', error);
      });
    }

    return {
      success: true,
      type: isPaid ? 'SUCCESS_PAID' : 'SUCCESS_UNPAID',
      student,
      record: newRecord,
      subscriptionPaid: isPaid,
      currentMonth,
    };
  }

  public clearSessionAttendance(groupId: string): void {
    const data = this.getData();
    const todayStr = new Date().toISOString().split('T')[0];
    const session = data.sessions.find((s) => s.groupId === groupId && s.date === todayStr);
    if (session) {
      data.attendance = data.attendance.filter((a) => a.sessionId !== session.id);
      if (supabase) {
        supabase.from('attendance').delete().eq('session_id', session.id).then(({ error }) => {
          if (error) console.error('Supabase delete session attendance error:', error);
        });
      }
    } else {
      data.attendance = data.attendance.filter((a) => a.groupId !== groupId);
    }
    this.saveData(data);
  }

  // --- Groups Management ---
  public addGroup(group: Omit<Group, 'id'>): Group {
    const data = this.getData();
    const newGroup: Group = {
      ...group,
      id: `grp-${Date.now()}`,
    };
    data.groups.push(newGroup);
    this.saveData(data);

    if (supabase) {
      supabase.from('groups').insert({
        id: newGroup.id,
        name: newGroup.name,
        time: newGroup.time,
        days: newGroup.days,
        academic_year: newGroup.academicYear,
        max_students: newGroup.maxStudents || 35,
      }).then(({ error }) => {
        if (error) console.error('Supabase addGroup error:', error);
      });
    }

    return newGroup;
  }

  public updateGroup(groupId: string, updates: Partial<Group>): Group | null {
    const data = this.getData();
    const index = data.groups.findIndex((g) => g.id === groupId);
    if (index === -1) return null;

    data.groups[index] = { ...data.groups[index], ...updates };
    this.saveData(data);

    if (supabase) {
      const g = data.groups[index];
      supabase.from('groups').update({
        name: g.name,
        time: g.time,
        days: g.days,
        academic_year: g.academicYear,
        max_students: g.maxStudents || 35,
      }).eq('id', groupId).then(({ error }) => {
        if (error) console.error('Supabase updateGroup error:', error);
      });
    }

    return data.groups[index];
  }

  public deleteGroup(groupId: string): boolean {
    const data = this.getData();
    data.groups = data.groups.filter((g) => g.id !== groupId);
    this.saveData(data);

    if (supabase) {
      supabase.from('groups').delete().eq('id', groupId).then(({ error }) => {
        if (error) console.error('Supabase deleteGroup error:', error);
      });
    }

    return true;
  }

  // --- Subscriptions ---
  public toggleSubscription(studentId: string, month: string = 'أكتوبر 2026', receivedBy: string = 'مس نشوى'): boolean {
    const data = this.getData();
    let sub = data.subscriptions.find((s) => s.studentId === studentId && s.month === month);
    if (!sub) {
      sub = {
        id: `sub-${studentId}-${Date.now()}`,
        studentId,
        month,
        amount: 250,
        isPaid: true,
        paidAt: new Date().toISOString(),
        receivedBy,
      };
      data.subscriptions.push(sub);
    } else {
      sub.isPaid = !sub.isPaid;
      if (sub.isPaid) {
        sub.paidAt = new Date().toISOString();
        sub.receivedBy = receivedBy;
      } else {
        sub.paidAt = undefined;
        sub.receivedBy = undefined;
      }
    }
    this.saveData(data);

    if (supabase && sub) {
      supabase.from('subscriptions').upsert(subscriptionToDb(sub), { onConflict: 'id' }).then(({ error }) => {
        if (error) console.error('Supabase sub toggle error:', error);
      });
    }

    return sub.isPaid;
  }

  // --- Exams & Grades ---
  public addExam(exam: Omit<Exam, 'id'>): Exam {
    const data = this.getData();
    const newExam: Exam = {
      ...exam,
      id: `ex-${Date.now()}`,
    };
    data.exams.push(newExam);
    this.saveData(data);

    if (supabase) {
      supabase.from('exams').insert({
        id: newExam.id,
        title: newExam.title,
        total_score: newExam.totalScore,
        date: newExam.date,
        academic_year: newExam.academicYear,
      }).then(({ error }) => {
        if (error) console.error('Supabase exam insert error:', error);
      });
    }

    return newExam;
  }

  public setExamGrade(examId: string, studentId: string, score: number, feedback?: string): ExamResult {
    const data = this.getData();
    let result = data.examResults.find((r) => r.examId === examId && r.studentId === studentId);
    if (result) {
      result.score = score;
      if (feedback !== undefined) result.feedback = feedback;
      result.gradedAt = new Date().toISOString();
    } else {
      result = {
        id: `res-${examId}-${studentId}`,
        examId,
        studentId,
        score,
        feedback: feedback || '',
        parentNotified: false,
        studentNotified: false,
        gradedAt: new Date().toISOString(),
      };
      data.examResults.push(result);
    }
    this.saveData(data);

    if (supabase) {
      supabase.from('exam_results').upsert({
        id: result.id,
        exam_id: result.examId,
        student_id: result.studentId,
        score: result.score,
        feedback: result.feedback,
        parent_notified: result.parentNotified,
        student_notified: result.studentNotified,
        graded_at: result.gradedAt,
      }, { onConflict: 'id' }).then(({ error }) => {
        if (error) console.error('Supabase exam result upsert error:', error);
      });
    }

    return result;
  }

  public markNotified(resultId: string, target: 'parent' | 'student') {
    const data = this.getData();
    const res = data.examResults.find((r) => r.id === resultId);
    if (res) {
      if (target === 'parent') res.parentNotified = true;
      if (target === 'student') res.studentNotified = true;
      this.saveData(data);

      if (supabase) {
        supabase.from('exam_results').update({
          parent_notified: res.parentNotified,
          student_notified: res.studentNotified,
        }).eq('id', resultId).then(({ error }) => {
          if (error) console.error('Supabase markNotified error:', error);
        });
      }
    }
  }

  // --- Backup & Recovery ---
  public exportBackup(): string {
    const data = this.getData();
    data.lastBackupDate = new Date().toISOString();
    this.saveData(data, false);
    return JSON.stringify(data, null, 2);
  }

  public importBackup(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.students && parsed.groups) {
        this.saveData(parsed, false);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public resetToDefault() {
    if (this.isClient()) {
      localStorage.removeItem(STORAGE_KEY);
      this.getData();
      this.notifyListeners();
    }
  }
}

export const db = new StorageService();
