'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/storage';
import { generateAbsenceWhatsAppUrl, generateStudentAbsenceWhatsAppUrl } from '@/lib/whatsapp';
import { Student, Group, AttendanceRecord, SystemData } from '@/types';
import { CalendarCheck, Users, UserX, MessageSquare, CheckCircle2, Phone, Clock, AlertTriangle, PlusCircle, Check } from 'lucide-react';

export default function AttendanceDashboardPage() {
  const [data, setData] = useState<SystemData | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [notifiedParentIds, setNotifiedParentIds] = useState<Set<string>>(new Set());
  const [notifiedStudentIds, setNotifiedStudentIds] = useState<Set<string>>(new Set());

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
    });

    setNotifiedStudentIds((prev) => new Set(prev).add(student.id));
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 py-2">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-brand-600 dark:text-cyan-400" />
            كشف الحضور والغياب اليومي ({todayStr})
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            متابعة الحاضرين والغائبين لكل مجموعة مع إرسال إشعارات الواتساب لأولياء الأمور
          </p>
        </div>

        {/* Group Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">المجموعة:</label>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="w-full sm:w-72 px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none"
          >
            {data.groups.map((grp) => (
              <option key={grp.id} value={grp.id}>
                {grp.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-cyan-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{groupStudents.length}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">إجمالي طلاب المجموعة</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{attendedStudents.length}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
              حاضر اليوم ({groupStudents.length > 0 ? Math.round((attendedStudents.length / groupStudents.length) * 100) : 0}%)
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{absentStudents.length}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">غائب اليوم بانتظار التواصل</div>
          </div>
        </div>
      </div>

      {/* Tables Grid: Attended vs Absent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attended Students List */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              الطلاب الحاضرين ({attendedStudents.length})
            </h2>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">مسجلين عبر السكانر</span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {attendedStudents.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8 font-semibold">
                لم يتم تسجيل حضور أي طالب حتى الآن
              </p>
            ) : (
              attendedStudents.map((std) => {
                const rec = groupAttendance.find((a) => a.studentId === std.id);
                const time = rec ? new Date(rec.scannedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '--:--';
                return (
                  <div
                    key={std.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-xs flex items-center justify-center">
                        #{std.code}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{std.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono" dir="ltr">{std.phone}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-bold bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {time}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Absent Students List & WhatsApp Actions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <UserX className="w-4 h-4" />
              الطلاب الغائبين ({absentStudents.length})
            </h2>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">إرسال تنبيه الغياب بنقرة واحدة</span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {absentStudents.length === 0 ? (
              <p className="text-xs text-emerald-600 text-center py-8 font-bold">
                🎉 رائع! تم حضور جميع طلاب المجموعة بالكامل اليوم
              </p>
            ) : (
              absentStudents.map((std) => {
                const parentNotified = notifiedParentIds.has(std.id);
                return (
                  <div
                    key={std.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-mono font-bold text-xs flex items-center justify-center">
                        #{std.code}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{std.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">ولي الأمر: {std.parentName} ({std.parentPhone})</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <button
                        onClick={() => handleManualAttend(std)}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition flex items-center gap-1"
                        title="تسجيل حضور يدوي"
                      >
                        <Check className="w-3.5 h-3.5" />
                        حضر يدوي
                      </button>

                      <button
                        onClick={() => handleOpenParentWhatsApp(std)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 ${
                          parentNotified
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        {parentNotified ? 'تم إرسال واتساب ✓' : 'واتساب لولي الأمر'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
