'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '@/lib/storage';
import { sound } from '@/lib/audio';
import { Group, Student, AttendanceRecord } from '@/types';
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
  Volume2
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
}

export default function ScannerPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  
  // Camera state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Scanner feedback overlay
  const [scanResult, setScanResult] = useState<ScanResultOverlay | null>(null);
  const [recentScans, setRecentScans] = useState<{ student: Student; time: string; isPaid: boolean; type: string }[]>([]);

  // Emergency manual search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [sessionToast, setSessionToast] = useState<string>('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedCodeRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  // Sync today's attendance into recentScans
  const syncSessionAttendance = useCallback((groupId: string) => {
    const data = db.getData();
    const todayStr = new Date().toISOString().split('T')[0];
    const sessionAtt = data.attendance.filter(
      (a) => a.groupId === groupId && a.scannedAt.startsWith(todayStr)
    );

    const mapped = sessionAtt.map((rec) => {
      const std = data.students.find((s) => s.id === rec.studentId);
      const sub = data.subscriptions.find((s) => s.studentId === rec.studentId && s.month === 'أكتوبر 2026');
      return {
        student: std || { id: rec.studentId, code: '—', name: 'طالب غير معروف', phone: '', parentName: '', parentPhone: '', address: '', academicYear: 'FIRST_SEC', groupId, status: 'ACTIVE', registeredAt: '' },
        time: new Date(rec.scannedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        isPaid: sub ? sub.isPaid : false,
        type: sub?.isPaid ? 'حضور مسدد' : 'حضور غير مسدد',
      };
    }).reverse();

    setRecentScans(mapped);
  }, []);

  // Load initial data
  useEffect(() => {
    db.syncFromSupabase().then(() => {
      const data = db.getData();
      setGroups(data.groups);
      setStudents(data.students);
    });

    const data = db.getData();
    setGroups(data.groups);
    setStudents(data.students);
    if (data.groups.length > 0) {
      const defaultGrp = data.groups[0].id;
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

    // Debounce duplicate scans within 2 seconds
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

    const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

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
      });
    } else {
      // SUCCESS (Paid or Unpaid)
      if (result.subscriptionPaid) {
        sound.playSuccessChime();
        try {
          confetti({
            particleCount: 50,
            spread: 60,
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
      });

      if (result.student) {
        setRecentScans((prev) => [
          {
            student: result.student!,
            time: timeStr,
            isPaid: !!result.subscriptionPaid,
            type: result.subscriptionPaid ? 'حضور مسدد' : 'غير مسدد',
          },
          ...prev,
        ]);
      }
    }

    // Auto-clear overlay after 5 seconds
    setTimeout(() => {
      setScanResult((curr) => (curr?.timestamp === timeStr ? null : curr));
    }, 5000);
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
        () => {
          // Frame scanned without code - ignore
        }
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
    setScanResult((prev) => prev ? { ...prev, type: 'SUCCESS_PAID', subscriptionPaid: true } : null);
    setRecentScans((prev) =>
      prev.map((r) => (r.student.id === studentId ? { ...r, isPaid: true, type: 'تم السداد كاش 💵' } : r))
    );
  };

  // Reset / Clear Today's Session Attendance
  const handleResetSession = () => {
    if (confirm('هل تريد إعادة تعيين ومسح حضور هذه الحصة للبدء من جديد؟')) {
      db.clearSessionAttendance(selectedGroupId);
      setRecentScans([]);
      setScanResult(null);
      setSessionToast('تمت إعادة تعيين حضور الحصة بنجاح! يمكنك مسح الطلاب مجدداً الآن 🔄');
      setTimeout(() => setSessionToast(''), 4000);
      sound.playSuccessChime();
    }
  };

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Top Bar: Group Selector & Session Reset */}
      <div className="liquid-glass rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-xs font-bold">
            <Zap className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>كشك السكانر الذكي فائق السرعة</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">شاشة الحضور الذكية</h1>
        </div>

        {/* Group Selector Dropdown & Reset Action */}
        <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
          <select
            value={selectedGroupId}
            onChange={(e) => handleGroupChange(e.target.value)}
            className="w-full sm:w-64 px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none shadow-xs"
          >
            {groups.map((grp) => (
              <option key={grp.id} value={grp.id}>
                {grp.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleResetSession}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition flex items-center gap-1.5 shadow-xs"
            title="إعادة تعيين الحضور للبدء من جديد"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>بدء حصة جديدة</span>
          </button>
        </div>
      </div>

      {sessionToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-sm animate-ios-spring">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{sessionToast}</span>
        </div>
      )}

      {/* Main Grid: Cinematic Camera Viewport vs Recent Scans Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Camera Viewport */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-950 rounded-3xl p-5 sm:p-7 text-white relative overflow-hidden shadow-2xl border border-slate-800">
            {/* Visual Feedback Banner on Scan */}
            {scanResult && (
              <div
                className={`absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center transition-all ${
                  scanResult.type === 'SUCCESS_PAID'
                    ? 'bg-emerald-600/95 text-white'
                    : scanResult.type === 'SUCCESS_UNPAID'
                    ? 'bg-rose-600/95 text-white'
                    : scanResult.type === 'ALREADY_RECORDED'
                    ? 'bg-blue-600/95 text-white'
                    : 'bg-slate-800/95 text-white'
                }`}
              >
                {scanResult.type === 'SUCCESS_PAID' && (
                  <div className="space-y-3 animate-bounce-short">
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto scale-125">
                      <CheckCircle2 className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-black">{scanResult.student?.name}</h2>
                    <p className="text-sm font-bold bg-white/20 py-1.5 px-4 rounded-full inline-block">
                      تم تسجيل الحضور بنجاح ✅ (الاشتراك مسدد)
                    </p>
                    <p className="text-xs text-emerald-100 font-mono">كود الطالب: #{scanResult.student?.code}</p>
                  </div>
                )}

                {scanResult.type === 'SUCCESS_UNPAID' && (
                  <div className="space-y-3">
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto scale-125">
                      <AlertCircle className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-black">{scanResult.student?.name}</h2>
                    <p className="text-sm font-black bg-white/25 py-1.5 px-4 rounded-full inline-block">
                      ⚠️ تنبيه: اشتراك شهر ({scanResult.currentMonth}) لم يسدد بعد!
                    </p>
                    <p className="text-xs text-rose-100">تم تسجيل الحضور في الحصة، يرجى استلام الكاش.</p>
                    
                    <button
                      onClick={() => handleCollectCash(scanResult.student!.id)}
                      className="mt-2 px-5 py-2.5 rounded-xl bg-white text-rose-700 font-black text-xs shadow-lg hover:bg-rose-50 active:scale-95 transition flex items-center gap-1.5 mx-auto"
                    >
                      <DollarSign className="w-4 h-4" />
                      استلام كاش 250 جنيه وتسجيل السداد الآن 💵
                    </button>
                  </div>
                )}

                {scanResult.type === 'ALREADY_RECORDED' && (
                  <div className="space-y-2">
                    <Info className="w-12 h-12 mx-auto text-cyan-200" />
                    <h2 className="text-xl font-bold">{scanResult.student?.name}</h2>
                    <p className="text-xs font-semibold bg-white/20 py-1.5 px-4 rounded-full inline-block">
                      تم تسجيل حضور هذا الطالب مسبقاً في هذه الحصة الساعة [{scanResult.recordedAt}] ✅
                    </p>
                    <p className="text-[11px] text-cyan-100">
                      حالة الاشتراك: {scanResult.subscriptionPaid ? 'مسدد ✅' : 'مستحق السداد ⚠️'}
                    </p>
                  </div>
                )}

                {scanResult.type === 'NOT_FOUND' && (
                  <div className="space-y-2">
                    <AlertCircle className="w-12 h-12 mx-auto text-rose-300" />
                    <h2 className="text-xl font-bold">كود غير معروف!</h2>
                    <p className="text-xs text-slate-300">لم يتم العثور على طالب بهذا الكود في النظام.</p>
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
                      className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black text-xs shadow-lg shadow-emerald-500/30 transition flex items-center gap-2 mx-auto"
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
          </div>

          {/* Quick Simulation Bar (For Testing without physical camera) */}
          <div className="liquid-glass rounded-2xl p-4 space-y-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
              ⚡ تجربة مسح سريع بكود الطالب (للتجربة):
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => processCode('101')}
                className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 text-xs font-bold transition text-right shadow-xs"
              >
                🟢 إياد (#101) - مسدد
              </button>
              <button
                onClick={() => processCode('102')}
                className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 text-xs font-bold transition text-right shadow-xs"
              >
                🔴 أحمد (#102) - غير مسدد
              </button>
              <button
                onClick={() => processCode('103')}
                className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 text-xs font-bold transition text-right shadow-xs"
              >
                🟢 سارة (#103) - مسدد
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Emergency Manual Search & Live Attendance Count */}
        <div className="lg:col-span-5 space-y-6">
          {/* Emergency Fast Search */}
          <div className="liquid-glass rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-brand-600 dark:text-cyan-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">البحث اليدوي الفوري للطوارئ</h2>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              في حال نسي الطالب موبايله أو الكارت، ابحث باسمه أو كوده لتسجيل حضوره بنقرة واحدة:
            </p>

            <div className="relative">
              <input
                type="text"
                placeholder="اكتب اسم الطالب أو الكود..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
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

          {/* Recent Scans Feed in this session */}
          <div className="liquid-glass rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                سجل الحاضرين في هذه الحصة
              </h2>
              <span className="text-xs font-black text-brand-700 dark:text-cyan-400 bg-brand-50 dark:bg-brand-950/80 px-2.5 py-1 rounded-xl border border-brand-200/60 dark:border-cyan-500/30">
                {recentScans.length} طالب حاضر
              </span>
            </div>

            {recentScans.length === 0 ? (
              <div className="text-center py-10 text-slate-400 space-y-2 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <QrCode className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-semibold">في انتظار مسح أول كارت في هذه الحصة...</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {recentScans.map((scan, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between text-xs hover:bg-white dark:hover:bg-slate-700 transition"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{scan.student.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        كود: #{scan.student.code} • الساعة {scan.time}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        scan.isPaid
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {scan.isPaid ? 'مسدد ✅' : 'غير مسدد ⚠️'}
                    </span>
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
