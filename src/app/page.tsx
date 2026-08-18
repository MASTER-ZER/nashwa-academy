'use client';

import Link from 'next/link';
import { 
  Sparkles, 
  QrCode, 
  UserPlus, 
  GraduationCap, 
  ShieldCheck, 
  CheckCircle2, 
  WifiOff, 
  MessageSquareShare, 
  Clock,
  BookOpen,
  ArrowRight,
  Zap,
  Check,
  Award,
  Bot
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-12 py-4">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-950 via-slate-900 to-brand-900 text-white p-8 sm:p-14 shadow-2xl border border-brand-800/40">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/10 text-cyan-200 text-xs font-bold backdrop-blur">
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>نظام الحضور والامتحانات الذكي للمراكز والدروس الخصوصية</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
            أكاديمية مس نشوى <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 via-cyan-200 to-emerald-300">
              لمادة العلوم المتكاملة
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
            المنظومة الرقمية الرسمية لطلاب الصف الأول الثانوي لإدارة الحضور برمز الـ QR والباركود فائق السرعة، متابعة الاشتراكات الشهرية (250 ج.م)، رصد درجات الامتحانات، وبوت تليجرام للاعتماد الفوري.
          </p>

          <div className="flex flex-wrap gap-3.5 pt-2">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black text-xs sm:text-sm shadow-xl shadow-emerald-500/25 transition active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              استمارة تقديم طالب جديد
            </Link>

            <Link
              href="/dashboard/scanner"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm backdrop-blur transition active:scale-95"
            >
              <QrCode className="w-4 h-4 text-cyan-300" />
              تشغيل كشك السكانر
            </Link>

            <Link
              href="/student"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm transition"
            >
              <GraduationCap className="w-4 h-4 text-brand-400" />
              بوابة الطالب
            </Link>
          </div>
        </div>
      </section>

      {/* 4 Main Action Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Registration Form */}
        <Link
          href="/register"
          className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/60 rounded-3xl p-6 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-13 h-13 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                استمارة التقديم
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                رابط مباشر للطلاب الجدد لملء بياناتهم واختيار موعد المجموعة المناسب.
              </p>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <span>تسجيل طالب جديد</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 2: Student Portal */}
        <Link
          href="/student"
          className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-brand-500/60 rounded-3xl p-6 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-13 h-13 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-cyan-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white transition-all shadow-xs">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-cyan-400 transition">
                بوابة الطالب وولي الأمر
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                عرض كارت الباركود والـ QR الرقمي، متابعة الحضور، ودرجات الامتحانات.
              </p>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-cyan-400">
            <span>دخول الطالب بالكود</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 3: Attendance Scanner Kiosk */}
        <Link
          href="/dashboard/scanner"
          className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-cyan-500/60 rounded-3xl p-6 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-13 h-13 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-cyan-600 group-hover:text-white transition-all shadow-xs">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition">
                كشك السكانر السريع
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                مسح الـ QR والباركود في ثانية مع صوت "تين" وتنبيهات الحضور والاشتراك.
              </p>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-1 text-xs font-bold text-cyan-700 dark:text-cyan-400">
            <span>فتح شاشة الحضور</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 4: Teacher Dashboard */}
        <Link
          href="/dashboard"
          className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-brand-700/60 rounded-3xl p-6 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-13 h-13 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center group-hover:scale-110 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-brand-700 transition">
                لوحة تحكم مس نشوى
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                اعتماد الطلاب، كشف الغياب، رصد الدرجات، الاشتراكات، ورسائل الواتساب.
              </p>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-1 text-xs font-bold text-slate-800 dark:text-slate-200">
            <span>إدارة المنصة بالكامل</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </section>

      {/* Feature Highlights */}
      <section className="bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 sm:p-10 space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <h3 className="text-xl font-black text-slate-900 dark:text-white">مميزات مصممة خصيصاً للسنتر والدروس الواقعية</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">تخلص من الكروت الورقية اليدوية واجعل عمل السنتر منظمًا واحترافيًا بنسبة 100%</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-slate-700 dark:text-slate-300">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mt-0.5">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">مسح فائق السرعة</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">صوت "تين" وتنبيهات ملونة تنظم طابور الدخول في ثوانٍ معدودة.</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 mt-0.5">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">بوت تليجرام ذكي</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">استقبال الاستمارات وقبول وتفعيل كارت الطالب بنقرة واحدة من هاتفك.</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-cyan-400 mt-0.5">
              <MessageSquareShare className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">واتساب بضغطة زر</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">إرسال نتائج الامتحانات وكشف الغياب لولي الأمر والطالب مجاناً.</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mt-0.5">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">طباعة كروت PDF</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">توليد شيت كروت باركود جاهز للطباعة والقص للطلاب بلا هواتف.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
