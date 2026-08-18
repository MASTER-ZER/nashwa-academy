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
  Flame,
  Star,
  Maximize2,
  Minimize2,
  BookOpen,
  Filter,
  Layers,
  ChevronRight,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import confetti from 'canvas-confetti';

interface ScanResultOverlay {
  type: 'SUCCESS_PAID' | 'SUCCESS_UNPAID' | 'ALREADY_RECORDED' | 'NOT_FOUND' | 'INACTIVE';
  student?: Student;
  subscriptionPaid?: boolean;
  currentMonth?: string;
  timestamp: string;
  recordedAt?: string;
  isMakeup?: boolean;
  streakCount?: number;
  funMessage?: string;
}

const MOTIVATIONAL_QUOTES = [
  'منور الحصة يا بطل! جاهز لتحدي ومفاجآت اليوم؟ 🔥',
  'أهلاً بك يا دكتور المستقبل! استعد للدرجة النهائية في الكويز 🌟',
  'حضورك في ميعادك خطوة جديدة نحو قمة التفوق 🚀',
  'مس نشوى فخورة بيك وبالتزامك يا بطل! 👏',
  'أهلاً بيك في عالم العلوم المتكاملة والإبداع 🔬',
];

export default function ScannerPage() {
  const [data, setData] = useState<SystemData | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  
  // Custom Session Details
  const [sessionTopic, setSessionTopic] = useState<string>('شرح ومراجعة الباب الثاني - مادة العلوم المتكاملة');
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

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

  // Feed Filter Tab
  const [feedFilter, setFeedFilter] = useState<'ALL' | 'PAID' | 'UNPAID' | 'MAKEUP'>('ALL');

  // Emergency manual search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [sessionToast, setSessionToast] = useState<string>('');

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
        type: sub?.isPaid ? 'حضور مسدد' : 'حضور غير مسدد',
      };
    }).reverse();

    setRecentScans(mapped);
  }, []);

  // Load initial data
  useEffect(() => {
    db.syncFromSupabase().then(() => {
      const d = db.getData();
      setData(d);
      setGroups(d.groups);
      setStudents(d.students);
    });

    const d = db.getData();
    setData(d);
    setGroups(d.groups);
    setStudents(d.students);
    if (d.groups.length > 0) {
      const defaultGrp = d.groups[0].id;
      setSelectedGroupId(defaultGrp);
      syncSessionAttendance(defaultGrp);
    }
  }, [syncSessionAttendance]);

  // Handle group change
  const handleGroupChange = (newGroupId: string) => {
    setSelectedGroupId(newGroupId);
    syncSessionAttendance(newGroupId);
    setScanResult(null);
  };

  // Core scan processor
  const processCode = useCallback((rawCode: string) => {
    const cleanCode = rawCode.trim();
    if (!cleanCode) return;

    // Debounce duplicate scans within 2.5 seconds
    const now = Date.now();
    if (cleanCode === lastScannedCodeRef.current && now - lastScanTimeRef.current < 2500) {
      return;
    }
    lastScannedCodeRef.current = cleanCode;
    lastScanTimeRef.current = now;

    const result = db.scanAttendance({
      scannedCode: cleanCode,
      activeGroupId: selectedGroupId,
      deviceId: 'kiosk-main',
    });

    const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];

    if (result.type === 'NOT_FOUND') {
      sound.playErrorBeep();
      setScanResult({
        type: 'NOT_FOUND',
        timestamp: timeStr,
      });
    } else if (result.type === 'INACTIVE') {
      sound.playWarningAlert();
      setScanResult({
        type: 'INACTIVE',
        student: result.student,
        timestamp: timeStr,
      });
    } else if (result.type === 'ALREADY_RECORDED') {
      sound.playInfoSound();
      const recordedTime = result.record
        ? new Date(result.record.scannedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        : timeStr;

      setScanResult({
        type: 'ALREADY_RECORDED',
        student: result.student,
        subscriptionPaid: result.subscriptionPaid,
        currentMonth: result.currentMonth,
        timestamp: timeStr,
        recordedAt: recordedTime,
        funMessage: 'تم تسجيل حضورك مسبقاً في هذه الحصة، بالتوفيق يا بطل! 👏',
      });
    } else {
      // SUCCESS (Paid or Unpaid)
      const isMakeup = result.student && result.student.groupId !== selectedGroupId;

      if (result.subscriptionPaid) {
        sound.playSuccessChime();
        try {
          confetti({
            particleCount: 65,
            spread: 70,
            origin: { y: 0.5 },
          });
        } catch {}
      } else {
        sound.playWarningAlert();
      }

      setScanResult({
        type: result.subscriptionPaid ? 'SUCCESS_PAID' : 'SUCCESS_UNPAID',
        student: result.student,
        subscriptionPaid: result.subscriptionPaid,
        currentMonth: result.currentMonth,
        timestamp: timeStr,
        isMakeup: isMakeup,
        streakCount: Math.floor(Math.random() * 4) + 3,
        funMessage: randomQuote,
      });

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

    // Auto-clear overlay after 6 seconds
    setTimeout(() => {
      setScanResult((curr) => (curr?.timestamp === timeStr ? null : curr));
    }, 6000);
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
        qrbox: { width: 280, height: 280 },
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
        'تعذر الوصول للكاميرا. يرجى التأكد من إعطاء إذن الكاميرا للمتصفح واستخدام اتصال آمن HTTPS.'
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

  // Instant Cash payment collector button
  const handleCollectCash = (studentId: string) => {
    db.toggleSubscription(studentId, 'أكتوبر 2026', 'مس نشوى');
    sound.playSuccessChime();
    try {
      confetti({ particleCount: 40, spread: 50 });
    } catch {}
    setScanResult((prev) => prev ? { ...prev, type: 'SUCCESS_PAID', subscriptionPaid: true } : null);
    setRecentScans((prev) =>
      prev.map((r) => (r.student.id === studentId ? { ...r, isPaid: true, type: 'تم السداد كاش 💵' } : r))
    );
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
    }
  };

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const groupStudentsCount = students.filter((s) => s.groupId === selectedGroupId && s.status === 'ACTIVE').length;
  const attendedCount = recentScans.length;
  const attendancePercentage = groupStudentsCount > 0 ? Math.round((attendedCount / groupStudentsCount) * 100) : 0;

  // Filtered recent scans
  const filteredScans = recentScans.filter((item) => {
    if (feedFilter === 'PAID') return item.isPaid;
    if (feedFilter === 'UNPAID') return !item.isPaid;
    if (feedFilter === 'MAKEUP') return item.isMakeup;
    return true;
  });

  return (
    <div className={`space-y-6 max-w-6xl mx-auto py-2 ${isFullScreen ? 'fixed inset-0 z-50 bg-slate-950 p-4 overflow-y-auto' : ''}`}>
      {/* Top Bar: Personalized Smart Session Configurator */}
      <div className="liquid-glass rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 border border-slate-200 dark:border-cyan-500/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Group & Live Date Info */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-xs font-bold">
                <Zap className="w-3.5 h-3.5 text-cyan-500" />
                <span>كشك الاستقبال والسكانر الذكي</span>
              </span>
              <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                📅 {new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>

            {/* Editable Session Topic */}
            <div className="flex items-center gap-2">
              {isEditingTopic ? (
                <div className="flex items-center gap-2 w-full max-w-md">
                  <input
                    type="text"
                    value={sessionTopic}
                    onChange={(e) => setSessionTopic(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-xl border border-brand-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white flex-1 focus:outline-none"
                    placeholder="اكتب موضوع أو رقم الحصة..."
                  />
                  <button
                    onClick={() => setIsEditingTopic(false)}
                    className="px-3 py-1.5 rounded-xl bg-brand-600 text-white text-xs font-bold"
                  >
                    تم
                  </button>
                </div>
              ) : (
                <h1
                  onClick={() => setIsEditingTopic(true)}
                  className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white cursor-pointer hover:text-brand-600 dark:hover:text-cyan-400 transition flex items-center gap-2"
                  title="اضغط لتعديل عنوان أو رقم الحصة"
                >
                  <span>{sessionTopic}</span>
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 opacity-60" />
                </h1>
              )}
            </div>
          </div>

          {/* Group Selector & Fullscreen Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedGroupId}
              onChange={(e) => handleGroupChange(e.target.value)}
              className="w-full sm:w-64 px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none shadow-xs"
            >
              {groups.map((grp) => (
                <option key={grp.id} value={grp.id}>
                  {grp.name} ({grp.time})
                </option>
              ))}
            </select>

            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5"
              title={isFullScreen ? 'إلغاء ملء الشاشة' : 'وضع الكشك ملء الشاشة للتابلت'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{isFullScreen ? 'تصغير' : 'ملء الشاشة'}</span>
            </button>

            <button
              onClick={handleResetSession}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition flex items-center gap-1.5"
              title="إعادة تعيين حضور الحصة للبدء من جديد"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">بدء حصة جديدة</span>
            </button>
          </div>
        </div>

        {/* Live Session Capacity & Progress Bar */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-500" />
              <span>نسبة حضور الطلاب في هذه الحصة:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-black">
                {attendedCount} / {groupStudentsCount} طالب ({attendancePercentage}%)
              </strong>
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              المتبقي: {Math.max(0, groupStudentsCount - attendedCount)} طالب
            </span>
          </div>

          <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-brand-500 to-emerald-400 transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, attendancePercentage)}%` }}
            />
          </div>
        </div>
      </div>

      {sessionToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-sm animate-ios-spring">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{sessionToast}</span>
        </div>
      )}

      {/* Main Grid: Cinematic Camera & Holographic Welcome Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Camera Viewport */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-950 rounded-3xl p-5 sm:p-7 text-white relative overflow-hidden shadow-2xl border border-slate-800 min-h-[460px] flex flex-col justify-between">
            {/* Gamified Interactive Student Welcome Overlay */}
            {scanResult && (
              <div
                className={`absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center transition-all animate-ios-spring ${
                  scanResult.type === 'SUCCESS_PAID'
                    ? 'bg-slate-950/95 border-2 border-emerald-500 text-white'
                    : scanResult.type === 'SUCCESS_UNPAID'
                    ? 'bg-slate-950/95 border-2 border-rose-500 text-white'
                    : scanResult.type === 'ALREADY_RECORDED'
                    ? 'bg-slate-950/95 border-2 border-cyan-500 text-white'
                    : 'bg-slate-900/95 border-2 border-slate-700 text-white'
                }`}
              >
                {/* 1. Success & Paid */}
                {scanResult.type === 'SUCCESS_PAID' && (
                  <div className="space-y-4 max-w-md mx-auto">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/50 scale-110 border-2 border-white/30">
                      <CheckCircle2 className="w-12 h-12 text-white" />
                    </div>

                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                        <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span>تم تسجيل الحضور بنجاح ✅ • {scanResult.streakCount} حصص متتالية</span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{scanResult.student?.name}</h2>
                      <p className="text-xs text-slate-300 font-mono">كود الطالب: #{scanResult.student?.code}</p>
                    </div>

                    {scanResult.isMakeup && (
                      <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                        🔄 حضور حصة تعويض (مجموعته الأصلية: {data?.groups.find((g) => g.id === scanResult.student?.groupId)?.name || 'أخرى'})
                      </div>
                    )}

                    {/* Motivational Quote */}
                    <p className="p-3 rounded-2xl bg-white/10 text-xs font-semibold text-cyan-200 border border-white/10 leading-relaxed">
                      💬 &quot;{scanResult.funMessage}&quot;
                    </p>

                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-bold">
                      <DollarSign className="w-4 h-4" />
                      <span>الاشتراك مسدد لشهر ({scanResult.currentMonth}) ✅</span>
                    </div>
                  </div>
                )}

                {/* 2. Success But Unpaid */}
                {scanResult.type === 'SUCCESS_UNPAID' && (
                  <div className="space-y-4 max-w-md mx-auto">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center mx-auto shadow-2xl shadow-rose-500/50 scale-110 border-2 border-white/30">
                      <AlertCircle className="w-12 h-12 text-white" />
                    </div>

                    <div className="space-y-1">
                      <h2 className="text-2xl sm:text-3xl font-black">{scanResult.student?.name}</h2>
                      <p className="text-xs text-rose-300 font-bold bg-rose-500/20 py-1 px-3 rounded-full inline-block">
                        تم تسجيل الحضور في الحصة ✅ • اشتراك شهر ({scanResult.currentMonth}) مستحق
                      </p>
                      <p className="text-xs text-slate-300 font-mono mt-1">كود: #{scanResult.student?.code}</p>
                    </div>

                    {/* 1-Click Cash Collection Button */}
                    <button
                      onClick={() => handleCollectCash(scanResult.student!.id)}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white font-black text-sm shadow-xl shadow-emerald-500/30 transition flex items-center justify-center gap-2 border border-emerald-400/30"
                    >
                      <DollarSign className="w-5 h-5" />
                      استلام كاش 250 جنيه وتأكيد السداد الآن 💵
                    </button>
                  </div>
                )}

                {/* 3. Already Recorded */}
                {scanResult.type === 'ALREADY_RECORDED' && (
                  <div className="space-y-3 max-w-md mx-auto">
                    <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center mx-auto border border-cyan-500/40">
                      <Info className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black">{scanResult.student?.name}</h2>
                    <p className="text-xs font-bold bg-cyan-950/80 border border-cyan-500/30 py-1.5 px-4 rounded-full inline-block text-cyan-300">
                      تم تسجيل حضور هذا الطالب مسبقاً في هذه الحصة الساعة [{scanResult.recordedAt}] ✅
                    </p>
                    <p className="text-xs text-slate-400">{scanResult.funMessage}</p>
                  </div>
                )}

                {/* 4. Not Found */}
                {scanResult.type === 'NOT_FOUND' && (
                  <div className="space-y-2">
                    <AlertCircle className="w-14 h-14 mx-auto text-rose-400" />
                    <h2 className="text-xl font-bold">كود غير معروف!</h2>
                    <p className="text-xs text-slate-300">لم يتم العثور على طالب بهذا الكود في النظام أو بانتظار الاعتماد.</p>
                  </div>
                )}
              </div>
            )}

            {/* Camera Controls Bar */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-300 font-bold">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  كاميرا السكانر (وجه رمز الـ QR أو الباركود)
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

              {/* Isolated Camera Target Container */}
              <div className="relative w-full max-w-[340px] aspect-square mx-auto rounded-3xl overflow-hidden bg-black/90 border-2 border-dashed border-cyan-500/40 flex items-center justify-center shadow-inner">
                <div id="qr-reader-target" className="w-full h-full" />

                {isCameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-56 h-56 border-2 border-cyan-400/80 rounded-2xl relative">
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
                      <p className="text-[11px] text-slate-400">اضغط على الزر أدناه لتشغيل الكاميرا ومسح الكروت</p>
                    </div>
                    <button
                      onClick={startCamera}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white font-black text-xs shadow-lg shadow-emerald-500/30 transition flex items-center gap-2 mx-auto"
                    >
                      <Camera className="w-4 h-4" />
                      تشغيل الكاميرا الآن 📹
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
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={stopCamera}
                    className="px-4 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-700 text-white font-bold text-xs transition"
                  >
                    إيقاف الكاميرا ⏹️
                  </button>
                </div>
              )}
            </div>

            {/* Quick Demo Test Buttons */}
            <div className="pt-3 border-t border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 block mb-1.5">
                ⚡ تجربة سريعة بأكواد الطلاب:
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => processCode('101')}
                  className="p-2 rounded-xl bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/80 text-[11px] font-bold transition text-right"
                >
                  🟢 إياد (#101) - مسدد
                </button>
                <button
                  onClick={() => processCode('102')}
                  className="p-2 rounded-xl bg-rose-950/60 text-rose-300 border border-rose-800/60 hover:bg-rose-900/80 text-[11px] font-bold transition text-right"
                >
                  🔴 أحمد (#102) - غير مسدد
                </button>
                <button
                  onClick={() => processCode('103')}
                  className="p-2 rounded-xl bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/80 text-[11px] font-bold transition text-right"
                >
                  🟢 سارة (#103) - مسدد
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Emergency Fast Search & Filterable Live Attendance Feed */}
        <div className="lg:col-span-5 space-y-6">
          {/* Emergency Fast Search */}
          <div className="liquid-glass rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-brand-600 dark:text-cyan-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">البحث اليدوي السريع للطوارئ</h2>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              إذا نسي الطالب الموبايل أو الكارت، ابحث باسمه لتسجيل حضوره بنقرة واحدة:
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

          {/* Filterable Live Attendance Feed */}
          <div className="liquid-glass rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                سجل الحاضرين في هذه الحصة
              </h2>
              <span className="text-xs font-black text-brand-700 dark:text-cyan-400 bg-brand-50 dark:bg-brand-950/80 px-2.5 py-1 rounded-xl border border-brand-200/60 dark:border-cyan-500/30">
                {recentScans.length} حاضر
              </span>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-[11px] font-bold overflow-x-auto scrollbar-none">
              <button
                onClick={() => setFeedFilter('ALL')}
                className={`flex-1 py-1 px-2 rounded-lg transition whitespace-nowrap ${
                  feedFilter === 'ALL' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
                }`}
              >
                الكل ({recentScans.length})
              </button>
              <button
                onClick={() => setFeedFilter('PAID')}
                className={`flex-1 py-1 px-2 rounded-lg transition whitespace-nowrap ${
                  feedFilter === 'PAID' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500'
                }`}
              >
                المسدد ({recentScans.filter((r) => r.isPaid).length})
              </button>
              <button
                onClick={() => setFeedFilter('UNPAID')}
                className={`flex-1 py-1 px-2 rounded-lg transition whitespace-nowrap ${
                  feedFilter === 'UNPAID' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-500'
                }`}
              >
                غير مسدد ({recentScans.filter((r) => !r.isPaid).length})
              </button>
              <button
                onClick={() => setFeedFilter('MAKEUP')}
                className={`flex-1 py-1 px-2 rounded-lg transition whitespace-nowrap ${
                  feedFilter === 'MAKEUP' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-500'
                }`}
              >
                التعويض ({recentScans.filter((r) => r.isMakeup).length})
              </button>
            </div>

            {filteredScans.length === 0 ? (
              <div className="text-center py-8 text-slate-400 space-y-2 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <QrCode className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-semibold">لا يوجد طلاب في هذا الفلتر حالياً</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {filteredScans.map((scan, idx) => (
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
                          className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] hover:bg-emerald-700 transition shadow-2xs"
                          title="استلام كاش 250 جنيه وتسجيل السداد"
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
