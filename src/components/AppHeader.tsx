'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, FileSpreadsheet, GraduationCap, LayoutDashboard, Home, Lock } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function AppHeader() {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith('/dashboard');

  return (
    <header className="sticky top-0 z-40 px-2 sm:px-6 py-2.5 sm:py-3 no-print">
      <div className="max-w-7xl mx-auto h-14 sm:h-16 rounded-2xl liquid-glass px-3 sm:px-6 flex items-center justify-between gap-2 border border-white/40 dark:border-cyan-500/20">
        {/* Logo & Brand */}
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group active:scale-95 transition-transform shrink-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl overflow-hidden shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform shrink-0 border border-white/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="مس نشوى" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs sm:text-base font-black text-slate-900 dark:text-white leading-tight tracking-tight whitespace-nowrap">
              أكاديمية مس نشوى
            </span>
            <span className="text-[10px] sm:text-[11px] text-brand-600 dark:text-cyan-400 font-bold leading-none mt-0.5">
              {isDashboard ? 'لوحة تحكم المعلمة والإدارة 👩‍🏫' : 'العلوم المتكاملة • أولى ثانوي'}
            </span>
          </div>
        </Link>

        {/* Navigation Actions - Strictly Separated */}
        <nav className="flex items-center gap-1.5 sm:gap-2">
          {isDashboard ? (
            /* TEACHER / DASHBOARD VIEW (NO STUDENT PASS LINK) */
            <>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60 rounded-xl transition"
              >
                <Home className="w-3.5 h-3.5 text-cyan-500" />
                <span className="hidden sm:inline">بوابة الموقع</span>
              </Link>

              <span className="px-2.5 py-1 rounded-xl bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-[11px] font-black hidden sm:inline-flex items-center gap-1">
                <span>وضع المعلمة</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </span>
            </>
          ) : (
            /* PUBLIC STUDENT & PARENT VIEW */
            <>
              <Link
                href="/register"
                className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-brand-600 dark:hover:text-cyan-400 hover:bg-white/60 dark:hover:bg-slate-800/60 rounded-xl transition"
              >
                <FileSpreadsheet className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                استمارة التقديم
              </Link>

              <Link
                href="/student"
                className="inline-flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-black bg-gradient-to-r from-brand-600 to-cyan-500 hover:from-brand-500 hover:to-cyan-400 text-white rounded-xl shadow-md shadow-brand-600/25 active:scale-95 transition whitespace-nowrap"
              >
                <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-100" />
                <span>كارت الطالب</span>
              </Link>
            </>
          )}

          {/* Dark / Light Mode Toggle */}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
