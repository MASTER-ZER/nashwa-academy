'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/storage';
import { generateAbsenceWhatsAppUrl, generateStudentAbsenceWhatsAppUrl } from '@/lib/whatsapp';
import { Student, Group, AttendanceRecord, SystemData } from '@/types';
import { CalendarCheck, Users, UserX, MessageSquare, CheckCircle2, Phone, Clock, AlertTriangle } from 'lucide-react';

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
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-brand-600" />
            كشف الحضور والغياب اليومي ({todayStr})
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            متابعة الحاضرين والغائبين لكل مجموعة مع إرسال إشعارات الواتساب لأولياء الأمور
          </p>
        </div>

        {/* Group Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-bold text-slate-600 whitespace-nowrap">المجموعة:</label>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="w-full sm:w-72 px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 focus:border-brand-500 focus:outline-none"
          >
            {data.groups.map((grp) => (
              <option key={grp.id} value={grp.id}>
                {grp.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-bold text-slate-500">إجمالي طلاب المجموعة</span>
          <p className="text-2xl font-black text-slate-900">{groupStudents.length}</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-bold text-emerald-800">الحاضرين اليوم</span>
          <p className="text-2xl font-black text-emerald-700">{attendedStudents.length}</p>
        </div>

        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-bold text-rose-800">الغائبين اليوم</span>
          <p className="text-2xl font-black text-rose-700">{absentStudents.length}</p>
        </div>
      </div>

      {/* Main Grid: Absent vs Attended Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Absent Students Section */}
        <div className="bg-white border border-rose-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-rose-900 flex items-center gap-1.5">
              <UserX className="w-4 h-4 text-rose-600" />
              الطلاب الغائبين عن حصة اليوم ({absentStudents.length})
            </h2>
            <span className="text-[11px] text-slate-400">بانتظار إبلاغ أولياء الأمور</span>
          </div>

          {absentStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-1">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
              <p className="text-xs font-bold text-emerald-700">ممتاز! نسبة الحضور 100% لا يوجد غياب اليوم 🎉</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {absentStudents.map((std) => {
                const parentSent = notifiedParentIds.has(std.id);
                const studentSent = notifiedStudentIds.has(std.id);

                return (
                  <div
                    key={std.id}
                    className="p-3.5 rounded-2xl bg-rose-50/40 border border-rose-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{std.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        كود: #{std.code} • ولي الأمر: {std.parentName} ({std.parentPhone})
                      </p>
                    </div>

                    {/* Action WhatsApp Buttons */}
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <button
                        onClick={() => handleOpenParentWhatsApp(std)}
                        className={`flex-1 sm:flex-none px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 shadow-xs ${
                          parentSent
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{parentSent ? 'تم فتح الشات ✔️' : 'واتساب ولي الأمر'}</span>
                      </button>

                      <button
                        onClick={() => handleOpenStudentWhatsApp(std)}
                        className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                          studentSent
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                        title="إرسال واتساب تشجيعي للطالب"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>طالب</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Attended Students Section */}
        <div className="bg-white border border-emerald-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-emerald-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              الطلاب الحاضرين اليوم ({attendedStudents.length})
            </h2>
            <span className="text-[11px] text-slate-400">سجل المسح</span>
          </div>

          {attendedStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-1">
              <Clock className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs">لم يتم تسجيل حضور أي طالب في هذه المجموعة اليوم بعد.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {attendedStudents.map((std) => {
                const attRec = groupAttendance.find((a) => a.studentId === std.id);
                return (
                  <div
                    key={std.id}
                    className="p-3 rounded-2xl bg-emerald-50/40 border border-emerald-200/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{std.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">#{std.code} • {std.phone}</p>
                    </div>
                    <div className="text-left">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full block">
                        حاضر ✅
                      </span>
                      {attRec && (
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          {new Date(attRec.scannedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
