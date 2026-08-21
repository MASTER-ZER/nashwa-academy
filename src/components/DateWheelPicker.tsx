'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

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

export default function DateWheelPicker({
  value,
  onChange,
  label = 'تاريخ الميلاد',
  required = false,
}: DateWheelPickerProps) {
  const [day, setDay] = useState<number>(15);
  const [month, setMonth] = useState<number>(5);
  const [year, setYear] = useState<number>(2009);

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
    // Days in month validation
    const maxDays = new Date(newYear, newMonth, 0).getDate();
    const validDay = Math.min(newDay, maxDays);

    setDay(validDay);
    setMonth(newMonth);
    setYear(newYear);

    const mm = String(newMonth).padStart(2, '0');
    const dd = String(validDay).padStart(2, '0');
    onChange(`${newYear}-${mm}-${dd}`);
  };

  const handleStepDay = (step: number) => {
    const maxDays = new Date(year, month, 0).getDate();
    let nextDay = day + step;
    if (nextDay > maxDays) nextDay = 1;
    if (nextDay < 1) nextDay = maxDays;
    updateDate(nextDay, month, year);
  };

  const handleStepMonth = (step: number) => {
    let nextMonth = month + step;
    if (nextMonth > 12) nextMonth = 1;
    if (nextMonth < 1) nextMonth = 12;
    updateDate(day, nextMonth, year);
  };

  const handleStepYear = (step: number) => {
    let nextYear = year + step;
    if (nextYear > 2015) nextYear = 2004;
    if (nextYear < 2004) nextYear = 2015;
    updateDate(day, month, nextYear);
  };

  return (
    <div className="space-y-2 text-right">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-brand-600 dark:text-cyan-400" />
          <span>{label}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>
        <span className="text-[11px] font-mono font-black text-brand-700 dark:text-cyan-400 bg-brand-50 dark:bg-brand-950/80 px-2.5 py-0.5 rounded-lg border border-brand-200/50 dark:border-brand-900/50">
          {day} / {month < 10 ? `0${month}` : month} / {year}
        </span>
      </div>

      {/* 3-Column Stepper & Wheel Controller */}
      <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* 1. Day Column */}
        <div className="flex flex-col items-center space-y-1 bg-slate-50/80 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
          <span className="text-[10px] font-black text-slate-400">اليوم</span>
          <button
            type="button"
            onClick={() => handleStepDay(1)}
            className="w-full py-1 text-slate-500 hover:text-brand-600 dark:hover:text-cyan-400 flex items-center justify-center transition active:scale-95"
            title="اليوم التالي"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          
          <select
            value={day}
            onChange={(e) => updateDate(Number(e.target.value), month, year)}
            className="w-full py-1.5 px-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-black text-sm text-center focus:outline-none focus:border-brand-500 shadow-inner"
          >
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d < 10 ? `0${d}` : d}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => handleStepDay(-1)}
            className="w-full py-1 text-slate-500 hover:text-brand-600 dark:hover:text-cyan-400 flex items-center justify-center transition active:scale-95"
            title="اليوم السابق"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Month Column */}
        <div className="flex flex-col items-center space-y-1 bg-slate-50/80 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
          <span className="text-[10px] font-black text-slate-400">الشهر</span>
          <button
            type="button"
            onClick={() => handleStepMonth(1)}
            className="w-full py-1 text-slate-500 hover:text-brand-600 dark:hover:text-cyan-400 flex items-center justify-center transition active:scale-95"
            title="الشهر التالي"
          >
            <ChevronUp className="w-4 h-4" />
          </button>

          <select
            value={month}
            onChange={(e) => updateDate(day, Number(e.target.value), year)}
            className="w-full py-1.5 px-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs text-center focus:outline-none focus:border-brand-500 shadow-inner"
          >
            {MONTHS_AR.map((m) => (
              <option key={m.val} value={m.val}>
                {m.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => handleStepMonth(-1)}
            className="w-full py-1 text-slate-500 hover:text-brand-600 dark:hover:text-cyan-400 flex items-center justify-center transition active:scale-95"
            title="الشهر السابق"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* 3. Year Column */}
        <div className="flex flex-col items-center space-y-1 bg-slate-50/80 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
          <span className="text-[10px] font-black text-slate-400">السنة</span>
          <button
            type="button"
            onClick={() => handleStepYear(1)}
            className="w-full py-1 text-slate-500 hover:text-brand-600 dark:hover:text-cyan-400 flex items-center justify-center transition active:scale-95"
            title="السنة التالية"
          >
            <ChevronUp className="w-4 h-4" />
          </button>

          <select
            value={year}
            onChange={(e) => updateDate(day, month, Number(e.target.value))}
            className="w-full py-1.5 px-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-black text-sm text-center focus:outline-none focus:border-brand-500 shadow-inner"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => handleStepYear(-1)}
            className="w-full py-1 text-slate-500 hover:text-brand-600 dark:hover:text-cyan-400 flex items-center justify-center transition active:scale-95"
            title="السنة السابقة"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
