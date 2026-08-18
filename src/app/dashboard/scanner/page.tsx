'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '@/lib/storage';
import { sound } from '@/lib/audio';
import { Group, Student, AttendanceRecord, SystemData } from '@/types';
import { 
  QrCode, 
  Camera, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  User, 
  DollarSign, 
  RefreshCw, 
  Info, 
  Sparkles,
  RotateCcw,
  ShieldCheck,
  Check,
  Zap,
  Volume2,
  Calendar,
  Layers,
  UserCheck,
  AlertTriangle,
  Radio,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import confetti from 'canvas-confetti';

interface ScanResultOverlay {
  type: 'SUCCESS_PAID' | 'SUCCESS_UNPAID' | 'ALREADY_RECORDED' | 'DIFFERENT_GROUP' | 'NOT_FOUND' | 'INACTIVE';
  student?: Student;
  subscriptionPaid?: boolean;
  currentMonth?: string;
  timestamp: string;
  recordedAt?: string;
  originalGroupId?: string;
  originalGroupName?: string;
}

export default function ScannerPage() {
  const [data, setData] = useState<SystemData | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Scanner feedback overlay
  const [scanResult, setScanResult] = useState<ScanResultOverlay | null>(null);
  const [recentScans, setRecentScans] = useState<{
    student: Student;
    time: string;
    isPaid: boolean;
    isMakeup: boolean;
    type: string;
  }[]>([]);

  // Emergency manual search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [sessionToast, setSessionToast] = useState<string>('');
  const [liveSyncPulse, setLiveSyncPulse] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedCodeRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  // Sync today's attendance into recentScans
  const syncSessionAttendance = useCallback((groupId: string) => {
    const d = db.getData();
    const todayStr = new Date().toISOString().split('T')[0];
    const sessionAtt = d.attendance.filter(
      (a) => a.groupId === groupId && a.scannedAt.startsWith(todayStr)
    );

    const mapped = sessionAtt.map((rec) => {
      const std = d.students.find((s) => s.id === rec.studentId);
      const sub = d.subscriptions.find((s) => s.studentId === rec.studentId && s.month === 'أكتوبر 2026');
      const isMakeup = rec.status === 'MAKEUP' || (std && std.groupId !== groupId);

      return {
        student: std || { id: rec.studentId, code: '—', name: 'طالب غير معروف', phone: '', parentName: '', parentPhone: '', address: '', academicYear: 'FIRST_SEC', groupId, status: 'ACTIVE', registeredAt: '' },
        time: new Date(rec.scannedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        isPaid: sub ? sub.isPaid : false,
        isMakeup: !!isMakeup,
        type: sub?.isPaid ? 'حضور مسدد' : 'غير مسدد',
      };
    }).reverse();

    setRecentScans(mapped);
  }, []);

  // Load initial data and connect to Realtime Sync Bus
  useEffect(() => {
    const refreshAll = async () => {
      await db.syncFromSupabase();
      const d = db.getData();
      setData(d);
      setGroups(d.groups);
      setStudents(d.students);
      if (selectedGroupId) {
        syncSessionAttendance(selectedGroupId);
      }
    };

    refreshAll();

    const d = db.getData();
    setData(d);
    setGroups(d.groups);
    setStudents(d.students);
    if (d.groups.length > 0 && !selectedGroupId) {
      const defaultGrp = d.groups[0].id;
      setSelectedGroupId(defaultGrp);
      syncSessionAttendance(defaultGrp);
    }

    // 1. Subscribe to Multi-Device Instant Realtime Events (WebSocket < 50ms)
    const unsubscribeBus = db.subscribeToKioskEvents((event) => {
      setLiveSyncPulse(true);
      setTimeout(() => setLiveSyncPulse(false), 2000);

      if (event.type === 'SCAN_RESULT' && event.payload !== undefined) {
        setScanResult(event.payload);
        if (event.payload?.type === 'SUCCESS_PAID') sound.playSuccessChime();
        else if (event.payload?.type === 'SUCCESS_UNPAID' || event.payload?.type === 'DIFFERENT_GROUP') sound.playWarningAlert();
        else if (event.payload?.type === 'ALREADY_RECORDED') sound.playInfoSound();
      } else if (event.type === 'PAYMENT_COLLECTED' && event.payload) {
        setScanResult(event.payload.updatedOverlay || null);
        sound.playSuccessChime();
      }

      // Re-sync attendance list on both devices immediately
      const latestData = db.getData();
      setData(latestData);
      setStudents(latestData.students);
      syncSessionAttendance(selectedGroupId || (latestData.groups[0]?.id ?? ''));
    });

    // 2. Continuous 2-Second Cloud Sync Pulse (Zero-Refresh Guarantee)
    const syncInterval = setInterval(() => {
      db.syncFromSupabase().then(() => {
        const latest = db.getData();
        setData(latest);
        setStudents(latest.students);
        if (selectedGroupId) {
          syncSessionAttendance(selectedGroupId);
        }
      });
    }, 2000);

    return () => {
      unsubscribeBus();
      clearInterval(syncInterval);
    };
  }, [selectedGroupId, syncSessionAttendance]);

  // Handle group change
  const handleGroupChange = (newGroupId: string) => {
    setSelectedGroupId(newGroupId);
    syncSessionAttendance(newGroupId);
    setScanResult(null);
  };

  // Core scan processor
  const processCode = useCallback((rawCode: string, forceMakeup = false) => {
    const cleanCode = rawCode.trim();
    if (!cleanCode) return;

    // Debounce duplicate scans within 2 seconds unless explicit action
    const now = Date.now();
    if (!forceMakeup && cleanCode === lastScannedCodeRef.current && now - lastScanTimeRef.current < 2000) {
      return;
    }
    lastScannedCodeRef.current = cleanCode;
    lastScanTimeRef.current = now;

    const result = db.scanAttendance({
      scannedCode: cleanCode,
      activeGroupId: selectedGroupId,
      deviceId: 'kiosk-scanner',
      allowMakeup: forceMakeup,
    });

    const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const origGrp = result.student ? db.getData().groups.find((g) => g.id === result.student?.groupId) : undefined;

    let overlayData: ScanResultOverlay;

    if (result.type === 'NOT_FOUND') {
      sound.playErrorBeep();
      overlayData = { type: 'NOT_FOUND', timestamp: timeStr };
    } else if (result.type === 'INACTIVE') {
      sound.playWarningAlert();
      overlayData = { type: 'INACTIVE', student: result.student, timestamp: timeStr };
    } else if (result.type === 'DIFFERENT_GROUP') {
      // 🟠 Orange Alert: Student belongs to another group!
      sound.playWarningAlert();
      overlayData = {
        type: 'DIFFERENT_GROUP',
        student: result.student,
        subscriptionPaid: result.subscriptionPaid,
        currentMonth: result.currentMonth,
        originalGroupId: result.student?.groupId,
        originalGroupName: origGrp ? origGrp.name : 'مجموعة أخرى',
        timestamp: timeStr,
      };
    } else if (result.type === 'ALREADY_RECORDED') {
      // 🔵 Blue Alert: Duplicate entry in same session!
      sound.playInfoSound();
      const recordedTime = result.record
        ? new Date(result.record.scannedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        : timeStr;

      overlayData = {
        type: 'ALREADY_RECORDED',
        student: result.student,
        subscriptionPaid: result.subscriptionPaid,
        currentMonth: result.currentMonth,
        timestamp: timeStr,
        recordedAt: recordedTime,
      };
    } else {
      // 🟢 Green or 🔴 Red Alert
      const isMakeup = result.student && result.student.groupId !== selectedGroupId;

      if (result.subscriptionPaid) {
        sound.playSuccessChime();
        try {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.5 } });
        } catch {}
      } else {
        sound.playWarningAlert();
      }

      overlayData = {
        type: result.subscriptionPaid ? 'SUCCESS_PAID' : 'SUCCESS_UNPAID',
        student: result.student,
        subscriptionPaid: result.subscriptionPaid,
        currentMonth: result.currentMonth,
        timestamp: timeStr,
      };

      if (result.student) {
        setRecentScans((prev) => [
          {
            student: result.student!,
            time: timeStr,
            isPaid: !!result.subscriptionPaid,
            isMakeup: !!isMakeup,
            type: result.subscriptionPaid ? 'حضور مسدد' : 'غير مسدد',
          },
          ...prev,
        ]);
      }
    }

    setScanResult(overlayData);

    // Broadcast in real-time to Laptop / other connected screens
    db.broadcastKioskEvent({
      type: 'SCAN_RESULT',
      payload: overlayData,
    });
  }, [selectedGroupId]);

  // Start Camera
  const startCamera = async () => {
    setCameraError('');
    setIsCameraActive(true);

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader-target', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.UPC_A,
          ],
          verbose: false,
        });
      }

      const config = {
        fps: 25,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1.0,
      };

      await html5QrCodeRef.current.start(
        { facingMode: facingMode },
        config,
        (decodedText) => {
          processCode(decodedText);
        },
        () => {}
      );
    } catch (err: any) {
      console.error('Camera start error:', err);
      setIsCameraActive(false);
      setCameraError(
        'تعذر الوصول للكاميرا. يرجى التأكد من إعطاء إذن الكاميرا للمتصفح.'
      );
    }
  };

  // Stop Camera
  const stopCamera = async () => {
    if (html5QrCodeRef.current && isCameraActive) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error('Error stopping camera:', err);
      }
      setIsCameraActive(false);
    }
  };

  // Toggle Camera Front / Back
  const toggleFacingMode = async () => {
    await stopCamera();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    setTimeout(() => {
      startCamera();
    }, 300);
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop().catch(() => {});
        } catch {}
      }
    };
  }, []);

  // Emergency Search handler
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    const cleanQ = q.trim().toLowerCase();
    const matches = students
      .filter((s) => s.status === 'ACTIVE')
      .filter(
        (s) =>
          s.name.toLowerCase().includes(cleanQ) ||
          s.code.includes(cleanQ) ||
          s.phone.includes(cleanQ)
      )
      .slice(0, 5);
    setSearchResults(matches);
  };

  // Instant Cash Payment Collector (From Mobile or Laptop)
  const handleCollectCash = (studentId: string) => {
    db.toggleSubscription(studentId, 'أكتوبر 2026', 'مس نشوى');
    sound.playSuccessChime();
    try {
      confetti({ particleCount: 50, spread: 60 });
    } catch {}

    const updatedOverlay: ScanResultOverlay | null = scanResult
      ? { ...scanResult, type: 'SUCCESS_PAID', subscriptionPaid: true }
      : null;

    setScanResult(updatedOverlay);
    setRecentScans((prev) =>
      prev.map((r) => (r.student.id === studentId ? { ...r, isPaid: true, type: 'تم السداد كاش 💵' } : r))
    );

    // Broadcast payment confirmation to all screens
    db.broadcastKioskEvent({
      type: 'PAYMENT_COLLECTED',
      payload: { studentId, updatedOverlay },
    });
  };

  // Accept Makeup Session (حضور تعويض من مجموعة أخرى)
  const handleAcceptMakeup = (studentCode: string) => {
    processCode(studentCode, true);
  };

  // Skip / Dismiss Overlay
  const handleDismissOverlay = () => {
    setScanResult(null);
    db.broadcastKioskEvent({ type: 'SCAN_RESULT', payload: null });
  };

  // Reset / Clear Today's Session Attendance
  const handleResetSession = () => {
    if (confirm('هل ترغب في إعادة تعيين كشف الحضور لهذه الحصة للبدء من جديد؟')) {
      db.clearSessionAttendance(selectedGroupId);
      setRecentScans([]);
      setScanResult(null);
      setSessionToast('تمت إعادة تعيين حضور الحصة بنجاح! يمكنك مسح الطلاب مجدداً الآن 🔄');
      setTimeout(() => setSessionToast(''), 4000);
      sound.playSuccessChime();
      db.broadcastKioskEvent({ type: 'ATTENDANCE_UPDATE', payload: {} });
    }
  };

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const groupStudentsCount = students.filter((s) => s.groupId === selectedGroupId && s.status === 'ACTIVE').length;
  const attendedCount = recentScans.length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Top Bar: Group Selector & Live Sync Indicator */}
      <div className="liquid-glass rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-cyan-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-xs font-bold">
              <QrCode className="w-3.5 h-3.5 text-cyan-500" />
              <span>كشك الحضور والاسكانر الفوري</span>
            </span>

            {/* Live Sync Badge between Mobile and Laptop */}
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border transition-all ${
              liveSyncPulse 
                ? 'bg-emerald-500 text-white border-emerald-400 scale-105' 
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
            }`}>
              <Radio className="w-3 h-3 animate-pulse" />
              <span>المزامنة اللحظية نشطة (موبايل + لابتوب)</span>
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            📅 {new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Group Dropdown */}
          <select
            value={selectedGroupId}
            onChange={(e) => handleGroupChange(e.target.value)}
            className="flex-1 sm:w-64 px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none shadow-xs"
          >
            {groups.map((grp) => (
              <option key={grp.id} value={grp.id}>
                {grp.name} ({grp.time})
              </option>
            ))}
          </select>

          <button
            onClick={handleResetSession}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition flex items-center gap-1.5"
            title="إعادة تعيين حضور الحصة للبدء من جديد"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">بدء من جديد</span>
          </button>
        </div>
      </div>

      {sessionToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-sm animate-ios-spring">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{sessionToast}</span>
        </div>
      )}

      {/* Main Scanner Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Camera Viewport & The 4 Live Action Alert Cards */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-950 rounded-3xl p-5 sm:p-7 text-white relative overflow-hidden shadow-2xl border border-slate-800 min-h-[480px] flex flex-col justify-between">
            
            {/* THE 4 DISTINCT REAL-TIME ACTION ALERT CARDS */}
            {scanResult && (
              <div
                className={`absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center transition-all animate-ios-spring ${
                  scanResult.type === 'SUCCESS_PAID'
                    ? 'bg-slate-950/95 border-4 border-emerald-500 text-white'
                    : scanResult.type === 'SUCCESS_UNPAID'
                    ? 'bg-slate-950/95 border-4 border-rose-500 text-white'
                    : scanResult.type === 'DIFFERENT_GROUP'
                    ? 'bg-slate-950/95 border-4 border-amber-500 text-white'
                    : scanResult.type === 'ALREADY_RECORDED'
                    ? 'bg-slate-950/95 border-4 border-sky-500 text-white'
                    : 'bg-slate-900/95 border-2 border-slate-700 text-white'
                }`}
              >
                {/* 🟢 1. GREEN ALERT: Success & Fully Paid */}
                {scanResult.type === 'SUCCESS_PAID' && (
                  <div className="space-y-4 max-w-md mx-auto">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/50 scale-110 border-2 border-white/30">
                      <CheckCircle2 className="w-12 h-12 text-white" />
                    </div>

                    <div className="space-y-1">
                      <span className="px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black">
                        تم القبول وتسجيل الحضور ✅
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black mt-2">{scanResult.student?.name}</h2>
                      <p className="text-xs text-slate-300 font-mono">كود الطالب: #{scanResult.student?.code} • {scanResult.student?.phone}</p>
                    </div>

                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-bold">
                      <DollarSign className="w-4 h-4" />
                      <span>الاشتراك مسدد لشهر ({scanResult.currentMonth}) 💵</span>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={handleDismissOverlay}
                        className="px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold transition"
                      >
                        إغلاق ومسح الطالب التالي ⏭️
                      </button>
                    </div>
                  </div>
                )}

                {/* 🔴 2. RED ALERT: Present But Unpaid Subscription */}
                {scanResult.type === 'SUCCESS_UNPAID' && (
                  <div className="space-y-4 max-w-md mx-auto">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center mx-auto shadow-2xl shadow-rose-500/50 scale-110 border-2 border-white/30">
                      <AlertCircle className="w-12 h-12 text-white" />
                    </div>

                    <div className="space-y-1">
                      <span className="px-3.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-black">
                        ⚠️ تنبيه: اشتراك الشهر غير مسدد (250 جنيه)
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black mt-2">{scanResult.student?.name}</h2>
                      <p className="text-xs text-slate-300 font-mono">كود: #{scanResult.student?.code} • {scanResult.student?.phone}</p>
                    </div>

                    {/* Instant 1-Click Action Buttons */}
                    <div className="space-y-2 pt-2">
                      <button
                        onClick={() => handleCollectCash(scanResult.student!.id)}
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white font-black text-sm shadow-xl shadow-emerald-500/30 transition flex items-center justify-center gap-2 border border-emerald-400/30"
                      >
                        <DollarSign className="w-5 h-5" />
                        استلام 250 جنيه كاش وتأكيد السداد فوراً 💵
                      </button>

                      <button
                        onClick={handleDismissOverlay}
                        className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold transition"
                      >
                        السماح بالدخول وتأجيل الدفع مؤقتاً ⏳
                      </button>
                    </div>
                  </div>
                )}

                {/* 🔵 3. BLUE ALERT: Duplicate Scan / Already Attended */}
                {scanResult.type === 'ALREADY_RECORDED' && (
                  <div className="space-y-4 max-w-md mx-auto">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center mx-auto shadow-2xl shadow-sky-500/50 scale-110 border-2 border-white/30">
                      <AlertTriangle className="w-12 h-12 text-white" />
                    </div>

                    <div className="space-y-1">
                      <span className="px-3.5 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-black">
                        ⛔ تنبيه: كارت مكرر - الطالب مسجل دخول مسبقاً!
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black mt-2">{scanResult.student?.name}</h2>
                      <p className="text-xs text-sky-300 font-bold bg-sky-950/80 py-1.5 px-4 rounded-xl inline-block mt-2 border border-sky-500/30">
                        تم تسجيل حضور هذا الطالب مسبقاً الساعة [{scanResult.recordedAt}]
                      </p>
                    </div>

                    <p className="text-xs text-slate-300 bg-white/10 p-3 rounded-2xl border border-white/10">
                      🛑 يرجى إيقاف الطالب والتحقق من هويته لمنع استخدام نفس الكارت لأكثر من شخص.
                    </p>

                    <div className="pt-2">
                      <button
                        onClick={handleDismissOverlay}
                        className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition"
                      >
                        تم التحقق وإغلاق التنبيه ✅
                      </button>
                    </div>
                  </div>
                )}

                {/* 🟠 4. ORANGE ALERT: Different Group / Makeup Needed */}
                {scanResult.type === 'DIFFERENT_GROUP' && (
                  <div className="space-y-4 max-w-md mx-auto">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center mx-auto shadow-2xl shadow-amber-500/50 scale-110 border-2 border-white/30">
                      <RefreshCw className="w-12 h-12 text-white" />
                    </div>

                    <div className="space-y-1">
                      <span className="px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black">
                        🔄 تنبيه: الطالب مسجل في مجموعة أخرى!
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black mt-2">{scanResult.student?.name}</h2>
                      <p className="text-xs text-amber-300 font-bold bg-amber-950/80 py-1 px-3 rounded-lg inline-block mt-1">
                        مجموعته الأصلية: {scanResult.originalGroupName}
                      </p>
                    </div>

                    {/* Action 1 & Action 2 */}
                    <div className="space-y-2 pt-2">
                      <button
                        onClick={() => handleAcceptMakeup(scanResult.student!.code)}
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-white font-black text-xs shadow-xl shadow-amber-500/30 transition flex items-center justify-center gap-2 border border-amber-400/30"
                      >
                        <Check className="w-4 h-4" />
                        قبول الطالب كـ (حضور تعويض) في حصة اليوم ✅
                      </button>

                      <button
                        onClick={handleDismissOverlay}
                        className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4 text-rose-400" />
                        تفادي الحصة وانتظار موعد مجموعته ⛔
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. Not Found */}
                {scanResult.type === 'NOT_FOUND' && (
                  <div className="space-y-3">
                    <AlertCircle className="w-16 h-16 mx-auto text-rose-400" />
                    <h2 className="text-xl font-bold">كود غير مسجل!</h2>
                    <p className="text-xs text-slate-300">لم يتم العثور على طالب بهذا الكود أو أن الاستمارة قيد المراجعة.</p>
                    <button onClick={handleDismissOverlay} className="px-5 py-2 bg-white/10 rounded-xl text-xs font-bold mt-2">
                      إغلاق
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Camera Controls Bar */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-300 font-bold">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  كاميرا مسح الباركود والـ QR
                </span>
                {isCameraActive && (
                  <button
                    onClick={toggleFacingMode}
                    className="text-[11px] text-cyan-300 hover:text-cyan-200 flex items-center gap-1 bg-white/10 px-3 py-1 rounded-xl transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    تبديل الكاميرا
                  </button>
                )}
              </div>

              {/* Camera Target Container */}
              <div className="relative w-full max-w-[320px] aspect-square mx-auto rounded-3xl overflow-hidden bg-black/90 border-2 border-dashed border-cyan-500/40 flex items-center justify-center shadow-inner">
                <div id="qr-reader-target" className="w-full h-full" />

                {isCameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-52 h-52 border-2 border-cyan-400/80 rounded-2xl relative">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-300" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-300" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-300" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-300" />
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent absolute top-1/2 -translate-y-1/2 animate-laser" />
                    </div>
                  </div>
                )}

                {!isCameraActive && (
                  <div className="text-center p-6 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
                      <QrCode className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-sm text-slate-200">الكاميرا متوقفة</p>
                      <p className="text-[11px] text-slate-400">اضغط لتشغيل الكاميرا ومسح كروت الطلاب</p>
                    </div>
                    <button
                      onClick={startCamera}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white font-black text-xs shadow-lg shadow-emerald-500/30 transition flex items-center gap-2 mx-auto"
                    >
                      <Camera className="w-4 h-4" />
                      تشغيل الكاميرا 📹
                    </button>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}

              {isCameraActive && (
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    onClick={stopCamera}
                    className="px-4 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-700 text-white font-bold text-xs transition"
                  >
                    إيقاف الكاميرا ⏹️
                  </button>
                </div>
              )}
            </div>

            {/* Quick Demo Test Buttons for All 4 Cases */}
            <div className="pt-3 border-t border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 block mb-1.5">
                ⚡ تجربة سريعة للحالات الأربعة:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => processCode('101')}
                  className="p-2 rounded-xl bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/80 text-[11px] font-bold transition text-center"
                >
                  🟢 101 مسدد
                </button>
                <button
                  onClick={() => processCode('102')}
                  className="p-2 rounded-xl bg-rose-950/60 text-rose-300 border border-rose-800/60 hover:bg-rose-900/80 text-[11px] font-bold transition text-center"
                >
                  🔴 102 غير مسدد
                </button>
                <button
                  onClick={() => processCode('101')}
                  className="p-2 rounded-xl bg-sky-950/60 text-sky-300 border border-sky-800/60 hover:bg-sky-900/80 text-[11px] font-bold transition text-center"
                >
                  🔵 دخول مكرر
                </button>
                <button
                  onClick={() => processCode('103')}
                  className="p-2 rounded-xl bg-amber-950/60 text-amber-300 border border-amber-800/60 hover:bg-amber-900/80 text-[11px] font-bold transition text-center"
                >
                  🟠 مجموعة أخرى
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Emergency Search & Live Session Attendees */}
        <div className="lg:col-span-5 space-y-6">
          {/* Emergency Fast Search */}
          <div className="liquid-glass rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-brand-600 dark:text-cyan-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">البحث اليدوي السريع للطوارئ</h2>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              إذا نسي الطالب الكارت، ابحث باسمه لتسجيل حضوره بنقرة واحدة:
            </p>

            <div className="relative">
              <input
                type="text"
                placeholder="اكتب اسم الطالب أو الكود..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="divide-y divide-slate-100 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800">
                {searchResults.map((std) => (
                  <div key={std.id} className="p-2.5 flex items-center justify-between hover:bg-white dark:hover:bg-slate-700 transition">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{std.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">كود: #{std.code} • {std.phone}</p>
                    </div>
                    <button
                      onClick={() => {
                        processCode(std.code);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="px-3 py-1 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-bold shadow-xs"
                    >
                      تسجيل حضور ✅
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Session Attendance Feed */}
          <div className="liquid-glass rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                سجل الحاضرين في الحصة ({recentScans.length})
              </h2>
              <span className="text-xs font-black text-brand-700 dark:text-cyan-400 bg-brand-50 dark:bg-brand-950/80 px-2.5 py-1 rounded-xl border border-brand-200/60 dark:border-cyan-500/30">
                {attendedCount} / {groupStudentsCount} طالب
              </span>
            </div>

            {recentScans.length === 0 ? (
              <div className="text-center py-8 text-slate-400 space-y-2 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <QrCode className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-semibold">بانتظار مسح كروت الطلاب لهذه الحصة...</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {recentScans.map((scan, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between text-xs hover:bg-white dark:hover:bg-slate-700 transition"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-slate-900 dark:text-white">{scan.student.name}</p>
                        {scan.isMakeup && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                            تعويض
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">
                        كود: #{scan.student.code} • الساعة {scan.time}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          scan.isPaid
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {scan.isPaid ? 'مسدد ✅' : 'غير مسدد ⚠️'}
                      </span>

                      {!scan.isPaid && (
                        <button
                          onClick={() => handleCollectCash(scan.student.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] hover:bg-emerald-700 transition shadow-2xs"
                          title="استلام كاش 250 جنيه وتسجيل السداد فوراً"
                        >
                          تحصيل 💵
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
