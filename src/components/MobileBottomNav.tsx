'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, GraduationCap } from 'lucide-react';

export default function MobileBottomNav() {
  const pathname = usePathname();

  // Show only on public routes for students / parents (hide in dashboard)
  if (pathname.startsWith('/dashboard')) return null;

  return (
    <div className="md:hidden fixed bottom-4 left-0 right-0 z-40 px-6 no-print pointer-events-none">
      <div className="max-w-xs mx-auto p-1.5 rounded-full liquid-glass shadow-2xl flex items-center justify-around pointer-events-auto border border-white/20 dark:border-cyan-500/20">
        {/* 1. Home */}
        <Link
          href="/"
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-full text-xs font-bold transition-all duration-200 active:scale-95 ${
            pathname === '/'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-500/30'
              : 'text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-cyan-400'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>الرئيسية</span>
        </Link>

        {/* 2. Student Portal */}
        <Link
          href="/student"
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-full text-xs font-black transition-all duration-200 active:scale-95 ${
            pathname.startsWith('/student')
              ? 'bg-gradient-to-r from-brand-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/25'
              : 'text-slate-600 dark:text-slate-300 hover:text-cyan-400'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>كارت الطالب</span>
        </Link>
      </div>
    </div>
  );
}
