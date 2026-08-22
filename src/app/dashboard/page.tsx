'use client';

import { useState, useEffect } from 'react';
import { db, getCurrentMonthLabel } from '@/lib/storage';
import { sound } from '@/lib/audio';
import { Student, Group, Subscription, SystemData } from '@/types';
import { notifyDashboardActionToTelegram } from '@/lib/telegram';
import Link from 'next/link';
import { 
  Users, 
  UserCheck, 
  QrCode, 
  CreditCard, 
  Award, 
  Printer, 
  Settings, 
  CalendarCheck, 
  UserPlus, 
  Clock, 
  Phone, 
  MapPin, 
  Check, 
  X, 
  Sparkles, 
  ArrowUpRight, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  Share2,
  HelpCircle,
  MessageCircle,
  CheckCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function DashboardOverviewPage() {
  const [data, setData] = useState<SystemData | null>(null);
  const [approvalToast, setApprovalToast] = useState<{ name: string; code: string } | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  const loadData = () => {
    setData(db.getData());
  };

  useEffect(() => {
    db.syncFromSupabase().then(() => loadData());
    loadData();
    const unsub = db.subscribe(loadData);
    return unsub;
  }, []);

  if (!data) return null;

  const activeStudents = data.students.filter((s) => s.status === 'ACTIVE');
  const pendingStudents = data.students.filter((s) => s.status === 'PENDING');

  const currentMonth = getCurrentMonthLabel();
  const subPrice = data.settings?.subscriptionPrice || 250;
  
  // Real active students paid subscriptions for current month
  const monthSubs = (data.subscriptions || []).filter(
    (s) => s.month === currentMonth && s.isPaid && activeStudents.some((std) => std.id === s.studentId)
  );
  const paidSubsCount = monthSubs.length;
  const totalSubRevenue = monthSubs.reduce((sum, s) => sum + (s.amount || subPrice), 0);

  const handleApprove = (student: Student, markPaid = false) => {
    db.approveStudent(student.id, markPaid);
    notifyDashboardActionToTelegram({
      action: markPaid ? 'APPROVE_STUDENT_PAID' : 'APPROVE_STUDENT_UNPAID',
      studentName: student.name,
      studentCode: student.code,
      telegramMessageId: student.telegramMessageId,
    }).catch(() => {});
    sound.playSuccessChime();
    setApprovalToast({ name: student.name, code: student.code });
    setTimeout(() => setApprovalToast(null), 4500);

    try {
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    } catch {}

    loadData();
  };

  const handleReject = (student: Student) => {
    if (confirm(`هل أنتِ متأكدة من رفض طلب الطالب (${student.name})؟`)) {
      db.rejectStudent(student.id);
      notifyDashboardActionToTelegram({
        action: 'REJECT_STUDENT',
        studentName: student.name,
        studentCode: student.code,
        telegramMessageId: student.telegramMessageId,
      }).catch(() => {});
      loadData();
    }
  };

  return (
    <div className="space-y-6 py-2 max-w-7xl mx-auto">
      {/* Toast Notification for Instant Approval */}
      {approvalToast && (
        <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between animate-ios-spring">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm">تم قبول الطالب ({approvalToast.name}) بنجاح! 🎉</p>
              <p className="text-xs text-emerald-100 font-mono">تم تفعيل كارت الباركود برقم #{approvalToast.code}</p>
            </div>
          </div>
          <span className="text-xs bg-white/20 px-3 py-1 rounded-lg font-bold">معتمد الآن ✅</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-950 via-slate-900 to-brand-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-brand-800/40">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-cyan-200 border border-white/10 text-xs font-bold backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>لوحة الإدارة المركزية • مس نشوى</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              أهلاً بكِ يا مس نشوى 🌸
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm">
              إدارة طلبات التقديم، كشك السكانر، رصد درجات الامتحانات والاشتراكات الشهرية.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/dashboard/scanner"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black text-xs shadow-lg shadow-emerald-500/25 transition"
            >
              <QrCode className="w-4 h-4" />
              <span>كشك السكانر ⚡</span>
            </Link>

            <button
              onClick={() => {
                const url = `${window.location.origin}/register`;
                navigator.clipboard.writeText(url);
                setCopiedToast(true);
                setTimeout(() => setCopiedToast(false), 3000);
                sound.playSuccessChime();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold text-xs border border-white/20 transition backdrop-blur-xs"
            >
              <Share2 className="w-4 h-4 text-cyan-300" />
              <span>{copiedToast ? 'تم نسخ الرابط! ✅' : 'نسخ رابط التسجيل 📲'}</span>
            </button>

            <Link
              href="/dashboard/print-cards"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold text-xs border border-white/20 transition backdrop-blur-xs"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>طباعة الكروت 🖨️</span>
            </Link>

            <button
              onClick={() => setShowGuideModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 active:scale-95 text-cyan-200 font-bold text-xs border border-cyan-400/30 transition backdrop-blur-xs"
            >
              <HelpCircle className="w-4 h-4 text-cyan-300" />
              <span>دليل المساعد والمس 📖</span>
            </button>
          </div>
        </div>
      </div>

      {/* Copied Toast Banner */}
      {copiedToast && (
        <div className="p-3 rounded-2xl bg-cyan-500 text-slate-950 font-black text-xs text-center animate-ios-spring shadow-lg">
          🎉 تم نسخ رابط تسجيل الطلاب الجدد بنجاح! يمكنك الآن لصقه في جروبات الواتساب والتليجرام.
        </div>
      )}

      {/* Stats KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="liquid-glass rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">الطلاب المعتمدين</span>
            <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-cyan-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">{activeStudents.length}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">طالب بالصف الأول الثانوي</span>
          </div>
        </div>

        <div className="liquid-glass rounded-2xl p-4 sm:p-5 flex flex-col justify-between border-amber-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">طلبات التقديم الجديدة</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black font-mono text-amber-600 dark:text-amber-400">{pendingStudents.length}</span>
            <span className="text-[11px] text-amber-700 dark:text-amber-400/80 block mt-0.5">بانتظار الموافقة والاعتماد</span>
          </div>
        </div>

        <div className="liquid-glass rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">تحصيل {currentMonth}</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {totalSubRevenue.toLocaleString()} <span className="text-xs font-bold font-sans">ج.م</span>
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">{paidSubsCount} طلاب مسددين</span>
          </div>
        </div>

        <div className="liquid-glass rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">المجموعات الدراسية</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black font-mono text-purple-600 dark:text-purple-400">{data.groups.length}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">مجموعات نشطة</span>
          </div>
        </div>
      </div>

      {/* Pending Student Applications Review */}
      <div className="liquid-glass rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              طلبات تسجيل الطلاب الجديدة ({pendingStudents.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400">اعتماد فوري بنقرة واحدة</span>
        </div>

        {pendingStudents.length === 0 ? (
          <div className="text-center py-10 space-y-2 text-slate-400">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/60" />
            <p className="text-xs font-bold">رائع! لا توجد طلبات تسجيل معلقة حالياً.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingStudents.map((std) => {
              const grp = data.groups.find((g) => g.id === std.groupId);
              return (
                <div
                  key={std.id}
                  className="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-amber-200/60 dark:border-amber-950/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 font-mono font-black text-xs flex items-center justify-center">
                        #{std.code}
                      </span>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{std.name}</h4>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                      <span>📱 هاتف الطالب: <strong className="font-mono text-slate-700 dark:text-slate-300">{std.phone}</strong></span>
                      <span>👨‍👦 ولي الأمر: <strong className="text-slate-700 dark:text-slate-300">{std.parentName} ({std.parentPhone})</strong></span>
                      <span>⏰ المجموعة: <strong className="text-brand-600 dark:text-cyan-400">{grp?.name}</strong></span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => handleApprove(std, true)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs shadow-xs transition flex items-center gap-1"
                      title="قبول وتفعيل اشتراك الشهر مدفوعاً"
                    >
                      <CheckCheck className="w-4 h-4" />
                      <span>قبول + دفع ✅</span>
                    </button>
                    <button
                      onClick={() => handleApprove(std, false)}
                      className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white font-bold text-xs shadow-xs transition flex items-center gap-1"
                      title="قبول الحساب فقط والاشتراك معلق"
                    >
                      <Check className="w-4 h-4" />
                      <span>قبول فقط ⏳</span>
                    </button>
                    <button
                      onClick={() => handleReject(std)}
                      className="px-2.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-400 font-bold text-xs transition"
                      title="رفض الطلب"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Guide Modal for Assistant & Teacher */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="liquid-glass rounded-3xl p-6 sm:p-7 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-5 border border-white/20 shadow-2xl animate-ios-spring">
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-500 flex items-center justify-center font-bold">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">دليل التشغيل السريع لمس نشوى والسكرتيرة 📖</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">خطوات بسيطة جداً لإدارة الحصة دون أي تعقيد</p>
                </div>
              </div>

              <button
                onClick={() => setShowGuideModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Step 1 */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-1.5">
                <div className="flex items-center gap-2 font-black text-emerald-800 dark:text-emerald-300">
                  <span>1️⃣ أول ما توصلي السنتر قبل بداية الحصة:</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  • حطي الموبايل على الستاند على باب القاعة، وافتحي صفحة <strong>(كشك السكانر)</strong> واضغطي &quot;تشغيل الكاميرا&quot;.
                  <br />
                  • كل طالب داخل يمرر كارت الـ QR أمام الكاميرا لمسافة شبر واحد.. هتسمعي نغمة نجاح ويظهر اسمه في ثانية واحدة.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-1.5">
                <div className="flex items-center gap-2 font-black text-amber-800 dark:text-amber-300">
                  <span>2️⃣ لو طالب نسي الكارت في البيت:</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  • متقلقيش، في نفس شاشة السكانر تحت الكاميرا هتلاقي خانة <strong>(بحث يدوي)</strong>، اكتبي أول حرفين من اسمه أو كوده واضغطي &quot;تسجيل الحضور ✅&quot;.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-2xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800/60 space-y-1.5">
                <div className="flex items-center gap-2 font-black text-brand-800 dark:text-cyan-300">
                  <span>3️⃣ لو طالب دفع الاشتراك الشهري:</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  • افتحي تبويب <strong>(الاشتراكات)</strong>، دوري على اسم الطالب واضغطي على الزر هيتحول من 🔴 غير مسدد إلى 🟢 مسدد فوراً.
                </p>
              </div>

              {/* Step 4 */}
              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 space-y-1.5">
                <div className="flex items-center gap-2 font-black text-purple-800 dark:text-purple-300">
                  <span>4️⃣ إرسال درجات الامتحان لولي الأمر:</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  • من تبويب <strong>(الامتحانات)</strong>، بعد رصد الدرجة، اضغطي على زر الواتساب الأخضر جنب اسم الطالب، هيفتحلك محادثة ولي الأمر برسالة شيك جاهزة للإرسال بضغطة واحدة.
                </p>
              </div>
            </div>

            {/* Emergency Support Contact */}
            <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-right">
                <p className="font-bold text-slate-800 dark:text-white text-xs">وقفت معاكي أي مشكلة؟</p>
                <p className="text-[11px] text-slate-500">مهندس النظام متاح للدعم الفني الفوري</p>
              </div>

              <a
                href="https://wa.me/201012345678?text=أهلاً%20يا%20باشمهندس،%20محتاجة%20مساعدة%20في%20منصة%20مس%20نشوى"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-md"
              >
                <MessageCircle className="w-4 h-4" />
                <span>تواصل مع الدعم الفني (واتساب) 💬</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
