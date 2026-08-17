'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/storage';
import { sound } from '@/lib/audio';
import { Settings, Download, Upload, RefreshCcw, ShieldCheck, Database, CheckCircle2, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SettingsDashboardPage() {
  const [lastBackup, setLastBackup] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const data = db.getData();
    if (data.lastBackupDate) {
      setLastBackup(data.lastBackupDate);
    }
  }, []);

  // Download JSON Backup
  const handleExportBackup = () => {
    const jsonStr = db.exportBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `nashwa_academy_backup_${today}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setLastBackup(new Date().toISOString());
    setStatusMsg({ type: 'success', text: 'تم تنزيل ملف النسخة الاحتياطية بنجاح على جهازك ✅' });
    sound.playSuccessChime();
    try {
      confetti({ particleCount: 30, spread: 50 });
    } catch {}
  };

  // Upload & Restore JSON Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = db.importBackup(content);
      if (success) {
        setStatusMsg({ type: 'success', text: 'تمت استعادة كافة البيانات بنجاح تام! 🎉' });
        sound.playSuccessChime();
      } else {
        setStatusMsg({ type: 'error', text: 'فشل استيراد الملف: تنسيق غير صحيح لقاعدة البيانات ⚠️' });
        sound.playWarningAlert();
      }
    };
    reader.readAsText(file);
  };

  // Reset to default seed
  const handleResetData = () => {
    if (confirm('تحذير: هل أنت متأكد من إعادة تعيين قاعدة البيانات إلى الإعدادات الأولية؟')) {
      db.resetToDefault();
      setStatusMsg({ type: 'success', text: 'تمت إعادة تعيين البيانات الأولية بنجاح.' });
      sound.playInfoSound();
    }
  };

  return (
    <div className="space-y-6 py-2 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-brand-600" />
          إدارة النظام والنسخ الاحتياطي
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          حفظ واستعادة بيانات الطلاب والحضور والاشتراكات لضمان عدم فقدان أي معلومة
        </p>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Backup & Recovery Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Backup Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <Download className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900">تنزيل نسخة احتياطية (Backup)</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              قم بتنزيل ملف يحتوي على كافة بيانات المنصة (الطلاب، الحضور، درجات الامتحانات، والاشتراكات) لحفظه على الكمبيوتر أو فلاشة.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-3">
            {lastBackup && (
              <p className="text-[11px] text-slate-400">
                آخر نسخة احتياطية: {new Date(lastBackup).toLocaleString('ar-EG')}
              </p>
            )}
            <button
              onClick={handleExportBackup}
              className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              تنزيل ملف النسخة الاحتياطية الآن 📥
            </button>
          </div>
        </div>

        {/* Import Backup Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900">استعادة البيانات (Restore)</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              استيراد ملف نسخة احتياطية سابقة لاستعادة كافة البيانات على أي جهاز جديد أو لابتوب آخر.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <label className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4 text-cyan-300" />
              اختيار ملف النسخة الاحتياطية (.json) 📤
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Safety & Reset Box */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">إعادة ضبط البيانات التجريبية</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              إرجاع المنصة إلى بيانات البداية التجريبية (مس نشوى، إياد، أحمد، سارة)
            </p>
          </div>
          <button
            onClick={handleResetData}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 text-xs font-bold transition flex items-center gap-1.5"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            إعادة تعيين
          </button>
        </div>
      </div>
    </div>
  );
}
