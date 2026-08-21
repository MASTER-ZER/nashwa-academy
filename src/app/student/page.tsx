'use client';

import { useState, useEffect, useRef } from 'react';
import { db, getCurrentMonthLabel } from '@/lib/storage';
import { Student, Group, AttendanceRecord, Subscription, ExamResult, Exam } from '@/types';
import {
  GraduationCap,
  QrCode,
  CalendarCheck,
  CreditCard,
  Award,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  LogOut,
  Download,
  Share2,
  ChevronRight,
  UserCheck,
  Zap,
  RotateCw,
  Phone,
  BarChart3,
  ShieldCheck,
  Lock,
  Flame,
  Star,
  Check,
  Smartphone,
  ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

export default function StudentPortalPage() {
  const [studentCode, setStudentCode] = useState('');
  const [phone, setPhone] = useState('');
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [examResults, setExamResults] = useState<{ result: ExamResult; exam: Exam }[]>([]);

  const [activeTab, setActiveTab] = useState<'CARD' | 'ATTENDANCE' | 'SUBSCRIPTION' | 'EXAMS'>('CARD');
  const [errorMsg, setErrorMsg] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [cardDisplayType, setCardDisplayType] = useState<'QR' | 'BARCODE'>('QR');
  const [copiedMsg, setCopiedMsg] = useState(false);

  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);

  // Auto-login from localStorage if available
  useEffect(() => {
    const savedCode = localStorage.getItem('logged_student_code');
    const savedPhone = localStorage.getItem('logged_student_phone');
    if (savedCode) {
      setStudentCode(savedCode);
      if (savedPhone) setPhone(savedPhone);
      loadStudentData(savedCode);
    }
  }, []);

  // Generate QR & Barcode when student is active
  useEffect(() => {
    if (currentStudent) {
      // High error correction Level H ensures instantaneous scanning under any lighting
      QRCode.toDataURL(currentStudent.code, {
        width: 360,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: { dark: '#020617', light: '#ffffff' },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR generation error', err));

      if (barcodeSvgRef.current) {
        try {
          JsBarcode(barcodeSvgRef.current, currentStudent.code, {
            format: 'CODE128',
            lineColor: '#020617',
            width: 3,
            height: 85,
            displayValue: true,
            fontSize: 18,
            font: 'Cairo',
            textMargin: 6,
          });
        } catch (err) {
          console.error('Barcode generation error', err);
        }
      }
    }
  }, [currentStudent, activeTab, cardDisplayType]);

  const loadStudentData = async (code: string) => {
    await db.syncFromSupabase();

    const data = db.getData();
    const std = data.students.find((s) => s.code === code.trim());
    if (!std) {
      setErrorMsg('لم يتم العثور على طالب بهذا الكود في المنصة');
      return false;
    }

    setCurrentStudent(std);
    localStorage.setItem('logged_student_code', std.code);
    setErrorMsg('');

    const grp = data.groups.find((g) => g.id === std.groupId);
    setGroup(grp || null);

    const att = data.attendance.filter((a) => a.studentId === std.id);
    setAttendance(att);

    const subs = data.subscriptions.filter((s) => s.studentId === std.id);
    setSubscriptions(subs);

    const results = data.examResults
      .filter((r) => r.studentId === std.id)
      .map((r) => {
        const exam = data.exams.find((e) => e.id === r.examId);
        return exam ? { result: r, exam } : null;
      })
      .filter(Boolean) as { result: ExamResult; exam: Exam }[];

    setExamResults(results);
    return true;
  };

  // Real-time reactive updates
  useEffect(() => {
    const unsub = db.subscribe(() => {
      const savedCode = localStorage.getItem('logged_student_code');
      if (savedCode) {
        const data = db.getData();
        const std = data.students.find((s) => s.code === savedCode.trim());
        if (std) {
          const grp = data.groups.find((g) => g.id === std.groupId);
          setGroup(grp || null);
          const att = data.attendance.filter((a) => a.studentId === std.id);
          setAttendance(att);
          const subs = data.subscriptions.filter((s) => s.studentId === std.id);
          setSubscriptions(subs);
        }
      }
    });
    return unsub;
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentCode.trim()) {
      setErrorMsg('يرجى إدخال كود الطالب');
      return;
    }

    await db.syncFromSupabase();
    const data = db.getData();
    const std = data.students.find((s) => s.code === studentCode.trim());
    if (!std) {
      setErrorMsg('كود الطالب غير مسجل أو بانتظار اعتماد المس');
      return;
    }

    // Two-factor privacy check (Phone verification)
    if (phone.trim()) {
      const cleanInput = phone.trim().replace(/\D/g, '');
      const cleanStdPhone = std.phone.replace(/\D/g, '');
      const cleanParentPhone = std.parentPhone.replace(/\D/g, '');

      const isMatch =
        cleanStdPhone.endsWith(cleanInput) ||
        cleanParentPhone.endsWith(cleanInput) ||
        cleanStdPhone === cleanInput ||
        cleanParentPhone === cleanInput;

      if (!isMatch) {
        setErrorMsg('رقم الهاتف غير متطابق مع بيانات هذا الطالب');
        return;
      }
      localStorage.setItem('logged_student_phone', phone.trim());
    }

    setCurrentStudent(std);
    localStorage.setItem('logged_student_code', std.code);
    setErrorMsg('');
    loadStudentData(std.code);
  };

  const handleLogout = () => {
    localStorage.removeItem('logged_student_code');
    localStorage.removeItem('logged_student_phone');
    setCurrentStudent(null);
    setStudentCode('');
    setPhone('');
    setErrorMsg('');
  };

  // Copy student portal link
  const handleShareCard = () => {
    if (!currentStudent) return;
    const shareText = `🎓 كارت هوية الطالب: ${currentStudent.name}\n🔑 الكود: #${currentStudent.code}\n📚 أكاديمية مس نشوى - العلوم المتكاملة`;
    if (navigator.share) {
      navigator.share({ title: 'كارت الطالب', text: shareText, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 3000);
    }
  };

  const currentAcademicMonth = getCurrentMonthLabel();
  const currentMonthSub = subscriptions.find((s) => s.month === currentAcademicMonth);
  const isCurrentMonthPaid = currentMonthSub ? currentMonthSub.isPaid : false;

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* 1. STUDENT LOGIN FORM (If not logged in) */}
      {!currentStudent ? (
        <div className="max-w-md mx-auto py-6">
          <div className="liquid-glass rounded-3xl p-7 sm:p-9 shadow-xl space-y-6 border border-slate-200/80 dark:border-slate-800 text-center animate-ios-spring">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-700 to-emerald-600 flex items-center justify-center mx-auto text-white shadow-lg shadow-brand-700/20">
              <GraduationCap className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                بوابة الطالب وولي الأمر
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                أدخل كود الطالب ورقم الهاتف لعرض بطاقة الهوية، كشف الحضور، والدرجات
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2 text-right">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 text-right">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-brand-600 dark:text-cyan-400" />
                  <span>كود الطالب (رقم البطاقة):</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 101"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-black text-center text-lg focus:outline-none focus:border-brand-500 shadow-inner"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>رقم الهاتف المسجل أو آخر 4 أرقام (للخصوصية):</span>
                </label>
                <input
                  type="tel"
                  placeholder="مثال: 01012345678 أو 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-center text-sm focus:outline-none focus:border-brand-500 shadow-inner"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-700 to-emerald-600 hover:from-brand-600 hover:to-emerald-500 text-white font-black text-sm shadow-lg shadow-brand-700/20 transition active:scale-95 flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>عرض كارت الطالب والدرجات 🔓</span>
              </button>
            </form>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 text-center">
              <span>طالب جديد؟ </span>
              <a href="/register" className="font-bold text-brand-600 dark:text-cyan-400 hover:underline">
                سجل استمارة التقديم الآن 📝
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* 2. ACTIVE STUDENT DASHBOARD & APPLE WALLET PASS */
        <div className="space-y-6 animate-ios-spring">
          {/* Top Profile Header */}
          <div className="liquid-glass rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-md border border-white/20 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="مس نشوى" className="w-full h-full object-cover" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
                    {currentStudent.name}
                  </h1>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      currentStudent.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-500/20'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-500/20'
                    }`}
                  >
                    {currentStudent.status === 'ACTIVE' ? 'معتمد ونشط ✅' : 'معلق ⏳'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-semibold">
                  {group ? group.name : 'العلوم المتكاملة • أولى ثانوي'}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-600 dark:text-slate-300 hover:text-rose-500 text-xs font-bold transition flex items-center gap-1.5 self-end sm:self-center border border-slate-200 dark:border-slate-700"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>تبديل الحساب</span>
            </button>
          </div>

          {/* Navigation Tabs (Segmented Controls) */}
          <div className="flex items-center gap-1 p-1.5 rounded-2xl liquid-glass overflow-x-auto scrollbar-none border border-slate-200/80 dark:border-slate-800">
            {[
              { id: 'CARD', label: 'كارت الهوية الرقمي', icon: QrCode },
              { id: 'ATTENDANCE', label: `سجل الحضور (${attendance.length})`, icon: CalendarCheck },
              { id: 'EXAMS', label: `كشف الدرجات (${examResults.length})`, icon: Award },
              { id: 'SUBSCRIPTION', label: 'حالة الاشتراك الشهري', icon: CreditCard },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap active:scale-95 ${
                    isActive
                      ? 'bg-brand-700 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: Apple Wallet Pass Card View */}
          {activeTab === 'CARD' && (
            <div className="space-y-6 max-w-md mx-auto animate-ios-spring">
              {/* Apple Wallet Pass Container */}
              <div className="apple-wallet-pass p-7 text-white space-y-6 shadow-2xl">
                {/* Pass Top Header */}
                <div className="flex items-start justify-between border-b border-white/15 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md border border-white/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/logo.png" alt="مس نشوى" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black tracking-tight">أكاديمية مس نشوى</h3>
                      <p className="text-[10px] text-emerald-200 font-semibold">علوم متكاملة • أولى ثانوي</p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-mono font-black bg-white/15 border border-white/20 text-emerald-100">
                    #{currentStudent.code}
                  </span>
                </div>

                {/* Pass Student Details */}
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-emerald-200/80 font-bold block">اسم الطالب</span>
                    <h2 className="text-2xl font-black tracking-tight">{currentStudent.name}</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1 text-xs">
                    <div>
                      <span className="text-[10px] text-emerald-200/80 font-bold block">المجموعة والموعد</span>
                      <p className="font-bold text-white leading-tight">{group ? group.name : '—'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-200/80 font-bold block">حالة الاشتراك</span>
                      <p className={`font-bold flex items-center gap-1 ${isCurrentMonthPaid ? 'text-emerald-300' : 'text-amber-300'}`}>
                        {isCurrentMonthPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        <span>{isCurrentMonthPaid ? `مسدد (${currentAcademicMonth})` : `مستحق (${currentAcademicMonth})`}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Code Selector (QR vs Barcode) */}
                <div className="pt-2 flex justify-center">
                  <div className="inline-flex p-1 rounded-xl bg-white/10 border border-white/15 text-xs font-bold">
                    <button
                      onClick={() => setCardDisplayType('QR')}
                      className={`px-3 py-1 rounded-lg transition ${
                        cardDisplayType === 'QR' ? 'bg-white text-slate-950 shadow-xs' : 'text-white/80'
                      }`}
                    >
                      رمز الـ QR (موصى به ⚡)
                    </button>
                    <button
                      onClick={() => setCardDisplayType('BARCODE')}
                      className={`px-3 py-1 rounded-lg transition ${
                        cardDisplayType === 'BARCODE' ? 'bg-white text-slate-950 shadow-xs' : 'text-white/80'
                      }`}
                    >
                      الباركود الشريطي
                    </button>
                  </div>
                </div>

                {/* Scannable Target Container */}
                <div className="p-4 rounded-2xl bg-white text-slate-950 flex flex-col items-center justify-center shadow-lg">
                  {cardDisplayType === 'QR' ? (
                    qrDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={qrDataUrl} alt="Student QR Code" className="w-56 h-56 object-contain" />
                    ) : (
                      <div className="w-56 h-56 flex items-center justify-center text-slate-400">جاري التوليد...</div>
                    )
                  ) : (
                    <div className="py-2 overflow-x-auto max-w-full">
                      <svg ref={barcodeSvgRef} className="mx-auto" />
                    </div>
                  )}
                  <p className="text-[11px] font-bold text-slate-500 font-mono mt-1">وجه هذا الرمز لكاميرا المس لتسجيل الحضور</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleShareCard}
                  className="flex-1 py-3 rounded-2xl liquid-glass hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-white font-bold text-xs transition flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 shadow-2xs"
                >
                  <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{copiedMsg ? 'تم نسخ بيانات الكارت! ✅' : 'مشاركة الكارت'}</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="flex-1 py-3 rounded-2xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>طباعة وحفظ PDF</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Attendance History */}
          {activeTab === 'ATTENDANCE' && (
            <div className="liquid-glass rounded-3xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>سجل حضور الحصص</span>
              </h2>

              {attendance.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Clock className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-semibold">لم يتم تسجيل أي حضور حتى الآن</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {attendance.map((rec) => (
                    <div key={rec.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">
                          📅 {new Date(rec.scannedAt).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          الساعة: {new Date(rec.scannedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {rec.status === 'MAKEUP' ? 'حضور تعويض 🔄' : 'حاضر في الموعد ✅'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Exam Results */}
          {activeTab === 'EXAMS' && (
            <div className="liquid-glass rounded-3xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-brand-700 dark:text-emerald-400" />
                <span>كشف نتائج وتقييمات الامتحانات</span>
              </h2>

              {examResults.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Award className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-semibold">لا توجد نتائج امتحانات مرصودة حالياً</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {examResults.map(({ result, exam }) => {
                    const percentage = Math.round((result.score / exam.maxScore) * 100);
                    return (
                      <div
                        key={result.id}
                        className="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-slate-900 dark:text-white text-xs">{exam.title}</h3>
                          <span className="px-2.5 py-1 rounded-xl bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-emerald-300 font-mono font-black text-xs">
                            {result.score} / {exam.maxScore} ({percentage}%)
                          </span>
                        </div>

                        {result.feedback && (
                          <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-[11px] text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                            💬 ملاحظة المس: &quot;{result.feedback}&quot;
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Subscriptions */}
          {activeTab === 'SUBSCRIPTION' && (
            <div className="liquid-glass rounded-3xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>سجل الاشتراكات الشهرية</span>
              </h2>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">شهر ({sub.month})</p>
                      <p className="text-[11px] text-slate-400 font-mono">القيمة: {sub.amount} جنيه مصري</p>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                        sub.isPaid
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {sub.isPaid ? 'مسدد بالكامل ✅' : 'مستحق الدفع ⚠️'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
