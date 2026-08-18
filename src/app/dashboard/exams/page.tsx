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
  Trophy,
  Share2,
  Copy,
  Flame,
  Star,
  Users
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ExamsDashboardPage() {
  const [data, setData] = useState<SystemData | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [isAddExamOpen, setIsAddExamOpen] = useState(false);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const [saveAllSuccess, setSaveAllSuccess] = useState<boolean>(false);
  const [copiedHonor, setCopiedHonor] = useState(false);

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

  // Compute Leaderboard Rankings
  const rankedStudents = activeStudents
    .map((std) => {
      const res = data.examResults.find((r) => r.examId === selectedExamId && r.studentId === std.id);
      const score = scoresState[std.id]?.score ?? res?.score ?? 0;
      const feedback = scoresState[std.id]?.feedback ?? res?.feedback ?? '';
      const grp = data.groups.find((g) => g.id === std.groupId);
      return {
        student: std,
        score,
        feedback,
        groupName: grp ? grp.name : '—',
        percentage: selectedExam ? Math.round((score / selectedExam.maxScore) * 100) : 0,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

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

    db.recordExamResult({
      examId: selectedExamId,
      studentId: studentId,
      score: scoreVal,
      feedback: feedbackVal,
      parentNotified: false,
      studentNotified: false,
    });

    setSavedSuccessId(studentId);
    sound.playSuccessChime();
    setTimeout(() => setSavedSuccessId(null), 2000);
  };

  const handleSaveAllGrades = () => {
    if (!selectedExamId) return;
    activeStudents.forEach((std) => {
      const item = scoresState[std.id];
      if (item !== undefined) {
        db.recordExamResult({
          examId: selectedExamId,
          studentId: std.id,
          score: item.score,
          feedback: item.feedback,
          parentNotified: false,
          studentNotified: false,
        });
      }
    });

    setSaveAllSuccess(true);
    sound.playSuccessChime();
    try {
      confetti({ particleCount: 50, spread: 60 });
    } catch {}
    setTimeout(() => setSaveAllSuccess(false), 3000);
  };

  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamTitle.trim()) return;

    const exam = db.addExam({
      title: newExamTitle.trim(),
      totalScore: Number(newExamScore) || 20,
      maxScore: Number(newExamScore) || 20,
      date: newExamDate,
      academicYear: 'FIRST_SEC',
    });

    setIsAddExamOpen(false);
    setNewExamTitle('');
    setSelectedExamId(exam.id);
    loadData();
  };

  const handleOpenParentWhatsApp = (student: Student, score: number) => {
    if (!selectedExam) return;
    const url = generateParentExamWhatsAppUrl({
      parentPhone: student.parentPhone,
      parentName: student.parentName,
      studentName: student.name,
      examTitle: selectedExam.title,
      score: score,
      totalScore: selectedExam.maxScore,
    });
    window.open(url, '_blank');
  };

  const handleOpenStudentWhatsApp = (student: Student, score: number) => {
    if (!selectedExam) return;
    const url = generateStudentExamWhatsAppUrl({
      studentPhone: student.phone,
      studentName: student.name,
      examTitle: selectedExam.title,
      score: score,
      totalScore: selectedExam.maxScore,
    });
    window.open(url, '_blank');
  };

  // Copy Leaderboard text for WhatsApp
  const handleCopyHonorWhatsApp = () => {
    if (!selectedExam || rankedStudents.length === 0) return;
    const topList = rankedStudents.slice(0, 5);
    let text = `🌟 *لوحة شرف الأوائل - أكاديمية مس نشوى* 🌟\n`;
    text += `🔬 *مادة العلوم المتكاملة - أولى ثانوي*\n`;
    text += `📝 *${selectedExam.title}* (الدرجة النهائية: ${selectedExam.maxScore})\n\n`;
    topList.forEach((item, idx) => {
      const medal = idx === 0 ? '🥇 المركز الأول' : idx === 1 ? '🥈 المركز الثاني' : idx === 2 ? '🥉 المركز الثالث' : `⭐ المركز (${idx + 1})`;
      text += `${medal}: *${item.student.name}* (${item.score}/${selectedExam.maxScore}) - ${item.percentage}%\n`;
    });
    text += `\n👏 ألف مبروك لأبطالنا المتفوقين ومزيد من التميز والنجاح دائماً! ✨\n#أكاديمية_مس_نشوى`;

    navigator.clipboard.writeText(text);
    sound.playSuccessChime();
    try {
      confetti({ particleCount: 40, spread: 70 });
    } catch {}
    setCopiedHonor(true);
    setTimeout(() => setCopiedHonor(false), 3500);
  };

  // Export Exam Grades to CSV
  const handleExportCSV = () => {
    if (!selectedExam) return;

    let csvContent = '\uFEFF';
    csvContent += 'كود الطالب,اسم الطالب,المجموعة,الدرجة,الدرجة النهائية,الملاحظة,هاتف ولي الأمر\n';

    activeStudents.forEach((std) => {
      const grp = data.groups.find((g) => g.id === std.groupId);
      const res = data.examResults.find((r) => r.examId === selectedExamId && r.studentId === std.id);
      const score = scoresState[std.id]?.score ?? res?.score ?? 0;
      const feedback = scoresState[std.id]?.feedback ?? res?.feedback ?? '';

      csvContent += `"${std.code}","${std.name}","${grp?.name || '—'}","${score}","${selectedExam.maxScore}","${feedback}","${std.parentPhone}"\n`;
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

  return (
    <div className="space-y-6 py-2">
      {/* Top Header */}
      <div className="liquid-glass rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-brand-600 dark:text-cyan-400" />
            رصد درجات الامتحانات والواتساب المباشر
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            رصد درجات الامتحانات وتكريم الأوائل وإرسال النتائج بضغطة زر
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Copy Honor WhatsApp */}
          <button
            onClick={handleCopyHonorWhatsApp}
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95"
            title="نسخ لوحة الشرف لجروب الواتساب"
          >
            <Trophy className="w-4 h-4 text-amber-100" />
            <span>{copiedHonor ? 'تم نسخ لوحة الشرف! 📋' : 'لوحة الشرف للواتساب 🏆'}</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            title="تصدير النتائج Excel"
          >
            <Download className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          <button
            onClick={handleSaveAllGrades}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{saveAllSuccess ? 'تم حفظ كل الدرجات! ✅' : 'حفظ كل الدرجات 💾'}</span>
          </button>
        </div>
      </div>

      {/* Exam Selector & New Exam Button */}
      <div className="liquid-glass rounded-3xl p-4 sm:p-5 shadow-sm space-y-3 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 sm:pb-0 flex-1">
            {data.exams.map((exam) => (
              <button
                key={exam.id}
                onClick={() => setSelectedExamId(exam.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap active:scale-95 ${
                  selectedExamId === exam.id
                    ? 'bg-gradient-to-r from-brand-600 to-cyan-500 text-white shadow-md shadow-brand-600/30'
                    : 'bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {exam.title} ({exam.maxScore} درجة)
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsAddExamOpen(true)}
            className="px-3.5 py-2 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-cyan-300 border border-brand-200 dark:border-cyan-500/30 font-bold text-xs hover:bg-brand-100 transition flex items-center gap-1 shrink-0 self-start sm:self-center"
          >
            <Plus className="w-4 h-4" />
            <span>امتحان جديد</span>
          </button>
        </div>
      </div>

      {/* LEADERBOARD / HONOR BOARD TOP CARDS */}
      {rankedStudents.length > 0 && selectedExam && (
        <div className="liquid-glass rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-transparent to-cyan-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-500/30">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>لوحة شرف أوائل الامتحان</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 font-bold">
                    Top Students 🌟
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  الطلاب الحاصلين على أعلى الدرجات في ({selectedExam.title})
                </p>
              </div>
            </div>

            <button
              onClick={handleCopyHonorWhatsApp}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Copy className="w-3.5 h-3.5 text-cyan-500" />
              <span>نسخ الرسالة</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {rankedStudents.slice(0, 3).map((item, idx) => (
              <div
                key={item.student.id}
                className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                  idx === 0
                    ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border-amber-500/40 shadow-lg shadow-amber-500/10'
                    : idx === 1
                    ? 'bg-gradient-to-r from-slate-300/20 to-slate-400/10 border-slate-400/40'
                    : 'bg-gradient-to-r from-orange-400/20 to-amber-600/10 border-orange-500/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white">{item.student.name}</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">#{item.student.code} • {item.groupName}</p>
                  </div>
                </div>

                <div className="text-left">
                  <span className="text-base font-black text-brand-600 dark:text-cyan-400 font-mono">
                    {item.score}/{selectedExam.maxScore}
                  </span>
                  <span className="text-[10px] text-slate-500 block font-bold">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grade Entry Table */}
      {selectedExam && (
        <div className="liquid-glass rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>كشف رصد الدرجات: ({selectedExam.title})</span>
              <span className="text-xs font-mono font-bold text-slate-400">الدرجة العظمى: {selectedExam.maxScore}</span>
            </h2>
            <span className="text-xs font-black text-brand-600 dark:text-cyan-400">
              {activeStudents.length} طالب مسجل
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {activeStudents.map((std) => {
              const item = scoresState[std.id];
              const scoreVal = item ? item.score : 0;
              const feedbackVal = item ? item.feedback : '';
              const percentage = Math.round((scoreVal / selectedExam.maxScore) * 100);
              const isSaved = savedSuccessId === std.id;
              const grp = data.groups.find((g) => g.id === std.groupId);

              return (
                <div
                  key={std.id}
                  className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 p-2 rounded-2xl transition"
                >
                  <div className="min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400">#{std.code}</span>
                      <p className="font-black text-slate-900 dark:text-white text-xs">{std.name}</p>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      {grp ? grp.name : '—'} • {std.phone}
                    </p>
                  </div>

                  {/* Score & Feedback Inputs */}
                  <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={selectedExam.maxScore}
                        value={scoreVal}
                        onChange={(e) => handleScoreChange(std.id, e.target.value)}
                        className="w-16 px-2.5 py-1.5 text-xs font-mono font-black text-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                      />
                      <span className="text-xs font-bold text-slate-400">/ {selectedExam.maxScore}</span>
                    </div>

                    <input
                      type="text"
                      placeholder="ملاحظة المعلمة (اختياري)..."
                      value={feedbackVal}
                      onChange={(e) => handleFeedbackChange(std.id, e.target.value)}
                      className="flex-1 min-w-[160px] px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                    />

                    <button
                      onClick={() => handleSaveGrade(std.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                        isSaved
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand-600 hover:text-white'
                      }`}
                    >
                      {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                      <span>{isSaved ? 'تم' : 'حفظ'}</span>
                    </button>
                  </div>

                  {/* Direct WhatsApp Buttons */}
                  <div className="flex items-center gap-1.5 self-end md:self-center">
                    <button
                      onClick={() => handleOpenParentWhatsApp(std, scoreVal)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-bold hover:bg-emerald-100 transition flex items-center gap-1"
                      title="إرسال النتيجة لولي الأمر عبر الواتساب"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>ولي الأمر</span>
                    </button>

                    <button
                      onClick={() => handleOpenStudentWhatsApp(std, scoreVal)}
                      className="px-2.5 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 text-[11px] font-bold hover:bg-cyan-100 transition flex items-center gap-1"
                      title="إرسال النتيجة للطالب عبر الواتساب"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>الطالب</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Exam Modal */}
      {isAddExamOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="liquid-glass rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 border border-white/20 animate-ios-spring">
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-3">
              <h3 className="font-black text-slate-900 dark:text-white text-base">إضافة اختبار أو تقييم جديد</h3>
              <button onClick={() => setIsAddExamOpen(false)} className="p-1 rounded-xl text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">عنوان الاختبار:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: اختبار الباب الثاني - الحركة والسرعة"
                  value={newExamTitle}
                  onChange={(e) => setNewExamTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">الدرجة النهائية:</label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={newExamScore}
                    onChange={(e) => setNewExamScore(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">تاريخ الامتحان:</label>
                  <input
                    type="date"
                    value={newExamDate}
                    onChange={(e) => setNewExamDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-brand-600 to-cyan-500 hover:from-brand-500 text-white font-black text-xs shadow-md transition"
                >
                  إنشاء الاختبار ✅
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddExamOpen(false)}
                  className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
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
