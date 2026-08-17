'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/storage';
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
    loadData();
    const unsub = db.subscribe(loadData);
    return unsub;
  }, []);

  if (!data) return null;

  const activeStudents = data.students.filter((s) => s.status === 'ACTIVE');
  const pendingStudents = data.students.filter((s) => s.status === 'PENDING');

  const currentMonth = 'أكتوبر 2026';
  const monthSubs = data.subscriptions.filter((s) => s.month === currentMonth);
  const paidSubsCount = monthSubs.filter((s) => s.isPaid).length;
  const totalSubRevenue = paidSubsCount * 150;

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
    <div className="space-y-8 py-2 max-w-7xl mx-auto">
      {/* Toast Notification for Instant Approval */}
      {approvalToast && (
        <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between animate-bounce-short">
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
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl border border-brand-800/40">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-cyan-200 border border-white/10 text-xs font-bold backdrop-blur">
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>منصة الإدارة الذكية • علوم متكاملة</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              لوحة تحكم مس نشوى 🌸
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
              إدارة شاملة لحضور السنتر، اعتماد الطلاب الجدد، متابعة اشتراكات أكتوبر، ورصد درجات الامتحانات بضغطة زر.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/scanner"
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-500/25 transition active:scale-95 flex items-center gap-2"
            >
              <QrCode className="w-4 h-4 text-white" />
              تشغيل كشك السكانر 🚀
            </Link>
            <Link
              href="/dashboard/attendance"
              className="px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs backdrop-blur transition flex items-center gap-2"
            >
              <CalendarCheck className="w-4 h-4 text-cyan-300" />
              كشف الغياب اليومي
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs hover:shadow-md transition space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">الطلاب المعتمدين</span>
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">{activeStudents.length}</p>
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>نشط في المجموعات</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs hover:shadow-md transition space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">طلبات التقديم المعلقة</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-600 tracking-tight">{pendingStudents.length}</p>
          <p className="text-[11px] text-slate-400 font-semibold">بانتظار المراجعة والاعتماد</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs hover:shadow-md transition space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">تحصيل شهر أكتوبر</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-600 tracking-tight">
            {paidSubsCount} <span className="text-sm text-slate-400 font-normal">/ {activeStudents.length}</span>
          </p>
          <p className="text-[11px] text-slate-500 font-bold">المحصل: {totalSubRevenue} ج.م</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs hover:shadow-md transition space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">الامتحانات المرصودة</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-cyan-700 tracking-tight">{data.exams.length}</p>
          <p className="text-[11px] text-slate-400 font-semibold">امتحانات ورقية مسجلة</p>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <Link
          href="/dashboard/students"
          className="group bg-white border border-slate-200/80 hover:border-brand-500 p-4 rounded-2xl text-center space-y-2 shadow-xs transition hover:shadow-md"
        >
          <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white transition">
            <Users className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800 block">دليل الطلاب</span>
        </Link>

        <Link
          href="/dashboard/attendance"
          className="group bg-white border border-slate-200/80 hover:border-emerald-500 p-4 rounded-2xl text-center space-y-2 shadow-xs transition hover:shadow-md"
        >
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800 block">كشف الغياب</span>
        </Link>

        <Link
          href="/dashboard/subscriptions"
          className="group bg-white border border-slate-200/80 hover:border-amber-500 p-4 rounded-2xl text-center space-y-2 shadow-xs transition hover:shadow-md"
        >
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition">
            <CreditCard className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800 block">الاشتراكات المالية</span>
        </Link>

        <Link
          href="/dashboard/exams"
          className="group bg-white border border-slate-200/80 hover:border-cyan-500 p-4 rounded-2xl text-center space-y-2 shadow-xs transition hover:shadow-md"
        >
          <div className="w-11 h-11 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center mx-auto group-hover:scale-110 group-hover:bg-cyan-700 group-hover:text-white transition">
            <Award className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800 block">الامتحانات والواتساب</span>
        </Link>

        <Link
          href="/dashboard/print-cards"
          className="group bg-white border border-slate-200/80 hover:border-purple-500 p-4 rounded-2xl text-center space-y-2 shadow-xs transition hover:shadow-md"
        >
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition">
            <Printer className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800 block">طباعة الكروت PDF</span>
        </Link>

        <Link
          href="/dashboard/settings"
          className="group bg-white border border-slate-200/80 hover:border-slate-400 p-4 rounded-2xl text-center space-y-2 shadow-xs transition hover:shadow-md"
        >
          <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto group-hover:scale-110 group-hover:bg-slate-900 group-hover:text-white transition">
            <Settings className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800 block">النسخ الاحتياطي</span>
        </Link>
      </div>

      {/* Pending Registrations Section */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2.5">
              <UserPlus className="w-5 h-5 text-amber-500" />
              طلبات الانضمام الجديدة المعلقة ({pendingStudents.length})
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              الطلاب الذين قاموا بملء الاستمارة وبانتظار قبول المس وتوليد كود الحضور
            </p>
          </div>
          <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200/60">
            {pendingStudents.length} بانتظار الاعتماد
          </span>
        </div>

        {pendingStudents.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 space-y-2 bg-slate-50/50">
            <UserCheck className="w-10 h-10 mx-auto text-emerald-500" />
            <p className="text-xs font-bold text-slate-600">رائع! تم اعتماد كافة طلبات الطلاب ولا توجد طلبات معلقة حالياً ✅</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingStudents.map((std) => {
              const requestedGroup = data.groups.find((g) => g.id === std.groupId);
              return (
                <div
                  key={std.id}
                  className="bg-slate-50/80 border border-amber-200/80 rounded-3xl p-5 flex flex-col justify-between space-y-4 hover:bg-white hover:shadow-md transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-base font-black text-slate-900">{std.name}</h3>
                        <span className="text-xs font-mono font-bold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-lg">
                          كود مقترح: #{std.code}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {new Date(std.registeredAt).toLocaleDateString('ar-EG')}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-200/60">
                      <p className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-brand-600" />
                        هاتف الطالب: <strong className="font-mono text-slate-800">{std.phone}</strong>
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        ولي الأمر: <strong className="text-slate-800">{std.parentName}</strong> (<span className="font-mono">{std.parentPhone}</span>)
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        العنوان: {std.address}
                      </p>
                      <p className="flex items-center gap-2 text-brand-800 font-bold">
                        <Clock className="w-3.5 h-3.5 text-brand-600" />
                        المجموعة: {requestedGroup ? requestedGroup.name : 'غير محدد'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                    <button
                      onClick={() => handleApprove(std)}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <Check className="w-4 h-4" />
                      قبول وتفعيل الباركود ✅
                    </button>
                    <button
                      onClick={() => handleReject(std)}
                      className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 font-bold text-xs transition flex items-center justify-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      رفض
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
