'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/storage';
import { sound } from '@/lib/audio';
import { Group, SystemData } from '@/types';
import {
  Settings,
  Download,
  Upload,
  RefreshCcw,
  ShieldCheck,
  Database,
  CheckCircle2,
  AlertTriangle,
  Send,
  PlusCircle,
  Edit2,
  Trash2,
  X,
  Layers,
  Bot,
  ExternalLink,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SettingsDashboardPage() {
  const [data, setData] = useState<SystemData | null>(null);
  const [lastBackup, setLastBackup] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Group modal states
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    time: '01:00 PM',
    days: 'الأحد، الثلاثاء',
    maxStudents: 35,
  });

  // Telegram test state
  const [tgTestStatus, setTgTestStatus] = useState<string | null>(null);
  const [isSendingTg, setIsSendingTg] = useState(false);

  const loadData = () => {
    const d = db.getData();
    setData(d);
    if (d.lastBackupDate) {
      setLastBackup(d.lastBackupDate);
    }
  };

  useEffect(() => {
    db.syncFromSupabase().then(() => loadData());
    loadData();
    const unsub = db.subscribe(loadData);
    return unsub;
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

  // Save Group (Add or Edit)
  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupFormData.name.trim()) return;

    const daysArr = groupFormData.days.split(/[,،]/).map((d) => d.trim()).filter(Boolean);

    if (editingGroup) {
      db.updateGroup(editingGroup.id, {
        name: groupFormData.name.trim(),
        time: groupFormData.time.trim(),
        days: daysArr,
        maxStudents: Number(groupFormData.maxStudents) || 35,
      });
      setStatusMsg({ type: 'success', text: 'تم تحديث بيانات المجموعة بنجاح ✅' });
    } else {
      db.addGroup({
        name: groupFormData.name.trim(),
        time: groupFormData.time.trim(),
        days: daysArr,
        academicYear: 'FIRST_SEC',
        maxStudents: Number(groupFormData.maxStudents) || 35,
      });
      setStatusMsg({ type: 'success', text: 'تمت إضافة المجموعة الجديدة بنجاح ➕' });
    }

    setIsGroupModalOpen(false);
    setEditingGroup(null);
    setGroupFormData({ name: '', time: '01:00 PM', days: 'الأحد، الثلاثاء', maxStudents: 35 });
    loadData();
  };

  const handleEditGroupClick = (grp: Group) => {
    setEditingGroup(grp);
    setGroupFormData({
      name: grp.name,
      time: grp.time,
      days: grp.days.join('، '),
      maxStudents: grp.maxStudents || 35,
    });
    setIsGroupModalOpen(true);
  };

  const handleDeleteGroup = (grp: Group) => {
    if (confirm(`هل أنت متأكد من حذف (${grp.name})؟`)) {
      db.deleteGroup(grp.id);
      setStatusMsg({ type: 'success', text: 'تم حذف المجموعة بنجاح' });
      loadData();
    }
  };

  // Send Test Telegram Notification
  const handleSendTelegramTest = async () => {
    setIsSendingTg(true);
    setTgTestStatus('جاري إرسال إشعار تجريبي للبوت...');
    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            text: '/stats',
            chat: { id: '6602868710' },
          },
        }),
      });
      if (res.ok) {
        setTgTestStatus('✅ تم إرسال إشعار التجربة بنجاح إلى تليجرام!');
        sound.playSuccessChime();
      } else {
        setTgTestStatus('⚠️ حدث خطأ أثناء الإرسال');
      }
    } catch {
      setTgTestStatus('⚠️ تعذر الاتصال بـ Telegram Webhook');
    } finally {
      setIsSendingTg(false);
      setTimeout(() => setTgTestStatus(null), 5000);
    }
  };

  if (!data) return null;

  return (
    <div className="space-y-6 py-2 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-brand-600 dark:text-cyan-400" />
          لوحة التحكم الشاملة وإعدادات النظام
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          إدارة مجموعات ومواعيد الدروس، ربط بوت التليجرام، والنسخ الاحتياطي السحابي
        </p>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
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

      {/* 1. Telegram Bot Automation Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                ربط بوت تليجرام الذكي (@MissNashwa_bot)
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                  متصل ونشط ⚡
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                استقبال استمارات التسجيل وقبول وتفعيل كارت الطالب بنقرة واحدة من تليجرام
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://t.me/MissNashwa_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              فتح البوت في تليجرام
            </a>

            <button
              onClick={handleSendTelegramTest}
              disabled={isSendingTg}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {isSendingTg ? 'جاري الإرسال...' : 'إرسال تجربة 📲'}
            </button>
          </div>
        </div>

        {tgTestStatus && (
          <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 text-xs font-bold">
            {tgTestStatus}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="text-slate-500 dark:text-slate-400 font-semibold mb-1">معرّف الآدمن (Chat ID):</div>
            <div className="font-mono font-bold text-slate-900 dark:text-white">6602868710</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="text-slate-500 dark:text-slate-400 font-semibold mb-1">رابط الويب هوك السحابي:</div>
            <div className="font-mono font-bold text-slate-900 dark:text-white text-[11px] truncate">
              nashwa-academy.vercel.app/api/telegram
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="text-slate-500 dark:text-slate-400 font-semibold mb-1">قيمة الاشتراك المعتمدة:</div>
            <div className="font-bold text-emerald-600 dark:text-emerald-400">250 جنيه مصري / شهرياً</div>
          </div>
        </div>
      </div>

      {/* 2. Groups Management Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-cyan-400 flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                إدارة مجموعات ومواعيد الدروس ({data.groups.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                إضافة مجموعات جديدة وتعديل أيام ومواعيد الحصص الأسبوعية
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setEditingGroup(null);
              setGroupFormData({ name: '', time: '01:00 PM', days: 'الأحد، الثلاثاء', maxStudents: 35 });
              setIsGroupModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            إضافة مجموعة جديدة ➕
          </button>
        </div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.groups.map((grp) => {
            const studentCount = data.students.filter((s) => s.groupId === grp.id).length;
            return (
              <div
                key={grp.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-brand-600 dark:text-cyan-400 bg-brand-50 dark:bg-brand-950/80 px-2 py-0.5 rounded-md">
                      {grp.time}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                      {studentCount} / {grp.maxStudents || 35} طالب
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-xs mt-2">{grp.name}</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    📅 الأيام: {grp.days.join(' • ')}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-700/50">
                  <button
                    onClick={() => handleEditGroupClick(grp)}
                    className="p-1.5 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-brand-600 shadow-2xs text-xs flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    تعديل
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(grp)}
                    className="p-1.5 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-600 shadow-2xs text-xs flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    حذف
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Database & Cloud Backup Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">قاعدة البيانات السحابية (Supabase)</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              مزامنة لحظية وتأمين بيانات الحضور والدرجات على السحابة
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">حفظ نسخة احتياطية محلية (JSON)</span>
              <Download className="w-4 h-4 text-brand-600" />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              تنزيل ملف كامل يحتوي على جميع الطلاب وسجلات الحضور والاشتراكات.
            </p>
            <button
              onClick={handleExportBackup}
              className="w-full mt-2 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              تنزيل النسخة الاحتياطية الآن
            </button>
            {lastBackup && (
              <p className="text-[10px] text-slate-400 text-center font-mono">
                آخر تصدير: {new Date(lastBackup).toLocaleString('ar-EG')}
              </p>
            )}
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">استعادة البيانات من ملف (JSON)</span>
              <Upload className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              استيراد وتحديث قاعدة البيانات من ملف احتياطي سابق تم حفظه.
            </p>
            <label className="w-full mt-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              اختيار ملف واستعادته
              <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Group Modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-slate-900 dark:text-white text-sm">
                {editingGroup ? 'تعديل بيانات المجموعة' : 'إضافة مجموعة جديدة'}
              </h3>
              <button onClick={() => setIsGroupModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">اسم المجموعة *</label>
                <input
                  type="text"
                  placeholder="مثال: مجموعة (4) - الأحد والثلاثاء | 5:00 مساءً"
                  value={groupFormData.name}
                  onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">الموعد</label>
                  <input
                    type="text"
                    placeholder="01:00 PM"
                    value={groupFormData.time}
                    onChange={(e) => setGroupFormData({ ...groupFormData, time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">الحد الأقصى للطلاب</label>
                  <input
                    type="number"
                    value={groupFormData.maxStudents}
                    onChange={(e) => setGroupFormData({ ...groupFormData, maxStudents: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">أيام الحصة (مفصولة بفاصلة)</label>
                <input
                  type="text"
                  placeholder="الأحد، الثلاثاء"
                  value={groupFormData.days}
                  onChange={(e) => setGroupFormData({ ...groupFormData, days: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition"
                >
                  حفظ المجموعة ✅
                </button>
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
