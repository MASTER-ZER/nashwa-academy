'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Unlock, KeyRound, Sparkles, AlertCircle, ArrowLeft } from 'lucide-react';
import { sound } from '@/lib/audio';
import confetti from 'canvas-confetti';
import Link from 'next/link';

const ADMIN_PASSCODE = '2026';
const AUTH_KEY = 'nashwa_admin_authenticated_v1';

export default function AdminPasscodeGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem(AUTH_KEY);
    if (saved === 'true') {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const handleDigitClick = (digit: string) => {
    if (pin.length >= 4) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    sound.playInfoSound();

    if (nextPin.length === 4) {
      verifyPin(nextPin);
    }
  };

  const handleDeleteDigit = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const verifyPin = (inputPin: string) => {
    if (inputPin === ADMIN_PASSCODE) {
      sound.playSuccessChime();
      try {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      } catch {}
      if (rememberMe) {
        localStorage.setItem(AUTH_KEY, 'true');
      }
      setIsAuthenticated(true);
      setErrorMsg('');
    } else {
      sound.playWarningAlert();
      setIsShaking(true);
      setErrorMsg('رمز المرور غير صحيح، يرجى المحاولة مرة أخرى');
      setTimeout(() => {
        setIsShaking(false);
        setPin('');
      }, 500);
    }
  };

  if (isAuthenticated === null) {
    return null;
  }

  if (isAuthenticated) {
    return (
      <div className="relative animate-ios-spring">
        {/* Floating Quick Admin Logout Button in header */}
        <div className="flex justify-end mb-2 no-print">
          <button
            onClick={() => {
              localStorage.removeItem(AUTH_KEY);
              setIsAuthenticated(false);
              setPin('');
            }}
            className="text-[11px] font-bold text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 flex items-center gap-1.5 py-1.5 px-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/80 transition border border-transparent hover:border-rose-500/20"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>قفل لوحة التحكم والخروج</span>
          </button>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div
        className={`w-full max-w-md p-8 rounded-3xl liquid-glass text-center space-y-6 shadow-2xl border border-slate-200 dark:border-white/10 ${
          isShaking ? 'animate-bounce' : 'animate-ios-spring'
        }`}
      >
        {/* Lock Icon Badge */}
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-brand-600 via-cyan-500 to-emerald-400 text-white flex items-center justify-center mx-auto shadow-xl shadow-cyan-500/25 scale-110 border border-white/20">
          <KeyRound className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">بوابة المعلمة • مس نشوى</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            أدخلي رمز المرور السري (PIN) لفتح لوحة التحكم
          </p>
        </div>

        {/* PIN Circles Display */}
        <div className="flex items-center justify-center gap-4 py-2">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-300 ${
                  isFilled
                    ? 'bg-cyan-400 scale-125 shadow-lg shadow-cyan-400/80 border border-cyan-200'
                    : 'bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700'
                }`}
              />
            );
          })}
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5 animate-pulse border border-rose-500/20">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Virtual iOS Keypad */}
        <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto pt-2" dir="ltr">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigitClick(num)}
              className="w-16 h-16 rounded-full bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800 active:scale-90 text-xl font-black text-slate-800 dark:text-white shadow-md border border-slate-200/80 dark:border-white/10 hover:border-cyan-500/40 transition flex items-center justify-center mx-auto"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => handleDigitClick('0')}
            className="w-16 h-16 rounded-full bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800 active:scale-90 text-xl font-black text-slate-800 dark:text-white shadow-md border border-slate-200/80 dark:border-white/10 hover:border-cyan-500/40 transition flex items-center justify-center mx-auto"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDeleteDigit}
            className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 transition flex items-center justify-center mx-auto border border-transparent dark:border-slate-700"
          >
            حذف
          </button>
        </div>

        {/* Remember on this device */}
        <div className="pt-2 flex items-center justify-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <input
            type="checkbox"
            id="rememberMe"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500 bg-white dark:bg-slate-800"
          />
          <label htmlFor="rememberMe" className="font-semibold cursor-pointer select-none">
            تذكر تسجيل الدخول على هذا الجهاز 🛡️
          </label>
        </div>

        {/* Back to Public Home */}
        <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-cyan-400 font-bold transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>العودة للرئيسية وبوابة الطالب</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
