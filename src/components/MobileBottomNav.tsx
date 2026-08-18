'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileSpreadsheet, GraduationCap, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { href: '/', label: 'الرئيسية', icon: Home },
    { href: '/register', label: 'الاستمارة', icon: FileSpreadsheet },
    { href: '/student', label: 'كارت الطالب', icon: GraduationCap, highlight: true },
  ];

  return (
    <div className="md:hidden fixed bottom-3 left-3 right-3 z-40 no-print">
      <div className="p-1.5 rounded-3xl liquid-glass shadow-2xl flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-2 px-2 rounded-2xl text-[11px] font-bold transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/30'
                  : item.highlight
                  ? 'text-brand-600 dark:text-cyan-400 bg-brand-50/50 dark:bg-brand-950/40'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Mobile Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="flex-1 flex flex-col items-center py-2 px-2 rounded-2xl text-[11px] font-bold text-slate-600 dark:text-slate-300 active:scale-95 transition"
          aria-label="تبديل المظهر"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 mb-0.5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 mb-0.5 text-slate-600" />
          )}
          <span>المظهر</span>
        </button>
      </div>
    </div>
  );
}
