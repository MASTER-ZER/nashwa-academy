import { Student, Group, Session, AttendanceRecord, Subscription, Exam, ExamResult, SystemData, SystemSettings, ProfileEditRequest } from '@/types';
import { supabase, isSupabaseConfigured } from './supabase';
import { validateBackupFile } from './validation';

const STORAGE_KEY = 'nashwa_academy_db_live_v1';
const OFFLINE_QUEUE_KEY = 'nashwa_offline_sync_queue_v1';

export interface OfflineSyncItem {
  id: string;
  table: string;
  action: 'INSERT' | 'UPSERT' | 'UPDATE' | 'DELETE';
  payload: any;
  onConflict?: string;
  matchKey?: string;
  matchVal?: any;
  createdAt: string;
  retryCount: number;
}

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
  requireStudentPhoto: false,
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
    birth_date: s.birthDate || '',
    photo_url: s.photoUrl || '',
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
    birthDate: row.birth_date || undefined,
    photoUrl: row.photo_url || undefined,
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
  private isFlushingQueue: boolean = false;
  private realtimeChannel: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initRealtimeChannel();
      this.syncFromSupabase();
      this.flushOfflineQueue();

      window.addEventListener('focus', () => {
        this.syncFromSupabase();
        this.flushOfflineQueue();
      });

      window.addEventListener('online', () => {
        console.log('🌐 Network online detected! Flushing offline queue...');
        this.flushOfflineQueue();
        this.syncFromSupabase();
      });

      // Background flush interval every 25 seconds
      setInterval(() => {
        if (this.isOnline() && this.getPendingSyncCount() > 0) {
          this.flushOfflineQueue();
        }
      }, 25000);
    }
  }

  public isClient(): boolean {
    return typeof window !== 'undefined';
  }

  public isOnline(): boolean {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  }

  // --- Offline Sync Queue System ---
  public getOfflineQueue(): OfflineSyncItem[] {
    if (!this.isClient()) return [];
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public enqueueOfflineSync(item: {
    table: string;
    action: 'INSERT' | 'UPSERT' | 'UPDATE' | 'DELETE';
    payload: any;
    onConflict?: string;
    matchKey?: string;
    matchVal?: any;
  }) {
    if (!this.isClient()) return;
    try {
      const queue = this.getOfflineQueue();
      const newItem: OfflineSyncItem = {
        id: generateSecureId('sync'),
        table: item.table,
        action: item.action,
        payload: item.payload,
        onConflict: item.onConflict,
        matchKey: item.matchKey,
        matchVal: item.matchVal,
        createdAt: new Date().toISOString(),
        retryCount: 0,
      };
      queue.push(newItem);
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      this.notifyListeners();
    } catch (err) {
      console.warn('Error enqueuing offline sync:', err);
    }
  }

  public getPendingSyncCount(): number {
    return this.getOfflineQueue().length;
  }

  public async flushOfflineQueue(): Promise<{ syncedCount: number; failedCount: number; remainingCount: number }> {
    if (!supabase || !this.isOnline() || this.isFlushingQueue) {
      return { syncedCount: 0, failedCount: 0, remainingCount: this.getPendingSyncCount() };
    }

    const queue = this.getOfflineQueue();
    if (queue.length === 0) {
      return { syncedCount: 0, failedCount: 0, remainingCount: 0 };
    }

    this.isFlushingQueue = true;
    const failedItems: OfflineSyncItem[] = [];
    let syncedCount = 0;

    try {
      for (const item of queue) {
        try {
          let res: any;
          if (item.action === 'INSERT') {
            res = await supabase.from(item.table).insert(item.payload);
          } else if (item.action === 'UPSERT') {
            res = await supabase.from(item.table).upsert(item.payload, item.onConflict ? { onConflict: item.onConflict } : undefined);
          } else if (item.action === 'UPDATE' && item.matchKey && item.matchVal) {
            res = await supabase.from(item.table).update(item.payload).eq(item.matchKey, item.matchVal);
          } else if (item.action === 'DELETE' && item.matchKey && item.matchVal) {
            res = await supabase.from(item.table).delete().eq(item.matchKey, item.matchVal);
          }

          if (res?.error) {
            console.warn(`Sync item ${item.id} error:`, res.error);
            item.retryCount = (item.retryCount || 0) + 1;
            if (item.retryCount < 5) failedItems.push(item);
          } else {
            syncedCount++;
          }
        } catch (err) {
          console.warn(`Sync exception on ${item.id}:`, err);
          item.retryCount = (item.retryCount || 0) + 1;
          if (item.retryCount < 5) failedItems.push(item);
        }
      }

      if (this.isClient()) {
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(failedItems));
        this.notifyListeners();
      }
    } finally {
      this.isFlushingQueue = false;
    }

    return {
      syncedCount,
      failedCount: failedItems.length,
      remainingCount: failedItems.length,
    };
  }

  private initRealtimeChannel() {
    if (!supabase || this.realtimeChannel) return;
    try {
      this.realtimeChannel = supabase.channel('kiosk_live_sync_v5', {
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
    if (!supabase || this.isSupabaseSyncing || !this.isOnline()) return;
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
          telegramBotToken: localData.settings?.telegramBotToken || DEFAULT_SETTINGS.telegramBotToken,
          telegramAdminChatId: localData.settings?.telegramAdminChatId || DEFAULT_SETTINGS.telegramAdminChatId,
          requireStudentPhoto: Boolean(settingsData.require_student_photo),
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
    if (supabase && this.isOnline()) {
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
        const bc = new BroadcastChannel('nashwa_kiosk_sync_bus_v5');
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
        broadcastChannel = new BroadcastChannel('nashwa_kiosk_sync_bus_v5');
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

  // --- Attendance Scanner Core Logic with Offline Buffer ---
  public scanAttendance(params: {
    scannedCode: string;
    activeGroupId: string;
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
    const cleanCode = params.scannedCode.trim();

    // 1. Find Student by Code or ID
    const student = data.students.find(
      (s) => s.code.toLowerCase() === cleanCode.toLowerCase() || s.id === cleanCode
    );

    if (!student) {
      return { success: false, type: 'NOT_FOUND' };
    }

    if (student.status !== 'ACTIVE') {
      return { success: false, type: 'INACTIVE', student };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonth = getCurrentMonthLabel();

    // Find or create Session
    let session = data.sessions.find(
      (s) => s.groupId === params.activeGroupId && s.date === todayStr
    );

    let sessionId = session ? session.id : `sess-${params.activeGroupId}-${todayStr}`;

    if (!session) {
      session = {
        id: sessionId,
        groupId: params.activeGroupId,
        title: `حصة ${todayStr}`,
        date: todayStr,
        time: '00:00',
      };
      data.sessions.push(session);
    }

    // Check monthly subscription status
    const sub = data.subscriptions.find(
      (s) => s.studentId === student.id && s.month === currentMonth
    );
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

    // Record attendance locally immediately
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

    // Save to Supabase Cloud or enqueue to offline buffer
    const sessionPayload = {
      id: sessionId,
      group_id: params.activeGroupId,
      title: `حصة ${todayStr}`,
      date: todayStr,
      time: '00:00',
    };
    const attPayload = attendanceToDb(newRecord);

    if (supabase && this.isOnline()) {
      const client = supabase;
      client
        .from('sessions')
        .upsert(sessionPayload, { onConflict: 'id' })
        .then(
          () => {
            client
              .from('attendance')
              .insert(attPayload)
              .then(
                () => {},
                (err) => {
                  console.warn('Attendance direct sync failed, enqueuing:', err);
                  this.enqueueOfflineSync({ table: 'attendance', action: 'INSERT', payload: attPayload });
                }
              );
          },
          (err) => {
            console.warn('Session direct sync failed, enqueuing:', err);
            this.enqueueOfflineSync({ table: 'sessions', action: 'UPSERT', payload: sessionPayload, onConflict: 'id' });
            this.enqueueOfflineSync({ table: 'attendance', action: 'INSERT', payload: attPayload });
          }
        );
    } else {
      this.enqueueOfflineSync({ table: 'sessions', action: 'UPSERT', payload: sessionPayload, onConflict: 'id' });
      this.enqueueOfflineSync({ table: 'attendance', action: 'INSERT', payload: attPayload });
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

      const dbSub = subscriptionToDb(newSub);
      if (supabase && this.isOnline()) {
        supabase.from('subscriptions').insert(dbSub).then(() => {}, (err) => {
          this.enqueueOfflineSync({ table: 'subscriptions', action: 'INSERT', payload: dbSub });
        });
      } else {
        this.enqueueOfflineSync({ table: 'subscriptions', action: 'INSERT', payload: dbSub });
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

    const dbSub = subscriptionToDb(updated);
    if (supabase && this.isOnline()) {
      supabase.from('subscriptions').upsert(dbSub, { onConflict: 'id' }).then(() => {}, (err) => {
        this.enqueueOfflineSync({ table: 'subscriptions', action: 'UPSERT', payload: dbSub, onConflict: 'id' });
      });
    } else {
      this.enqueueOfflineSync({ table: 'subscriptions', action: 'UPSERT', payload: dbSub, onConflict: 'id' });
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

    const payload = {
      id: newGroup.id,
      name: newGroup.name,
      time: newGroup.time,
      days: newGroup.days,
      academic_year: newGroup.academicYear,
      max_students: newGroup.maxStudents,
    };

    if (supabase && this.isOnline()) {
      supabase.from('groups').insert(payload).then(() => {}, (err) => {
        this.enqueueOfflineSync({ table: 'groups', action: 'INSERT', payload });
      });
    } else {
      this.enqueueOfflineSync({ table: 'groups', action: 'INSERT', payload });
    }
    return newGroup;
  }

  public updateGroup(id: string, groupData: Partial<Group>): Group | null {
    const data = this.getData();
    const index = data.groups.findIndex((g) => g.id === id);
    if (index === -1) return null;

    data.groups[index] = { ...data.groups[index], ...groupData };
    this.saveData(data);

    const payload = {
      name: data.groups[index].name,
      time: data.groups[index].time,
      days: data.groups[index].days,
      academic_year: data.groups[index].academicYear,
      max_students: data.groups[index].maxStudents,
    };

    if (supabase && this.isOnline()) {
      supabase.from('groups').update(payload).eq('id', id).then(() => {}, (err) => {
        this.enqueueOfflineSync({ table: 'groups', action: 'UPDATE', payload, matchKey: 'id', matchVal: id });
      });
    } else {
      this.enqueueOfflineSync({ table: 'groups', action: 'UPDATE', payload, matchKey: 'id', matchVal: id });
    }
    return data.groups[index];
  }

  public deleteGroup(id: string): boolean {
    const data = this.getData();
    data.groups = data.groups.filter((g) => g.id !== id);
    this.saveData(data);

    if (supabase && this.isOnline()) {
      supabase.from('groups').delete().eq('id', id).then(() => {}, (err) => {
        this.enqueueOfflineSync({ table: 'groups', action: 'DELETE', payload: {}, matchKey: 'id', matchVal: id });
      });
    } else {
      this.enqueueOfflineSync({ table: 'groups', action: 'DELETE', payload: {}, matchKey: 'id', matchVal: id });
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
    birthDate?: string;
    photoUrl?: string;
    groupId: string;
    academicYear?: any;
    status?: any;
    notes?: string;
  }): Promise<Student> {
    const data = this.getData();
    let nextCode = '101';

    if (supabase && this.isOnline()) {
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
      birthDate: studentData.birthDate || '',
      photoUrl: studentData.photoUrl || '',
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

    const payload = studentToDb(newStudent);
    if (supabase && this.isOnline()) {
      supabase.from('students').insert(payload).then(() => {}, (err) => {
        this.enqueueOfflineSync({ table: 'students', action: 'INSERT', payload });
      });
    } else {
      this.enqueueOfflineSync({ table: 'students', action: 'INSERT', payload });
    }
    return newStudent;
  }

  public updateStudent(id: string, studentData: Partial<Student>): Student | null {
    const data = this.getData();
    const index = data.students.findIndex((s) => s.id === id);
    if (index === -1) return null;

    data.students[index] = { ...data.students[index], ...studentData };
    this.saveData(data);

    const payload = studentToDb(data.students[index]);
    if (supabase && this.isOnline()) {
      supabase.from('students').update(payload).eq('id', id).then(() => {}, (err) => {
        this.enqueueOfflineSync({ table: 'students', action: 'UPDATE', payload, matchKey: 'id', matchVal: id });
      });
    } else {
      this.enqueueOfflineSync({ table: 'students', action: 'UPDATE', payload, matchKey: 'id', matchVal: id });
    }
    return data.students[index];
  }

  public approveStudent(id: string, markSubscriptionPaid = false): boolean {
    const res = this.updateStudent(id, { status: 'ACTIVE' });
    if (!res) return false;

    const curMonth = getCurrentMonthLabel();
    const data = this.getData();
    const subIndex = data.subscriptions.findIndex((s) => s.studentId === id && s.month === curMonth);
    const price = data.settings?.subscriptionPrice || 250;

    if (subIndex === -1) {
      const newSub: Subscription = {
        id: generateSecureId(`sub-${id}`),
        studentId: id,
        month: curMonth,
        amount: price,
        isPaid: markSubscriptionPaid,
        paidAt: markSubscriptionPaid ? new Date().toISOString() : undefined,
        receivedBy: markSubscriptionPaid ? 'مس نشوى' : undefined,
      };
      data.subscriptions.push(newSub);
      this.saveData(data);

      const dbSub = subscriptionToDb(newSub);
      if (supabase && this.isOnline()) {
        supabase.from('subscriptions').insert(dbSub).then(() => {}, (err) => {
          this.enqueueOfflineSync({ table: 'subscriptions', action: 'INSERT', payload: dbSub });
        });
      } else {
        this.enqueueOfflineSync({ table: 'subscriptions', action: 'INSERT', payload: dbSub });
      }
    } else if (markSubscriptionPaid && !data.subscriptions[subIndex].isPaid) {
      this.toggleSubscription(id, curMonth, 'مس نشوى');
    }

    return true;
  }

  public rejectStudent(id: string): boolean {
    const data = this.getData();
    data.students = data.students.filter((s) => s.id !== id);
    this.saveData(data);

    if (supabase && this.isOnline()) {
      supabase.from('students').delete().eq('id', id).then(() => {}, (err) => {
        this.enqueueOfflineSync({ table: 'students', action: 'DELETE', payload: {}, matchKey: 'id', matchVal: id });
      });
    } else {
      this.enqueueOfflineSync({ table: 'students', action: 'DELETE', payload: {}, matchKey: 'id', matchVal: id });
    }
    return true;
  }

  // --- Profile Edit Requests (Pending Approval Workflow) ---
  public addProfileEditRequest(req: {
    studentId: string;
    studentCode: string;
    originalData: ProfileEditRequest['originalData'];
    proposedData: ProfileEditRequest['proposedData'];
    notes?: string;
  }): ProfileEditRequest {
    const data = this.getData();
    const newReq: ProfileEditRequest = {
      id: generateSecureId('req'),
      studentId: req.studentId,
      studentCode: req.studentCode,
      originalData: req.originalData,
      proposedData: req.proposedData,
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
      notes: req.notes,
    };

    if (!data.profileEditRequests) {
      data.profileEditRequests = [];
    }

    // Keep only the newest pending request for this student
    data.profileEditRequests = [
      newReq,
      ...data.profileEditRequests.filter((r) => r.studentId !== req.studentId || r.status !== 'PENDING'),
    ];

    this.saveData(data);
    return newReq;
  }

  public approveProfileEditRequest(requestId: string): boolean {
    const data = this.getData();
    if (!data.profileEditRequests) return false;
    const req = data.profileEditRequests.find((r) => r.id === requestId);
    if (!req) return false;

    req.status = 'APPROVED';
    req.reviewedAt = new Date().toISOString();

    // Apply proposed changes to the student record
    const studentIdx = data.students.findIndex((s) => s.id === req.studentId);
    if (studentIdx !== -1) {
      data.students[studentIdx] = {
        ...data.students[studentIdx],
        name: req.proposedData.name,
        phone: req.proposedData.phone,
        parentName: req.proposedData.parentName,
        parentPhone: req.proposedData.parentPhone,
        address: req.proposedData.address,
        birthDate: req.proposedData.birthDate,
        photoUrl: req.proposedData.photoUrl || data.students[studentIdx].photoUrl,
        groupId: req.proposedData.groupId || data.students[studentIdx].groupId,
      };

      const payload = studentToDb(data.students[studentIdx]);
      if (supabase && this.isOnline()) {
        supabase.from('students').update(payload).eq('id', req.studentId).then(() => {}, (err) => {
          this.enqueueOfflineSync({ table: 'students', action: 'UPDATE', payload, matchKey: 'id', matchVal: req.studentId });
        });
      } else {
        this.enqueueOfflineSync({ table: 'students', action: 'UPDATE', payload, matchKey: 'id', matchVal: req.studentId });
      }
    }

    this.saveData(data);
    return true;
  }

  public rejectProfileEditRequest(requestId: string): boolean {
    const data = this.getData();
    if (!data.profileEditRequests) return false;
    const req = data.profileEditRequests.find((r) => r.id === requestId);
    if (!req) return false;

    req.status = 'REJECTED';
    req.reviewedAt = new Date().toISOString();
    this.saveData(data);
    return true;
  }

  public getPendingEditRequests(): ProfileEditRequest[] {
    const data = this.getData();
    return (data.profileEditRequests || []).filter((r) => r.status === 'PENDING');
  }

  public getStudentPendingEditRequest(studentId: string): ProfileEditRequest | null {
    const data = this.getData();
    return (data.profileEditRequests || []).find((r) => r.studentId === studentId && r.status === 'PENDING') || null;
  }

  public updateProfileEditRequestMessageId(requestId: string, messageId: number): void {
    const data = this.getData();
    if (!data.profileEditRequests) return;
    const req = data.profileEditRequests.find((r) => r.id === requestId);
    if (req) {
      req.telegramMessageId = messageId;
      this.saveData(data);
    }
  }

  public markExamNotificationSent(resultId: string, type: 'student' | 'parent'): void {
    const data = this.getData();
    const index = data.examResults.findIndex((r) => r.id === resultId);
    if (index === -1) return;

    if (type === 'parent') {
      data.examResults[index].parentNotified = true;
    } else {
      data.examResults[index].studentNotified = true;
    }
    this.saveData(data);

    const updateData = type === 'parent' ? { parent_notified: true } : { student_notified: true };
    if (supabase && this.isOnline()) {
      supabase.from('exam_results').update(updateData).eq('id', resultId).then(() => {}, (err) => {
        this.enqueueOfflineSync({ table: 'exam_results', action: 'UPDATE', payload: updateData, matchKey: 'id', matchVal: resultId });
      });
    } else {
      this.enqueueOfflineSync({ table: 'exam_results', action: 'UPDATE', payload: updateData, matchKey: 'id', matchVal: resultId });
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

    const payload = {
      id: newExam.id,
      title: newExam.title,
      date: newExam.date,
      max_score: total,
      total_score: total,
      academic_year: newExam.academicYear,
      group_id: newExam.groupId,
    };

    if (supabase && this.isOnline()) {
      supabase.from('exams').insert(payload).then(() => {}, (err) => {
        this.enqueueOfflineSync({ table: 'exams', action: 'INSERT', payload });
      });
    } else {
      this.enqueueOfflineSync({ table: 'exams', action: 'INSERT', payload });
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

      const payload = {
        id: data.examResults[index].id,
        exam_id: resultData.examId,
        student_id: resultData.studentId,
        score: resultData.score,
        feedback: resultData.feedback,
        parent_notified: resultData.parentNotified,
        student_notified: resultData.studentNotified,
        graded_at: data.examResults[index].gradedAt,
      };

      if (supabase && this.isOnline()) {
        supabase.from('exam_results').upsert(payload, { onConflict: 'exam_id,student_id' }).then(() => {}, (err) => {
          this.enqueueOfflineSync({ table: 'exam_results', action: 'UPSERT', payload, onConflict: 'exam_id,student_id' });
        });
      } else {
        this.enqueueOfflineSync({ table: 'exam_results', action: 'UPSERT', payload, onConflict: 'exam_id,student_id' });
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

    const payload = {
      id: newResult.id,
      exam_id: newResult.examId,
      student_id: newResult.studentId,
      score: newResult.score,
      feedback: newResult.feedback,
      parent_notified: newResult.parentNotified,
      student_notified: newResult.studentNotified,
      graded_at: newResult.gradedAt,
    };

    if (supabase && this.isOnline()) {
      supabase.from('exam_results').insert(payload).then(() => {}, (err) => {
        this.enqueueOfflineSync({ table: 'exam_results', action: 'INSERT', payload });
      });
    } else {
      this.enqueueOfflineSync({ table: 'exam_results', action: 'INSERT', payload });
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

    const payload = {
      id: 'main_settings',
      teacher_name: data.settings.teacherName,
      subject_name: data.settings.subjectName,
      academic_year_label: data.settings.academicYearLabel,
      subscription_price: data.settings.subscriptionPrice,
      admin_passcode: data.settings.adminPasscode,
      assistant_phone: data.settings.assistantPhone,
      center_location: data.settings.centerLocation,
      require_student_photo: Boolean(data.settings.requireStudentPhoto),
    };

    if (supabase && this.isOnline()) {
      supabase.from('system_settings').upsert(payload, { onConflict: 'id' }).then(() => {}, (err) => {
        this.enqueueOfflineSync({ table: 'system_settings', action: 'UPSERT', payload, onConflict: 'id' });
      });
    } else {
      this.enqueueOfflineSync({ table: 'system_settings', action: 'UPSERT', payload, onConflict: 'id' });
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
      if (supabase && this.isOnline()) {
        supabase.from('attendance').delete().eq('session_id', session.id).then(() => {});
      }
    }
  }

  // --- Backup & Recovery ---
  public exportBackup(): string {
    const data = this.getData();
    const backupObj = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      source: 'nashwa-science-academy',
      data: data,
    };
    return JSON.stringify(backupObj, null, 2);
  }

  public importBackup(jsonString: string): boolean {
    try {
      const validation = validateBackupFile(jsonString);
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
    const currentSettings = this.getSettings();
    const cleanData: SystemData = {
      groups: INITIAL_GROUPS,
      students: [],
      sessions: [],
      attendance: [],
      subscriptions: [],
      exams: [],
      examResults: [],
      settings: currentSettings,
    };
    if (this.isClient()) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanData));
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
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
