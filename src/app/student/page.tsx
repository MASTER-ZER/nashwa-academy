'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/storage';
import { Student, Group, AttendanceRecord, Subscription, ExamResult, Exam } from '@/types';
import { 
  GraduationCap, 
  QrCode, 
  CalendarCheck, 
  Award, 
  CreditCard, 
  LogOut, 
  Download, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  User, 
  AlertTriangle,
  Layers,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

export default function StudentPortalPage() {
  const [studentCode, setStudentCode] = useState('');
  const [phone, setPhone] = useState('');
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [examResults, setExamResults] = useState<{ result: ExamResult; exam: Exam }[]>([]);
  const [activeTab, setActiveTab] = useState<'card' | 'attendance' | 'exams' | 'subscription'>('card');
  const [cardDisplayType, setCardDisplayType] = useState<'qr' | 'barcode'>('qr');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');

  const barcodeRef = useRef<SVGSVGElement | null>(null);

  // Check saved session in localStorage
  useEffect(() => {
    const savedCode = localStorage.getItem('logged_student_code');
    if (savedCode) {
      loadStudentData(savedCode);
    }
  }, []);

  // Generate QR Code & Barcode when student is active
  useEffect(() => {
    if (currentStudent) {
      // Generate QR Code
      QRCode.toDataURL(currentStudent.code, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }).then((url) => {
        setQrCodeUrl(url);
      }).catch((err) => {
        console.error('QR code generation error', err);
      });

      // Generate 1D Barcode
      if (barcodeRef.current) {
        try {
          JsBarcode(barcodeRef.current, currentStudent.code, {
            format: 'CODE128',
            lineColor: '#0f172a',
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
    // 1. Sync from cloud first
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

  // Subscribe to real-time updates while on student portal
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
      setErrorMsg('كود الطالب غير صحيح أو بانتظار اعتماد المس');
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

  if (!currentStudent) {
    return (
      <div className="max-w-md mx-auto py-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-brand-50 text-brand-600 border border-brand-100 flex items-center justify-center mx-auto shadow-sm">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">بوابة الطالب وولي الأمر</h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            سجل الدخول بكود الطالب الخاص بك لمتابعة الباركود والدرجات والاشتراك الشهري
          </p>
        </div>

        <form onSubmit={handleLogin} className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">كود الطالب (Student Code)</label>
            <input
              type="text"
              placeholder="مثال: 101"
              value={studentCode}
              onChange={(e) => setStudentCode(e.target.value)}
              className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">رقم هاتف الطالب (اختياري للتأكيد)</label>
            <input
              type="tel"
              placeholder="مثال: 01012345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-black text-sm shadow-md shadow-brand-600/20 transition active:scale-95"
          >
            تسجيل الدخول 🚀
          </button>

          {/* Quick Demo Logins */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <p className="text-[11px] text-slate-400 font-bold text-center">أو جرب الدخول المباشر كطالب تجريبي:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('101')}
                className="p-2.5 text-xs font-bold rounded-xl bg-slate-50 hover:bg-brand-50 text-slate-700 hover:text-brand-600 border border-slate-200/60 transition text-center"
              >
                👤 إياد محمد (#101)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('102')}
                className="p-2.5 text-xs font-bold rounded-xl bg-slate-50 hover:bg-brand-50 text-slate-700 hover:text-brand-600 border border-slate-200/60 transition text-center"
              >
                👤 أحمد محمود (#102)
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-4 space-y-6">
      {/* Student Profile Card Header (Apple Wallet Aesthetic) */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800">
        <div className="absolute -top-12 -left-12 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-cyan-200 text-xs font-bold backdrop-blur">
              <Sparkles className="w-3.5 h-3.5" />
              <span>الصف الأول الثانوي • علوم متكاملة</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{currentStudent.name}</h1>
            <p className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>{group ? group.name : 'مجموعة غير محددة'}</span>
            </p>
          </div>

          <div className="text-left space-y-1">
            <span className="text-[10px] text-slate-400 block font-bold">كود الطالب:</span>
            <span className="text-2xl sm:text-3xl font-black text-cyan-300 font-mono tracking-wider">
              #{currentStudent.code}
            </span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1 text-xs text-rose-300 hover:text-rose-200 pt-1 font-bold"
            >
              <LogOut className="w-3 h-3" />
              خروج
            </button>
          </div>
        </div>

        {/* Quick Summary Badges */}
        <div className="grid grid-cols-3 gap-2 mt-6 pt-5 border-t border-white/10 text-center">
          <div className="bg-white/10 rounded-2xl p-3 backdrop-blur border border-white/10">
            <span className="text-[10px] text-slate-300 block font-bold">الحضور المسجل</span>
            <span className="text-sm font-black text-white">{attendance.length} حصص</span>
          </div>

          <div className="bg-white/10 rounded-2xl p-3 backdrop-blur border border-white/10">
            <span className="text-[10px] text-slate-300 block font-bold">امتحان الباب الأول</span>
            <span className="text-sm font-black text-cyan-300">
              {examResults.length > 0 ? `${examResults[0].result.score}/20` : '—'}
            </span>
          </div>

          <div className="bg-white/10 rounded-2xl p-3 backdrop-blur border border-white/10">
            <span className="text-[10px] text-slate-300 block font-bold">اشتراك أكتوبر</span>
            <span className={`text-xs font-black ${currentMonthSub.isPaid ? 'text-emerald-400' : 'text-rose-400'}`}>
              {currentMonthSub.isPaid ? 'مسدد ✅' : 'مستحق ⚠️'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex bg-slate-200/70 p-1.5 rounded-2xl gap-1 text-xs font-bold text-slate-700">
        <button
          onClick={() => setActiveTab('card')}
          className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'card' ? 'bg-white text-brand-700 shadow-sm' : 'hover:text-slate-900'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>كارت الباركود والـ QR</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'attendance' ? 'bg-white text-brand-700 shadow-sm' : 'hover:text-slate-900'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>سجل الحضور</span>
        </button>

        <button
          onClick={() => setActiveTab('exams')}
          className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'exams' ? 'bg-white text-brand-700 shadow-sm' : 'hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>الامتحانات</span>
        </button>

        <button
          onClick={() => setActiveTab('subscription')}
          className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'subscription' ? 'bg-white text-brand-700 shadow-sm' : 'hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>الاشتراك</span>
        </button>
      </div>

      {/* Tab 1: Digital QR / Barcode Card */}
      {activeTab === 'card' && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm text-center space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-black text-slate-900">بطاقة الحضور الرقمية</h2>
            <p className="text-xs text-slate-500">
              قم بتوجيه رمز الـ QR أمام كاميرا السكانر عند دخول قاعة الدرس
            </p>
          </div>

          {/* Toggle between QR and 1D Barcode */}
          <div className="inline-flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-bold mx-auto">
            <button
              onClick={() => setCardDisplayType('qr')}
              className={`px-4 py-1.5 rounded-lg transition ${
                cardDisplayType === 'qr'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              رمز QR السريع (موصى به) 📱
            </button>
            <button
              onClick={() => setCardDisplayType('barcode')}
              className={`px-4 py-1.5 rounded-lg transition ${
                cardDisplayType === 'barcode'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الباركود الخطي (1D) 📊
            </button>
          </div>

          {/* Card Box */}
          <div className="p-6 sm:p-8 bg-slate-50 border-2 border-dashed border-slate-300 rounded-3xl inline-block mx-auto min-w-[280px] shadow-inner">
            {cardDisplayType === 'qr' ? (
              <div className="space-y-3">
                {qrCodeUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrCodeUrl}
                    alt={`QR Code #${currentStudent.code}`}
                    className="w-52 h-52 mx-auto rounded-2xl shadow-sm bg-white p-2 border border-slate-200/80"
                  />
                ) : (
                  <div className="w-52 h-52 mx-auto flex items-center justify-center text-slate-400">
                    جاري التوليد...
                  </div>
                )}
                <span className="text-2xl font-black text-brand-700 font-mono tracking-wider block">
                  #{currentStudent.code}
                </span>
              </div>
            ) : (
              <div className="space-y-2 py-4">
                <svg ref={barcodeRef} className="mx-auto" />
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-200 text-xs font-bold text-slate-700">
              {currentStudent.name} • {group?.name}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 leading-relaxed text-right flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              ⚡ <strong>رمز QR يقرأ في ثانية:</strong> يمكنك الاحتفاظ بلقطة شاشة (Screenshot) لهذا الكارت وإظهاره من شاشة الموبايل في كل حصة.
            </span>
          </div>
        </div>
      )}

      {/* Tab 2: Attendance Log */}
      {activeTab === 'attendance' && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">سجل حضور الحصص</h2>
            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
              إجمالي الحضور: {attendance.length}
            </span>
          </div>

          {attendance.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2 border-2 border-dashed border-slate-200 rounded-2xl">
              <CalendarCheck className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold">لم يتم تسجيل أي حضور حتى الآن.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {attendance.map((rec) => (
                <div key={rec.id} className="py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {new Date(rec.scannedAt).toLocaleDateString('ar-EG', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        الساعة {new Date(rec.scannedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                    حاضر ✅
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Exam Results */}
      {activeTab === 'exams' && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">نتائج الامتحانات الورقية</h2>

          {examResults.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2 border-2 border-dashed border-slate-200 rounded-2xl">
              <Award className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold">لا توجد نتائج امتحانات مرصودة حالياً.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {examResults.map(({ result, exam }) => {
                const percentage = Math.round((result.score / exam.totalScore) * 100);
                return (
                  <div key={result.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{exam.title}</h3>
                        <p className="text-[11px] text-slate-500">تاريخ الامتحان: {exam.date}</p>
                      </div>
                      <div className="text-left">
                        <span className="text-xl font-black text-brand-600">
                          {result.score} <span className="text-xs text-slate-400 font-normal">/ {exam.totalScore}</span>
                        </span>
                        <span className="block text-[11px] font-bold text-emerald-600">({percentage}%)</span>
                      </div>
                    </div>
                    {result.feedback && (
                      <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200/80">
                        💬 <strong>ملاحظة المس:</strong> {result.feedback}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Subscriptions */}
      {activeTab === 'subscription' && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">حالة الاشتراك الشهري</h2>
            <span className="text-xs text-slate-500 font-semibold">اشتراك 8 حصص شهرياً</span>
          </div>

          <div className={`p-6 rounded-3xl border ${
            currentMonthSub.isPaid 
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
              : 'bg-rose-50/70 border-rose-200 text-rose-900'
          } space-y-3`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold block text-slate-500">شهر:</span>
                <span className="text-xl font-black text-slate-900">{currentMonthSub.month}</span>
              </div>
              <span className={`px-4 py-1.5 text-xs font-black rounded-full shadow-xs ${
                currentMonthSub.isPaid ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}>
                {currentMonthSub.isPaid ? 'تم السداد بنجاح ✅' : 'مستحق السداد ⚠️'}
              </span>
            </div>

            <div className="text-xs pt-3 border-t border-slate-200/60 flex items-center justify-between text-slate-600">
              <span>قيمة الاشتراك: <strong>{currentMonthSub.amount} جنيه</strong></span>
              {currentMonthSub.paidAt && (
                <span>تاريخ السداد: {new Date(currentMonthSub.paidAt).toLocaleDateString('ar-EG')}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
