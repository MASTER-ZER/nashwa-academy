'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/storage';
import { generateAbsenceWhatsAppUrl, generateStudentAbsenceWhatsAppUrl } from '@/lib/whatsapp';
import { Student, Group, AttendanceRecord, SystemData } from '@/types';
import { 
  CalendarCheck, 
  Users, 
  UserX, 
  MessageSquare, 
  CheckCircle2, 
  Phone, 
  Clock, 
  AlertTriangle, 
  PlusCircle, 
  Check,
  Download,
  Printer,
  Send,
  X,
  ExternalLink,
  Sparkles
} from 'lucide-react';

export default function AttendanceDashboardPage() {
  const [data, setData] = useState<SystemData | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [notifiedParentIds, setNotifiedParentIds] = useState<Set<string>>(new Set());
  const [notifiedStudentIds, setNotifiedStudentIds] = useState<Set<string>>(new Set());
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const loadData = () => {
    const d = db.getData();
    setData(d);
    if (d.groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(d.groups[0].id);
    }
  };

  useEffect(() => {
    db.syncFromSupabase().then(() => loadData());
    loadData();
    const unsub = db.subscribe(loadData);
    return unsub;
  }, []);

  if (!data) return null;

  const selectedGroup = data.groups.find((g) => g.id === selectedGroupId);
  const groupStudents = data.students.filter((s) => s.groupId === selectedGroupId && s.status === 'ACTIVE');

  // Today attendance for this group
  const todayStr = new Date().toISOString().split('T')[0];
  const groupAttendance = data.attendance.filter(
    (a) => a.groupId === selectedGroupId && a.scannedAt.startsWith(todayStr)
  );

  const attendedStudentIds = new Set(groupAttendance.map((a) => a.studentId));

  const attendedStudents = groupStudents.filter((s) => attendedStudentIds.has(s.id));
  const absentStudents = groupStudents.filter((s) => !attendedStudentIds.has(s.id));

  const handleManualAttend = (student: Student) => {
    db.scanAttendance({
      scannedCode: student.code,
      activeGroupId: selectedGroupId,
      deviceId: 'admin-manual',
    });
    loadData();
  };

  const handleOpenParentWhatsApp = (student: Student) => {
    if (!selectedGroup) return;
    const url = generateAbsenceWhatsAppUrl({
      parentPhone: student.parentPhone,
      parentName: student.parentName,
      studentName: student.name,
      groupName: selectedGroup.name,
      sessionDate: todayStr,
    });

    setNotifiedParentIds((prev) => new Set(prev).add(student.id));
    window.open(url, '_blank');
  };

  const handleOpenStudentWhatsApp = (student: Student) => {
    if (!selectedGroup) return;
    const url = generateStudentAbsenceWhatsAppUrl({
      studentPhone: student.phone,
      studentName: student.name,
      groupName: selectedGroup.name,
      sessionDate: todayStr,
    });

    setNotifiedStudentIds((prev) => new Set(prev).add(student.id));
    window.open(url, '_blank');
  };

  // Export to Excel / CSV with UTF-8 BOM for perfect Arabic display
  const handleExportCSV = () => {
    if (!selectedGroup) return;

    let csvContent = '\uFEFF'; // Arabic UTF-8 BOM
    csvContent += 'كود الطالب,اسم الطالب,رقم هاتف الطالب,اسم ولي الأمر,رقم ولي الأمر,المجموعة,حالة الحضور,توقيت الحضور\n';

    groupStudents.forEach((std) => {
      const isAttended = attendedStudentIds.has(std.id);
      const attRecord = groupAttendance.find((a) => a.studentId === std.id);
      const scanTime = attRecord
        ? new Date(attRecord.scannedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        : '—';

      csvContent += `"${std.code}","${std.name}","${std.phone}","${std.parentName}","${std.parentPhone}","${selectedGroup.name}","${isAttended ? 'حاضر' : 'غائب'}","${scanTime}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `كشف_حضور_${selectedGroup.name}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print attendance sheet
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & Group Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 liquid-glass rounded-3xl p-5 sm:p-6 no-print">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">سجل الحضور والغياب</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
            كشف حضور حصة اليوم: {new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Actions & Filters */}
        <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="w-full sm:w-56 px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
          >
            {data.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            title="تصدير كملف Excel"
          >
            <Download className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span className="hidden sm:inline">تصدير Excel</span>
          </button>

          {/* Print PDF Button */}
          <button
            onClick={handlePrint}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            title="طباعة كشف الحضور"
          >
            <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span className="hidden sm:inline">طباعة الكشف</span>
          </button>

          {/* Bulk WhatsApp for Absentees */}
          {absentStudents.length > 0 && (
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-95 text-white text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
            >
              <MessageSquare className="w-4 h-4" />
              <span>إرسال واتساب للغائبين ({absentStudents.length}) 📲</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary Banner */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 no-print">
        <div className="liquid-glass-card rounded-2xl p-4 sm:p-5 flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block">إجمالي طلاب المجموعة</span>
            <span className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{groupStudents.length}</span>
          </div>
        </div>

        <div className="liquid-glass-card rounded-2xl p-4 sm:p-5 flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold block">الحاضرون اليوم</span>
            <span className="text-lg sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">{attendedStudents.length}</span>
          </div>
        </div>

        <div className="liquid-glass-card rounded-2xl p-4 sm:p-5 flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <UserX className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <span className="text-[11px] text-rose-700 dark:text-rose-400 font-bold block">الغائبون اليوم</span>
            <span className="text-lg sm:text-2xl font-black text-rose-700 dark:text-rose-400 font-mono">{absentStudents.length}</span>
          </div>
        </div>
      </div>

      {/* Main Lists (Absent vs Attended) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Absent Students */}
        <div className="liquid-glass rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-3">
            <h2 className="text-base font-black text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <UserX className="w-5 h-5" />
              <span>الطلاب الغائبون ({absentStudents.length})</span>
            </h2>
            <span className="text-[11px] text-slate-400 font-semibold">لم يمسحوا الكارت اليوم</span>
          </div>

          {absentStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">مبارك! جميع طلاب هذه المجموعة حاضرون اليوم 🎉</p>
            </div>
          ) : (
            <div className="space-y-3">
              {absentStudents.map((std) => (
                <div
                  key={std.id}
                  className="p-4 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-rose-200/50 dark:border-rose-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md text-slate-700 dark:text-slate-300">
                        #{std.code}
                      </span>
                      <h3 className="font-black text-slate-900 dark:text-white text-sm">{std.name}</h3>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                      ولي الأمر: {std.parentName} ({std.parentPhone})
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    {/* Manual Check-in */}
                    <button
                      onClick={() => handleManualAttend(std)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1"
                      title="تسجيل حضور يدوي"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>تحضير</span>
                    </button>

                    {/* WhatsApp Parent */}
                    <button
                      onClick={() => handleOpenParentWhatsApp(std)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                        notifiedParentIds.has(std.id)
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{notifiedParentIds.has(std.id) ? 'أُرسل للولي ✔️' : 'واتساب الولي'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Attended Students */}
        <div className="liquid-glass rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-3">
            <h2 className="text-base font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>الطلاب الحاضرون ({attendedStudents.length})</span>
            </h2>
            <span className="text-[11px] text-slate-400 font-semibold">تم تسجيل حضورهم بنجاح</span>
          </div>

          {attendedStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Clock className="w-10 h-10 mx-auto opacity-40" />
              <p className="text-xs font-semibold">في انتظار مسح كروت الحضور في هذه الحصة...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {attendedStudents.map((std) => {
                const attRec = groupAttendance.find((a) => a.studentId === std.id);
                const scanTime = attRec
                  ? new Date(attRec.scannedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
                  : '—';

                return (
                  <div
                    key={std.id}
                    className="p-4 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-emerald-200/50 dark:border-emerald-900/30 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md text-slate-700 dark:text-slate-300">
                          #{std.code}
                        </span>
                        <h3 className="font-black text-slate-900 dark:text-white text-sm">{std.name}</h3>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                        توقيت المسح: {scanTime}
                      </p>
                    </div>

                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      حاضر ✅
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bulk WhatsApp Dispatch Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg liquid-glass rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl border border-white/20 animate-ios-spring">
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">إرسال واتساب جماعي للغائبين</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">إشعار أولياء الأمور بغياب أبنائهم اليوم ({absentStudents.length} طلاب)</p>
                </div>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">📄 نص الرسالة المجهزة تلقائياً:</p>
              <p className="italic text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                &quot;تحية طيبة من أكاديمية مس نشوى لمادة العلوم المتكاملة. نود إحاطة علم سيادتكم بغياب الطالب/ة عن حصة اليوم. نرجو التواصل لتحديد موعد حصة التعويض.&quot;
              </p>
            </div>

            {/* List of absent students to message */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {absentStudents.map((std) => (
                <div
                  key={std.id}
                  className="p-3 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{std.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono block">ولي الأمر: {std.parentPhone}</span>
                  </div>
                  <button
                    onClick={() => handleOpenParentWhatsApp(std)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1 ${
                      notifiedParentIds.has(std.id)
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    }`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{notifiedParentIds.has(std.id) ? 'تم الإرسال ✔️' : 'إرسال واتساب'}</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs hover:bg-slate-300 dark:hover:bg-slate-600 transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
