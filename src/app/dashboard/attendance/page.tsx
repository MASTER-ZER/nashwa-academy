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
  Sparkles,
  Calendar,
  Search,
  Filter
} from 'lucide-react';

export default function AttendanceDashboardPage() {
  const [data, setData] = useState<SystemData | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState<string>('');
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

  // Selected date attendance for this group
  const groupAttendance = data.attendance.filter(
    (a) => a.groupId === selectedGroupId && a.scannedAt.startsWith(selectedDate)
  );

  const attendedStudentIds = new Set(groupAttendance.map((a) => a.studentId));

  const attendedStudents = groupStudents.filter((s) => attendedStudentIds.has(s.id));
  const absentStudents = groupStudents.filter((s) => !attendedStudentIds.has(s.id));

  const attendanceRate = groupStudents.length > 0
    ? Math.round((attendedStudents.length / groupStudents.length) * 100)
    : 0;

  const filteredStudents = groupStudents.filter((std) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      std.name.toLowerCase().includes(q) ||
      std.code.includes(q) ||
      std.phone.includes(q) ||
      std.parentPhone.includes(q)
    );
  });

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
      sessionDate: selectedDate,
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
      sessionDate: selectedDate,
    });

    setNotifiedStudentIds((prev) => new Set(prev).add(student.id));
    window.open(url, '_blank');
  };

  // Export to Excel / CSV with UTF-8 BOM for perfect Arabic display
  const handleExportCSV = () => {
    if (!selectedGroup) return;

    let csvContent = '\uFEFF'; // Arabic UTF-8 BOM
    csvContent += 'كود الطالب,اسم الطالب,رقم هاتف الطالب,اسم ولي الأمر,رقم ولي الأمر,المجموعة,تاريخ الحصة,حالة الحضور,توقيت الحضور\n';

    groupStudents.forEach((std) => {
      const isAttended = attendedStudentIds.has(std.id);
      const attRecord = groupAttendance.find((a) => a.studentId === std.id);
      const scanTime = attRecord
        ? new Date(attRecord.scannedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        : '—';

      csvContent += `"${std.code}","${std.name}","${std.phone}","${std.parentName}","${std.parentPhone}","${selectedGroup.name}","${selectedDate}","${isAttended ? 'حاضر' : 'غائب'}","${scanTime}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `كشف_حضور_${selectedGroup.name}_${selectedDate}.csv`);
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
      {/* Header & Group + Date Selector */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 liquid-glass rounded-3xl p-5 sm:p-6 no-print shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-brand-700 dark:text-emerald-400" />
            سجل الحضور والغياب
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
            كشف حضور الحصة بتاريخ ({selectedDate}) لمجموعة {selectedGroup?.name}
          </p>
        </div>

        {/* Actions & Filters */}
        <div className="w-full lg:w-auto flex flex-wrap items-center gap-2">
          {/* Group Selector */}
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="flex-1 sm:flex-initial sm:w-56 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
          >
            {data.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          {/* Date Picker */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-900 dark:text-white focus:outline-none text-xs font-mono font-bold"
            />
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
            title="تصدير كملف Excel"
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">تصدير Excel</span>
          </button>

          {/* Print PDF Button */}
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
            title="طباعة كشف الحضور"
          >
            <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span className="hidden sm:inline">طباعة</span>
          </button>

          {/* Bulk WhatsApp for Absentees */}
          {absentStudents.length > 0 && (
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black transition flex items-center gap-1.5 shadow-xs"
            >
              <MessageSquare className="w-4 h-4" />
              <span>إرسال واتساب للغائبين ({absentStudents.length}) 📲</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 no-print">
        <div className="liquid-glass rounded-2xl p-4 sm:p-5 flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block">إجمالي طلاب المجموعة</span>
            <span className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{groupStudents.length}</span>
          </div>
        </div>

        <div className="liquid-glass rounded-2xl p-4 sm:p-5 flex items-center gap-3 border-emerald-500/30">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold block">الحاضرين في الحصة</span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{attendedStudents.length}</span>
              <span className="text-xs font-bold text-emerald-600/80 font-mono">({attendanceRate}%)</span>
            </div>
          </div>
        </div>

        <div className="liquid-glass rounded-2xl p-4 sm:p-5 flex items-center gap-3 border-rose-500/30">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <UserX className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <span className="text-[11px] text-rose-700 dark:text-rose-400 font-bold block">الطلاب الغائبين</span>
            <span className="text-lg sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">{absentStudents.length}</span>
          </div>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="liquid-glass rounded-2xl p-3 sm:p-4 shadow-xs no-print flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="بحث في كشف الحضور باسم الطالب أو الكود..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
        />
      </div>

      {/* Main Attendance List */}
      <div className="liquid-glass rounded-3xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              كشف الحضور ({filteredStudents.length} طالب)
            </h3>
          </div>

          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono">
            {selectedDate}
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredStudents.length === 0 ? (
            <div className="p-10 text-center text-slate-400 space-y-2">
              <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-xs font-bold">لا يوجد طلاب مطابقين للبحث</p>
            </div>
          ) : (
            filteredStudents.map((std) => {
              const isAttended = attendedStudentIds.has(std.id);
              const attRecord = groupAttendance.find((a) => a.studentId === std.id);
              const isParentNotified = notifiedParentIds.has(std.id);
              const isStudentNotified = notifiedStudentIds.has(std.id);

              return (
                <div
                  key={std.id}
                  className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition ${
                    isAttended
                      ? 'hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20'
                      : 'hover:bg-rose-50/30 dark:hover:bg-rose-950/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono font-black text-xs text-brand-700 dark:text-emerald-400 flex items-center justify-center">
                      #{std.code}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{std.name}</h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <span>📱 {std.phone}</span>
                        <span>👨‍👦 {std.parentName}: {std.parentPhone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                    {isAttended ? (
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>حاضر ({attRecord ? new Date(attRecord.scannedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : 'مسجل'})</span>
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          غائب ❌
                        </span>

                        {/* Quick Manual Attend Button */}
                        <button
                          onClick={() => handleManualAttend(std)}
                          className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1"
                          title="تسجيل حضور يدوي"
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="hidden sm:inline">تحضير</span>
                        </button>

                        {/* WhatsApp Absence to Parent */}
                        <button
                          onClick={() => handleOpenParentWhatsApp(std)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                            isParentNotified
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          }`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{isParentNotified ? 'تم إبلاغ ولي الأمر ✓' : 'واتساب ولي الأمر'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bulk WhatsApp Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="liquid-glass rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 animate-ios-spring">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">إرسال إشعارات الغياب للغائبين ({absentStudents.length})</h3>
              </div>
              <button onClick={() => setIsBulkModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              اضغط على كل طالب لفتح محادثة الواتساب مع ولي أمره وإرسال نص الغياب المخصص تلقائياً:
            </p>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto space-y-1">
              {absentStudents.map((std) => {
                const isSent = notifiedParentIds.has(std.id);
                return (
                  <div key={std.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{std.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{std.parentPhone}</p>
                    </div>

                    <button
                      onClick={() => handleOpenParentWhatsApp(std)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1 ${
                        isSent
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSent ? 'تم الإرسال ✓' : 'إرسال الآن 📲'}</span>
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setIsBulkModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
