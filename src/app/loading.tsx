export default function GlobalLoading() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
      <div className="relative w-16 h-16">
        <div className="w-16 h-16 rounded-2xl border-4 border-brand-500/20 border-t-brand-600 dark:border-t-cyan-400 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl">🌸</span>
        </div>
      </div>
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono animate-pulse">
        جاري تحميل المنصة...
      </p>
    </div>
  );
}
