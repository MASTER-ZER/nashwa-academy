'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/storage';
import { generateParentExamWhatsAppUrl, generateStudentExamWhatsAppUrl } from '@/lib/whatsapp';
import { sound } from '@/lib/audio';
import { Student, Exam, ExamResult, SystemData } from '@/types';
import {
  Award,
  Plus,
  MessageSquare,
  Phone,
  CheckCircle2,
  Search,
  Sparkles,
  Send,
  Save,
  Check,
  X,
  Trash2,
  Download,
  Printer,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ExamsDashboardPage() {
  const [data, setData] = useState<SystemData | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [isAddExamOpen, setIsAddExamOpen] = useState(false);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const [saveAllSuccess, setSaveAllSuccess] = useState<boolean>(false);

  // New exam form
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamScore, setNewExamScore] = useState<number>(20);
  const [newExamDate, setNewExamDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Scores input state
  const [scoresState, setScoresState] = useState<Record<string, { score: number; feedback: string }>>({});

  const loadData = () => {
    const d = db.getData();
    setData(d);
    if (d.exams.length > 0 && !selectedExamId) {
      setSelectedExamId(d.exams[0].id);
    }
  };

  useEffect(() => {
    db.syncFromSupabase().then(() => loadData());
    loadData();
    const unsub = db.subscribe(loadData);
    return unsub;
  }, []);

  // Sync scoresState when exam or data changes
  useEffect(() => {
    if (!data || !selectedExamId) return;
    const initialScores: Record<string, { score: number; feedback: string }> = {};
    data.examResults
      .filter((r) => r.examId === selectedExamId)
      .forEach((r) => {
        initialScores[r.studentId] = {
          score: r.score,
          feedback: r.feedback || '',
        };
      });
    setScoresState(initialScores);
  }, [data, selectedExamId]);

  if (!data) return null;

  const selectedExam = data.exams.find((e) => e.id === selectedExamId);
  const activeStudents = data.students.filter((s) => s.status === 'ACTIVE');

  const handleScoreChange = (studentId: string, val: string) => {
    const num = Number(val);
    setScoresState((prev) => ({
      ...prev,
      [studentId]: {
        score: isNaN(num) ? 0 : num,
        feedback: prev[studentId]?.feedback || '',
      },
    }));
  };

  const handleFeedbackChange = (studentId: string, val: string) => {
    setScoresState((prev) => ({
      ...prev,
      [studentId]: {
        score: prev[studentId]?.score || 0,
        feedback: val,
      },
    }));
  };

  const handleSaveGrade = (studentId: string) => {
    if (!selectedExamId) return;
    const item = scoresState[studentId];
    const scoreVal = item ? item.score : 0;
    const feedbackVal = item ? item.feedback : '';

    db.setExamGrade(selectedExamId, studentId, scoreVal, feedbackVal);

    sound.playSuccessChime();
    setSavedSuccessId(studentId);
    setTimeout(() => {
      setSavedSuccessId(null);
    }, 2000);
    loadData();
  };

  const handleSaveAllGrades = () => {
    if (!selectedExamId) return;
    activeStudents.forEach((std) => {
      const item = scoresState[std.id];
      const scoreVal = item ? item.score : 0;
      const feedbackVal = item ? item.feedback : '';

      db.setExamGrade(selectedExamId, std.id, scoreVal, feedbackVal);
    });

    sound.playSuccessChime();
    try {
      confetti({ particleCount: 50, spread: 60 });
    } catch {}

    setSaveAllSuccess(true);
    setTimeout(() => setSaveAllSuccess(false), 3000);
    loadData();
  };

  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamTitle.trim()) return;

    const exam = db.addExam({
      title: newExamTitle.trim(),
      totalScore: Number(newExamScore) || 20,
      date: newExamDate,
      academicYear: 'FIRST_SEC',
    });

    setIsAddExamOpen(false);
    setNewExamTitle('');
    setSelectedExamId(exam.id);
    loadData();
  };

  const handleOpenParentWhatsApp = (student: Student, score: number, resultId?: string) => {
    if (!selectedExam) return;
    const url = generateParentExamWhatsAppUrl({
      parentPhone: student.parentPhone,
      parentName: student.parentName,
      studentName: student.name,
      examTitle: selectedExam.title,
      score: score,
      totalScore: selectedExam.totalScore,
    });

    if (resultId) {
      db.markNotified(resultId, 'parent');
    }
    window.open(url, '_blank');
  };

  const handleOpenStudentWhatsApp = (student: Student, score: number, resultId?: string) => {
    if (!selectedExam) return;
    const url = generateStudentExamWhatsAppUrl({
      studentPhone: student.phone,
      studentName: student.name,
      examTitle: selectedExam.title,
      score: score,
      totalScore: selectedExam.totalScore,
    });

    if (resultId) {
      db.markNotified(resultId, 'student');
    }
    window.open(url, '_blank');
  };

  // Export Exam Grades to CSV
  const handleExportCSV = () => {
    if (!selectedExam) return;

    let csvContent = '\uFEFF'; // Arabic UTF-8 BOM
    csvContent += 'كود الطالب,اسم الطالب,المجموعة,الدرجة,الدرجة النهائية,الملاحظة,هاتف ولي الأمر\n';

    activeStudents.forEach((std) => {
      const grp = data.groups.find((g) => g.id === std.groupId);
      const res = data.examResults.find((r) => r.examId === selectedExamId && r.studentId === std.id);
      const score = scoresState[std.id]?.score ?? res?.score ?? 0;
      const feedback = scoresState[std.id]?.feedback ?? res?.feedback ?? '';

      csvContent += `"${std.code}","${std.name}","${grp?.name || '—'}","${score}","${selectedExam.totalScore}","${feedback}","${std.parentPhone}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `كشف_درجات_${selectedExam.title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 py-2">
      {/* Header */}
      <div className="liquid-glass rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-brand-600 dark:text-cyan-400" />
            رصد درجات الامتحانات والواتساب المباشر
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            رصد درجات الامتحانات الورقية وإرسال النتيجة بضغطة زر لولي الأمر والطالب
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            title="تصدير النتائج Excel"
          >
            <Download className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span className="hidden sm:inline">تصدير Excel</span>
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            title="طباعة كشف الدرجات"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">طباعة</span>
          </button>

          <button
            onClick={handleSaveAllGrades}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            {saveAllSuccess ? 'تم حفظ الكل! ✅' : 'حفظ كل الدرجات 💾'}
          </button>

          <button
            onClick={() => setIsAddExamOpen(true)}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            إضافة امتحان ➕
          </button>
        </div>
      </div>

      {/* Exam Selector Strip */}
      <div className="liquid-glass rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">اختر الامتحان:</label>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="w-full sm:w-96 px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none"
          >
            {data.exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title} (الدرجة من {ex.totalScore}) • {ex.date}
              </option>
            ))}
          </select>
        </div>

        {selectedExam && (
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            الدرجة النهائية: <strong className="text-brand-600 dark:text-cyan-400 font-bold">{selectedExam.totalScore} درجة</strong>
          </div>
        )}
      </div>

      {/* Responsive Cards for Mobile / Table for Desktop */}
      <div className="liquid-glass rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              <tr>
                <th className="p-3.5">الكود</th>
                <th className="p-3.5">اسم الطالب</th>
                <th className="p-3.5">المجموعة</th>
                <th className="p-3.5">الدرجة ({selectedExam?.totalScore})</th>
                <th className="p-3.5">ملاحظة المس</th>
                <th className="p-3.5 text-center">حفظ</th>
                <th className="p-3.5 text-center">📱 رسائل الواتساب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {activeStudents.map((std) => {
                const grp = data.groups.find((g) => g.id === std.groupId);
                const existingResult = data.examResults.find(
                  (r) => r.examId === selectedExamId && r.studentId === std.id
                );
                const currentScore = scoresState[std.id]?.score ?? existingResult?.score ?? 0;
                const currentFeedback = scoresState[std.id]?.feedback ?? existingResult?.feedback ?? '';

                const parentSent = existingResult?.parentNotified;
                const studentSent = existingResult?.studentNotified;
                const isSaved = savedSuccessId === std.id;

                return (
                  <tr key={std.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition">
                    <td className="p-3.5 font-mono font-black text-brand-700 dark:text-cyan-400">#{std.code}</td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{std.name}</td>
                    <td className="p-3.5 text-slate-500 dark:text-slate-400 text-[11px]">{grp ? grp.name : '—'}</td>

                    {/* Score Input */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          max={selectedExam?.totalScore || 100}
                          value={currentScore}
                          onChange={(e) => handleScoreChange(std.id, e.target.value)}
                          className="w-16 px-2 py-1.5 text-center font-black text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none"
                        />
                        <span className="text-slate-400 font-semibold">/ {selectedExam?.totalScore}</span>
                      </div>
                    </td>

                    {/* Feedback Input */}
                    <td className="p-3.5">
                      <input
                        type="text"
                        placeholder="ملاحظة تشجيعية..."
                        value={currentFeedback}
                        onChange={(e) => handleFeedbackChange(std.id, e.target.value)}
                        className="w-full sm:w-48 px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none"
                      />
                    </td>

                    {/* Save Button */}
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleSaveGrade(std.id)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition active:scale-95 flex items-center gap-1 mx-auto ${
                          isSaved
                            ? 'bg-emerald-600 text-white'
                            : 'bg-brand-600 hover:bg-brand-700 text-white'
                        }`}
                      >
                        {isSaved ? <Check className="w-3.5 h-3.5" /> : null}
                        <span>{isSaved ? 'تم ✔️' : 'حفظ'}</span>
                      </button>
                    </td>

                    {/* WhatsApp Actions */}
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenParentWhatsApp(std, currentScore, existingResult?.id)}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1 ${
                            parentSent
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                          title={`إرسال لولي الأمر (${std.parentPhone})`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{parentSent ? 'أُرسل للولي ✔️' : 'واتساب الولي'}</span>
                        </button>

                        <button
                          onClick={() => handleOpenStudentWhatsApp(std, currentScore, existingResult?.id)}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1 ${
                            studentSent
                              ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
                              : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                          }`}
                          title={`إرسال للطالب (${std.phone})`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{studentSent ? 'أُرسل للطالب ✔️' : 'واتساب الطالب'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Touch Cards View */}
        <div className="md:hidden space-y-3">
          {activeStudents.map((std) => {
            const grp = data.groups.find((g) => g.id === std.groupId);
            const existingResult = data.examResults.find(
              (r) => r.examId === selectedExamId && r.studentId === std.id
            );
            const currentScore = scoresState[std.id]?.score ?? existingResult?.score ?? 0;
            const currentFeedback = scoresState[std.id]?.feedback ?? existingResult?.feedback ?? '';

            const parentSent = existingResult?.parentNotified;
            const studentSent = existingResult?.studentNotified;
            const isSaved = savedSuccessId === std.id;

            return (
              <div
                key={std.id}
                className="p-4 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-3 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-xs bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-cyan-400 px-2 py-0.5 rounded-md">
                      #{std.code}
                    </span>
                    <h3 className="font-black text-slate-900 dark:text-white text-sm">{std.name}</h3>
                  </div>
                  <span className="text-[10px] text-slate-400">{grp?.name || '—'}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
                      الدرجة من ({selectedExam?.totalScore}):
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={selectedExam?.totalScore || 100}
                      value={currentScore}
                      onChange={(e) => handleScoreChange(std.id, e.target.value)}
                      className="w-full px-3 py-2 text-center font-black text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
                      حفظ الدرجة:
                    </label>
                    <button
                      onClick={() => handleSaveGrade(std.id)}
                      className={`w-full py-2 rounded-xl font-bold text-xs shadow-xs transition active:scale-95 flex items-center justify-center gap-1 ${
                        isSaved
                          ? 'bg-emerald-600 text-white'
                          : 'bg-brand-600 hover:bg-brand-700 text-white'
                      }`}
                    >
                      {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                      <span>{isSaved ? 'تم الحفظ ✔️' : 'حفظ الدرجة'}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder="ملاحظة تشجيعية للطالب..."
                    value={currentFeedback}
                    onChange={(e) => handleFeedbackChange(std.id, e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                  <button
                    onClick={() => handleOpenParentWhatsApp(std, currentScore, existingResult?.id)}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                      parentSent
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{parentSent ? 'أُرسل للولي ✔️' : 'واتساب الولي'}</span>
                  </button>

                  <button
                    onClick={() => handleOpenStudentWhatsApp(std, currentScore, existingResult?.id)}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                      studentSent
                        ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
                        : 'bg-cyan-600 text-white'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{studentSent ? 'أُرسل للطالب ✔️' : 'واتساب الطالب'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add New Exam Modal */}
      {isAddExamOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md liquid-glass rounded-3xl p-6 sm:p-7 space-y-4 shadow-2xl animate-ios-spring">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-black text-slate-900 dark:text-white text-base">إضافة امتحان جديد</h3>
              <button
                onClick={() => setIsAddExamOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">عنوان الامتحان *</label>
                <input
                  type="text"
                  placeholder="مثال: امتحان شهر نوفمبر - الباب الثاني"
                  value={newExamTitle}
                  onChange={(e) => setNewExamTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">الدرجة النهائية *</label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={newExamScore}
                    onChange={(e) => setNewExamScore(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">تاريخ الامتحان *</label>
                  <input
                    type="date"
                    value={newExamDate}
                    onChange={(e) => setNewExamDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black shadow-md transition active:scale-95"
                >
                  إنشاء الامتحان والبدء بالرصد 🚀
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddExamOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 transition"
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
