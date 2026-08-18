'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AdminPasscodeGate from '@/components/AdminPasscodeGate';
import {
  LayoutDashboard,
  QrCode,
  Users,
  CalendarCheck,
  CreditCard,
  Award,
  Printer,
  Settings,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const tabsScrollRef = useRef<HTMLDivElement | null>(null);

  const navTabs = [
    { href: '/dashboard', label: 'نظرة عامة', icon: LayoutDashboard, exact: true },
    { href: '/dashboard/scanner', label: 'كشك السكانر', icon: QrCode, highlight: true },
    { href: '/dashboard/students', label: 'دليل الطلاب', icon: Users },
    { href: '/dashboard/attendance', label: 'الحضور والغياب', icon: CalendarCheck },
    { href: '/dashboard/subscriptions', label: 'الاشتراكات', icon: CreditCard },
    { href: '/dashboard/exams', label: 'الامتحانات', icon: Award },
    { href: '/dashboard/print-cards', label: 'طباعة الكروت', icon: Printer },
    { href: '/dashboard/settings', label: 'الإعدادات والبوت', icon: Settings },
  ];

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsScrollRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      tabsScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <AdminPasscodeGate>
      <div className="space-y-6">
        {/* iOS 24 Segmented Tab Bar with Arrow Navigation Controls for Mobile */}
        <div className="no-print relative flex items-center gap-1 max-w-full">
          {/* Scroll Right Arrow */}
          <button
            onClick={() => scrollTabs('right')}
            className="hidden sm:flex p-2 rounded-xl liquid-glass text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white shrink-0 active:scale-90 transition"
            aria-label="تمرير لليمين"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Scrollable Tabs Track */}
          <div
            ref={tabsScrollRef}
            className="overflow-x-auto pb-1 px-1 scrollbar-none flex-1 scroll-smooth"
          >
            <div className="flex items-center gap-1.5 p-1.5 rounded-2xl liquid-glass w-max max-w-none mx-auto">
              {navTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap active:scale-95 ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                        : tab.highlight
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Scroll Left Arrow */}
          <button
            onClick={() => scrollTabs('left')}
            className="hidden sm:flex p-2 rounded-xl liquid-glass text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white shrink-0 active:scale-90 transition"
            aria-label="تمرير لليسار"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Dashboard Content */}
        {children}
      </div>
    </AdminPasscodeGate>
  );
}
