'use client';

import { useState, useEffect } from 'react';
import { Download, Sparkles, X, Smartphone, Check } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.log('SW registration error', err);
      });
    }

    // Check if already in standalone mode (already installed as PWA)
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as unknown as { standalone: boolean }).standalone === true;
      if (isStandalone) {
        setIsInstalled(true);
        return;
      }

      // Detect iOS
      const userAgent = window.navigator.userAgent.toLowerCase();
      const iosDevice = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(iosDevice);

      // Listen for Android/Desktop install prompt
      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setShowBanner(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);

      if (iosDevice && !isStandalone) {
        setShowBanner(true);
      }

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  if (isInstalled || !showBanner) return null;

  return (
    <>
      {/* Floating PWA Install Bar */}
      <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-bounce-short">
        <div className="bg-gradient-to-r from-slate-900 to-brand-950 text-white border border-brand-500/30 p-4 rounded-3xl shadow-2xl flex items-center justify-between gap-3 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-400 text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-brand-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-black text-white">تثبيت تطبيق مس نشوى 📲</p>
              <p className="text-[11px] text-slate-300">يعمل بدون إنترنت وبسرعة فائقة</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-500/25 transition active:scale-95 flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تثبيت</span>
            </button>
            <button
              onClick={() => setShowBanner(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Install Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
              <Smartphone className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black">تثبيت التطبيق على الآيفون 🍏</h3>
            <div className="text-xs text-slate-600 space-y-2 text-right bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <p className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                <span>اضغط على زر المشاركة <strong>(Share / ⎋)</strong> أسفل المتصفح.</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                <span>مرر للأسفل واختر <strong>(إضافة إلى الشاشة الرئيسية / Add to Home Screen ➕)</strong>.</span>
              </p>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold"
            >
              فهمت ✅
            </button>
          </div>
        </div>
      )}
    </>
  );
}
