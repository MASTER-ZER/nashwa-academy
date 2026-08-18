'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/storage';
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
  ShieldCheck
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

  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);

  // Auto-login from localStorage if available
  useEffect(() => {
    const savedCode = localStorage.getItem('logged_student_code');
    if (savedCode) {
      setStudentCode(savedCode);
      loadStudentData(savedCode);
    }
  }, []);

  // Generate QR & Barcode when student is active
  useEffect(() => {
    if (currentStudent) {
      QRCode.toDataURL(currentStudent.code, {
        width: 320,
        margin: 2,
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

    if (phone.trim() && !std.phone.endsWith(phone.trim().slice(-4))) {
      setErrorMsg('رقم الهاتف غير متطابق مع بيانات الطالب المسجلة');
      return;
    }

    await loadStudentData(std.code);
  };

  const handleLogout = () => {
    localStorage.removeItem('logged_student_code');
    setCurrentStudent(null);
    setStudentCode('');
    setPhone('');
  };

  const handleQuickDemoLogin = (code: string) => {
    loadStudentData(code);
  };

  const currentMonthSub: Subscription = subscriptions.find((s) => s.month === 'أكتوبر 2026') || {
    id: 'sub-temp',
    studentId: currentStudent?.id || '',
    month: 'أكتوبر 2026',
    amount: 250,
    isPaid: false,
  };

  return (
    <div className="max-w-4xl mx-auto py-2 space-y-6">
      {/* Login Screen (If Not Logged In) */}
      {!currentStudent ? (
        <div className="max-w-md mx-auto my-6 liquid-glass rounded-3xl p-8 space-y-6 shadow-2xl animate-ios-spring border border-slate-200 dark:border-white/10">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-brand-600 via-cyan-500 to-emerald-400 text-white flex items-center justify-center mx-auto shadow-xl shadow-brand-500/30">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">بوابة الطالب وولي الأمر</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
              أدخل كود الطالب الخاص بك لعرض كارت الـ QR الذكي، سجل الحضور، وحالة الاشتراك
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2 border border-rose-500/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">كود الطالب (3 أو 4 أرقام) *</label>
              <input
                type="text"
                placeholder="مثال: 101"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                className="w-full px-4 py-3 text-lg font-black text-center tracking-widest font-mono rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-500 dark:text-slate-400">
                رقم هاتف الطالب أو ولي الأمر (اختياري للتأكيد)
              </label>
              <input
                type="tel"
                placeholder="01012345678"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 to-cyan-500 hover:from-brand-500 hover:to-cyan-400 active:scale-95 text-white font-black text-sm shadow-xl shadow-brand-600/30 transition"
            >
              عرض كارت الطالب الآن 📲
            </button>
          </form>

          {/* Quick Demo Student Picker */}
          <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800 space-y-2">
            <p className="text-[11px] text-slate-400 text-center font-bold">حسابات تجريبية سريعة للتجربة:</p>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {['101', '102', '103'].map((c) => (
                <button
                  key={c}
                  onClick={() => handleQuickDemoLogin(c)}
                  className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-brand-50 dark:hover:bg-cyan-950 text-slate-700 dark:text-slate-300 hover:text-cyan-400 font-mono font-bold text-xs transition border border-transparent hover:border-cyan-500/30"
                >
                  كود #{c}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Logged-In Student Dashboard */
        <div className="space-y-6 animate-ios-spring">
          {/* Header Strip with Student Details */}
          <div className="p-5 sm:p-6 rounded-3xl liquid-glass flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md border border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-700 via-cyan-600 to-emerald-500 text-white flex items-center justify-center font-mono font-black text-lg shadow-xl shadow-cyan-500/20 border border-white/20">
                #{currentStudent.code}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
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
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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

          {/* Navigation Tabs (Segmented iOS Controls) */}
          <div className="flex items-center gap-1 p-1.5 rounded-2xl liquid-glass overflow-x-auto scrollbar-none border border-slate-200 dark:border-white/10">
            {[
              { id: 'CARD', label: 'كارت الهوية والباركود', icon: QrCode },
              { id: 'ATTENDANCE', label: `سجل الحضور (${attendance.length})`, icon: CalendarCheck },
              { id: 'SUBSCRIPTION', label: 'الاشتراك الشهري', icon: CreditCard },
              { id: 'EXAMS', label: `الامتحانات (${examResults.length})`, icon: Award },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 whitespace-nowrap ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
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
              <div className="apple-wallet-pass p-7 text-white space-y-6">
                {/* Pass Top Header */}
                <div className="flex items-start justify-between border-b border-white/15 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-md">
                      <Sparkles className="w-4 h-4 text-slate-950" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black tracking-tight">أكاديمية مس نشوى</h3>
                      <p className="text-[10px] text-cyan-300 font-semibold">علوم متكاملة • أولى ثانوي</p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-mono font-black bg-white/15 border border-white/20 text-cyan-200">
                    #{currentStudent.code}
                  </span>
                </div>

                {/* Pass Student Details */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">اسم الطالب</span>
                    <span className="font-black text-sm text-white">{currentStudent.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">حالة الاشتراك</span>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold ${
                        currentMonthSub.isPaid ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {currentMonthSub.isPaid ? 'مسدد (أكتوبر) ✅' : 'مستحق (250 ج.م) ⚠️'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 block font-semibold">المجموعة والموعد</span>
                    <span className="font-bold text-xs text-slate-200">{group?.name || 'غير محدد'}</span>
                  </div>
                </div>

                {/* QR Code / Barcode Switcher */}
                <div className="bg-white rounded-2xl p-5 text-slate-900 text-center space-y-3 shadow-2xl border border-white/40">
                  {cardDisplayType === 'QR' ? (
                    <div className="flex flex-col items-center justify-center space-y-2">
                      {qrDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 rounded-xl shadow-xs" />
                      ) : (
                        <div className="w-48 h-48 bg-slate-100 rounded-xl flex items-center justify-center text-xs text-slate-400">
                          جاري توليد الكود...
                        </div>
                      )}
                      <p className="text-[11px] font-mono font-black text-slate-800">كود الطالب: #{currentStudent.code}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-4">
                      <svg ref={barcodeSvgRef} className="max-w-full" />
                    </div>
                  )}

                  {/* Switch between QR & Barcode */}
                  <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setCardDisplayType('QR')}
                      className={`px-3.5 py-1 rounded-lg text-xs font-bold transition ${
                        cardDisplayType === 'QR'
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      رمز الـ QR
                    </button>
                    <button
                      onClick={() => setCardDisplayType('BARCODE')}
                      className={`px-3.5 py-1 rounded-lg text-xs font-bold transition ${
                        cardDisplayType === 'BARCODE'
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      الباركود الشريطي
                    </button>
                  </div>
                </div>

                {/* Pass Footer */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>كارت حضور رسمي معتمد</span>
                  <span>أكاديمية مس نشوى {new Date().getFullYear()}</span>
                </div>
              </div>

              {/* Instructions below pass */}
              <div className="p-4 rounded-2xl liquid-glass text-center text-xs text-slate-500 dark:text-slate-400 font-semibold border border-slate-200 dark:border-white/10">
                💡 أظهر هذا الكارت أمام كاميرا السكانر في مدخل الحصة لتسجيل حضورك في ثانية واحدة.
              </div>
            </div>
          )}

          {/* TAB 2: Attendance History */}
          {activeTab === 'ATTENDANCE' && (
            <div className="p-6 rounded-3xl liquid-glass space-y-4 animate-ios-spring border border-slate-200 dark:border-white/10">
              <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-3">
                <h3 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-emerald-500" />
                  سجل الحضور والغياب للدروس
                </h3>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {attendance.length} حصص مسجلة
                </span>
              </div>

              {attendance.length === 0 ? (
                <div className="text-center py-12 space-y-2 text-slate-400">
                  <Clock className="w-10 h-10 mx-auto opacity-40" />
                  <p className="text-xs font-semibold">لم يتم تسجيل حضورك في أي حصة بعد.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {attendance.map((rec) => {
                    const dateObj = new Date(rec.scannedAt);
                    const formattedDate = dateObj.toLocaleDateString('ar-EG', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    });
                    const formattedTime = dateObj.toLocaleTimeString('ar-EG', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={rec.id}
                        className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between shadow-2xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">{formattedDate}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              توقيت المسح: {formattedTime}
                            </div>
                          </div>
                        </div>

                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {rec.status === 'MAKEUP' ? 'تعويض حصة 🔄' : 'حاضر ✅'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Subscriptions */}
          {activeTab === 'SUBSCRIPTION' && (
            <div className="p-6 rounded-3xl liquid-glass space-y-4 animate-ios-spring border border-slate-200 dark:border-white/10">
              <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-3">
                <h3 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-brand-500" />
                  الاشتراكات الشهرية
                </h3>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">قيمة الاشتراك: 250 ج.م</span>
              </div>

              <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white text-sm">اشتراك شهر أكتوبر 2026</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">شامل 8 حصص ومذكرات الشرح والمراجعة</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-base font-black font-mono text-slate-900 dark:text-white">250 ج.م</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      currentMonthSub.isPaid
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {currentMonthSub.isPaid ? 'تم السداد بنجاح ✅' : 'مستحق الدفع ⏳'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Exams & Grades */}
          {activeTab === 'EXAMS' && (
            <div className="p-6 rounded-3xl liquid-glass space-y-4 animate-ios-spring border border-slate-200 dark:border-white/10">
              <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-3">
                <h3 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  درجات وتقييمات الامتحانات
                </h3>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{examResults.length} امتحانات مرصودة</span>
              </div>

              {examResults.length === 0 ? (
                <div className="text-center py-12 space-y-2 text-slate-400">
                  <Award className="w-10 h-10 mx-auto opacity-40" />
                  <p className="text-xs font-semibold">لم يتم رصد نتائج امتحانات لهذا الطالب بعد.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {examResults.map(({ result, exam }) => (
                    <div
                      key={result.id}
                      className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">{exam.title}</h4>
                        <div className="flex items-center gap-1 font-mono font-black text-sm">
                          <span className="text-brand-600 dark:text-cyan-400 text-base">{result.score}</span>
                          <span className="text-slate-400">/ {exam.totalScore}</span>
                        </div>
                      </div>

                      {result.feedback && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/60">
                          💬 <strong>ملاحظة مس نشوى:</strong> {result.feedback}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
