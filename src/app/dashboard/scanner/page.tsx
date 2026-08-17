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
  };

  // Process a scanned code
  const processCode = useCallback((code: string) => {
    const now = Date.now();
    if (lastScannedCodeRef.current === code && now - lastScanTimeRef.current < 2000) {
      return;
    }
    lastScannedCodeRef.current = code;
    lastScanTimeRef.current = now;

    const res = db.scanAttendance({
      scannedCode: code,
      activeGroupId: selectedGroupId,
    });

    const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (res.type === 'SUCCESS_PAID') {
      sound.playSuccessChime(); // "تين" sound
      try {
        confetti({ particleCount: 40, spread: 60 });
      } catch {}

      setScanResult({
        type: 'SUCCESS_PAID',
        student: res.student,
        subscriptionPaid: true,
        currentMonth: res.currentMonth,
        timestamp: timeStr,
      });

      if (res.student) {
        setRecentScans((prev) => [
          { student: res.student!, time: timeStr, isPaid: true, type: 'حضور مسدد ✅' },
          ...prev.filter((p) => p.student.id !== res.student!.id).slice(0, 24),
        ]);
      }
    } else if (res.type === 'SUCCESS_UNPAID') {
      sound.playWarningAlert(); // Warning beep
      setScanResult({
        type: 'SUCCESS_UNPAID',
        student: res.student,
        subscriptionPaid: false,
        currentMonth: res.currentMonth,
        timestamp: timeStr,
      });

      if (res.student) {
        setRecentScans((prev) => [
          { student: res.student!, time: timeStr, isPaid: false, type: 'حضور غير مسدد ⚠️' },
          ...prev.filter((p) => p.student.id !== res.student!.id).slice(0, 24),
        ]);
      }
    } else if (res.type === 'ALREADY_RECORDED') {
      sound.playInfoSound();
      const recordedTime = res.record 
        ? new Date(res.record.scannedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        : timeStr;

      setScanResult({
        type: 'ALREADY_RECORDED',
        student: res.student,
        subscriptionPaid: res.subscriptionPaid,
        timestamp: timeStr,
        recordedAt: recordedTime,
      });
    } else {
      sound.playWarningAlert();
      setScanResult({
        type: 'NOT_FOUND',
        timestamp: timeStr,
      });
    }

    setTimeout(() => {
      setScanResult((curr) => (curr?.timestamp === timeStr ? null : curr));
    }, 3500);
  }, [selectedGroupId]);

  // Start Camera safely
  const startCamera = async () => {
    try {
      setCameraError('');
      
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
          html5QrCodeRef.current.clear();
        } catch {}
      }

      const supportedFormats = [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODABAR,
      ];

      const qrScanner = new Html5Qrcode('qr-reader-target', {
        formatsToSupport: supportedFormats,
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      });
      html5QrCodeRef.current = qrScanner;

      await qrScanner.start(
        { facingMode: facingMode },
        {
          fps: 20,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const width = Math.min(viewfinderWidth - 10, 320);
            const height = Math.min(viewfinderHeight - 10, 260);
            return { width, height };
          },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          processCode(decodedText);
        },
        () => {}
      );

      setIsCameraActive(true);
    } catch (err: unknown) {
      console.error('Camera start error', err);
      const isNonSecureRemote = typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost';
      if (isNonSecureRemote) {
        setCameraError('⚠️ تنبيه أمني من متصفح الموبايل: متصفحات الهواتف تمنع تشغيل الكاميرا عبر IP الشبكة العادي (HTTP). يرجى تشغيل كشك السكانر على الكمبيوتر الرئيسي عبر (localhost) أو تفعيل HTTPS.');
      } else {
        setCameraError('تعذر تشغيل الكاميرا. يرجى التأكد من الضغط على "سماح / Allow" لإعطاء إذن الكاميرا للمتصفح.');
      }
      setIsCameraActive(false);
    }
  };

  // Stop Camera safely
  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error('Camera stop error', err);
      }
      setIsCameraActive(false);
    }
  };

  // Switch camera front/back
  const toggleFacingMode = async () => {
    await stopCamera();
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    setTimeout(() => {
      startCamera();
    }, 300);
  };

  // Clean up on unmount
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
    };
  }, []);

  // Emergency Search Handler (Sub-5ms in-memory)
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    const query = q.trim().toLowerCase();
    const matches = students
      .filter((s) => s.status === 'ACTIVE')
      .filter((s) => s.name.toLowerCase().includes(query) || s.code.includes(query) || s.phone.includes(query))
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

  // Reset / Clear Today's Session Attendance for fresh testing
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
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 text-xs font-bold">
            <Zap className="w-3.5 h-3.5 text-cyan-600" />
            <span>كشك السكانر الذكي فائق السرعة</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">شاشة الحضور الذكية</h1>
        </div>

        {/* Group Selector Dropdown & Reset Action */}
        <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
          <select
            value={selectedGroupId}
            onChange={(e) => handleGroupChange(e.target.value)}
            className="w-full sm:w-64 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 focus:border-brand-500 focus:outline-none shadow-xs"
          >
            {groups.map((grp) => (
              <option key={grp.id} value={grp.id}>
                {grp.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleResetSession}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1.5 shadow-xs"
            title="إعادة تعيين الحضور للبدء من جديد"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>بدء حصة جديدة</span>
          </button>
        </div>
      </div>

      {sessionToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-sm animate-pulse-fast">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{sessionToast}</span>
        </div>
      )}

      {/* Main Grid: Cinematic Camera Viewport vs Recent Scans Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Center Column: Camera Viewport */}
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
                      استلام كاش 150 جنيه وتسجيل السداد الآن 💵
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
                {/* Empty container target for html5-qrcode */}
                <div id="qr-reader-target" className="w-full h-full" />

                {/* Animated Scanner Crosshairs and Laser line */}
                {isCameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-56 h-56 border-2 border-cyan-400/70 rounded-2xl relative shadow-lg shadow-cyan-500/20">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />
                      {/* Laser Line */}
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent absolute top-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                  </div>
                )}

                {/* Stopped Camera Placeholder */}
                {!isCameraActive && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 space-y-4 text-slate-400 bg-slate-950">
                    <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 shadow-md">
                      <QrCode className="w-8 h-8" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-xs font-bold text-slate-300">الكاميرا متوقفة</p>
                      <p className="text-[11px] text-slate-500">اضغط على الزر أدناه لتشغيل الكاميرا ومسح الكروت</p>
                    </div>
                    <button
                      onClick={startCamera}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition active:scale-95 flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      تشغيل الكاميرا الآن 📹
                    </button>
                  </div>
                )}
              </div>

              {isCameraActive && (
                <div className="text-center pt-1">
                  <button
                    onClick={stopCamera}
                    className="text-xs text-rose-400 hover:text-rose-300 font-bold underline"
                  >
                    إيقاف الكاميرا
                  </button>
                </div>
              )}

              {cameraError && (
                <p className="text-xs text-rose-400 text-center font-bold">{cameraError}</p>
              )}
            </div>
          </div>

          {/* Quick Simulation Buttons for Easy Testing without physical camera */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span>💡 تجربة سريعة لمحاكاة مسح الكروت (بنقرة واحدة):</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                onClick={() => processCode('101')}
                className="p-2.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200/80 hover:bg-emerald-100 text-xs font-bold transition text-right shadow-xs"
              >
                🟢 إياد (#101) - مسدد
              </button>
              <button
                onClick={() => processCode('102')}
                className="p-2.5 rounded-xl bg-rose-50 text-rose-900 border border-rose-200/80 hover:bg-rose-100 text-xs font-bold transition text-right shadow-xs"
              >
                🔴 أحمد (#102) - غير مسدد
              </button>
              <button
                onClick={() => processCode('103')}
                className="p-2.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200/80 hover:bg-emerald-100 text-xs font-bold transition text-right shadow-xs"
              >
                🟢 سارة (#103) - مسدد
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Emergency Manual Search & Live Attendance Count */}
        <div className="lg:col-span-5 space-y-6">
          {/* Emergency Fast Search */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-brand-600" />
              <h2 className="text-sm font-bold text-slate-900">البحث اليدوي الفوري للطوارئ</h2>
            </div>
            <p className="text-[11px] text-slate-500">
              في حال نسي الطالب موبايله أو الكارت، ابحث باسمه أو كوده لتسجيل حضوره بنقرة واحدة:
            </p>

            <div className="relative">
              <input
                type="text"
                placeholder="اكتب اسم الطالب أو الكود..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                {searchResults.map((std) => (
                  <div key={std.id} className="p-2.5 flex items-center justify-between hover:bg-white transition">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{std.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">كود: #{std.code} • {std.phone}</p>
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
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500" />
                سجل الحاضرين في هذه الحصة
              </h2>
              <span className="text-xs font-black text-brand-700 bg-brand-50 px-2.5 py-1 rounded-xl border border-brand-200/60">
                {recentScans.length} طالب حاضر
              </span>
            </div>

            {recentScans.length === 0 ? (
              <div className="text-center py-10 text-slate-400 space-y-2 border-2 border-dashed border-slate-200 rounded-2xl">
                <QrCode className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold">في انتظار مسح أول كارت في هذه الحصة...</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {recentScans.map((scan, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs hover:bg-slate-100/70 transition"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{scan.student.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        كود: #{scan.student.code} • الساعة {scan.time}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        scan.isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
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
