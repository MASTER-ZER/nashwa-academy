'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/storage';
import { sound } from '@/lib/audio';
import { Group, SystemData, SystemSettings } from '@/types';
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
  Save,
  DollarSign,
  Lock,
  GraduationCap,
  Sparkles,
  Phone,
  MapPin,
  Clock,
  Calendar,
  Users,
} from 'lucide-react';
import confetti from 'canvas-confetti';

const WEEK_DAYS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
const HOURS = ['1:00', '2:00', '3:00', '4:00', '5:00', '6:00', '7:00', '8:00', '9:00', '10:00', '11:00', '12:00'];
const PERIODS = ['مساءً', 'صباحاً', 'ظهراً', 'عصراً'];

export default function SettingsDashboardPage() {
  const [data, setData] = useState<SystemData | null>(null);
  const [settings, setSettings] = useState<SystemSettings>({
    teacherName: 'مس نشوى',
    subjectName: 'العلوم المتكاملة',
    academicYearLabel: 'الصف الأول الثانوي',
    subscriptionPrice: 250,
    adminPasscode: '2026',
    assistantPhone: '01012345678',
    centerLocation: 'سنتر الأوائل - قاعة 1',
    telegramBotToken: '8897471175:AAH__IM1R9Ro2yYdClmtZ_X4TvzFZsr5uUs',
    telegramAdminChatId: '6602868710',
  });

  const [lastBackup, setLastBackup] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState(false);

  // Group modal states with Dropdown selections
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  // Dropdown specific states for groups
  const [groupNumber, setGroupNumber] = useState<number>(1);
  const [day1, setDay1] = useState<string>('الأحد');
  const [day2, setDay2] = useState<string>('الثلاثاء');
  const [selectedHour, setSelectedHour] = useState<string>('4:00');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('مساءً');
  const [maxStudents, setMaxStudents] = useState<number>(35);
  const [customGroupName, setCustomGroupName] = useState<string>('');

  // Telegram test state
  const [tgTestStatus, setTgTestStatus] = useState<string | null>(null);
  const [isSendingTg, setIsSendingTg] = useState(false);

  const loadData = () => {
    const d = db.getData();
    setData(d);
    const s = db.getSettings();
    setSettings(s);
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

  // Compute live group name preview from dropdown selections
  const getAutoGroupName = () => {
    const daysStr = day2 === 'حصة واحدة أسبوعياً' ? day1 : `${day1} و${day2}`;
    return `مجموعة (${groupNumber}) - ${daysStr} | ${selectedHour} ${selectedPeriod}`;
  };

  // Save General System Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    db.updateSettings(settings);
    sound.playSuccessChime();
    try {
      confetti({ particleCount: 40, spread: 60 });
    } catch {}
    setSaveSettingsSuccess(true);
    setStatusMsg({ type: 'success', text: 'تم حفظ وتحديث جميع إعدادات المنصة بنجاح! 🎉' });
    setTimeout(() => setSaveSettingsSuccess(false), 3000);
  };

  // Open Group Modal for Adding
  const handleOpenAddGroup = () => {
    setEditingGroup(null);
    const nextNum = (data?.groups.length || 0) + 1;
    setGroupNumber(nextNum);
    setDay1('الأحد');
    setDay2('الثلاثاء');
    setSelectedHour('4:00');
    setSelectedPeriod('مساءً');
    setMaxStudents(35);
    setCustomGroupName('');
    setIsGroupModalOpen(true);
  };

  // Open Group Modal for Editing
  const handleEditGroupClick = (grp: Group) => {
    setEditingGroup(grp);
    setDay1(grp.days[0] || 'الأحد');
    setDay2(grp.days[1] || 'حصة واحدة أسبوعياً');
    setMaxStudents(grp.maxStudents || 35);
    setCustomGroupName(grp.name);
    setIsGroupModalOpen(true);
  };

  // Save Group (Add or Edit)
  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();

    const finalName = customGroupName.trim() || getAutoGroupName();
    const daysArr = day2 === 'حصة واحدة أسبوعياً' ? [day1] : [day1, day2];
    const timeStr = `${selectedHour} ${selectedPeriod}`;

    if (editingGroup) {
      db.updateGroup(editingGroup.id, {
        name: finalName,
        time: timeStr,
        days: daysArr,
        academicYear: 'FIRST_SEC',
        maxStudents: Number(maxStudents) || 35,
      });
      setStatusMsg({ type: 'success', text: 'تم تعديل بيانات المجموعة بنجاح ✅' });
    } else {
      db.addGroup({
        name: finalName,
        time: timeStr,
        days: daysArr,
        academicYear: 'FIRST_SEC',
        maxStudents: Number(maxStudents) || 35,
      });
      setStatusMsg({ type: 'success', text: 'تمت إضافة المجموعة الجديدة بنجاح ➕' });
    }

    sound.playSuccessChime();
    setIsGroupModalOpen(false);
    setEditingGroup(null);
    loadData();
  };

  // Delete Group
  const handleDeleteGroup = (grp: Group) => {
    if (confirm(`هل أنت متأكد من حذف (${grp.name})؟`)) {
      db.deleteGroup(grp.id);
      setStatusMsg({ type: 'success', text: 'تم حذف المجموعة بنجاح' });
      sound.playWarningAlert();
      loadData();
    }
  };

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
            chat: { id: settings.telegramAdminChatId || '6602868710' },
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
      {/* Top Header */}
      <div className="liquid-glass rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-brand-600 dark:text-cyan-400" />
            لوحة التحكم الشاملة وإعدادات النظام
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            تحكم كامل في هوية المنصة، المجموعات، سعر الاشتراك، رمز المرور، وربط البوت
          </p>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 animate-ios-spring ${
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

      {/* SECTION 1: Master General Settings (تحكم شامل في كل بيانات المنصة) */}
      <form onSubmit={handleSaveSettings} className="liquid-glass rounded-3xl p-5 sm:p-7 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-cyan-400 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">التحكم في بيانات الأكاديمية والأسعار</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">تعديل اسم المعلمة، المادة، سعر الاشتراك، ورمز المرور السري</p>
            </div>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-brand-600 to-cyan-500 hover:from-brand-500 hover:to-cyan-400 text-white font-black text-xs shadow-md shadow-brand-600/25 active:scale-95 transition flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            {saveSettingsSuccess ? 'تم الحفظ بنجاح! ✅' : 'حفظ التعديلات 💾'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {/* Teacher Name */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>اسم المعلمة / صاحب المنصة:</span>
            </label>
            <input
              type="text"
              value={settings.teacherName}
              onChange={(e) => setSettings({ ...settings, teacherName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
              required
            />
          </div>

          {/* Subject Name */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300">اسم المادة التعليمية:</label>
            <input
              type="text"
              value={settings.subjectName}
              onChange={(e) => setSettings({ ...settings, subjectName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
              required
            />
          </div>

          {/* Stage / Grade */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300">المرحلة والصف الدراسي:</label>
            <input
              type="text"
              value={settings.academicYearLabel}
              onChange={(e) => setSettings({ ...settings, academicYearLabel: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
              required
            />
          </div>

          {/* Monthly Subscription Fee */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
              <span>قيمة الاشتراك الشهري (جنيه مصري):</span>
            </label>
            <input
              type="number"
              min={0}
              value={settings.subscriptionPrice}
              onChange={(e) => setSettings({ ...settings, subscriptionPrice: Number(e.target.value) })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-brand-500"
              required
            />
          </div>

          {/* Admin Passcode */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-brand-500" />
              <span>رمز مرور لوحة التحكم السري (PIN):</span>
            </label>
            <input
              type="text"
              maxLength={6}
              value={settings.adminPasscode}
              onChange={(e) => setSettings({ ...settings, adminPasscode: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-black tracking-widest focus:outline-none focus:border-brand-500 text-center"
              required
            />
          </div>

          {/* Assistant Phone */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-cyan-500" />
              <span>رقم هاتف المساعد / الدعم:</span>
            </label>
            <input
              type="tel"
              value={settings.assistantPhone}
              onChange={(e) => setSettings({ ...settings, assistantPhone: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Center Location */}
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
            <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span>مقر ومكان انعقاد الدروس (السنتر / القاعة):</span>
            </label>
            <input
              type="text"
              value={settings.centerLocation}
              onChange={(e) => setSettings({ ...settings, centerLocation: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>
      </form>

      {/* SECTION 2: Groups Management Section with Dropdowns (إدارة المجموعات بالقوائم المنسدلة) */}
      <div className="liquid-glass rounded-3xl p-5 sm:p-7 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/50 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-cyan-400 flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                إدارة مجموعات ومواعيد الدروس ({data.groups.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                إضافة مجموعات جديدة واختيار الأيام والمواعيد بسهولة عبر القوائم المنسدلة
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenAddGroup}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-brand-600 to-cyan-500 hover:from-brand-500 hover:to-cyan-400 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-brand-600/25 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            إضافة مجموعة جديدة بالقوائم ➕
          </button>
        </div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.groups.map((grp) => {
            const studentCount = data.students.filter((s) => s.groupId === grp.id).length;
            return (
              <div
                key={grp.id}
                className="p-5 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-3 flex flex-col justify-between shadow-2xs hover:border-cyan-500/30 transition"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-black text-brand-600 dark:text-cyan-400 bg-brand-50 dark:bg-brand-950/80 px-2.5 py-1 rounded-lg">
                      {grp.time}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                      {studentCount} / {grp.maxStudents || 35} طالب
                    </span>
                  </div>
                  <h3 className="font-black text-slate-900 dark:text-white text-sm mt-2.5">{grp.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-cyan-500" />
                    <span>الأيام: {grp.days.join(' • ')}</span>
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-700/60">
                  <button
                    onClick={() => handleEditGroupClick(grp)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-brand-600 dark:hover:text-cyan-400 shadow-2xs text-xs font-bold flex items-center gap-1 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    تعديل
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(grp)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-rose-500 shadow-2xs text-xs font-bold flex items-center gap-1 transition"
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

      {/* SECTION 3: Telegram Bot Live In-Dashboard Config (بدون تعديل أكواد) */}
      <div className="liquid-glass rounded-3xl p-5 sm:p-7 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/50 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
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
                استقبال استمارات التسجيل الجديدة وقبول وتفعيل كارت الطالب بنقرة واحدة من تليجرام
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://t.me/MissNashwa_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              فتح البوت في تليجرام
            </a>

            <button
              onClick={handleSendTelegramTest}
              disabled={isSendingTg}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5 text-cyan-500" />
              {isSendingTg ? 'جاري الإرسال...' : 'إرسال تجربة 📲'}
            </button>
          </div>
        </div>

        {tgTestStatus && (
          <div className="p-3.5 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 text-xs font-bold animate-ios-spring">
            {tgTestStatus}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 space-y-1">
            <label className="text-slate-500 dark:text-slate-400 font-semibold block">توكن البوت (Telegram Bot Token):</label>
            <input
              type="text"
              value={settings.telegramBotToken}
              onChange={(e) => setSettings({ ...settings, telegramBotToken: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 space-y-1">
            <label className="text-slate-500 dark:text-slate-400 font-semibold block">معرّف الآدمن (Admin Chat ID):</label>
            <input
              type="text"
              value={settings.telegramAdminChatId}
              onChange={(e) => setSettings({ ...settings, telegramAdminChatId: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* SECTION 4: Database & Cloud Backup */}
      <div className="liquid-glass rounded-3xl p-5 sm:p-7 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-200/50 dark:border-slate-800 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">قاعدة البيانات السحابية (Supabase)</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              مزامنة لحظية وتأمين بيانات الحضور والدرجات على السحابة مع تنزيل نسخة احتياطية
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">حفظ نسخة احتياطية محلية (JSON)</span>
              <Download className="w-4 h-4 text-brand-600 dark:text-cyan-400" />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              تنزيل ملف كامل يحتوي على جميع الطلاب وسجلات الحضور والاشتراكات.
            </p>
            <button
              onClick={handleExportBackup}
              className="w-full mt-2 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
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

          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">استعادة البيانات من ملف (JSON)</span>
              <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              استيراد وتحديث قاعدة البيانات من ملف احتياطي سابق تم حفظه.
            </p>
            <label className="w-full mt-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs">
              <Upload className="w-3.5 h-3.5" />
              اختيار ملف واستعادته
              <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* DROPDOWN GROUP MODAL (إضافة / تعديل مجموعة بالقوائم المنسدلة بالكامل) */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="liquid-glass rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 border border-white/20 animate-ios-spring">
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/80 text-brand-600 dark:text-cyan-400 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  {editingGroup ? 'تعديل بيانات المجموعة' : 'إضافة مجموعة جديدة بالقوائم المنسدلة'}
                </h3>
              </div>
              <button onClick={() => setIsGroupModalOpen(false)} className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="space-y-4 text-xs">
              {/* Group Number & Auto Title */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">رقم المجموعة:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={groupNumber}
                    onChange={(e) => setGroupNumber(Number(e.target.value))}
                    className="w-24 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-center"
                  />
                  <div className="flex-1 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold text-[11px] truncate">
                    المعاينة: {getAutoGroupName()}
                  </div>
                </div>
              </div>

              {/* Day 1 & Day 2 Dropdowns */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">📅 اليوم الأول:</label>
                  <select
                    value={day1}
                    onChange={(e) => setDay1(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-brand-500"
                  >
                    {WEEK_DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">📅 اليوم الثاني:</label>
                  <select
                    value={day2}
                    onChange={(e) => setDay2(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-brand-500"
                  >
                    <option value="حصة واحدة أسبوعياً">حصة واحدة فقط أسبوعياً</option>
                    {WEEK_DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Time Dropdowns (Hour + Period) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">⏰ توقيت الحصة (الساعة):</label>
                  <select
                    value={selectedHour}
                    onChange={(e) => setSelectedHour(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold font-mono focus:outline-none focus:border-brand-500"
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">الفترة:</label>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-brand-500"
                  >
                    {PERIODS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Student Capacity Presets */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">👥 الحد الأقصى للطلاب في المجموعة:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={maxStudents}
                    onChange={(e) => setMaxStudents(Number(e.target.value))}
                    className="w-24 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-center"
                  />
                  <div className="flex items-center gap-1">
                    {[25, 35, 45, 50].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setMaxStudents(preset)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                          maxStudents === preset
                            ? 'bg-brand-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {preset} طالب
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Optional Custom Group Name */}
              <div className="space-y-1.5 pt-1">
                <label className="font-bold text-slate-500 dark:text-slate-400 text-[11px]">
                  تخصيص الاسم يدوياً (اختياري - سيتم استخدام المعاينة التلقائية إذا ترك فارغاً):
                </label>
                <input
                  type="text"
                  placeholder={getAutoGroupName()}
                  value={customGroupName}
                  onChange={(e) => setCustomGroupName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="pt-3 flex gap-2 border-t border-slate-200/50 dark:border-slate-800">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-brand-600 to-cyan-500 hover:from-brand-500 hover:to-cyan-400 text-white font-black text-xs transition shadow-md shadow-brand-600/25 active:scale-95"
                >
                  حفظ وتأكيد المجموعة ✅
                </button>
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition"
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
