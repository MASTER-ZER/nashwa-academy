import { Student, Group, Session, AttendanceRecord, Subscription, Exam, ExamResult, SystemData, SystemSettings } from '@/types';
import { supabase, isSupabaseConfigured } from './supabase';
import { validateBackupFile } from './validation';

const STORAGE_KEY = 'nashwa_academy_db_live_v1';

// Helper to get current Arabic academic month dynamically
export function getCurrentMonthLabel(): string {
  const arabicMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  const now = new Date();
  const monthName = arabicMonths[now.getMonth()];
  const year = now.getFullYear();
  return `${monthName} ${year}`;
}

export function getAcademicMonthsList(): string[] {
  const arabicMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  const list: string[] = [];
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  for (let i = 0; i < 12; i++) {
    const d = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
    const label = `${arabicMonths[d.getMonth()]} ${d.getFullYear()}`;
    list.push(label);
  }
  return list;
}

// Default initial seed data (Groups & Clean State)
const INITIAL_GROUPS: Group[] = [
  {
    id: 'grp-1',
    name: 'مجموعة (1) - السبت (4:00 مساءً) والثلاثاء (4:00 مساءً)',
    time: 'السبت: 4:00 مساءً | الثلاثاء: 4:00 مساءً',
    days: ['السبت', 'الثلاثاء'],
    academicYear: 'FIRST_SEC',
    maxStudents: 35,
  },
  {
    id: 'grp-2',
    name: 'مجموعة (2) - الأحد (5:00 مساءً) والأربعاء (5:00 مساءً)',
    time: 'الأحد: 5:00 مساءً | الأربعاء: 5:00 مساءً',
    days: ['الأحد', 'الأربعاء'],
    academicYear: 'FIRST_SEC',
    maxStudents: 35,
  },
  {
    id: 'grp-3',
    name: 'مجموعة (3) - الإثنين (3:00 مساءً) والخميس (3:00 مساءً)',
    time: 'الإثنين: 3:00 مساءً | الخميس: 3:00 مساءً',
    days: ['الإثنين', 'الخميس'],
    academicYear: 'FIRST_SEC',
    maxStudents: 35,
  },
];

const INITIAL_STUDENTS: Student[] = [];
const INITIAL_SUBSCRIPTIONS: Subscription[] = [];
const INITIAL_EXAMS: Exam[] = [];
const INITIAL_RESULTS: ExamResult[] = [];

const DEFAULT_SETTINGS: SystemSettings = {
  teacherName: 'مس نشوى',
  subjectName: 'العلوم المتكاملة',
  academicYearLabel: 'الصف الأول الثانوي',
  subscriptionPrice: 250,
  adminPasscode: '2026',
  assistantPhone: '01012345678',
  centerLocation: 'سنتر الأوائل - قاعة 1',
  telegramBotToken: '8897471175:AAH__IM1R9Ro2yYdClmtZ_X4TvzFZsr5uUs',
  telegramAdminChatId: '6602868710',
};

function generateSecureId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID().slice(0, 12)}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

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
    parentName: row.parent_name,
    parentPhone: row.parent_phone,
    address: row.address || '',
    academicYear: row.academic_year || 'FIRST_SEC',
    groupId: row.group_id || '',
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
  private realtimeChannel: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initRealtimeChannel();
      this.syncFromSupabase();

      window.addEventListener('focus', () => {
        this.syncFromSupabase();
      });
    }
  }

  private isClient(): boolean {
    return typeof window !== 'undefined';
  }

  private initRealtimeChannel() {
    if (!supabase || this.realtimeChannel) return;
    try {
      this.realtimeChannel = supabase.channel('kiosk_live_sync_v4', {
        config: { broadcast: { ack: true } },
      });
      this.realtimeChannel.subscribe((status: string) => {
        console.log('📡 Realtime Kiosk Status:', status);
      });
    } catch (err) {
      console.warn('Realtime init warning:', err);
    }
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
        { data: settingsData },
      ] = await Promise.all([
        supabase.from('groups').select('*'),
        supabase.from('students').select('*'),
        supabase.from('sessions').select('*'),
        supabase.from('attendance').select('*'),
        supabase.from('subscriptions').select('*'),
        supabase.from('exams').select('*'),
        supabase.from('exam_results').select('*'),
        supabase.from('system_settings').select('*').eq('id', 'main_settings').maybeSingle(),
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
        attendance: attendanceData && attendanceData.length > 0
          ? attendanceData.map(dbToAttendance)
          : localData.attendance,
        subscriptions: subscriptionsData && subscriptionsData.length > 0
          ? subscriptionsData.map(dbToSubscription)
          : localData.subscriptions,
        exams: examsData && examsData.length > 0
          ? examsData.map((e: any) => ({
              id: e.id,
              title: e.title,
              date: e.date,
              totalScore: Number(e.total_score || e.max_score || 20),
              maxScore: Number(e.max_score || e.total_score || 20),
              academicYear: e.academic_year,
              groupId: e.group_id,
            }))
          : localData.exams,
        examResults: resultsData && resultsData.length > 0
          ? resultsData.map((r: any) => ({
              id: r.id,
              examId: r.exam_id,
              studentId: r.student_id,
              score: Number(r.score),
              feedback: r.feedback || '',
              parentNotified: Boolean(r.parent_notified),
              studentNotified: Boolean(r.student_notified),
              gradedAt: r.graded_at,
            }))
          : localData.examResults,
        settings: settingsData ? {
          teacherName: settingsData.teacher_name || DEFAULT_SETTINGS.teacherName,
          subjectName: settingsData.subject_name || DEFAULT_SETTINGS.subjectName,
          academicYearLabel: settingsData.academic_year_label || DEFAULT_SETTINGS.academicYearLabel,
          subscriptionPrice: Number(settingsData.subscription_price || 250),
          adminPasscode: settingsData.admin_passcode || DEFAULT_SETTINGS.adminPasscode,
          assistantPhone: settingsData.assistant_phone || DEFAULT_SETTINGS.assistantPhone,
          centerLocation: settingsData.center_location || DEFAULT_SETTINGS.centerLocation,
          telegramBotToken: '',
          telegramAdminChatId: '',
        } : (localData.settings || DEFAULT_SETTINGS),
        lastBackupDate: localData.lastBackupDate,
      };

      this.saveData(merged, false);
      this.notifyListeners();
    } catch (err) {
      console.warn('Supabase sync warning:', err);
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
        examResults: INITIAL_RESULTS,
        settings: DEFAULT_SETTINGS,
      };
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        const initialData: SystemData = {
          groups: INITIAL_GROUPS,
          students: INITIAL_STUDENTS,
          sessions: [],
          attendance: [],
          subscriptions: INITIAL_SUBSCRIPTIONS,
          exams: INITIAL_EXAMS,
          examResults: INITIAL_RESULTS,
          settings: DEFAULT_SETTINGS,
        };
        this.saveData(initialData, false);
        return initialData;
      }
      const parsed: SystemData = JSON.parse(stored);
      if (!parsed.settings) parsed.settings = DEFAULT_SETTINGS;
      return parsed;
    } catch (e) {
      console.error('Failed to parse local storage data, resetting...', e);
      return {
        groups: INITIAL_GROUPS,
        students: INITIAL_STUDENTS,
        sessions: [],
        attendance: [],
        subscriptions: INITIAL_SUBSCRIPTIONS,
        exams: INITIAL_EXAMS,
        examResults: INITIAL_RESULTS,
        settings: DEFAULT_SETTINGS,
      };
    }
  }

  public saveData(data: SystemData, syncCloud = true): void {
    if (!this.isClient()) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      this.notifyListeners();
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error('Error in storage listener', e);
      }
    });
  }

  // --- Real-time Kiosk Multi-Device Sync ---
  public broadcastKioskEvent(event: {
    type: 'SCAN_RESULT' | 'ATTENDANCE_UPDATE' | 'PAYMENT_COLLECTED';
    payload: any;
  }) {
    if (supabase) {
      try {
        this.initRealtimeChannel();
        if (this.realtimeChannel) {
          this.realtimeChannel.send({
            type: 'broadcast',
            event: 'kiosk_action',
            payload: event,
          });
        }
      } catch (err) {
        console.warn('Supabase broadcast error:', err);
      }
    }

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('nashwa_kiosk_sync_bus_v4');
        bc.postMessage(event);
      } catch {}
    }
  }

  public subscribeToKioskEvents(callback: (event: { type: string; payload: any }) => void): () => void {
    let broadcastChannel: BroadcastChannel | null = null;

    if (supabase) {
      try {
        this.initRealtimeChannel();
        if (this.realtimeChannel) {
          this.realtimeChannel.on('broadcast', { event: 'kiosk_action' }, ({ payload }: any) => {
            if (payload) callback(payload);
          });
        }
      } catch (err) {
        console.warn('Supabase subscribe error:', err);
      }
    }

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        broadcastChannel = new BroadcastChannel('nashwa_kiosk_sync_bus_v4');
        broadcastChannel.onmessage = (msg) => {
          if (msg.data) {
            callback(msg.data);
          }
        };
      } catch {}
    }

    return () => {
      if (broadcastChannel) {
        broadcastChannel.close();
      }
    };
  }

  // --- Attendance Scanner Core Logic ---
  public scanAttendance(params: {
    scannedCode: string;
    activeGroupId: string;
    activeSessionId?: string;
    deviceId?: string;
    allowMakeup?: boolean;
  }): {
    success: boolean;
    type: 'SUCCESS_PAID' | 'SUCCESS_UNPAID' | 'ALREADY_RECORDED' | 'DIFFERENT_GROUP' | 'NOT_FOUND' | 'INACTIVE';
    student?: Student;
    record?: AttendanceRecord;
    subscriptionPaid?: boolean;
    currentMonth?: string;
    originalGroupId?: string;
  } {
    const data = this.getData();
    const code = params.scannedCode.trim();

    const student = data.students.find(
      (s) => s.code === code || s.id === code || s.phone === code
    );

    if (!student) {
      this.syncFromSupabase();
      return { success: false, type: 'NOT_FOUND' };
    }

    if (student.status !== 'ACTIVE') {
      return { success: false, type: 'INACTIVE', student };
    }

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
      }
      sessionId = session.id;
    }

    const currentMonth = getCurrentMonthLabel();
    const sub = data.subscriptions.find((s) => s.studentId === student.id && s.month === currentMonth);
    const isPaid = sub ? sub.isPaid : false;

    // Check duplicate
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

    // Check different group
    const isDifferentGroup = student.groupId !== params.activeGroupId;
    if (isDifferentGroup && !params.allowMakeup) {
      return {
        success: true,
        type: 'DIFFERENT_GROUP',
        student,
        originalGroupId: student.groupId,
        subscriptionPaid: isPaid,
        currentMonth,
      };
    }

    // Record attendance
    const newRecord: AttendanceRecord = {
      id: generateSecureId(`att-${sessionId}-${student.id}`),
      sessionId: sessionId,
      studentId: student.id,
      groupId: student.groupId,
      scannedAt: new Date().toISOString(),
      status: isDifferentGroup ? 'MAKEUP' : 'ATTENDED',
      deviceId: params.deviceId || 'main-kiosk',
      synced: true,
    };

    data.attendance.push(newRecord);
    this.saveData(data);

    // Save to Supabase Cloud
    if (supabase) {
      const client = supabase;
      client.from('sessions').upsert({
        id: sessionId,
        group_id: params.activeGroupId,
        title: `حصة ${todayStr}`,
        date: todayStr,
        time: '00:00',
      }, { onConflict: 'id' }).then(() => {
        client.from('attendance').insert(attendanceToDb(newRecord)).then(() => {});
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

  // --- Subscriptions ---
  public toggleSubscription(studentId: string, month = getCurrentMonthLabel(), receivedBy = 'مس نشوى'): Subscription {
    const data = this.getData();
    let subIndex = data.subscriptions.findIndex(
      (s) => s.studentId === studentId && s.month === month
    );

    const price = data.settings?.subscriptionPrice || 250;

    if (subIndex === -1) {
      const newSub: Subscription = {
        id: generateSecureId(`sub-${studentId}`),
        studentId,
        month,
        amount: price,
        isPaid: true,
        paidAt: new Date().toISOString(),
        receivedBy,
      };
      data.subscriptions.push(newSub);
      this.saveData(data);

      if (supabase) {
        supabase.from('subscriptions').insert(subscriptionToDb(newSub)).then(() => {});
      }
      return newSub;
    }

    const current = data.subscriptions[subIndex];
    const updated: Subscription = {
      ...current,
      isPaid: !current.isPaid,
      paidAt: !current.isPaid ? new Date().toISOString() : undefined,
      receivedBy: !current.isPaid ? receivedBy : undefined,
    };

    data.subscriptions[subIndex] = updated;
    this.saveData(data);

    if (supabase) {
      supabase.from('subscriptions').upsert(subscriptionToDb(updated), { onConflict: 'id' }).then(() => {});
    }

    return updated;
  }

  // --- Groups ---
  public addGroup(groupData: Omit<Group, 'id'>): Group {
    const data = this.getData();
    const newGroup: Group = {
      ...groupData,
      id: generateSecureId('grp'),
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
        max_students: newGroup.maxStudents,
      }).then(() => {});
    }
    return newGroup;
  }

  public updateGroup(id: string, groupData: Partial<Group>): Group | null {
    const data = this.getData();
    const index = data.groups.findIndex((g) => g.id === id);
    if (index === -1) return null;

    data.groups[index] = { ...data.groups[index], ...groupData };
    this.saveData(data);

    if (supabase) {
      supabase.from('groups').update({
        name: data.groups[index].name,
        time: data.groups[index].time,
        days: data.groups[index].days,
        academic_year: data.groups[index].academicYear,
        max_students: data.groups[index].maxStudents,
      }).eq('id', id).then(() => {});
    }
    return data.groups[index];
  }

  public deleteGroup(id: string): boolean {
    const data = this.getData();
    data.groups = data.groups.filter((g) => g.id !== id);
    this.saveData(data);
    if (supabase) {
      supabase.from('groups').delete().eq('id', id).then(() => {});
    }
    return true;
  }

  // --- Students ---
  public async registerStudent(studentData: {
    name: string;
    phone: string;
    parentName: string;
    parentPhone: string;
    address?: string;
    groupId: string;
    academicYear?: any;
    status?: any;
    notes?: string;
  }): Promise<Student> {
    const data = this.getData();
    let nextCode = '101';

    if (supabase) {
      try {
        const { data: seqCode, error } = await supabase.rpc('get_next_student_code');
        if (!error && seqCode) {
          nextCode = String(seqCode);
        } else {
          const { data: maxRows } = await supabase
            .from('students')
            .select('code')
            .order('registered_at', { ascending: false })
            .limit(50);
          const cloudCodes = (maxRows || []).map((r: any) => parseInt(r.code, 10)).filter((n: number) => !isNaN(n));
          const localCodes = data.students.map((s) => parseInt(s.code, 10)).filter((n) => !isNaN(n));
          const allCodes = [...cloudCodes, ...localCodes];
          nextCode = allCodes.length > 0 ? String(Math.max(...allCodes) + 1) : '101';
        }
      } catch {
        const codes = data.students.map((s) => parseInt(s.code, 10)).filter((n) => !isNaN(n));
        nextCode = codes.length > 0 ? String(Math.max(...codes) + 1) : '101';
      }
    } else {
      const codes = data.students.map((s) => parseInt(s.code, 10)).filter((n) => !isNaN(n));
      nextCode = codes.length > 0 ? String(Math.max(...codes) + 1) : '101';
    }

    return this.addStudent({
      code: nextCode,
      name: studentData.name,
      phone: studentData.phone,
      parentName: studentData.parentName,
      parentPhone: studentData.parentPhone,
      address: studentData.address || '',
      groupId: studentData.groupId,
      academicYear: studentData.academicYear || 'FIRST_SEC',
      status: studentData.status || 'PENDING',
      notes: studentData.notes,
    });
  }

  public addStudent(studentData: Omit<Student, 'id' | 'registeredAt'>): Student {
    const data = this.getData();
    const newStudent: Student = {
      ...studentData,
      id: generateSecureId('std'),
      registeredAt: new Date().toISOString(),
    };
    data.students.push(newStudent);
    this.saveData(data);

    if (supabase) {
      supabase.from('students').insert(studentToDb(newStudent)).then(() => {});
    }
    return newStudent;
  }

  public updateStudent(id: string, studentData: Partial<Student>): Student | null {
    const data = this.getData();
    const index = data.students.findIndex((s) => s.id === id);
    if (index === -1) return null;

    data.students[index] = { ...data.students[index], ...studentData };
    this.saveData(data);

    if (supabase) {
      supabase.from('students').update(studentToDb(data.students[index])).eq('id', id).then(() => {});
    }
    return data.students[index];
  }

  public approveStudent(id: string): Student | null {
    const data = this.getData();
    const index = data.students.findIndex((s) => s.id === id);
    if (index === -1) return null;

    data.students[index].status = 'ACTIVE';
    this.saveData(data);

    if (supabase) {
      supabase.from('students').update({ status: 'ACTIVE' }).eq('id', id).then(() => {});
    }
    return data.students[index];
  }

  public deleteStudent(id: string): boolean {
    const data = this.getData();
    data.students = data.students.filter((s) => s.id !== id);
    data.attendance = data.attendance.filter((a) => a.studentId !== id);
    data.subscriptions = data.subscriptions.filter((s) => s.studentId !== id);
    data.examResults = data.examResults.filter((r) => r.studentId !== id);
    this.saveData(data);
    if (supabase) {
      supabase.from('exam_results').delete().eq('student_id', id).then(() => {});
      supabase.from('subscriptions').delete().eq('student_id', id).then(() => {});
      supabase.from('attendance').delete().eq('student_id', id).then(() => {});
      supabase.from('students').delete().eq('id', id).then(() => {});
    }
    return true;
  }

  public rejectStudent(id: string): boolean {
    return this.deleteStudent(id);
  }

  public markNotified(resultId: string, type: 'parent' | 'student'): void {
    const data = this.getData();
    const index = data.examResults.findIndex((r) => r.id === resultId);
    if (index === -1) return;

    if (type === 'parent') data.examResults[index].parentNotified = true;
    if (type === 'student') data.examResults[index].studentNotified = true;
    this.saveData(data);

    if (supabase) {
      const updateData = type === 'parent' ? { parent_notified: true } : { student_notified: true };
      supabase.from('exam_results').update(updateData).eq('id', resultId).then(() => {});
    }
  }

  // --- Exams & Results ---
  public addExam(examData: Omit<Exam, 'id'>): Exam {
    const data = this.getData();
    const total = examData.totalScore || examData.maxScore || 20;
    const newExam: Exam = {
      ...examData,
      totalScore: total,
      maxScore: total,
      id: generateSecureId('ex'),
    };
    data.exams.push(newExam);
    this.saveData(data);

    if (supabase) {
      supabase.from('exams').insert({
        id: newExam.id,
        title: newExam.title,
        date: newExam.date,
        max_score: total,
        total_score: total,
        academic_year: newExam.academicYear,
        group_id: newExam.groupId,
      }).then(() => {});
    }
    return newExam;
  }

  public recordExamResult(resultData: Omit<ExamResult, 'id' | 'gradedAt'>): ExamResult {
    const data = this.getData();
    const index = data.examResults.findIndex(
      (r) => r.examId === resultData.examId && r.studentId === resultData.studentId
    );

    if (index !== -1) {
      data.examResults[index] = {
        ...data.examResults[index],
        ...resultData,
        gradedAt: new Date().toISOString(),
      };
      this.saveData(data);
      if (supabase) {
        supabase.from('exam_results').upsert({
          id: data.examResults[index].id,
          exam_id: resultData.examId,
          student_id: resultData.studentId,
          score: resultData.score,
          feedback: resultData.feedback,
          parent_notified: resultData.parentNotified,
          student_notified: resultData.studentNotified,
          graded_at: data.examResults[index].gradedAt,
        }, { onConflict: 'exam_id,student_id' }).then(() => {});
      }
      return data.examResults[index];
    }

    const newResult: ExamResult = {
      ...resultData,
      id: generateSecureId('res'),
      gradedAt: new Date().toISOString(),
    };
    data.examResults.push(newResult);
    this.saveData(data);

    if (supabase) {
      supabase.from('exam_results').insert({
        id: newResult.id,
        exam_id: newResult.examId,
        student_id: newResult.studentId,
        score: newResult.score,
        feedback: newResult.feedback,
        parent_notified: newResult.parentNotified,
        student_notified: newResult.studentNotified,
        graded_at: newResult.gradedAt,
      }).then(() => {});
    }
    return newResult;
  }

  // --- Settings ---
  public getSettings(): SystemSettings {
    const data = this.getData();
    return data.settings || DEFAULT_SETTINGS;
  }

  public updateSettings(newSettings: Partial<SystemSettings>): SystemSettings {
    const data = this.getData();
    data.settings = {
      ...DEFAULT_SETTINGS,
      ...(data.settings || {}),
      ...newSettings,
    };
    this.saveData(data, false);

    if (supabase) {
      supabase.from('system_settings').upsert({
        id: 'main_settings',
        teacher_name: data.settings.teacherName,
        subject_name: data.settings.subjectName,
        academic_year_label: data.settings.academicYearLabel,
        subscription_price: data.settings.subscriptionPrice,
        admin_passcode: data.settings.adminPasscode,
        assistant_phone: data.settings.assistantPhone,
      }, { onConflict: 'id' }).then(() => {}, (err: any) => console.warn('Supabase settings sync error:', err));
    }
    return data.settings;
  }

  public clearSessionAttendance(groupId: string): void {
    const data = this.getData();
    const todayStr = new Date().toISOString().split('T')[0];
    const session = data.sessions.find((s) => s.groupId === groupId && s.date === todayStr);
    if (session) {
      data.attendance = data.attendance.filter((a) => a.sessionId !== session.id);
      this.saveData(data);
      if (supabase) {
        supabase.from('attendance').delete().eq('session_id', session.id).then(() => {});
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
      const validation = validateBackupFile(parsed);
      if (validation.success && validation.data) {
        const validatedData = validation.data as SystemData;
        this.saveData(validatedData, false);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public resetToDefault() {
    this.clearAllData();
  }

  public async clearAllData(): Promise<void> {
    const cleanData: SystemData = {
      groups: INITIAL_GROUPS,
      students: [],
      sessions: [],
      attendance: [],
      subscriptions: [],
      exams: [],
      examResults: [],
      settings: DEFAULT_SETTINGS,
    };
    if (this.isClient()) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanData));
      localStorage.removeItem('logged_student_code');
      localStorage.removeItem('logged_student_phone');
    }
    this.notifyListeners();

    if (supabase) {
      try {
        await Promise.all([
          supabase.from('exam_results').delete().neq('id', '___none___'),
          supabase.from('exams').delete().neq('id', '___none___'),
          supabase.from('attendance').delete().neq('id', '___none___'),
          supabase.from('sessions').delete().neq('id', '___none___'),
          supabase.from('subscriptions').delete().neq('id', '___none___'),
          supabase.from('students').delete().neq('id', '___none___'),
        ]);
      } catch (err) {
        console.warn('Supabase clear error:', err);
      }
    }
  }
}

export const db = new StorageService();
