'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronUp, ChevronDown, Check } from 'lucide-react';

interface DateWheelPickerProps {
  value?: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  label?: string;
  required?: boolean;
}

const MONTHS_AR = [
  { val: 1, name: 'يناير (01)' },
  { val: 2, name: 'فبراير (02)' },
  { val: 3, name: 'مارس (03)' },
  { val: 4, name: 'أبريل (04)' },
  { val: 5, name: 'مايو (05)' },
  { val: 6, name: 'يونيو (06)' },
  { val: 7, name: 'يوليو (07)' },
  { val: 8, name: 'أغسطس (08)' },
  { val: 9, name: 'سبتمبر (09)' },
  { val: 10, name: 'أكتوبر (10)' },
  { val: 11, name: 'نوفمبر (11)' },
  { val: 12, name: 'ديسمبر (12)' },
];

const YEARS = Array.from({ length: 12 }, (_, i) => 2004 + i); // 2004 - 2015
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export default function DateWheelPicker({ value, onChange, label = 'تاريخ الميلاد', required = false }: DateWheelPickerProps) {
  const [day, setDay] = useState<number>(15);
  const [month, setMonth] = useState<number>(5);
  const [year, setYear] = useState<number>(2009);
  const [isOpen, setIsOpen] = useState(false);

  // Parse initial value if passed
  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        if (!isNaN(y)) setYear(y);
        if (!isNaN(m)) setMonth(m);
        if (!isNaN(d)) setDay(d);
      }
    }
  }, [value]);

  const updateDate = (newDay: number, newMonth: number, newYear: number) => {
    setDay(newDay);
    setMonth(newMonth);
    setYear(newYear);
    const mm = String(newMonth).padStart(2, '0');
    const dd = String(newDay).padStart(2, '0');
    onChange(`${newYear}-${mm}-${dd}`);
  };

  const formattedDisplay = `${day} ${MONTHS_AR.find((m) => m.val === month)?.name.split(' ')[0]} ${year}`;

  return (
    <div className="space-y-1.5 text-right">
      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-cyan-500" />
          <span>{label}</span>
          {required && <span className="text-rose-500">*</span>}
        </span>
        <span className="text-[10px] text-slate-400 font-normal">بكرة اختيار سلسة 🎡</span>
      </label>

      {/* Trigger Box */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-white flex items-center justify-between text-xs font-bold transition hover:border-cyan-500/50 shadow-2xs active:scale-[0.99]"
      >
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-mono font-black text-xs">
            📅
          </span>
          <span className="text-sm font-black text-slate-900 dark:text-white">{formattedDisplay}</span>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
          {isOpen ? 'إغلاق البكرة 🔼' : 'تغيير بالبكرة 🎡'}
        </span>
      </button>

      {/* 3D Wheel Reel Selector */}
      {isOpen && (
        <div className="p-4 rounded-3xl liquid-glass border border-cyan-500/30 bg-slate-950/95 text-white space-y-3 shadow-xl animate-ios-spring">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-[11px] font-bold text-cyan-300">حرّك البكرة أو اختر مباشرة:</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 rounded-xl bg-cyan-500 text-slate-950 font-black text-[11px] flex items-center gap-1 shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>تأكيد الميعاد ✅</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-center">
            {/* 1. Day Column */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 block">اليوم</span>
              <div className="relative">
                <select
                  value={day}
                  onChange={(e) => updateDate(Number(e.target.value), month, year)}
                  className="w-full py-2.5 px-2 rounded-xl bg-white/10 border border-white/15 text-white font-mono font-bold text-sm text-center appearance-none focus:outline-none focus:border-cyan-400 cursor-pointer"
                  size={5}
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d} className="bg-slate-900 py-1 font-bold">
                      {d < 10 ? `0${d}` : d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. Month Column */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 block">الشهر</span>
              <div className="relative">
                <select
                  value={month}
                  onChange={(e) => updateDate(day, Number(e.target.value), year)}
                  className="w-full py-2.5 px-1 rounded-xl bg-white/10 border border-white/15 text-white font-bold text-xs text-center appearance-none focus:outline-none focus:border-cyan-400 cursor-pointer"
                  size={5}
                >
                  {MONTHS_AR.map((m) => (
                    <option key={m.val} value={m.val} className="bg-slate-900 py-1">
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3. Year Column */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 block">السنة</span>
              <div className="relative">
                <select
                  value={year}
                  onChange={(e) => updateDate(day, month, Number(e.target.value))}
                  className="w-full py-2.5 px-2 rounded-xl bg-white/10 border border-white/15 text-white font-mono font-bold text-sm text-center appearance-none focus:outline-none focus:border-cyan-400 cursor-pointer"
                  size={5}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y} className="bg-slate-900 py-1 font-bold">
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
