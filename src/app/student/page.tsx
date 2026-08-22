'use client';

import { useState, useEffect, useRef } from 'react';
import { db, getCurrentMonthLabel } from '@/lib/storage';
import { Student, Group, AttendanceRecord, Subscription, ExamResult, Exam } from '@/types';
import { sound } from '@/lib/audio';
import {
  QrCode,
  CalendarCheck,
  CreditCard,
  Award,
  Download,
  Share2,
  ChevronRight,
  UserCheck,
  Zap,
  RotateCw,
  Phone,
  BarChart3,
  ShieldCheck,
  Lock,
  Flame,
  Star,
  Check,
  Smartphone,
  ExternalLink,
  Image as ImageIcon,
  FileText,
  Printer,
  Edit3,
  Camera,
  User,
  MapPin,
  Calendar,
  X,
  Send,
  Sparkles,
  LogOut,
  Clock,
  MessageCircle,
  GraduationCap,
  Bot,
  BrainCircuit,
  Wand2,
  Lightbulb,
  Loader2,
  Copy,
  CheckCheck,
  Trash2,
  Search,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { generateStudentCardCanvas } from '@/lib/generateCardImage';
import { generateStudentReportCardCanvas } from '@/lib/generateReportCard';
import DateWheelPicker from '@/components/DateWheelPicker';
import { compressStudentPhoto } from '@/lib/imageCompressor';
import { notifyStudentProfileUpdate, notifyProfileEditRequest } from '@/lib/telegram';
import { fetchStudentAIChat, ChatMessage } from '@/lib/ai';

export default function StudentPortalPage() {
  const [studentCode, setStudentCode] = useState('');
  const [phone, setPhone] = useState('');
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [pendingEditReq, setPendingEditReq] = useState<any>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [examResults, setExamResults] = useState<{ result: ExamResult; exam: Exam }[]>([]);

  const [activeTab, setActiveTab] = useState<'CARD' | 'REPORT' | 'AI_TUTOR' | 'ATTENDANCE' | 'SUBSCRIPTION' | 'EXAMS' | 'EDIT'>('CARD');
  const [errorMsg, setErrorMsg] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [cardDisplayType, setCardDisplayType] = useState<'QR' | 'BARCODE'>('QR');
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);

  // Nashwa AI Science Tutor Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [copiedChatIdx, setCopiedChatIdx] = useState<number | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Report Card State
  const [reportCardDataUrl, setReportCardDataUrl] = useState<string>('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Edit Profile States
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    parentName: '',
    parentPhone: '',
    address: '',
    birthDate: '2009-05-15',
    photoUrl: '',
    groupId: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState('');
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  // Forgot Code Recovery States
  const [isForgotCodeModalOpen, setIsForgotCodeModalOpen] = useState(false);
  const [forgotPhoneQuery, setForgotPhoneQuery] = useState('');
  const [forgotSearchResults, setForgotSearchResults] = useState<Student[] | null>(null);

  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);
  const editGalleryInputRef = useRef<HTMLInputElement>(null);
  const editCameraInputRef = useRef<HTMLInputElement>(null);

  const handleSearchForgotCode = (e: React.FormEvent) => {
    e.preventDefault();
    const query = forgotPhoneQuery.trim().replace(/\s+/g, '');
    if (!query) return;

    const data = db.getData();
    const matches = data.students.filter((s) => {
      const p1 = (s.phone || '').replace(/\D/g, '');
      const p2 = (s.parentPhone || '').replace(/\D/g, '');
      const cleanQ = query.replace(/\D/g, '');
      return (
        (cleanQ.length >= 4 && (p1.endsWith(cleanQ) || p2.endsWith(cleanQ) || p1.includes(cleanQ) || p2.includes(cleanQ))) ||
        s.name.includes(query)
      );
    });

    setForgotSearchResults(matches);
  };

  // Auto-login from localStorage if available
  useEffect(() => {
    const savedCode = localStorage.getItem('logged_student_code');
    const savedPhone = localStorage.getItem('logged_student_phone');
    if (savedCode) {
      setStudentCode(savedCode);
      if (savedPhone) setPhone(savedPhone);
      loadStudentData(savedCode);
    }
  }, []);

  // Generate QR Code & Barcode whenever student loads
  useEffect(() => {
    if (currentStudent) {
      QRCode.toDataURL(currentStudent.code, {
        width: 300,
        margin: 1,
        color: { dark: '#042f2e', light: '#ffffff' },
      })
        .then((url) => setQrDataUrl(url))
        .catch(console.error);

      setTimeout(() => {
        if (barcodeSvgRef.current) {
          try {
            JsBarcode(barcodeSvgRef.current, currentStudent.code, {
              format: 'CODE128',
              lineColor: '#000000',
              width: 2.2,
              height: 55,
              displayValue: true,
              fontSize: 14,
              font: 'monospace',
              fontOptions: 'bold',
              background: '#ffffff',
            });
          } catch (e) {
            console.error('Barcode render error:', e);
          }
        }
      }, 100);
    }
  }, [currentStudent, cardDisplayType]);

  const loadStudentData = (code: string) => {
    const data = db.getData();
    setGroups(data.groups);
    const std = data.students.find((s) => s.code === code.trim());
    if (!std) {
      setErrorMsg('كود الطالب غير صحيح أو غير مسجل بالمنظومة');
      return;
    }

    setCurrentStudent(std);
    const grp = data.groups.find((g) => g.id === std.groupId) || null;
    setGroup(grp);

    // Check pending profile edit request
    const pending = db.getStudentPendingEditRequest(std.id);
    setPendingEditReq(pending);

    // Sync Edit Form Data
    setEditFormData({
      name: std.name,
      phone: std.phone,
      parentName: std.parentName,
      parentPhone: std.parentPhone,
      address: std.address || 'المنصورة',
      birthDate: std.birthDate || '2009-05-15',
      photoUrl: std.photoUrl || '',
      groupId: std.groupId,
    });

    // Attendance
    const att = data.attendance.filter((a) => a.studentId === std.id);
    setAttendance(att.sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()));

    // Subscriptions
    const sub = data.subscriptions.filter((s) => s.studentId === std.id);
    setSubscriptions(sub);

    // Exam Results
    const results = data.examResults
      .filter((r) => r.studentId === std.id)
      .map((r) => {
        const exam = data.exams.find((e) => e.id === r.examId);
        return exam ? { result: r, exam } : null;
      })
      .filter(Boolean) as { result: ExamResult; exam: Exam }[];

    setExamResults(results);
  };

  const handleGenerateReport = async (studentToReport?: Student) => {
    const std = studentToReport || currentStudent;
    if (!std) return;
    setIsGeneratingReport(true);
    try {
      const curMonth = getCurrentMonthLabel();
      const settings = db.getSettings();
      const data = db.getData();
      const groupSessions = data.sessions.filter((s) => s.groupId === std.groupId);
      const totalSessions = Math.max(groupSessions.length, attendance.length, 8);

      const formattedExams = examResults.map((er) => ({
        exam: er.exam,
        result: er.result,
      }));

      const url = await generateStudentReportCardCanvas({
        student: std,
        group: group,
        attendanceCount: attendance.length,
        totalSessionsCount: totalSessions,
        examResults: formattedExams,
        isPaid: isCurrentMonthPaid,
        monthName: curMonth,
        teacherName: settings?.teacherName || 'مس نشوى',
      });
      setReportCardDataUrl(url);
    } catch (err) {
      console.error('Error generating report:', err);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentCode.trim()) {
      setErrorMsg('يرجى إدخال كود الطالب');
      return;
    }

    const data = db.getData();
    const std = data.students.find((s) => s.code === studentCode.trim());

    if (!std) {
      setErrorMsg('كود الطالب غير صحيح، تأكد من الرقم المسجل في الكارت');
      return;
    }

    if (phone.trim()) {
      const isMatch =
        std.phone.endsWith(phone.trim()) ||
        std.parentPhone.endsWith(phone.trim()) ||
        std.phone === phone.trim() ||
        std.parentPhone === phone.trim();

      if (!isMatch) {
        setErrorMsg('رقم الهاتف غير متطابق مع بيانات هذا الطالب');
        return;
      }
      localStorage.setItem('logged_student_phone', phone.trim());
    }

    setCurrentStudent(std);
    localStorage.setItem('logged_student_code', std.code);
    setErrorMsg('');
    loadStudentData(std.code);
  };

  const handleLogout = () => {
    localStorage.removeItem('logged_student_code');
    localStorage.removeItem('logged_student_phone');
    setCurrentStudent(null);
    setStudentCode('');
    setPhone('');
    setErrorMsg('');
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeTab === 'AI_TUTOR' && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab, isChatLoading]);

  // Load persistent chat history for this specific student
  useEffect(() => {
    if (!currentStudent) return;
    try {
      const storageKey = `nashwa_ai_chat_${currentStudent.code}`;
      const savedChat = localStorage.getItem(storageKey);
      if (savedChat) {
        const parsed = JSON.parse(savedChat);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChatMessages(parsed);
          return;
        }
      }
      // Default greeting if no history
      const initialGreeting: ChatMessage = {
        role: 'assistant',
        content: `أهلاً بك يا ${currentStudent.name} 🌸🔬! أنا "Master AI" - المساعد الذكي لمس نشوى. أنا معك على مدار الساعة لمساعدتك في مراجعة منهج العلوم المتكاملة للصف الأول الثانوي، شرح أي مفهوم أو مسألة، وتوضيح خطوات الحل بالتفصيل. ماذا تحب أن نذاكر معاً الآن؟`,
      };
      setChatMessages([initialGreeting]);
      localStorage.setItem(storageKey, JSON.stringify([initialGreeting]));
    } catch (err) {
      console.warn('Error reading chat history:', err);
    }
  }, [currentStudent?.code]);

  // Persist chat messages whenever they change
  useEffect(() => {
    if (!currentStudent || chatMessages.length === 0) return;
    try {
      const storageKey = `nashwa_ai_chat_${currentStudent.code}`;
      localStorage.setItem(storageKey, JSON.stringify(chatMessages));
    } catch (err) {
      console.warn('Error saving chat history:', err);
    }
  }, [chatMessages, currentStudent?.code]);

  const handleSendChatMessage = async (textToSend?: string) => {
    const text = (textToSend || chatInput).trim();
    if (!text || isChatLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const updated = [...chatMessages, userMsg];
    setChatMessages(updated);
    setChatInput('');
    setIsChatLoading(true);

    try {
      // Pass the last 12 messages for rich conversational context
      const contextSlice = updated.slice(-12);
      const reply = await fetchStudentAIChat({
        messages: contextSlice,
        studentName: currentStudent?.name || 'البطل',
      });
      setChatMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      sound.playSuccessChime();
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'عذراً يا بطل، حدث بطء مؤقت في الشبكة. من فضلك أعد إرسال سؤالك وسأجيبك فوراً! 🌸',
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleClearChat = () => {
    if (!currentStudent) return;
    if (confirm('هل ترغب في بدء جلسة مذاكرة جديدة ومسح سجل المحادثة السابق؟')) {
      const freshGreeting: ChatMessage = {
        role: 'assistant',
        content: `أهلاً بك مجدداً يا ${currentStudent.name}! 🌸🔬 بدأت جلسة مذاكرة جديدة. اسألني عن أي جزء في منهج العلوم المتكاملة وسأشرحه لك فوراً.`,
      };
      setChatMessages([freshGreeting]);
      try {
        localStorage.setItem(`nashwa_ai_chat_${currentStudent.code}`, JSON.stringify([freshGreeting]));
      } catch {}
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPhoto(true);
    try {
      const compressed = await compressStudentPhoto(file);
      setEditFormData((prev) => ({ ...prev, photoUrl: compressed }));
      setEditErrors((prev) => ({ ...prev, photo: '' }));
    } catch (err) {
      console.error('Photo compression error:', err);
      setEditErrors((prev) => ({ ...prev, photo: 'فشل معالجة الصورة، يرجى اختيار صورة أخرى' }));
    } finally {
      setIsProcessingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSaveEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent) return;

    const errors: Record<string, string> = {};
    if (!editFormData.name.trim()) errors.name = 'اسم الطالب مطلوب';
    if (!editFormData.phone.trim()) errors.phone = 'رقم هاتف الطالب مطلوب';
    if (!editFormData.parentPhone.trim()) errors.parentPhone = 'رقم ولي الأمر مطلوب';

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    setIsSavingEdit(true);
    try {
      const proposedData = {
        name: editFormData.name.trim(),
        phone: editFormData.phone.trim(),
        parentName: editFormData.parentName.trim() || currentStudent.parentName,
        parentPhone: editFormData.parentPhone.trim() || currentStudent.parentPhone,
        address: editFormData.address.trim() || currentStudent.address,
        birthDate: editFormData.birthDate || currentStudent.birthDate || '2009-05-15',
        photoUrl: editFormData.photoUrl || currentStudent.photoUrl || '',
        groupId: editFormData.groupId || currentStudent.groupId,
      };

      const originalData = {
        name: currentStudent.name,
        phone: currentStudent.phone,
        parentName: currentStudent.parentName,
        parentPhone: currentStudent.parentPhone,
        address: currentStudent.address,
        birthDate: currentStudent.birthDate || '',
        photoUrl: currentStudent.photoUrl || '',
        groupId: currentStudent.groupId,
      };

      // 1. Create Pending Edit Request in Local DB & Supabase
      const newReq = db.addProfileEditRequest({
        studentId: currentStudent.id,
        studentCode: currentStudent.code,
        originalData,
        proposedData,
      });

      setPendingEditReq(newReq);

      // 2. Notify Miss Nashwa on Telegram with Detailed Diff & Inline Approve/Reject Buttons
      const selectedGrp = groups.find((g) => g.id === proposedData.groupId) || group;
      const originalGrp = groups.find((g) => g.id === currentStudent.groupId);
      notifyProfileEditRequest(newReq.id, currentStudent, proposedData, selectedGrp?.name, originalGrp?.name).then((res) => {
        if (res && res.messageId) {
          db.updateProfileEditRequestMessageId(newReq.id, res.messageId);
        }
      }).catch(() => {});

      setEditSuccessMsg('تم إرسال طلب تعديل البيانات بنجاح! 🌸 سيتم مراجعة وتطبيق التعديل فور اعتماد مس نشوى له.');

      sound.playSuccessChime();
      try {
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
      } catch {}

      setTimeout(() => setEditSuccessMsg(''), 7000);
    } catch (err) {
      console.error('Submit edit request error:', err);
      alert('حدث خطأ أثناء إرسال طلب التعديل، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Download 3D Card as ultra-crisp HD PNG into user's photo gallery
  const handleDownloadCardImage = async () => {
    if (!currentStudent) return;

    setIsDownloadingImage(true);
    try {
      const curMonth = getCurrentMonthLabel();
      const imgData = await generateStudentCardCanvas({
        student: currentStudent,
        group: group,
        qrDataUrl: qrDataUrl,
        isPaid: isCurrentMonthPaid,
        currentMonth: curMonth,
      });

      const link = document.createElement('a');
      link.href = imgData;
      link.download = `كارت_طالب_مس_نشوى_${currentStudent.code}_${currentStudent.name.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      sound.playSuccessChime();
      try {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
      } catch {}
    } catch (err) {
      console.error('Download card error', err);
      alert('حدث خطأ أثناء تنزيل الصورة، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsDownloadingImage(false);
    }
  };

  const currentAcademicMonth = getCurrentMonthLabel();
  const currentMonthSub = subscriptions.find((s) => s.month === currentAcademicMonth);
  const isCurrentMonthPaid = currentMonthSub ? currentMonthSub.isPaid : false;

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* 1. STUDENT LOGIN FORM (If not logged in) */}
      {!currentStudent ? (
        <div className="max-w-md mx-auto py-6">
          <div className="liquid-glass rounded-3xl p-7 sm:p-9 shadow-xl space-y-6 border border-slate-200/80 dark:border-slate-800 text-center animate-ios-spring">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-700 to-emerald-600 flex items-center justify-center mx-auto text-white shadow-lg shadow-brand-700/20">
              <GraduationCap className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                بوابة الطالب وولي الأمر
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                أدخل كود الطالب ورقم الهاتف لعرض بطاقة الهوية، كشف الحضور، والدرجات
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold animate-pulse">
                ⚠️ {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 text-right">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  كود الطالب (المسجل في الكارت):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-xs font-mono font-bold text-slate-400">#</span>
                  <input
                    type="text"
                    required
                    placeholder="مثال: 101"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-center text-base focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  رقم الهاتف (التحقق الأمني):
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  placeholder="رقم الهاتف المسجل أو آخر 4 أرقام"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-center text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-brand-600 to-cyan-500 hover:from-brand-500 hover:to-cyan-400 text-white font-black text-sm shadow-md shadow-brand-600/30 transition active:scale-95 flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>دخول وعرض بطاقة الطالب 🚀</span>
              </button>

              <div className="pt-2 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotCodeModalOpen(true);
                    setForgotPhoneQuery('');
                    setForgotSearchResults(null);
                  }}
                  className="text-brand-600 dark:text-cyan-400 font-bold hover:underline flex items-center gap-1"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>نسيت الكود؟ استرجعه برقم الهاتف 🔍</span>
                </button>

                <a
                  href={`https://wa.me/201012345678?text=${encodeURIComponent('أهلاً مس نشوى، أرغب بالاستفسار عن كود الطالب الخاص بي ومعي صورة الكارت القديم 🌸')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-bold flex items-center gap-1"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>مساعدة واتساب</span>
                </a>
              </div>
            </form>
          </div>

          {/* Forgot Code Recovery Modal */}
          {isForgotCodeModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-right animate-ios-spring">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2 font-black text-slate-900 dark:text-white text-base">
                    <Search className="w-5 h-5 text-brand-600 dark:text-cyan-400" />
                    <span>استرجاع كود الطالب والبطاقة</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsForgotCodeModalOpen(false)}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  أدخل رقم هاتف الطالب أو ولي الأمر المسجل للبحث عن كودك والدخول فوراً:
                </p>

                <form onSubmit={handleSearchForgotCode} className="space-y-3">
                  <div className="relative">
                    <input
                      type="tel"
                      dir="ltr"
                      required
                      placeholder="مثال: 01012345678 أو 5678"
                      value={forgotPhoneQuery}
                      onChange={(e) => setForgotPhoneQuery(e.target.value)}
                      className="w-full pl-3.5 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-center text-sm font-bold focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
                  >
                    <Search className="w-4 h-4" />
                    <span>بحث عن بيانات الطالب</span>
                  </button>
                </form>

                {forgotSearchResults !== null && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    {forgotSearchResults.length === 0 ? (
                      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs space-y-2 text-center">
                        <p className="font-bold">لم نتمكن من العثور على طالب مسجل بهذا الرقم ⚠️</p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-300">
                          تأكد من كتابة الرقم بشكل صحيح، أو أرسل صورة الكارت القديم للمس عبر واتساب للتحقق وتفعيل حسابك.
                        </p>
                        <a
                          href={`https://wa.me/201012345678?text=${encodeURIComponent(`أهلاً مس نشوى، نسيت كود الطالب ورقم هاتفي ${forgotPhoneQuery}، وسأرسل لحضرتك صورة الكارت القديم للتحقق 🌸`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm w-full mt-1"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>إرسال صورة الكارت القديم على واتساب 💬</span>
                        </a>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-[11px] font-bold text-slate-500">تم العثور على الطالب التالي:</p>
                        {forgotSearchResults.map((std) => (
                          <div
                            key={std.id}
                            className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-black text-xs text-slate-900 dark:text-white">{std.name}</h4>
                                <p className="text-[10px] text-slate-500 font-mono">هاتف: {std.phone}</p>
                              </div>
                              <span className="px-3 py-1 rounded-xl bg-brand-600 text-white font-mono font-black text-xs shadow-xs">
                                #{std.code}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setStudentCode(std.code);
                                setPhone(std.phone);
                                setIsForgotCodeModalOpen(false);
                                setCurrentStudent(std);
                                localStorage.setItem('logged_student_code', std.code);
                                localStorage.setItem('logged_student_phone', std.phone);
                                loadStudentData(std.code);
                              }}
                              className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>دخول مباشر بهذا الحساب 🚀</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 2. LOGGED IN STUDENT DASHBOARD */
        <div className="space-y-6">
          {/* Header Profile Bar */}
          <div className="liquid-glass rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {currentStudent.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentStudent.photoUrl}
                  alt={currentStudent.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-brand-500 shadow-md"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-700 to-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                  {currentStudent.name.slice(0, 1)}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    {currentStudent.name}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-cyan-400">
                    #{currentStudent.code}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {group ? group.name : 'العلوم المتكاملة • أولى ثانوي'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={() => {
                  setActiveTab('REPORT');
                  handleGenerateReport();
                }}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>شهادتي الشهرية 📜</span>
              </button>

              <button
                onClick={() => setActiveTab('EDIT')}
                className="px-3.5 py-2 rounded-xl bg-brand-50 dark:bg-brand-950/80 hover:bg-brand-100 text-brand-700 dark:text-cyan-300 text-xs font-bold transition flex items-center gap-1.5 border border-brand-200 dark:border-brand-900"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعديل بياناتي ✏️</span>
              </button>

              <button
                onClick={handleLogout}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-600 dark:text-slate-300 hover:text-rose-500 text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>خروج</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs (Segmented Controls) */}
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 p-1.5 rounded-2xl liquid-glass border border-slate-200/80 dark:border-slate-800 no-print">
            {[
              { id: 'CARD', label: 'كارت الهوية', icon: QrCode },
              { id: 'AI_TUTOR', label: 'Master AI 🤖⚡', icon: Bot, isSpecial: true },
              { id: 'REPORT', label: 'التقرير الشهري', icon: FileText },
              { id: 'ATTENDANCE', label: `الحضور (${attendance.length})`, icon: CalendarCheck },
              { id: 'EXAMS', label: `الدرجات (${examResults.length})`, icon: Award },
              { id: 'SUBSCRIPTION', label: 'الاشتراك', icon: CreditCard },
              { id: 'EDIT', label: 'تعديل البيانات', icon: Edit3 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    if (tab.id === 'REPORT' && !reportCardDataUrl) {
                      handleGenerateReport();
                    }
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                    isActive
                      ? tab.isSpecial
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30'
                        : 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                      : tab.isSpecial
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/50 font-black'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: Apple Wallet Pass Card View */}
          {activeTab === 'CARD' && (
            <div className="space-y-6 max-w-md mx-auto animate-ios-spring">
              {/* Apple Wallet Pass Container */}
              <div id="student-wallet-card" className="apple-wallet-pass p-7 text-white space-y-6 shadow-2xl">
                {/* Pass Top Header */}
                <div className="flex items-start justify-between border-b border-white/15 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md border border-white/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/logo.png" alt="مس نشوى" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black tracking-tight">أكاديمية مس نشوى</h3>
                      <p className="text-[10px] text-emerald-200 font-semibold">علوم متكاملة • أولى ثانوي</p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-mono font-black bg-white/15 border border-white/20 text-emerald-100">
                    #{currentStudent.code}
                  </span>
                </div>

                {/* Pass Student Details */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-emerald-200/80 font-bold block">اسم الطالب</span>
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight">{currentStudent.name}</h2>
                    </div>

                    {currentStudent.photoUrl && (
                      <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-emerald-400/80 shadow-md shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={currentStudent.photoUrl} alt={currentStudent.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/10 text-xs">
                    <div>
                      <span className="text-[10px] text-emerald-200/80 block">المجموعة</span>
                      <span className="font-bold text-white text-xs">{group ? group.name : '—'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-emerald-200/80 block">اشتراك الشهر</span>
                      <span className={`font-bold text-xs ${isCurrentMonthPaid ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {isCurrentMonthPaid ? 'مسدد ✅' : 'مستحق ⚠️'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Barcode / QR Code Switcher */}
                <div className="bg-white rounded-2xl p-4 shadow-inner text-slate-900 text-center space-y-3">
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCardDisplayType('QR')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black transition ${
                        cardDisplayType === 'QR' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      QR Code
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardDisplayType('BARCODE')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black transition ${
                        cardDisplayType === 'BARCODE' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Barcode
                    </button>
                  </div>

                  <div className="flex items-center justify-center min-h-[150px]">
                    {cardDisplayType === 'QR' ? (
                      qrDataUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={qrDataUrl} alt="QR Code" className="w-36 h-36 mx-auto rounded-lg" />
                      )
                    ) : (
                      <svg ref={barcodeSvgRef} className="max-w-full" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold">أظهر هذا الباركود لكاميرا السكانر عند باب السنتر</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCardImage}
                  disabled={isDownloadingImage}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>{isDownloadingImage ? 'جاري التحميل...' : 'حفظ الكارت بالمعرض 📥'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('REPORT');
                    handleGenerateReport();
                  }}
                  className="py-3 px-4 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition active:scale-95"
                >
                  <FileText className="w-4 h-4" />
                  <span>التقرير 📜</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB: Nashwa AI Science Tutor Interactive Chat */}
          {activeTab === 'AI_TUTOR' && (
            <div className="liquid-glass rounded-3xl p-4 sm:p-6 shadow-xl space-y-4 animate-ios-spring flex flex-col h-[75vh] max-h-[750px]">
              {/* Tutor Header */}
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Master AI 🤖⚡</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                        معلم العلوم الذكي
                      </span>
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      المساعد الذكي لمس نشوى • متاح لمساعدتك خطوة بخطوة 24/7
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClearChat}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1"
                  title="بدء محادثة جديدة"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">مذاكرة جديدة</span>
                </button>
              </div>

              {/* Chat Messages Log */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 pl-1 scrollbar-thin">
                {chatMessages.map((msg, idx) => {
                  const isAssistant = msg.role === 'assistant';
                  return (
                    <div
                      key={idx}
                      className={`flex gap-2.5 items-start ${isAssistant ? 'justify-start' : 'justify-end'}`}
                    >
                      {isAssistant && (
                        <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-500 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      <div
                        className={`relative max-w-[85%] sm:max-w-[78%] p-3.5 sm:p-4 rounded-2xl text-xs leading-relaxed text-right space-y-1.5 shadow-sm ${
                          isAssistant
                            ? 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tr-xs'
                            : 'bg-gradient-to-r from-brand-600 to-cyan-500 text-white font-medium rounded-tl-xs shadow-brand-600/20'
                        }`}
                      >
                        <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

                        {isAssistant && (
                          <div className="pt-1 flex items-center justify-end gap-1.5 border-t border-slate-100 dark:border-slate-800/80">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(msg.content);
                                setCopiedChatIdx(idx);
                                setTimeout(() => setCopiedChatIdx(null), 2000);
                              }}
                              className="text-[10px] text-slate-400 hover:text-emerald-500 flex items-center gap-1 transition"
                            >
                              {copiedChatIdx === idx ? (
                                <>
                                  <CheckCheck className="w-3 h-3 text-emerald-500" />
                                  <span>تم النسخ</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>نسخ الإجابة</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {!isAssistant && (
                        <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs shadow-xs">
                          {currentStudent.name.slice(0, 1)}
                        </div>
                      )}
                    </div>
                  );
                })}

                {isChatLoading && (
                  <div className="flex gap-2.5 items-start justify-start animate-pulse">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-500 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                      <span>Master AI يكتب لك الشرح الآن... 🔬</span>
                    </div>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Quick Prompt Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1 shrink-0 overflow-x-auto pb-1 scrollbar-none">
                {[
                  'اشرح لي درس الكربوهيدرات والليبيدات 🔬',
                  'ما الفرق بين المجتمع الحيوي والنظام البيئي؟ 🌿',
                  'كيف أحل مسائل حفظ الطاقة؟ ⚡',
                  'اختبرني بسؤال تفوق في العلوم المتكاملة! 🏆',
                ].map((promptText, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => handleSendChatMessage(promptText)}
                    disabled={isChatLoading}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700/80 transition whitespace-nowrap active:scale-95 disabled:opacity-50"
                  >
                    💡 {promptText}
                  </button>
                ))}
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChatMessage();
                }}
                className="flex items-center gap-2 pt-1 shrink-0"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="اسألني عن أي مفهوم أو مسألة في مادة العلوم المتكاملة..."
                  disabled={isChatLoading}
                  className="flex-1 px-4 py-3 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-xs"
                />

                <button
                  type="submit"
                  disabled={isChatLoading || !chatInput.trim()}
                  className="p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-md shadow-emerald-600/30 transition active:scale-95 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: Monthly Report Card Certificate View */}
          {activeTab === 'REPORT' && (
            <div className="liquid-glass rounded-3xl p-6 shadow-sm space-y-6 animate-ios-spring">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-500" />
                    <span>شهادة التقييم والمتابعة الشهرية ({currentAcademicMonth})</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    تقرير معتمد وشامل يوضح نسبة حضور الحصص، درجات الامتحانات، وملاحظات المس
                  </p>
                </div>

                <button
                  onClick={() => handleGenerateReport()}
                  disabled={isGeneratingReport}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isGeneratingReport ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingReport ? 'جاري التحديث...' : 'تحديث الشهادة 🔄'}</span>
                </button>
              </div>

              {/* Certificate Canvas / Image Preview */}
              {isGeneratingReport ? (
                <div className="p-16 text-center text-slate-400 space-y-3">
                  <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-bold">جاري توليد وطباعة شهادة التقرير الشهري...</p>
                </div>
              ) : reportCardDataUrl ? (
                <div className="space-y-4">
                  <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-emerald-500/30 bg-slate-950 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={reportCardDataUrl}
                      alt="Monthly Report Card"
                      className="w-full h-auto object-contain rounded-xl max-h-[70vh]"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const cleanParentPhone = currentStudent.parentPhone.replace(/\D/g, '').replace(/^0/, '20');
                        const msg = `أهلاً بحضرتك أستاذ ${currentStudent.parentName} 🌸\nنرسل لحضرتكم تقرير المتابعة والتقييم الشهري الخاص بـ (${currentStudent.name}) لشهر (${currentAcademicMonth}) في مادة العلوم المتكاملة مع مس نشوى 🌟\n\n📌 كود الطالب: #${currentStudent.code}\n🔗 لمتابعة كارت الطالب والدرجات المحدثة: https://nashwa-academy.vercel.app/student`;
                        window.open(`https://wa.me/${cleanParentPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                      }}
                      className="flex-1 min-w-[150px] py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-95"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>إرسال لولي الأمر عبر واتساب 💬</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = reportCardDataUrl;
                        a.download = `تقرير_${currentStudent.code}_${currentStudent.name.replace(/\s+/g, '_')}_${currentAcademicMonth}.png`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      className="py-3 px-5 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
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
              ) : (
                <div className="text-center py-12">
                  <button
                    onClick={() => handleGenerateReport()}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-black text-xs shadow-lg transition active:scale-95"
                  >
                    عرض وتوليد شهادة التقرير الشهري 📜
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Edit Profile */}
          {activeTab === 'EDIT' && (
            <div className="liquid-glass rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-ios-spring">
              <div className="border-b border-slate-200/60 dark:border-slate-800 pb-4">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-brand-600 dark:text-cyan-400" />
                  <span>تعديل وتحديث بياناتي</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  يمكنك تعديل أرقام الهواتف، العنوان، وتاريخ الميلاد، وسيتم إرسال الطلب لمس نشوى لاعتماده وتطبيقه 🔔
                </p>
              </div>

              {pendingEditReq && pendingEditReq.status === 'PENDING' && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs space-y-1.5 shadow-sm">
                  <div className="flex items-center gap-2 font-black text-amber-800 dark:text-amber-300">
                    <Clock className="w-4 h-4 text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
                    <span>طلب تعديل بياناتك قيد مراجعة واعتماد مس نشوى ⏳</span>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300/80 leading-relaxed">
                    تم إرسال طلبك بتاريخ ({new Date(pendingEditReq.requestedAt).toLocaleDateString('ar-EG')}) وسيتم تحديث الكارت والبيانات تلقائياً فور موافقة المس.
                  </p>
                </div>
              )}

              {editSuccessMsg && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-bounce">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{editSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveEditProfile} className="space-y-4 text-xs">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">اسم الطالب ثلاثياً:</label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-brand-500"
                    required
                  />
                  {editErrors.name && <p className="text-rose-500 text-[10px] font-bold">{editErrors.name}</p>}
                </div>

                {/* Phones Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">رقم هاتف الطالب (واتساب):</label>
                    <input
                      type="tel"
                      dir="ltr"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-brand-500 text-center"
                      required
                    />
                    {editErrors.phone && <p className="text-rose-500 text-[10px] font-bold">{editErrors.phone}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">رقم هاتف ولي الأمر:</label>
                    <input
                      type="tel"
                      dir="ltr"
                      value={editFormData.parentPhone}
                      onChange={(e) => setEditFormData({ ...editFormData, parentPhone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-brand-500 text-center"
                      required
                    />
                    {editErrors.parentPhone && <p className="text-rose-500 text-[10px] font-bold">{editErrors.parentPhone}</p>}
                  </div>
                </div>

                {/* Parent Name & Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">اسم ولي الأمر:</label>
                    <input
                      type="text"
                      value={editFormData.parentName}
                      onChange={(e) => setEditFormData({ ...editFormData, parentName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">العنوان / المنطقة السكنية:</label>
                    <input
                      type="text"
                      value={editFormData.address}
                      onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                {/* Date Wheel Picker */}
                <DateWheelPicker
                  value={editFormData.birthDate || '2009-05-15'}
                  onChange={(val) => setEditFormData({ ...editFormData, birthDate: val })}
                  label="تاريخ الميلاد"
                />

                {/* Photo Upload with Gallery & Camera Options */}
                <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-cyan-500" />
                      <span>الصورة الشخصية للكارت:</span>
                    </span>
                    {editFormData.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, photoUrl: '' })}
                        className="text-[10px] text-rose-500 font-bold hover:underline"
                      >
                        إزالة الصورة 🗑️
                      </button>
                    )}
                  </label>

                  {editFormData.photoUrl ? (
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={editFormData.photoUrl}
                        alt="Preview"
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                      />
                      <div className="space-y-1">
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold block">
                          تم تجهيز الصورة بنجاح ✅
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => editGalleryInputRef.current?.click()}
                            className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-[10px] font-bold text-slate-800 dark:text-white"
                          >
                            تغيير من المعرض 🖼️
                          </button>
                          <button
                            type="button"
                            onClick={() => editCameraInputRef.current?.click()}
                            className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-[10px] font-bold text-slate-800 dark:text-white"
                          >
                            التقاط سيلفي 📸
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => editGalleryInputRef.current?.click()}
                        className="p-3 rounded-xl border border-dashed border-cyan-400/60 dark:border-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 font-bold text-xs flex flex-col items-center justify-center gap-1 transition"
                      >
                        <ImageIcon className="w-5 h-5 text-cyan-500" />
                        <span>اختيار من المعرض 🖼️</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => editCameraInputRef.current?.click()}
                        className="p-3 rounded-xl border border-dashed border-emerald-400/60 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex flex-col items-center justify-center gap-1 transition"
                      >
                        <Camera className="w-5 h-5 text-emerald-500" />
                        <span>التقاط سيلفي 📸</span>
                      </button>
                    </div>
                  )}

                  <input
                    ref={editGalleryInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <input
                    ref={editCameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>

                {/* Submit button */}
                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 via-cyan-500 to-emerald-500 hover:from-brand-500 hover:to-emerald-400 text-white font-black text-xs shadow-lg shadow-brand-600/25 active:scale-95 transition flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSavingEdit ? 'جاري الحفظ وإرسال الإشعار...' : 'حفظ وتحديث البيانات فوراً 🚀'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: Attendance History */}
          {activeTab === 'ATTENDANCE' && (
            <div className="liquid-glass rounded-3xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>سجل حضور الحصص</span>
              </h2>

              {attendance.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Clock className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-semibold">لم يتم تسجيل أي حضور حتى الآن</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {attendance.map((rec) => (
                    <div key={rec.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">
                          📅 {new Date(rec.scannedAt).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          الساعة: {new Date(rec.scannedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {rec.status === 'MAKEUP' ? 'حضور تعويض 🔄' : 'حاضر في الموعد ✅'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Exam Results */}
          {activeTab === 'EXAMS' && (
            <div className="liquid-glass rounded-3xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-brand-700 dark:text-emerald-400" />
                <span>كشف نتائج وتقييمات الامتحانات</span>
              </h2>

              {examResults.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Award className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-semibold">لا توجد نتائج امتحانات مرصودة حالياً</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {examResults.map(({ result, exam }) => {
                    const percentage = Math.round((result.score / exam.maxScore) * 100);
                    return (
                      <div
                        key={result.id}
                        className="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-slate-900 dark:text-white text-xs">{exam.title}</h3>
                          <span className="px-2.5 py-1 rounded-xl bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-emerald-300 font-mono font-black text-xs">
                            {result.score} / {exam.maxScore} ({percentage}%)
                          </span>
                        </div>

                        {result.feedback && (
                          <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-[11px] text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                            💬 ملاحظة المس: &quot;{result.feedback}&quot;
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: Subscriptions */}
          {activeTab === 'SUBSCRIPTION' && (
            <div className="liquid-glass rounded-3xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>سجل الاشتراكات الشهرية</span>
              </h2>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">شهر ({sub.month})</p>
                      <p className="text-[11px] text-slate-400 font-mono">القيمة: {sub.amount} جنيه مصري</p>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                        sub.isPaid
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {sub.isPaid ? 'مسدد بالكامل ✅' : 'مستحق الدفع ⚠️'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
