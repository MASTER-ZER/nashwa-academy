'use client';

import React from 'react';
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
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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

  return (
    <AdminPasscodeGate>
      <div className="space-y-6">
        {/* iOS 24 Segmented Tab Bar for Teacher */}
        <div className="no-print overflow-x-auto pb-1 -mx-2 px-2 scrollbar-none">
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl liquid-glass w-max max-w-full mx-auto">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap active:scale-95 ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                      : tab.highlight
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 border border-emerald-200 dark:border-emerald-800/60'
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

        {/* Dashboard Content */}
        {children}
      </div>
    </AdminPasscodeGate>
  );
}
