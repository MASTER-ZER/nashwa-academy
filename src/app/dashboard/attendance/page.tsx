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
      <div className="liquid-glass rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
            className="w-full sm:w-80 px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none"
          >
            {data.groups.map((grp) => (
              <option key={grp.id} value={grp.id}>
                {grp.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="liquid-glass rounded-2xl p-4 text-center">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block">إجمالي المجموعة</span>
          <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">{groupStudents.length}</span>
        </div>
        <div className="liquid-glass rounded-2xl p-4 text-center border-emerald-500/30">
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold block">الحاضرون</span>
          <span className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">{attendedStudents.length}</span>
        </div>
        <div className="liquid-glass rounded-2xl p-4 text-center border-rose-500/30">
          <span className="text-[11px] text-rose-700 dark:text-rose-400 font-bold block">الغائبون</span>
          <span className="text-xl sm:text-2xl font-black font-mono text-rose-600 dark:text-rose-400">{absentStudents.length}</span>
        </div>
      </div>

      {/* Absent Students Section (High Priority) */}
      <div className="liquid-glass rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-3">
          <h2 className="text-base font-black text-rose-700 dark:text-rose-400 flex items-center gap-2">
            <UserX className="w-5 h-5" />
            الطلاب الغائبون عن الحصة ({absentStudents.length})
          </h2>
          <span className="text-xs text-slate-400">إرسال إشعار غياب فوري لولي الأمر</span>
        </div>

        {absentStudents.length === 0 ? (
          <div className="p-8 text-center text-emerald-600 dark:text-emerald-400 font-bold text-xs">
            🎉 لا يوجد غياب في هذه المجموعة اليوم! جميع الطلاب حاضرون.
          </div>
        ) : (
          <div className="space-y-2.5">
            {absentStudents.map((std) => {
              const isNotified = notifiedParentIds.has(std.id);
              return (
                <div
                  key={std.id}
                  className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-rose-200/60 dark:border-rose-950/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-mono font-black text-xs flex items-center justify-center">
                      #{std.code}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs">{std.name}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">ولي الأمر: {std.parentName} ({std.parentPhone})</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center w-full sm:w-auto justify-end">
                    <button
                      onClick={() => handleManualAttend(std)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-200 hover:text-emerald-700 text-xs font-bold transition flex items-center gap-1"
                      title="تسجيل الحضور يدوياً"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>حضر يدوي ✏️</span>
                    </button>

                    <button
                      onClick={() => handleOpenParentWhatsApp(std)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition flex items-center gap-1.5 ${
                        isNotified
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-600 hover:bg-rose-700 text-white'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{isNotified ? 'تم إرسال الواتساب ✔️' : 'واتساب لولي الأمر'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Attended Students Section */}
      <div className="liquid-glass rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-3">
          <h2 className="text-base font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            الطلاب الحاضرون في الحصة ({attendedStudents.length})
          </h2>
        </div>

        {attendedStudents.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold">
            لم يتم مسح أو تسجيل أي طالب حتى الآن.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {attendedStudents.map((std) => {
              const attRecord = groupAttendance.find((a) => a.studentId === std.id);
              const scanTime = attRecord
                ? new Date(attRecord.scannedAt).toLocaleTimeString('ar-EG', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—';

              return (
                <div
                  key={std.id}
                  className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-emerald-200/60 dark:border-emerald-950/80 flex items-center justify-between shadow-2xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-mono font-black text-xs flex items-center justify-center">
                      #{std.code}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs">{std.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">توقيت المسح: {scanTime}</p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    حاضر ✅
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
