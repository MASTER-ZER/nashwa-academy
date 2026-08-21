'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, KeyRound, Sparkles, AlertCircle, ArrowLeft, Unlock, Check } from 'lucide-react';
import { sound } from '@/lib/audio';
import { db } from '@/lib/storage';
import confetti from 'canvas-confetti';
import Link from 'next/link';

const AUTH_KEY = 'nashwa_admin_authenticated_v1';

export default function AdminPasscodeGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  useEffect(() => {
    // Initial sync from DB
    db.syncFromSupabase().catch(() => {});
    const saved = localStorage.getItem(AUTH_KEY);
    if (saved === 'true') {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const handleDigitClick = (digit: string) => {
    if (pin.length >= 10) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    sound.playInfoSound();

    const currentPasscode = db.getSettings().adminPasscode || '2026';
    if (nextPin === currentPasscode) {
      verifyPin(nextPin);
    }
  };

  const handleDeleteDigit = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClearPin = () => {
    setPin('');
    setErrorMsg('');
  };

  const verifyPin = (inputPin?: string) => {
    const pinToVerify = inputPin !== undefined ? inputPin : pin;
    const currentPasscode = (db.getSettings().adminPasscode || '2026').trim();

    if (pinToVerify.trim() === currentPasscode) {
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
      setErrorMsg('رمز المرور غير صحيح! يرجى إدخال الرقم السري الصحيح للمعلمة');
      setTimeout(() => {
        setIsShaking(false);
        setPin('');
      }, 600);
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setErrorMsg('يرجى كتابة رمز المرور أولاً');
      return;
    }
    verifyPin(pin);
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
        className={`w-full max-w-md p-7 sm:p-9 rounded-3xl liquid-glass text-center space-y-6 shadow-2xl border border-slate-200 dark:border-white/10 ${
          isShaking ? 'animate-bounce' : 'animate-ios-spring'
        }`}
      >
        {/* Lock Icon Badge */}
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-brand-600 via-cyan-500 to-emerald-400 text-white flex items-center justify-center mx-auto shadow-xl shadow-cyan-500/25 scale-110 border border-white/20">
          <KeyRound className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">بوابة المعلمة • مس نشوى</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            أدخلي رمز المرور السري (Passcode / PIN) لفتح لوحة التحكم
          </p>
        </div>

        {/* Input Box for typing or keypad */}
        <form onSubmit={handleSubmitForm} className="space-y-3">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={pin}
              autoFocus
              placeholder="••••"
              onChange={(e) => {
                setPin(e.target.value);
                setErrorMsg('');
              }}
              className="w-full py-3 px-4 rounded-2xl border-2 border-brand-500/40 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-black text-2xl text-center tracking-widest focus:outline-none focus:border-brand-500 shadow-inner"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3.5 top-3.5 text-xs text-slate-400 hover:text-brand-500 font-bold"
            >
              {showPassword ? 'إخفاء' : 'إظهار'}
            </button>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-brand-600 to-cyan-500 hover:from-brand-500 hover:to-cyan-400 text-white font-black text-sm shadow-md shadow-brand-600/30 transition active:scale-95 flex items-center justify-center gap-2"
          >
            <Unlock className="w-4 h-4" />
            <span>تأكيد وفتح لوحة التحكم 🔓</span>
          </button>
        </form>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5 animate-pulse border border-rose-500/20">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Virtual Touch Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto pt-1" dir="ltr">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigitClick(num)}
              className="w-14 h-14 rounded-2xl bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800 active:scale-90 text-lg font-black text-slate-800 dark:text-white shadow-xs border border-slate-200/80 dark:border-white/10 hover:border-cyan-500/40 transition flex items-center justify-center mx-auto"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClearPin}
            className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 text-[11px] font-bold text-slate-500 dark:text-slate-400 transition flex items-center justify-center mx-auto"
          >
            مسح
          </button>
          <button
            type="button"
            onClick={() => handleDigitClick('0')}
            className="w-14 h-14 rounded-2xl bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800 active:scale-90 text-lg font-black text-slate-800 dark:text-white shadow-xs border border-slate-200/80 dark:border-white/10 hover:border-cyan-500/40 transition flex items-center justify-center mx-auto"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDeleteDigit}
            className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 text-xs font-bold text-slate-600 dark:text-slate-300 transition flex items-center justify-center mx-auto"
          >
            ⌫
          </button>
        </div>

        {/* Remember on this device */}
        <div className="pt-1 flex items-center justify-center gap-2 text-xs text-slate-600 dark:text-slate-400">
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
