'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/storage';
import { Student } from '@/types';
import { 
  Sparkles, 
  UserPlus, 
  GraduationCap, 
  CheckCircle2, 
  WifiOff, 
  MessageSquareShare, 
  Clock,
  BookOpen,
  ArrowRight,
  Zap,
  Award,
  Bot,
  QrCode,
  ShieldCheck,
  ChevronLeft,
  Flame,
  Star
} from 'lucide-react';

export default function HomePage() {
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);

  useEffect(() => {
    const savedCode = localStorage.getItem('logged_student_code');
    if (savedCode) {
      const data = db.getData();
      const std = data.students.find((s) => s.code === savedCode.trim());
      if (std) {
        setActiveStudent(std);
      }
    }
  }, []);

  return (
    <div className="space-y-10 py-2">
      {/* Smart Auto-Detected Student Quick Pass Banner */}
      {activeStudent && (
        <div className="p-4 sm:p-5 rounded-3xl liquid-glass border border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl shadow-emerald-500/10 animate-ios-spring">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 font-black text-sm font-mono">
              #{activeStudent.code}
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>حسابك محفوظ ونشط على هذا الموبايل 📲</span>
              </div>
              <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                أهلاً بك يا بطل، {activeStudent.name}!
              </p>
            </div>
          </div>

          <Link
            href="/student"
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-95 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25"
          >
            <QrCode className="w-4 h-4" />
            <span>فتح كارت الحضور والباركود 📲</span>
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#020617] via-[#091533] to-[#04091a] text-white p-8 sm:p-14 shadow-2xl border border-white/10 dark:border-cyan-500/20">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none animate-pulse-slow" style={{ animationDelay: '2s' }} />
        
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 dark:bg-cyan-950/60 border border-white/15 dark:border-cyan-400/30 text-cyan-300 text-xs font-bold backdrop-blur-md shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-spin" style={{ animationDuration: '6s' }} />
            <span>المنصة الرقمية الأولى لمادة العلوم المتكاملة • أولى ثانوي</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
            أكاديمية مس نشوى <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-emerald-300">
              للعلوم المتكاملة
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
            منظومة تعليمية تفاعلية متكاملة تجمع بين كارت الهوية الذكي (Apple Wallet Pass) بالـ QR فائق السرعة، متابعة الحضور والغياب، الاشتراكات الشهرية، ورصد درجات الامتحانات والتقارير لولي الأمر.
          </p>

          <div className="flex flex-wrap gap-3.5 pt-2">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black text-sm shadow-xl shadow-emerald-500/30 transition active:scale-95 border border-emerald-400/30"
            >
              <UserPlus className="w-4 h-4" />
              استمارة تقديم طالب جديد
            </Link>

            <Link
              href="/student"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm backdrop-blur-md transition active:scale-95 hover:border-cyan-400/40"
            >
              <GraduationCap className="w-4 h-4 text-cyan-300" />
              دخول بوابة الطالب
            </Link>
          </div>
        </div>
      </section>

      {/* 2 Main Public Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Registration Form */}
        <Link
          href="/register"
          className="group liquid-glass-card rounded-3xl p-7 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-md shadow-emerald-500/10 border border-emerald-500/20">
              <UserPlus className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                استمارة تقديم طالب جديد
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                سجل بياناتك واختر موعد المجموعة المناسب ليصل طلبك لمس نشوى للاعتماد الفوري.
              </p>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
            <span>الانتقال للاستمارة</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 2: Student Portal */}
        <Link
          href="/student"
          className="group liquid-glass-card rounded-3xl p-7 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-cyan-950/70 text-brand-600 dark:text-cyan-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white transition-all shadow-md shadow-brand-500/10 border border-cyan-500/20">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-cyan-400 transition">
                بوابة الطالب وولي الأمر
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                عرض كارت الباركود الذكي لدخول الحصص، سجل الحضور، وحالة الاشتراك والامتحانات.
              </p>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-1.5 text-xs font-black text-brand-600 dark:text-cyan-400">
            <span>دخول البوابة بالكود</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </section>

      {/* Feature Highlights Grid */}
      <section className="rounded-3xl liquid-glass p-8 sm:p-10 space-y-6 border border-slate-200 dark:border-white/10">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <div className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 dark:text-cyan-400">
            <Star className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" />
            <span>مميزات حصرية لطلاب الأكاديمية</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">تجربة تعليمية فائقة التميز</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">منظومة ذكية تميز طلاب مادة العلوم المتكاملة لمس نشوى</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-slate-700 dark:text-slate-300">
          <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/80 border border-white/60 dark:border-slate-800 shadow-xs flex items-start gap-3.5 hover:border-emerald-500/30 transition">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 mt-0.5">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">كارت Apple Wallet Pass</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">كارت هوية رقمي أنيق برمز QR وباركود عالي الدقة.</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/80 border border-white/60 dark:border-slate-800 shadow-xs flex items-start gap-3.5 hover:border-cyan-500/30 transition">
            <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-400 mt-0.5">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">اعتماد فوري بالبوت</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">تصل الاستمارة وتُعتمد في ثوانٍ عبر بوت تليجرام الذكي.</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/80 border border-white/60 dark:border-slate-800 shadow-xs flex items-start gap-3.5 hover:border-brand-500/30 transition">
            <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/70 text-brand-600 dark:text-cyan-400 mt-0.5">
              <MessageSquareShare className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">واتساب مباشر لولي الأمر</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">إشعارات فورية بدرجات الامتحانات وكشف الحضور والغياب.</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/80 border border-white/60 dark:border-slate-800 shadow-xs flex items-start gap-3.5 hover:border-amber-500/30 transition">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 mt-0.5">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">متابعة الاشتراكات (250 ج.م)</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">شفافية كاملة في رصد الاشتراكات الشهرية وسداد الكاش.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
