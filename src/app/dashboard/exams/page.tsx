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
        initialScores[r.studentId] = { score: r.score, feedback: r.feedback || '' };
      });
    setScoresState(initialScores);
  }, [data, selectedExamId]);

  if (!data) return null;

  const activeStudents = data.students.filter((s) => s.status === 'ACTIVE');
  const selectedExam = data.exams.find((e) => e.id === selectedExamId);

  const handleScoreChange = (studentId: string, val: string) => {
    const num = Math.min(Math.max(0, parseFloat(val) || 0), selectedExam?.totalScore || 100);
    setScoresState((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || { feedback: '' }), score: num },
    }));
  };

  const handleFeedbackChange = (studentId: string, feedback: string) => {
    setScoresState((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || { score: 0 }), feedback },
    }));
  };

  const handleSaveGrade = (studentId: string) => {
    if (!selectedExam) return;
    const existingResult = data.examResults.find(
      (r) => r.examId === selectedExamId && r.studentId === studentId
    );
    const scoreToSave = scoresState[studentId]?.score ?? existingResult?.score ?? 0;
    const feedbackToSave = scoresState[studentId]?.feedback ?? existingResult?.feedback ?? '';

    db.setExamGrade(selectedExam.id, studentId, scoreToSave, feedbackToSave);
    sound.playSuccessChime();

    setSavedSuccessId(studentId);
    setTimeout(() => setSavedSuccessId(null), 2500);
    loadData();
  };

  const handleSaveAllGrades = () => {
    if (!selectedExam) return;
    activeStudents.forEach((std) => {
      const existingResult = data.examResults.find(
        (r) => r.examId === selectedExamId && r.studentId === std.id
      );
      const scoreToSave = scoresState[std.id]?.score ?? existingResult?.score ?? 0;
      const feedbackToSave = scoresState[std.id]?.feedback ?? existingResult?.feedback ?? '';
      db.setExamGrade(selectedExam.id, std.id, scoreToSave, feedbackToSave);
    });

    sound.playSuccessChime();
    setSaveAllSuccess(true);
    try {
      confetti({ particleCount: 40, spread: 60 });
    } catch {}
    setTimeout(() => setSaveAllSuccess(false), 3500);
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

  return (
    <div className="space-y-6 py-2">
      {/* Header */}
      <div className="liquid-glass rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
          <button
            onClick={handleSaveAllGrades}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            {saveAllSuccess ? 'تم حفظ جميع الدرجات بنجاح! ✅' : 'حفظ كل الدرجات 💾'}
          </button>

          <button
            onClick={() => setIsAddExamOpen(true)}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            إضافة امتحان جديد ➕
          </button>
        </div>
      </div>

      {/* Exam Selector Strip */}
      <div className="liquid-glass rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
        {/* Desktop Table View (Hidden on mobile) */}
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
                        <span>{isSaved ? 'تم الحفظ' : 'حفظ'}</span>
                      </button>
                    </td>

                    {/* Direct WhatsApp Buttons */}
                    <td className="p-3.5 text-center space-x-1.5 space-x-reverse">
                      <button
                        onClick={() => handleOpenParentWhatsApp(std, currentScore, existingResult?.id)}
                        className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] transition inline-flex items-center gap-1 shadow-xs ${
                          parentSent
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                        title="إرسال واتساب لولي الأمر"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{parentSent ? 'تم الإرسال ✔️' : 'ولي الأمر'}</span>
                      </button>

                      <button
                        onClick={() => handleOpenStudentWhatsApp(std, currentScore, existingResult?.id)}
                        className={`px-2 py-1.5 rounded-xl font-bold text-[11px] transition inline-flex items-center gap-1 ${
                          studentSent
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200'
                        }`}
                        title="إرسال واتساب للطالب"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>طالب</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Touch Cards View (Shown only on phones) */}
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
                className="p-4 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-3 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-cyan-400 font-mono font-black text-xs flex items-center justify-center">
                      #{std.code}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs">{std.name}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{grp ? grp.name : '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={selectedExam?.totalScore || 100}
                      value={currentScore}
                      onChange={(e) => handleScoreChange(std.id, e.target.value)}
                      className="w-14 px-2 py-1 text-center font-black text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                    <span className="text-slate-400 text-xs font-bold">/ {selectedExam?.totalScore}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="ملاحظة المس..."
                    value={currentFeedback}
                    onChange={(e) => handleFeedbackChange(std.id, e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                  />
                  <button
                    onClick={() => handleSaveGrade(std.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition shrink-0 ${
                      isSaved ? 'bg-emerald-600 text-white' : 'bg-brand-600 text-white'
                    }`}
                  >
                    {isSaved ? 'تم ✓' : 'حفظ'}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400">إرسال واتساب:</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleOpenParentWhatsApp(std, currentScore, existingResult?.id)}
                      className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3" />
                      ولي الأمر
                    </button>
                    <button
                      onClick={() => handleOpenStudentWhatsApp(std, currentScore, existingResult?.id)}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      طالب
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Exam Modal */}
      {isAddExamOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">إضافة امتحان ورقي جديد</h2>
              <button onClick={() => setIsAddExamOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">عنوان الامتحان</label>
                <input
                  type="text"
                  placeholder="مثال: اختبار الباب الأول - الكيمياء ومركز العلوم"
                  value={newExamTitle}
                  onChange={(e) => setNewExamTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 font-bold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">الدرجة النهائية</label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={newExamScore}
                  onChange={(e) => setNewExamScore(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 font-bold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">تاريخ الامتحان</label>
                <input
                  type="date"
                  value={newExamDate}
                  onChange={(e) => setNewExamDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold transition"
                >
                  إنشاء الامتحان 🚀
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddExamOpen(false)}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition"
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
