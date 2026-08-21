'use client';

import { useEffect } from 'react';
import { RefreshCcw, AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled app error:', error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-md mx-auto">
      <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-lg">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-black text-slate-900 dark:text-white">حدث خطأ غير متوقع</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          تم تسجيل الخطأ، اضغط على زر التحديث لإعادة تحميل الصفحة واستئناف العمل.
        </p>
      </div>
      <button
        onClick={() => reset()}
        className="px-5 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-black text-xs transition flex items-center gap-2 shadow-md shadow-brand-600/25"
      >
        <RefreshCcw className="w-4 h-4" />
        <span>إعادة المحاولة 🔄</span>
      </button>
    </div>
  );
}
