'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { db, getCurrentMonthLabel } from '@/lib/storage';
import { sound } from '@/lib/audio';
import { Group, Student, AttendanceRecord, SystemData } from '@/types';
import { 
  QrCode, 
  Camera, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  DollarSign, 
  RefreshCw, 
  RotateCcw, 
  Check, 
  Zap, 
  AlertTriangle, 
  Radio, 
  XCircle, 
  Barcode, 
  Keyboard,
  Flashlight,
  Maximize2,
  Minimize2,
  Sparkles,
  Smartphone,
  Eye,
  CheckCheck,
  Image as ImageIcon
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

  // Camera & Device hardware states
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [isStandMode, setIsStandMode] = useState<boolean>(false);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);

  // Scanner feedback overlay
  const [scanResult, setScanResult] = useState<ScanResultOverlay | null>(null);
  const [autoDismissTimer, setAutoDismissTimer] = useState<number>(0);
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
  const [hardwareScanToast, setHardwareScanToast] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const wakeLockRef = useRef<any>(null);
  const lastScannedCodeRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const dismissTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Keep Screen Awake on Stand (Screen Wake Lock API)
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        setWakeLockActive(true);
        wakeLockRef.current.addEventListener('release', () => {
          setWakeLockActive(false);
        });
      } catch {
        setWakeLockActive(false);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  };

  useEffect(() => {
    requestWakeLock();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isCameraActive) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isCameraActive]);

  // Sync today's attendance into recentScans
  const syncSessionAttendance = useCallback((groupId: string) => {
    const d = db.getData();
    const todayStr = new Date().toISOString().split('T')[0];
    const sessionAtt = d.attendance.filter(
      (a) => a.groupId === groupId && a.scannedAt.startsWith(todayStr)
    );
    const curMonth = getCurrentMonthLabel();

    const mapped = sessionAtt.map((rec) => {
      const std = d.students.find((s) => s.id === rec.studentId);
      const sub = d.subscriptions.find((s) => s.studentId === rec.studentId && s.month === curMonth);
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

        // Auto-dismiss popup after 3 seconds on stand
        if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
        dismissTimeoutRef.current = setTimeout(() => {
          setScanResult(null);
        }, 3500);
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
      if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    };
  }, [selectedGroupId, syncSessionAttendance]);

  // Handle group change
  const handleGroupChange = (newGroupId: string) => {
    setSelectedGroupId(newGroupId);
    syncSessionAttendance(newGroupId);
    setScanResult(null);
  };

  // Core scan processor - Continuous & Non-Blocking for real-world stand queue
  const processCode = useCallback((rawCode: string, forceMakeup = false) => {
    const cleanCode = rawCode.trim();
    if (!cleanCode) return;

    sound.unlockAudio();

    // Debounce duplicate scans of the exact same code within 2.5 seconds
    const now = Date.now();
    if (!forceMakeup && cleanCode === lastScannedCodeRef.current && now - lastScanTimeRef.current < 2500) {
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
          confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
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

    // Auto-clear overlay after 3 seconds so screen is fresh for next student
    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    dismissTimeoutRef.current = setTimeout(() => {
      setScanResult(null);
    }, 3500);

    // Broadcast in real-time to Laptop / other connected screens
    db.broadcastKioskEvent({
      type: 'SCAN_RESULT',
      payload: overlayData,
    });
  }, [selectedGroupId]);

  // Global Hardware USB / Bluetooth Laser Barcode Scanner Listener
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputActive = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (barcodeBuffer.trim().length >= 1) {
          const code = barcodeBuffer.trim();
          barcodeBuffer = '';
          setHardwareScanToast(true);
          setTimeout(() => setHardwareScanToast(false), 2000);
          processCode(code);
          if (!isInputActive) e.preventDefault();
        }
      } else if (e.key.length === 1) {
        if (timeDiff > 140 && !isInputActive) {
          barcodeBuffer = '';
        }
        if (!isInputActive) {
          barcodeBuffer += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [processCode]);

  // Start Camera with High-Speed Hardware Accelerated Barcode Decoding
  const startCamera = async () => {
    sound.unlockAudio();
    requestWakeLock();
    setCameraError('');
    setIsCameraActive(true);

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader-target', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.ITF,
          ],
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });
      }

      const config = {
        fps: 30,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const w = Math.floor(Math.min(viewfinderWidth * 0.92, 340));
          const h = Math.floor(Math.min(viewfinderHeight * 0.7, 230));
          return { width: w, height: h };
        },
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
        'تعذر تشغيل الكاميرا. يرجى التأكد من منح الإذن للمتصفح أو استخدام مسدس الباركود USB.'
      );
    }
  };

  // Stop Camera
  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error('Error stopping camera:', err);
      }
      setIsCameraActive(false);
    }
    releaseWakeLock();
  };

  // Toggle Camera Front / Back
  const toggleFacingMode = async () => {
    await stopCamera();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    setTimeout(() => {
      startCamera();
    }, 300);
  };

  // Toggle Camera Flashlight (Torch)
  const toggleTorch = async () => {
    if (html5QrCodeRef.current && isCameraActive) {
      try {
        const nextState = !isTorchOn;
        await html5QrCodeRef.current.applyVideoConstraints({
          // @ts-ignore
          advanced: [{ torch: nextState }],
        });
        setIsTorchOn(nextState);
      } catch {
        alert('الفلاش غير مدعوم في هذا المتصفح أو الكاميرا');
      }
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop().catch(() => {});
          }
          html5QrCodeRef.current.clear();
        } catch {}
      }
      releaseWakeLock();
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
    sound.unlockAudio();
    const curMonth = getCurrentMonthLabel();
    db.toggleSubscription(studentId, curMonth, 'مس نشوى');
    sound.playSuccessChime();
    try {
      confetti({ particleCount: 40, spread: 50 });
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

  // Upload Image File to Decode QR / Barcode
  const handleScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader-target', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.ITF,
          ],
          verbose: false,
        });
      }

      const decodedText = await html5QrCodeRef.current.scanFile(file, true);
      processCode(decodedText);
    } catch {
      alert('لم يتم العثور على رمز باركود أو QR واضح في هذه الصورة. يرجى اختيار صورة أو لقطة شاشة أخرى أو تشغيل الكاميرا.');
    } finally {
      e.target.value = '';
    }
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
    <div className={`space-y-4 max-w-6xl mx-auto py-1 ${isStandMode ? 'fixed inset-0 z-50 bg-slate-950 p-3 overflow-y-auto' : ''}`}>
      {/* Top Bar: Group Selector & Live Sync Indicator */}
      <div className="liquid-glass rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-black">
              <QrCode className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>كشك الحضور والاسكانر</span>
            </span>

            {/* Live Sync Badge between Mobile and Laptop */}
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border transition-all ${
              liveSyncPulse 
                ? 'bg-emerald-600 text-white border-emerald-500 scale-105' 
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
            }`}>
              <Radio className="w-3 h-3 animate-pulse text-emerald-500 dark:text-emerald-300" />
              <span>مزامنة سحابية لحظية (موبايل + لابتوب)</span>
            </span>

            {wakeLockActive && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                <Smartphone className="w-3 h-3 text-amber-600" />
                <span>الشاشة مضاءة دائماً (مانع القفل نشط 💡)</span>
              </span>
            )}
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
            className="flex-1 sm:flex-initial px-3.5 py-2.5 text-xs font-bold rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 shadow-2xs"
          >
            {groups.map((grp) => (
              <option key={grp.id} value={grp.id}>
                {grp.name}
              </option>
            ))}
          </select>

          {/* Stand Mode Fullscreen Toggle */}
          <button
            onClick={() => setIsStandMode(!isStandMode)}
            className={`px-3 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 border shadow-2xs ${
              isStandMode
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50'
            }`}
            title="وضع الستاند الكامل للموبايل"
          >
            {isStandMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5 text-brand-600 dark:text-cyan-400" />}
            <span>{isStandMode ? 'خروج من الستاند' : 'وضع الستاند 📱'}</span>
          </button>

          <button
            onClick={handleResetSession}
            className="px-3 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-600 text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
            title="إعادة تعيين حضور الحصة"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">تصفير</span>
          </button>
        </div>
      </div>

      {sessionToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold text-center animate-ios-spring">
          {sessionToast}
        </div>
      )}

      {hardwareScanToast && (
        <div className="p-3 rounded-2xl bg-cyan-50 dark:bg-cyan-950/80 border border-cyan-300 dark:border-cyan-700 text-cyan-800 dark:text-cyan-200 text-xs font-bold text-center animate-ios-spring flex items-center justify-center gap-2">
          <Barcode className="w-4 h-4 text-cyan-500 animate-pulse" />
          <span>تم التقاط الباركود من قارئ الليزر بنجاح ⚡</span>
        </div>
      )}

      {/* Main Grid: Left Scanner Feed & Right Live Log (1.5fr / 1fr) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 items-start">
        {/* LEFT COLUMN: Camera & Scan Area */}
        <div className="space-y-4">
          <div className="liquid-glass rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">عين الكاميرا الذكية</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">وجه كارت الطالب أمام الكاميرا للمسح التلقائي المستمر</p>
                </div>
              </div>

              {/* Camera Controls */}
              <div className="flex items-center gap-1.5">
                {isCameraActive && (
                  <>
                    <button
                      onClick={toggleTorch}
                      className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                        isTorchOn ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                      title="تشغيل / إطفاء الفلاش"
                    >
                      <Flashlight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={toggleFacingMode}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1"
                      title="تبديل الكاميرا (أمامية / خلفية)"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}

                <label
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="مسح باركود أو QR من صورة / لقطة شاشة"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden sm:inline">من صورة</span>
                  <input type="file" accept="image/*" onChange={handleScanFile} className="hidden" />
                </label>

                <button
                  onClick={isCameraActive ? stopCamera : startCamera}
                  className={`px-4 py-2 rounded-2xl text-xs font-black transition flex items-center gap-1.5 active:scale-95 shadow-xs ${
                    isCameraActive
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white shadow-emerald-600/20'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{isCameraActive ? 'إيقاف ⏹️' : 'تشغيل الكاميرا 📷'}</span>
                </button>
              </div>
            </div>

            {cameraError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Video Viewfinder Container */}
            <div className={`relative rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800 shadow-inner ${isStandMode ? 'min-h-[380px]' : 'min-h-[290px]'}`}>
              <div id="qr-reader-target" className="w-full h-full min-h-[290px]" />

              {/* Floating Quick Scan Overlay Banner on top of Camera */}
              {scanResult && isCameraActive && (
                <div className="absolute top-3 inset-x-3 z-30 animate-ios-spring">
                  <div className={`p-4 rounded-2xl border-2 shadow-2xl backdrop-blur-md text-white flex items-center justify-between gap-3 ${
                    scanResult.type === 'SUCCESS_PAID'
                      ? 'bg-emerald-950/90 border-emerald-500 shadow-emerald-500/30'
                      : scanResult.type === 'SUCCESS_UNPAID'
                      ? 'bg-rose-950/90 border-rose-500 shadow-rose-500/30'
                      : scanResult.type === 'ALREADY_RECORDED'
                      ? 'bg-blue-950/90 border-blue-500 shadow-blue-500/30'
                      : scanResult.type === 'DIFFERENT_GROUP'
                      ? 'bg-amber-950/90 border-amber-500 shadow-amber-500/30'
                      : 'bg-slate-900/90 border-slate-700'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                        {scanResult.type === 'SUCCESS_PAID' && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
                        {scanResult.type === 'SUCCESS_UNPAID' && <AlertCircle className="w-6 h-6 text-rose-400" />}
                        {scanResult.type === 'ALREADY_RECORDED' && <Clock className="w-6 h-6 text-blue-400" />}
                        {scanResult.type === 'DIFFERENT_GROUP' && <AlertTriangle className="w-6 h-6 text-amber-400" />}
                        {scanResult.type === 'NOT_FOUND' && <XCircle className="w-6 h-6 text-slate-400" />}
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs text-white/80">#{scanResult.student?.code}</span>
                          <h4 className="font-black text-sm text-white">{scanResult.student?.name || 'كود غير مسجل'}</h4>
                        </div>
                        <p className="text-[11px] text-white/80 font-bold mt-0.5">
                          {scanResult.type === 'SUCCESS_PAID' && 'تم القبول وتسجيل الحضور ✅ (مسدد)'}
                          {scanResult.type === 'SUCCESS_UNPAID' && '⚠️ اشتراك الشهر غير مسدد (250 جنيه)'}
                          {scanResult.type === 'ALREADY_RECORDED' && '⛔ كارت مكرر تم تسجيله مسبقاً اليوم'}
                          {scanResult.type === 'DIFFERENT_GROUP' && `🔄 طالب في (${scanResult.originalGroupName})`}
                          {scanResult.type === 'NOT_FOUND' && 'الكود غير موجود في المنصة'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleDismissOverlay}
                      className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition shrink-0"
                    >
                      تخطي ⏩
                    </button>
                  </div>
                </div>
              )}

              {!isCameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-950/90 backdrop-blur-xs">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800/80 text-emerald-400 flex items-center justify-center shadow-lg border border-white/10">
                    <Barcode className="w-7 h-7 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-white">الكاميرا في وضع الاستعداد</p>
                    <p className="text-[11px] text-slate-400 max-w-xs">
                      اضغط على &quot;تشغيل الكاميرا&quot; لبدء المسح التلقائي على الستاند، أو استخدم مسدس الليزر
                    </p>
                  </div>
                  <button
                    onClick={startCamera}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs shadow-md shadow-emerald-600/30 active:scale-95 transition"
                  >
                    بدء المسح الآن 📷
                  </button>
                </div>
              )}
            </div>

            {/* Quick Test Barcode Simulation (Collapsed for Clean Stand View) */}
            <details className="pt-2 border-t border-slate-200/50 dark:border-slate-800 text-xs group">
              <summary className="font-bold text-slate-500 dark:text-slate-400 cursor-pointer flex items-center justify-between py-1 hover:text-slate-800 dark:hover:text-slate-200 transition">
                <span>🛠️ أدوات الاختبار والمحاكاة التجريبية</span>
                <span className="text-[10px] text-brand-600 dark:text-cyan-400 font-bold">عرض الأكواد ▾</span>
              </summary>
              <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => processCode('101')}
                  className="py-2 px-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-center transition"
                >
                  🟢 1. مسدد ومقبول (#101)
                </button>
                <button
                  onClick={() => processCode('102')}
                  className="py-2 px-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-bold text-center transition"
                >
                  🔴 2. غير مسدد (#102)
                </button>
                <button
                  onClick={() => processCode('103')}
                  className="py-2 px-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-bold text-center transition"
                >
                  🟠 3. مجموعة أخرى (#103)
                </button>
                <button
                  onClick={() => processCode('999')}
                  className="py-2 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-center transition"
                >
                  ⚪ 4. كود غير مسجل
                </button>
              </div>
            </details>
          </div>

          {/* Emergency Manual Search Bar */}
          <div className="liquid-glass rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>بحث يدوي بالاسم أو الكود (في حالة نسيان الكارت):</span>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="اكتب اسم الطالب أو الكود أو رقم الهاتف..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:border-brand-500 shadow-inner"
              />
            </div>

            {searchResults.length > 0 && (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg">
                {searchResults.map((std) => (
                  <div
                    key={std.id}
                    className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-brand-600 dark:text-cyan-400">#{std.code}</span>
                        <p className="font-bold text-slate-900 dark:text-white">{std.name}</p>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono">{std.phone}</p>
                    </div>

                    <button
                      onClick={() => {
                        processCode(std.code);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-xs"
                    >
                      تسجيل الحضور ✅
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: 4-STATE HOLO FEEDBACK CARD & LIVE SESSION LOG */}
        <div className="space-y-4 lg:sticky lg:top-[76px]">
          {/* 1. DYNAMIC COLOR-CODED SCAN RESULT CARD (The 4 Distinct Alert States) */}
          {scanResult ? (
            <div className="animate-ios-spring space-y-3">
              {/* 🟢 STATE 1: SUCCESS & PAID */}
              {scanResult.type === 'SUCCESS_PAID' && (
                <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-teal-500/10 border-2 border-emerald-500 shadow-2xl shadow-emerald-500/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-600 text-white flex items-center gap-1.5 shadow-md">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>تم القبول وتسجيل الحضور ✅</span>
                    </span>
                    <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 font-bold">
                      {scanResult.timestamp}
                    </span>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                      #{scanResult.student?.code}
                    </span>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                      {scanResult.student?.name}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                      {selectedGroup?.name}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center justify-between">
                    <span>حالة الاشتراك الشهري:</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      <span>مسدد بالكامل ({scanResult.currentMonth})</span>
                    </span>
                  </div>

                  <button
                    onClick={handleDismissOverlay}
                    className="w-full py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
                  >
                    إغلاق ومتابعة المسح ⏩
                  </button>
                </div>
              )}

              {/* 🔴 STATE 2: SUCCESS & UNPAID (250 EGP Prompt) */}
              {scanResult.type === 'SUCCESS_UNPAID' && (
                <div className="p-6 rounded-3xl bg-gradient-to-br from-rose-500/20 via-rose-500/10 to-orange-500/10 border-2 border-rose-500 shadow-2xl shadow-rose-500/25 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-600 text-white flex items-center gap-1.5 shadow-md">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>⚠️ تنبيه: اشتراك الشهر غير مسدد (250 ج)</span>
                    </span>
                    <span className="text-[11px] font-mono text-rose-600 dark:text-rose-300 font-bold">
                      {scanResult.timestamp}
                    </span>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="text-xs font-mono font-black text-rose-600 dark:text-rose-400">
                      #{scanResult.student?.code}
                    </span>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                      {scanResult.student?.name}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                      {selectedGroup?.name}
                    </p>
                  </div>

                  {/* 1-Click Action Buttons */}
                  <div className="space-y-2 pt-1">
                    <button
                      onClick={() => handleCollectCash(scanResult.student!.id)}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-black text-sm shadow-lg shadow-emerald-600/30 transition active:scale-95 flex items-center justify-center gap-2"
                    >
                      <DollarSign className="w-5 h-5" />
                      <span>💵 استلام 250 جنيه كاش وتأكيد السداد فوراً</span>
                    </button>

                    <button
                      onClick={handleDismissOverlay}
                      className="w-full py-2.5 rounded-2xl bg-white/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-white transition border border-slate-200 dark:border-slate-700"
                    >
                      السماح بالدخول اليوم وتأجيل الدفع مؤقتاً ⏳
                    </button>
                  </div>
                </div>
              )}

              {/* 🔵 STATE 3: DUPLICATE ENTRY (Already Recorded Today) */}
              {scanResult.type === 'ALREADY_RECORDED' && (
                <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-indigo-500/10 border-2 border-blue-500 shadow-2xl shadow-blue-500/25 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-600 text-white flex items-center gap-1.5 shadow-md">
                      <Clock className="w-3.5 h-3.5" />
                      <span>⛔ كارت مكرر: الطالب مسجل دخول مسبقاً!</span>
                    </span>
                    <span className="text-[11px] font-mono text-blue-600 dark:text-blue-300 font-bold">
                      {scanResult.timestamp}
                    </span>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="text-xs font-mono font-black text-blue-600 dark:text-blue-400">
                      #{scanResult.student?.code}
                    </span>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                      {scanResult.student?.name}
                    </h3>
                    <p className="text-xs text-blue-800 dark:text-blue-200 font-bold">
                      تم تسجيل حضور هذا الكارت اليوم في تمام الساعة ({scanResult.recordedAt})
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200 text-xs">
                    🛑 <b>تنبيه أمان:</b> يرجى التحقق من هوية الطالب لمنع تمرير نفس الكارت لأكثر من شخص.
                  </div>

                  <button
                    onClick={handleDismissOverlay}
                    className="w-full py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
                  >
                    حسناً، تم التحقق ✅
                  </button>
                </div>
              )}

              {/* 🟠 STATE 4: DIFFERENT GROUP (Make-up Alert) */}
              {scanResult.type === 'DIFFERENT_GROUP' && (
                <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-orange-500/10 border-2 border-amber-500 shadow-2xl shadow-amber-500/25 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-600 text-white flex items-center gap-1.5 shadow-md">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>🔄 تنبيه: الطالب مسجل في مجموعة أخرى!</span>
                    </span>
                    <span className="text-[11px] font-mono text-amber-600 dark:text-amber-300 font-bold">
                      {scanResult.timestamp}
                    </span>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400">
                      #{scanResult.student?.code}
                    </span>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                      {scanResult.student?.name}
                    </h3>
                    <p className="text-xs text-amber-800 dark:text-amber-200 font-bold">
                      المجموعة الأصلية: ({scanResult.originalGroupName})
                    </p>
                  </div>

                  <div className="space-y-2 pt-1">
                    <button
                      onClick={() => handleAcceptMakeup(scanResult.student!.code)}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 text-white font-black text-xs shadow-lg shadow-amber-600/30 transition active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>✅ قبول الطالب كـ (حضور تعويض) في حصة اليوم</span>
                    </button>

                    <button
                      onClick={handleDismissOverlay}
                      className="w-full py-2.5 rounded-2xl bg-white/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-white transition border border-slate-200 dark:border-slate-700"
                    >
                      ⛔ تفادي الحصة وانتظار موعد مجموعته
                    </button>
                  </div>
                </div>
              )}

              {/* ⚪ STATE 5: NOT FOUND */}
              {scanResult.type === 'NOT_FOUND' && (
                <div className="p-6 rounded-3xl bg-slate-900 border-2 border-slate-700 text-white text-center space-y-3 shadow-2xl">
                  <XCircle className="w-10 h-10 text-rose-500 mx-auto" />
                  <h3 className="text-lg font-black">الكود غير مسجل في المنصة</h3>
                  <p className="text-xs text-slate-400">
                    يرجى التحقق من كود الطالب أو إضافته من صفحة إدارة الطلاب أولاً
                  </p>
                  <button
                    onClick={handleDismissOverlay}
                    className="px-5 py-2 rounded-xl bg-slate-800 text-xs font-bold"
                  >
                    إغلاق
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Standby Card when no scan is active */
            <div className="liquid-glass rounded-3xl p-6 text-center space-y-3 border border-slate-200/60 dark:border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
                <QrCode className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">في انتظار مسح كارت الطالب...</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                بمجرد مرور كارت الطالب، تظهر بيانات الحضور والسداد بصوت ولون مميز فوراً
              </p>
            </div>
          )}

          {/* 2. LIVE SESSION ATTENDANCE STREAM */}
          <div className="liquid-glass rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">كشف الحضور المباشر للحصة</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                {attendedCount} حاضر / {groupStudentsCount} طالب
              </span>
            </div>

            {recentScans.length === 0 ? (
              <div className="text-center py-10 text-slate-400 space-y-2">
                <Clock className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-bold">لم يبدأ تسجيل حضور أي طالب بعد</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[340px] overflow-y-auto scrollbar-none space-y-1">
                {recentScans.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center text-[10px] font-bold font-mono">
                        {recentScans.length - idx}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-slate-900 dark:text-white">{item.student.name}</p>
                          <span className="font-mono text-[10px] text-slate-400 font-bold">#{item.student.code}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">{item.time}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.isMakeup && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                          تعويض
                        </span>
                      )}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.isPaid
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {item.type}
                      </span>
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

function Users(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}
