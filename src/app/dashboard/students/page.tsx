'use client';

import { useState, useEffect, useRef } from 'react';
import { db, getCurrentMonthLabel } from '@/lib/storage';
import { Student, Group, SystemData } from '@/types';
import {
  Users,
  Search,
  Phone,
  MapPin,
  Edit3,
  Trash2,
  CheckCircle2,
  QrCode,
  Clock,
  UserPlus,
  X,
  Check,
  Calendar,
  Eye,
  Camera,
  MessageCircle,
  ExternalLink,
  DollarSign,
  Award,
  Download,
  Image as ImageIcon,
  ZoomIn,
  FileText,
  Printer,
  Sparkles,
  Wand2,
  BrainCircuit,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import DateWheelPicker from '@/components/DateWheelPicker';
import { compressStudentPhoto } from '@/lib/imageCompressor';
import { generateStudentReportCardCanvas } from '@/lib/generateReportCard';
import { fetchAIRecommendation } from '@/lib/ai';

export default function StudentsDirectoryPage() {
  const [data, setData] = useState<SystemData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('ALL');

  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [previewImageModal, setPreviewImageModal] = useState<{ url: string; name: string; code: string } | null>(null);
  const [reportCardModal, setReportCardModal] = useState<{ student: Student; dataUrl: string; monthName: string } | null>(null);
  const [customAINote, setCustomAINote] = useState('');
  const [isGeneratingAINote, setIsGeneratingAINote] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  const addFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);

  const [newStudentData, setNewStudentData] = useState({
    name: '',
    phone: '',
    parentName: '',
    parentPhone: '',
    address: '',
    birthDate: '2009-05-15',
    photoUrl: '',
    groupId: '',
  });

  const loadData = () => {
    setData(db.getData());
  };

  useEffect(() => {
    db.syncFromSupabase().then(() => loadData());
    loadData();
    const unsub = db.subscribe(loadData);
    return unsub;
  }, []);

  if (!data) return null;

  const filteredStudents = data.students.filter((s) => {
    const matchesGroup = selectedGroupFilter === 'ALL' || s.groupId === selectedGroupFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.code.includes(q) ||
      s.phone.includes(q) ||
      s.parentPhone.includes(q);
    return matchesGroup && matchesSearch;
  });

  const handleDownloadPhoto = (photoUrl: string, studentName: string, studentCode: string) => {
    const a = document.createElement('a');
    a.href = photoUrl;
    a.download = `student_${studentCode}_${studentName.replace(/\s+/g, '_')}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !viewingStudent) return;
    setIsProcessingPhoto(true);
    try {
      const compressed = await compressStudentPhoto(file);
      const updated = { ...viewingStudent, photoUrl: compressed };
      db.updateStudent(viewingStudent.id, updated);
      setViewingStudent(updated);
      loadData();
    } catch (err) {
      console.error('Error updating profile photo:', err);
      alert('فشل معالجة الصورة، يرجى اختيار صورة أخرى');
    } finally {
      setIsProcessingPhoto(false);
      e.target.value = '';
    }
  };

  const handleOpenReportCard = async (std: Student) => {
    if (!data) return;
    setIsGeneratingReport(true);
    try {
      const curMonth = getCurrentMonthLabel();
      const grp = data.groups.find((g) => g.id === std.groupId) || null;
      const stdAtt = data.attendance.filter((a) => a.studentId === std.id);
      const groupSessions = data.sessions.filter((s) => s.groupId === std.groupId);
      const totalSessions = Math.max(groupSessions.length, stdAtt.length, 4);

      const stdExamResults = data.examResults
        .filter((r) => r.studentId === std.id)
        .map((r) => {
          const exam = data.exams.find((e) => e.id === r.examId);
          return exam ? { exam, result: r } : null;
        })
        .filter(Boolean) as { exam: any; result: any }[];

      const isPaid = data.subscriptions.some((s) => s.studentId === std.id && s.month === curMonth && s.isPaid);

      const dataUrl = await generateStudentReportCardCanvas({
        student: std,
        group: grp,
        attendanceCount: stdAtt.length,
        totalSessionsCount: totalSessions,
        examResults: stdExamResults,
        isPaid,
        monthName: curMonth,
        teacherName: data.settings?.teacherName || 'مس نشوى',
      });

      setReportCardModal({
        student: std,
        dataUrl,
        monthName: curMonth,
      });
      setCustomAINote('');
    } catch (err) {
      console.error('Error generating report card:', err);
      alert('حدث خطأ أثناء توليد التقرير الشهري.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleRegenerateWithNote = async (note: string) => {
    if (!data || !reportCardModal) return;
    const std = reportCardModal.student;
    const curMonth = reportCardModal.monthName;
    const grp = data.groups.find((g) => g.id === std.groupId) || null;
    const stdAtt = data.attendance.filter((a) => a.studentId === std.id);
    const groupSessions = data.sessions.filter((s) => s.groupId === std.groupId);
    const totalSessions = Math.max(groupSessions.length, stdAtt.length, 4);

    const stdExamResults = data.examResults
      .filter((r) => r.studentId === std.id)
      .map((r) => {
        const exam = data.exams.find((e) => e.id === r.examId);
        return exam ? { exam, result: r } : null;
      })
      .filter(Boolean) as { exam: any; result: any }[];

    const isPaid = data.subscriptions.some((s) => s.studentId === std.id && s.month === curMonth && s.isPaid);

    const dataUrl = await generateStudentReportCardCanvas({
      student: std,
      group: grp,
      attendanceCount: stdAtt.length,
      totalSessionsCount: totalSessions,
      examResults: stdExamResults,
      isPaid,
      monthName: curMonth,
      teacherName: data.settings?.teacherName || 'مس نشوى',
      customNote: note,
    });

    setReportCardModal((prev) => (prev ? { ...prev, dataUrl } : null));
  };

  const handleGenerateAIRecommendation = async () => {
    if (!data || !reportCardModal) return;
    const std = reportCardModal.student;
    const curMonth = reportCardModal.monthName;
    const grp = data.groups.find((g) => g.id === std.groupId) || null;
    const stdAtt = data.attendance.filter((a) => a.studentId === std.id);
    const groupSessions = data.sessions.filter((s) => s.groupId === std.groupId);
    const totalSessions = Math.max(groupSessions.length, stdAtt.length, 4);
    const attRate = Math.round((stdAtt.length / totalSessions) * 100);

    const stdExamResults = data.examResults
      .filter((r) => r.studentId === std.id)
      .map((r) => {
        const exam = data.exams.find((e) => e.id === r.examId);
        return exam ? { exam, result: r } : null;
      })
      .filter(Boolean) as { exam: any; result: any }[];

    const avgScore =
      stdExamResults.length > 0
        ? Math.round(
            stdExamResults.reduce((acc, curr) => acc + (curr.result.score / curr.exam.maxScore) * 100, 0) /
              stdExamResults.length
          )
        : 0;

    const gradeLabel =
      avgScore >= 85 ? 'ممتاز 🏆' : avgScore >= 75 ? 'جيد جداً 🌟' : avgScore >= 65 ? 'جيد 👍' : 'يحتاج لمتابعة ⚠️';

    const isPaid = data.subscriptions.some((s) => s.studentId === std.id && s.month === curMonth && s.isPaid);

    setIsGeneratingAINote(true);
    try {
      const generated = await fetchAIRecommendation({
        studentName: std.name,
        studentCode: std.code,
        groupName: grp ? grp.name : 'مجموعة عامة',
        attendanceRate: attRate,
        attendedSessions: stdAtt.length,
        totalSessions,
        academicAverage: avgScore,
        averageGradeLabel: gradeLabel,
        isSubscriptionPaid: isPaid,
        examsList: stdExamResults.map((e) => ({
          title: e.exam.title,
          score: e.result.score,
          maxScore: e.exam.maxScore,
          percentage: Math.round((e.result.score / e.exam.maxScore) * 100),
        })),
      });

      setCustomAINote(generated);
      await handleRegenerateWithNote(generated);
    } catch (err) {
      console.error('AI Recommendation Error:', err);
    } finally {
      setIsGeneratingAINote(false);
    }
  };

  const handleUpdateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudent) {
      db.updateStudent(editingStudent.id, editingStudent);
      setEditingStudent(null);
      if (viewingStudent?.id === editingStudent.id) {
        setViewingStudent(editingStudent);
      }
      loadData();
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentData.name.trim() || !newStudentData.phone.trim()) {
      alert('يرجى كتابة اسم الطالب ورقم الهاتف على الأقل');
      return;
    }

    const std = await db.registerStudent({
      name: newStudentData.name.trim(),
      phone: newStudentData.phone.trim(),
      parentName: newStudentData.parentName.trim() || 'ولي الأمر',
      parentPhone: newStudentData.parentPhone.trim() || newStudentData.phone.trim(),
      address: newStudentData.address.trim() || 'المنصورة',
      birthDate: newStudentData.birthDate || '2009-05-15',
      photoUrl: newStudentData.photoUrl || '',
      academicYear: 'FIRST_SEC',
      groupId: newStudentData.groupId || (data.groups[0]?.id || 'grp-1'),
    });

    // Auto approve
    db.approveStudent(std.id);

    setIsAddModalOpen(false);
    setNewStudentData({
      name: '',
      phone: '',
      parentName: '',
      parentPhone: '',
      address: '',
      birthDate: '2009-05-15',
      photoUrl: '',
      groupId: '',
    });
    loadData();
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف الطالب (${name}) نهائياً؟`)) {
      db.rejectStudent(id);
      if (viewingStudent?.id === id) setViewingStudent(null);
      loadData();
    }
  };

  return (
    <div className="space-y-6 py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 liquid-glass rounded-3xl p-5 sm:p-6 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-600 dark:text-cyan-400" />
            دليل وإدارة الطلاب ({data.students.length})
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            عرض وتعديل بيانات وصور وتواريخ ميلاد وتقارير المتابعة الشهرية لطلاب الصف الأول الثانوي
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-black shadow-md shadow-emerald-500/20 transition active:scale-95 flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            إضافة طالب جديد ➕
          </button>

          <Link
            href="/dashboard/print-cards"
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <QrCode className="w-4 h-4 text-cyan-300" />
            طباعة الكروت PDF
          </Link>

          {data.students.length > 0 && (
            <button
              onClick={async () => {
                if (confirm(`هل أنتِ متأكدة من حذف وتصفير جميع الطلاب (${data.students.length} طالب) للبدء من الصفر؟`)) {
                  await db.clearAllData();
                  localStorage.clear();
                  loadData();
                  window.location.reload();
                }
              }}
              className="px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-600 dark:text-rose-400 text-xs font-bold transition flex items-center justify-center gap-1.5 border border-rose-200 dark:border-rose-900"
            >
              <Trash2 className="w-4 h-4" />
              <span>تصفير القائمة 🧹</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="liquid-glass rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            placeholder="بحث باسم الطالب، الكود، تاريخ الميلاد، أو رقم الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <select
          value={selectedGroupFilter}
          onChange={(e) => setSelectedGroupFilter(e.target.value)}
          className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none sm:w-64"
        >
          <option value="ALL">جميع المجموعات ({data.students.length})</option>
          {data.groups.map((grp) => (
            <option key={grp.id} value={grp.id}>
              {grp.name} ({data.students.filter((s) => s.groupId === grp.id).length})
            </option>
          ))}
        </select>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block liquid-glass rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              <tr>
                <th className="p-4">الطالب</th>
                <th className="p-4">الكود</th>
                <th className="p-4">تاريخ الميلاد</th>
                <th className="p-4">هاتف الطالب</th>
                <th className="p-4">ولي الأمر</th>
                <th className="p-4">المجموعة</th>
                <th className="p-4">الحالة</th>
                <th className="p-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-semibold">
                    لا يوجد طلاب مطابقين للبحث
                  </td>
                </tr>
              ) : (
                filteredStudents.map((std) => {
                  const grp = data.groups.find((g) => g.id === std.groupId);
                  return (
                    <tr key={std.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      <td className="p-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          {std.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={std.photoUrl}
                              alt={std.name}
                              onClick={() => setPreviewImageModal({ url: std.photoUrl!, name: std.name, code: std.code })}
                              className="w-8 h-8 rounded-full object-cover border border-cyan-500 shadow-2xs shrink-0 cursor-pointer hover:scale-110 transition"
                              title="اضغط لمعاينة وتنزيل الصورة"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                              {std.name.slice(0, 1)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{std.name}</p>
                            <p className="text-[10px] text-slate-400">{std.address || 'المنصورة'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono font-black text-brand-700 dark:text-cyan-400">#{std.code}</td>
                      <td className="p-4 font-mono text-slate-600 dark:text-slate-300">
                        {std.birthDate ? (
                          <span className="flex items-center gap-1 font-bold">
                            <Calendar className="w-3.5 h-3.5 text-cyan-500" />
                            {std.birthDate}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-4 font-mono" dir="ltr">{std.phone}</td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{std.parentName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono" dir="ltr">{std.parentPhone}</div>
                      </td>
                      <td className="p-4 font-semibold text-brand-800 dark:text-cyan-300">
                        {grp ? grp.name : 'غير محدد'}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            std.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {std.status === 'ACTIVE' ? 'معتمد ✅' : 'معلق ⏳'}
                        </span>
                      </td>
                      <td className="p-4 text-center space-x-1 space-x-reverse">
                        <button
                          onClick={() => handleOpenReportCard(std)}
                          className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 transition"
                          title="شهادة التقرير الشهري الشامل"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setViewingStudent(std)}
                          className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 hover:bg-cyan-100 text-cyan-700 dark:text-cyan-300 transition"
                          title="عرض الملف والبيانات الكاملة"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingStudent(std)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 text-slate-600 dark:text-slate-300 hover:text-brand-600 transition"
                          title="تعديل بيانات الطالب"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(std.id, std.name)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 text-slate-600 dark:text-slate-300 hover:text-rose-600 transition"
                          title="حذف الطالب"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Student Cards View */}
      <div className="md:hidden space-y-3">
        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-slate-400 liquid-glass rounded-2xl">لا يوجد طلاب مطابقين للبحث</div>
        ) : (
          filteredStudents.map((std) => {
            const grp = data.groups.find((g) => g.id === std.groupId);
            return (
              <div
                key={std.id}
                className="p-4 rounded-2xl liquid-glass space-y-3 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {std.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={std.photoUrl}
                        alt={std.name}
                        onClick={() => setPreviewImageModal({ url: std.photoUrl!, name: std.name, code: std.code })}
                        className="w-10 h-10 rounded-2xl object-cover border border-cyan-500 shadow-2xs shrink-0 cursor-pointer"
                      />
                    ) : (
                      <span className="w-10 h-10 rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-cyan-400 font-mono font-black text-xs flex items-center justify-center">
                        #{std.code}
                      </span>
                    )}
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs">{std.name}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{grp ? grp.name : '—'}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      std.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {std.status === 'ACTIVE' ? 'معتمد' : 'معلق'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 border-t border-slate-100 dark:border-slate-800 pt-2">
                  {std.birthDate && (
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1 font-semibold">
                        <Calendar className="w-3 h-3 text-cyan-500" />
                        الميلاد:
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{std.birthDate}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>هاتف الطالب:</span>
                    <span className="font-mono text-slate-900 dark:text-white" dir="ltr">{std.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ولي الأمر:</span>
                    <span className="font-mono text-slate-900 dark:text-white" dir="ltr">{std.parentPhone}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => handleOpenReportCard(std)}
                    className="py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>التقرير الشهري</span>
                  </button>

                  <button
                    onClick={() => setViewingStudent(std)}
                    className="flex-1 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    الملف
                  </button>
                  <button
                    onClick={() => setEditingStudent(std)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(std.id, std.name)}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 text-xs font-bold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FULL STUDENT PROFILE MODAL */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="liquid-glass rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 border border-cyan-500/30 animate-ios-spring max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-mono font-black text-xs">
                  #{viewingStudent.code}
                </span>
                <h3 className="font-black text-slate-900 dark:text-white text-base">الملف الكامل للطالب</h3>
              </div>
              <button
                onClick={() => setViewingStudent(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Avatar & Quick Details with Photo Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="relative group cursor-pointer shrink-0">
                {viewingStudent.photoUrl ? (
                  <div
                    onClick={() =>
                      setPreviewImageModal({
                        url: viewingStudent.photoUrl!,
                        name: viewingStudent.name,
                        code: viewingStudent.code,
                      })
                    }
                    className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-cyan-500 shadow-md group-hover:scale-105 transition"
                    title="اضغط لتكبير وتحميل الصورة"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={viewingStudent.photoUrl}
                      alt={viewingStudent.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                      <ZoomIn className="w-6 h-6" />
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => profilePhotoInputRef.current?.click()}
                    className="w-24 h-24 rounded-2xl bg-gradient-to-br from-brand-600 to-cyan-500 text-white flex flex-col items-center justify-center font-black text-2xl shadow-md cursor-pointer hover:opacity-90"
                    title="اضغط لرفع صورة للطالب"
                  >
                    <span>#{viewingStudent.code}</span>
                    <span className="text-[9px] font-normal text-cyan-200 flex items-center gap-0.5 mt-1">
                      <Camera className="w-3 h-3" /> رفع صورة
                    </span>
                  </div>
                )}
              </div>

              <div className="text-center sm:text-right space-y-1.5 flex-1">
                <h4 className="font-black text-slate-900 dark:text-white text-base">{viewingStudent.name}</h4>
                <p className="text-xs text-brand-600 dark:text-cyan-400 font-bold">
                  {data.groups.find((g) => g.id === viewingStudent.groupId)?.name || 'غير محدد'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center sm:justify-start gap-1">
                  <MapPin className="w-3 h-3 text-rose-500" />
                  <span>{viewingStudent.address || 'المنصورة'}</span>
                </p>

                {/* Photo Action Row */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                  {viewingStudent.photoUrl && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewImageModal({
                            url: viewingStudent.photoUrl!,
                            name: viewingStudent.name,
                            code: viewingStudent.code,
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-950/70 hover:bg-cyan-100 text-cyan-700 dark:text-cyan-300 font-bold text-[10px] flex items-center gap-1 border border-cyan-300 dark:border-cyan-800"
                      >
                        <Eye className="w-3 h-3" />
                        <span>معاينة مكبرة</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDownloadPhoto(viewingStudent.photoUrl!, viewingStudent.name, viewingStudent.code)
                        }
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] flex items-center gap-1 border border-emerald-300 dark:border-emerald-800"
                      >
                        <Download className="w-3 h-3" />
                        <span>تحميل الصورة 📥</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => profilePhotoInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-[10px] flex items-center gap-1"
                  >
                    <Camera className="w-3 h-3 text-brand-500" />
                    <span>{viewingStudent.photoUrl ? 'تغيير الصورة' : 'إضافة صورة 📸'}</span>
                  </button>

                  <input
                    ref={profilePhotoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePhotoChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Grid of full metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Birth Date */}
              <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 flex items-center gap-1 font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-cyan-500" />
                  تاريخ الميلاد:
                </span>
                <p className="font-mono font-black text-slate-900 dark:text-white text-sm">
                  {viewingStudent.birthDate || 'غير مسجل'}
                </p>
              </div>

              {/* Status */}
              <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 font-semibold">حالة الاعتماد:</span>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {viewingStudent.status === 'ACTIVE' ? 'طالب معتمد ونشط ✅' : 'قيد الانتظار ⏳'}
                </p>
              </div>

              {/* Student Phone */}
              <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
                <span className="text-slate-400 flex items-center gap-1 font-semibold">
                  <Phone className="w-3.5 h-3.5 text-brand-500" />
                  هاتف الطالب (واتساب):
                </span>
                <p className="font-mono font-black text-slate-900 dark:text-white" dir="ltr">{viewingStudent.phone}</p>
                <div className="flex gap-1.5">
                  <a
                    href={`https://wa.me/2${viewingStudent.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center gap-1"
                  >
                    <MessageCircle className="w-3 h-3" />
                    واتساب
                  </a>
                  <a
                    href={`tel:${viewingStudent.phone}`}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[10px] flex items-center justify-center"
                  >
                    اتصال
                  </a>
                </div>
              </div>

              {/* Parent Phone */}
              <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
                <span className="text-slate-400 flex items-center gap-1 font-semibold">
                  <Phone className="w-3.5 h-3.5 text-emerald-500" />
                  ولي الأمر ({viewingStudent.parentName}):
                </span>
                <p className="font-mono font-black text-slate-900 dark:text-white" dir="ltr">{viewingStudent.parentPhone}</p>
                <div className="flex gap-1.5">
                  <a
                    href={`https://wa.me/2${viewingStudent.parentPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                      `أهلاً بحضرتك أستاذ ${viewingStudent.parentName}، من أكاديمية مس نشوى للعلوم المتكاملة 🌸`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center gap-1"
                  >
                    <MessageCircle className="w-3 h-3" />
                    واتساب
                  </a>
                  <a
                    href={`tel:${viewingStudent.parentPhone}`}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[10px] flex items-center justify-center"
                  >
                    اتصال
                  </a>
                </div>
              </div>
            </div>

            {/* Attendance & Exams Stats */}
            <div className="p-4 rounded-2xl bg-brand-50/50 dark:bg-brand-950/40 border border-brand-200/60 dark:border-brand-900/50 grid grid-cols-2 gap-3 text-xs text-center">
              <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80">
                <span className="text-[10px] text-slate-400 block">مرات الحضور المسجلة</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {data.attendance.filter((a) => a.studentId === viewingStudent.id).length} حصص
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80">
                <span className="text-[10px] text-slate-400 block">حالة اشتراك الشهر</span>
                <span className="text-lg font-black text-brand-600 dark:text-cyan-400">
                  {data.subscriptions.some((s) => s.studentId === viewingStudent.id && s.isPaid) ? 'مسدد ✅' : 'مستحق ⏳'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleOpenReportCard(viewingStudent)}
                disabled={isGeneratingReport}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition active:scale-95"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{isGeneratingReport ? 'جاري إنشاء الشهادة...' : 'شهادة التقرير الشهري 📜'}</span>
              </button>

              <Link
                href="/dashboard/print-cards"
                className="px-3 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                <span>طباعة الكارت</span>
              </Link>

              <button
                onClick={() => {
                  setEditingStudent(viewingStudent);
                }}
                className="px-3 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعديل</span>
              </button>

              <button
                onClick={() => handleDelete(viewingStudent.id, viewingStudent.name)}
                className="px-3 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL PHOTO LIGHTBOX INSPECTOR MODAL */}
      {previewImageModal && (
        <div
          onClick={() => setPreviewImageModal(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-ios-spring"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-md w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/20 p-5 text-center space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="text-right">
                <h4 className="text-sm font-black text-white">{previewImageModal.name}</h4>
                <p className="text-[11px] text-cyan-400 font-mono">كود الطالب: #{previewImageModal.code}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImageModal(null)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-inner bg-black flex items-center justify-center border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImageModal.url}
                alt={previewImageModal.name}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  handleDownloadPhoto(previewImageModal.url, previewImageModal.name, previewImageModal.code)
                }
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>تحميل الصورة لجهازك 📥</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewImageModal(null)}
                className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MONTHLY REPORT CARD MODAL */}
      {reportCardModal && (
        <div
          onClick={() => setReportCardModal(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-ios-spring overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-emerald-500/30 p-5 text-center space-y-4 my-8"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="text-right">
                <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>شهادة التقييم والمتابعة الشهرية ({reportCardModal.monthName})</span>
                </h4>
                <p className="text-[11px] text-emerald-400 font-mono">
                  {reportCardModal.student.name} (#{reportCardModal.student.code})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReportCardModal(null)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-emerald-500/20 bg-slate-950 flex items-center justify-center max-h-[60vh] overflow-y-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={reportCardModal.dataUrl}
                alt="Monthly Report Card"
                className="w-full h-auto object-contain rounded-xl"
              />
            </div>

            {/* Smart AI Recommendation Panel */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-emerald-500/20 text-right space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-emerald-400 flex items-center gap-1.5">
                  <BrainCircuit className="w-3.5 h-3.5 text-emerald-400" />
                  <span>توصية المعلمة الذكية (GPT-4o AI):</span>
                </span>
                <button
                  type="button"
                  onClick={handleGenerateAIRecommendation}
                  disabled={isGeneratingAINote}
                  className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-[11px] flex items-center gap-1 shadow-md transition active:scale-95 disabled:opacity-50"
                >
                  {isGeneratingAINote ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>جاري التحليل والصياغة...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3 h-3 text-amber-300" />
                      <span>صياغة توصية ذكية بالذكاء الاصطناعي ✨</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customAINote}
                  onChange={(e) => setCustomAINote(e.target.value)}
                  placeholder="يمكنك كتابة أو تعديل التوصية هنا ثم تطبيقها على الشهادة..."
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
                {customAINote && (
                  <button
                    type="button"
                    onClick={() => handleRegenerateWithNote(customAINote)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-bold transition"
                  >
                    تطبيق على الشهادة 🔄
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const cleanParentPhone = reportCardModal.student.parentPhone.replace(/\D/g, '').replace(/^0/, '20');
                  const msg = `أهلاً بحضرتك أستاذ ${reportCardModal.student.parentName} 🌸\nنرسل لحضرتكم تقرير المتابعة والتقييم الشهري الخاص بـ (${reportCardModal.student.name}) لشهر (${reportCardModal.monthName}) في مادة العلوم المتكاملة مع مس نشوى 🌟\n\n📌 كود الطالب: #${reportCardModal.student.code}\n🔗 لمتابعة كارت الطالب والدرجات المحدثة: https://nashwa-academy.vercel.app/student`;
                  window.open(`https://wa.me/${cleanParentPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                }}
                className="flex-1 min-w-[140px] py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
                <span>إرسال واتساب لولي الأمر 💬</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = reportCardModal.dataUrl;
                  a.download = `تقرير_${reportCardModal.student.code}_${reportCardModal.student.name.replace(/\s+/g, '_')}_${reportCardModal.monthName}.png`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
                className="py-3 px-4 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>تنزيل الشهادة HD 📥</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Printer className="w-4 h-4 text-cyan-300" />
                <span>طباعة PDF 🖨️</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-500" />
              إضافة طالب جديد
            </h2>

            <form onSubmit={handleAddStudent} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">اسم الطالب ثلاثياً</label>
                <input
                  type="text"
                  placeholder="مثال: أحمد علي محمود"
                  value={newStudentData.name}
                  onChange={(e) => setNewStudentData({ ...newStudentData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">هاتف الطالب</label>
                  <input
                    type="tel"
                    dir="ltr"
                    placeholder="01012345678"
                    value={newStudentData.phone}
                    onChange={(e) => setNewStudentData({ ...newStudentData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">هاتف ولي الأمر</label>
                  <input
                    type="tel"
                    dir="ltr"
                    placeholder="01198765432"
                    value={newStudentData.parentPhone}
                    onChange={(e) => setNewStudentData({ ...newStudentData, parentPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">اسم ولي الأمر</label>
                <input
                  type="text"
                  placeholder="مثال: علي محمود"
                  value={newStudentData.parentName}
                  onChange={(e) => setNewStudentData({ ...newStudentData, parentName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">العنوان / المنطقة</label>
                <input
                  type="text"
                  placeholder="مثال: المنصورة - شارع الجيش"
                  value={newStudentData.address}
                  onChange={(e) => setNewStudentData({ ...newStudentData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Date Wheel Picker */}
              <DateWheelPicker
                value={newStudentData.birthDate}
                onChange={(val) => setNewStudentData({ ...newStudentData, birthDate: val })}
                label="تاريخ الميلاد"
              />

              {/* Photo Upload in Add Modal */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-cyan-500" />
                    صورة الطالب (اختياري):
                  </span>
                  {newStudentData.photoUrl && (
                    <button
                      type="button"
                      onClick={() => setNewStudentData({ ...newStudentData, photoUrl: '' })}
                      className="text-[10px] text-rose-500 font-bold"
                    >
                      إزالة الصورة
                    </button>
                  )}
                </label>

                {newStudentData.photoUrl ? (
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={newStudentData.photoUrl}
                      alt="Student"
                      className="w-12 h-12 rounded-xl object-cover border border-emerald-500"
                    />
                    <span className="text-[11px] text-emerald-600 font-bold">تم اختيار الصورة بنجاح ✅</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => addFileInputRef.current?.click()}
                    className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Camera className="w-4 h-4 text-cyan-500" />
                    <span>{isProcessingPhoto ? 'جاري المعالجة...' : 'رفع صورة الطالب 📸'}</span>
                  </button>
                )}
                <input
                  ref={addFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setIsProcessingPhoto(true);
                      try {
                        const compressed = await compressStudentPhoto(file);
                        setNewStudentData((prev) => ({ ...prev, photoUrl: compressed }));
                      } finally {
                        setIsProcessingPhoto(false);
                      }
                    }
                  }}
                  className="hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">المجموعة</label>
                <select
                  value={newStudentData.groupId || data.groups[0]?.id}
                  onChange={(e) => setNewStudentData({ ...newStudentData, groupId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                >
                  {data.groups.map((grp) => (
                    <option key={grp.id} value={grp.id}>
                      {grp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
                >
                  إضافة واعتماد الطالب ✅
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">تعديل بيانات الطالب #{editingStudent.code}</h2>

            <form onSubmit={handleUpdateStudent} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">اسم الطالب</label>
                <input
                  type="text"
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">هاتف الطالب</label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={editingStudent.phone}
                    onChange={(e) => setEditingStudent({ ...editingStudent, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">هاتف ولي الأمر</label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={editingStudent.parentPhone}
                    onChange={(e) => setEditingStudent({ ...editingStudent, parentPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">اسم ولي الأمر</label>
                <input
                  type="text"
                  value={editingStudent.parentName}
                  onChange={(e) => setEditingStudent({ ...editingStudent, parentName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">العنوان / المنطقة</label>
                <input
                  type="text"
                  value={editingStudent.address || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Date Wheel Picker in Edit Modal */}
              <DateWheelPicker
                value={editingStudent.birthDate || '2009-05-15'}
                onChange={(val) => setEditingStudent({ ...editingStudent, birthDate: val })}
                label="تاريخ الميلاد"
              />

              {/* Photo Upload in Edit Modal */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-cyan-500" />
                    تحديث صورة الطالب:
                  </span>
                  {editingStudent.photoUrl && (
                    <button
                      type="button"
                      onClick={() => setEditingStudent({ ...editingStudent, photoUrl: '' })}
                      className="text-[10px] text-rose-500 font-bold"
                    >
                      إزالة الصورة
                    </button>
                  )}
                </label>

                {editingStudent.photoUrl ? (
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={editingStudent.photoUrl}
                      alt="Student"
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-cyan-500 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-800 dark:text-white"
                    >
                      تغيير الصورة 📸
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Camera className="w-4 h-4 text-cyan-500" />
                    <span>{isProcessingPhoto ? 'جاري المعالجة...' : 'رفع صورة الطالب 📸'}</span>
                  </button>
                )}
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setIsProcessingPhoto(true);
                      try {
                        const compressed = await compressStudentPhoto(file);
                        setEditingStudent((prev) => (prev ? { ...prev, photoUrl: compressed } : null));
                      } finally {
                        setIsProcessingPhoto(false);
                      }
                    }
                  }}
                  className="hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">المجموعة</label>
                <select
                  value={editingStudent.groupId}
                  onChange={(e) => setEditingStudent({ ...editingStudent, groupId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                >
                  {data.groups.map((grp) => (
                    <option key={grp.id} value={grp.id}>
                      {grp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">حالة الطالب</label>
                <select
                  value={editingStudent.status}
                  onChange={(e) => setEditingStudent({ ...editingStudent, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="ACTIVE">معتمد ونشط ✅</option>
                  <option value="PENDING">معلق بانتظار الاعتماد ⏳</option>
                  <option value="SUSPENDED">موقوف مؤقتاً 🚫</option>
                </select>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition"
                >
                  حفظ التعديلات
                </button>
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
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
