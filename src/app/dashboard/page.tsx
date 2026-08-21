'use client';

import { useState, useEffect } from 'react';
import { db, getCurrentMonthLabel } from '@/lib/storage';
import { sound } from '@/lib/audio';
import { Student, Group, Subscription, SystemData } from '@/types';
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
  AlertCircle 
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function DashboardOverviewPage() {
  const [data, setData] = useState<SystemData | null>(null);
  const [approvalToast, setApprovalToast] = useState<{ name: string; code: string } | null>(null);

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
  const monthSubs = data.subscriptions.filter((s) => s.month === currentMonth);
  const paidSubsCount = monthSubs.filter((s) => s.isPaid).length;
  const totalSubRevenue = paidSubsCount * subPrice;

  const handleApprove = (student: Student) => {
    db.approveStudent(student.id);
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
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black text-xs shadow-lg shadow-emerald-500/25 transition"
            >
              <QrCode className="w-4 h-4" />
              فتح كشك السكانر ⚡
            </Link>
          </div>
        </div>
      </div>

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

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => handleApprove(std)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-xs transition flex items-center gap-1"
                    >
                      <Check className="w-4 h-4" />
                      <span>قبول واعتماد الطالب ✅</span>
                    </button>
                    <button
                      onClick={() => handleReject(std)}
                      className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-400 font-bold text-xs transition"
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
    </div>
  );
}
