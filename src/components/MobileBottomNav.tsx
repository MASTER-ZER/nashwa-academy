'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, QrCode, GraduationCap, ShieldCheck, UserPlus } from 'lucide-react';

export default function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'الرئيسية', icon: Home },
    { href: '/dashboard/scanner', label: 'السكانر', icon: QrCode, highlight: true },
    { href: '/student', label: 'كارت الطالب', icon: GraduationCap },
    { href: '/dashboard', label: 'لوحة المس', icon: ShieldCheck },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800 shadow-lg px-2 py-1.5 no-print">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));

          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-5 group"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-tr from-cyan-600 to-emerald-500 text-white shadow-emerald-500/30'
                    : 'bg-gradient-to-tr from-slate-900 to-brand-900 text-white shadow-slate-900/30 group-hover:scale-105'
                }`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className={`text-[10px] font-bold mt-1 ${isActive ? 'text-emerald-700 font-black' : 'text-slate-600'}`}>
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
                isActive
                  ? 'text-brand-600 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
