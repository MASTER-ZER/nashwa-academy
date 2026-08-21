'use client';

import { useState, useEffect, useRef } from 'react';
import { db, getCurrentMonthLabel } from '@/lib/storage';
import { sound } from '@/lib/audio';
import { Student, Group, AttendanceRecord, Subscription, ExamResult, Exam } from '@/types';
import {
  GraduationCap,
  QrCode,
  CalendarCheck,
  CreditCard,
  Award,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  LogOut,
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
} from 'lucide-react';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { generateStudentCardCanvas } from '@/lib/generateCardImage';
import DateWheelPicker from '@/components/DateWheelPicker';
import { compressStudentPhoto } from '@/lib/imageCompressor';
import { notifyStudentProfileUpdate } from '@/lib/telegram';

export default function StudentPortalPage() {
  const [studentCode, setStudentCode] = useState('');
  const [phone, setPhone] = useState('');
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [examResults, setExamResults] = useState<{ result: ExamResult; exam: Exam }[]>([]);

  const [activeTab, setActiveTab] = useState<'CARD' | 'ATTENDANCE' | 'SUBSCRIPTION' | 'EXAMS' | 'EDIT'>('CARD');
  const [errorMsg, setErrorMsg] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [cardDisplayType, setCardDisplayType] = useState<'QR' | 'BARCODE'>('QR');
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);

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

  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);
  const editGalleryInputRef = useRef<HTMLInputElement>(null);
  const editCameraInputRef = useRef<HTMLInputElement>(null);

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

  // Sync groups
  useEffect(() => {
    const d = db.getData();
    setGroups(d.groups || []);
  }, []);

  // When currentStudent changes, update edit form data
  useEffect(() => {
    if (currentStudent) {
      setEditFormData({
        name: currentStudent.name,
        phone: currentStudent.phone,
        parentName: currentStudent.parentName,
        parentPhone: currentStudent.parentPhone,
        address: currentStudent.address || '',
        birthDate: currentStudent.birthDate || '2009-05-15',
        photoUrl: currentStudent.photoUrl || '',
        groupId: currentStudent.groupId || '',
      });
    }
  }, [currentStudent]);

  // Generate QR & Barcode when student is active
  useEffect(() => {
    if (currentStudent) {
      // High error correction Level H ensures instantaneous scanning under any lighting
      QRCode.toDataURL(currentStudent.code, {
        width: 360,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: { dark: '#020617', light: '#ffffff' },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR generation error', err));

      if (barcodeSvgRef.current) {
        try {
          JsBarcode(barcodeSvgRef.current, currentStudent.code, {
            format: 'CODE128',
            lineColor: '#020617',
            width: 3,
            height: 85,
            displayValue: true,
            fontSize: 18,
            font: 'Cairo',
            textMargin: 6,
          });
        } catch (err) {
          console.error('Barcode generation error', err);
        }
      }
    }
  }, [currentStudent, activeTab, cardDisplayType]);

  const loadStudentData = async (code: string) => {
    await db.syncFromSupabase();

    const data = db.getData();
    setGroups(data.groups || []);
    const std = data.students.find((s) => s.code === code.trim());
    if (!std) {
      setErrorMsg('لم يتم العثور على طالب بهذا الكود في المنصة');
      return false;
    }

    setCurrentStudent(std);
    localStorage.setItem('logged_student_code', std.code);
    setErrorMsg('');

    const grp = data.groups.find((g) => g.id === std.groupId);
    setGroup(grp || null);

    const att = data.attendance.filter((a) => a.studentId === std.id);
    setAttendance(att);

    const subs = data.subscriptions.filter((s) => s.studentId === std.id);
    setSubscriptions(subs);

    const results = data.examResults
      .filter((r) => r.studentId === std.id)
      .map((r) => {
        const exam = data.exams.find((e) => e.id === r.examId);
        return exam ? { result: r, exam } : null;
      })
      .filter(Boolean) as { result: ExamResult; exam: Exam }[];

    setExamResults(results);
    return true;
  };

  // Real-time reactive updates
  useEffect(() => {
    const unsub = db.subscribe(() => {
      const savedCode = localStorage.getItem('logged_student_code');
      if (savedCode) {
        const data = db.getData();
        setGroups(data.groups || []);
        const std = data.students.find((s) => s.code === savedCode.trim());
        if (std) {
          setCurrentStudent(std);
          const grp = data.groups.find((g) => g.id === std.groupId);
          setGroup(grp || null);
          const att = data.attendance.filter((a) => a.studentId === std.id);
          setAttendance(att);
          const subs = data.subscriptions.filter((s) => s.studentId === std.id);
          setSubscriptions(subs);
        }
      }
    });
    return unsub;
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentCode.trim()) {
      setErrorMsg('يرجى إدخال كود الطالب');
      return;
    }

    await db.syncFromSupabase();
    const data = db.getData();
    const std = data.students.find((s) => s.code === studentCode.trim());
    if (!std) {
      setErrorMsg('كود الطالب غير مسجل أو بانتظار اعتماد المس');
      return;
    }

    // Two-factor privacy check (Phone verification)
    if (phone.trim()) {
      const cleanInput = phone.trim().replace(/\D/g, '');
      const cleanStdPhone = std.phone.replace(/\D/g, '');
      const cleanParentPhone = std.parentPhone.replace(/\D/g, '');

      const isMatch =
        cleanStdPhone.endsWith(cleanInput) ||
        cleanParentPhone.endsWith(cleanInput) ||
        cleanStdPhone === cleanInput ||
        cleanParentPhone === cleanInput;

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
      const updatedStudent: Student = {
        ...currentStudent,
        name: editFormData.name.trim(),
        phone: editFormData.phone.trim(),
        parentName: editFormData.parentName.trim() || currentStudent.parentName,
        parentPhone: editFormData.parentPhone.trim() || currentStudent.parentPhone,
        address: editFormData.address.trim() || currentStudent.address,
        birthDate: editFormData.birthDate || currentStudent.birthDate,
        photoUrl: editFormData.photoUrl || currentStudent.photoUrl,
        groupId: editFormData.groupId || currentStudent.groupId,
      };

      // 1. Update in local DB & Supabase
      db.updateStudent(currentStudent.id, updatedStudent);

      // 2. Notify Miss Nashwa on Telegram
      const selectedGrp = groups.find((g) => g.id === updatedStudent.groupId) || group;
      notifyStudentProfileUpdate(updatedStudent, selectedGrp);

      setCurrentStudent(updatedStudent);
      setGroup(selectedGrp || null);
      setEditSuccessMsg('تم حفظ وتحديث بياناتك بنجاح وإشعار المس فوراً! 🎉');

      sound.playSuccessChime();
      try {
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
      } catch {}

      setTimeout(() => {
        setEditSuccessMsg('');
        setActiveTab('CARD');
      }, 2500);
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('حدث خطأ أثناء حفظ التعديلات، يرجى المحاولة مرة أخرى.');
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

  // Print & Save as PDF
  const handleSavePdf = () => {
    window.print();
  };

  // Copy student portal link
  const handleShareCard = () => {
    if (!currentStudent) return;
    const shareText = `🎓 كارت هوية الطالب: ${currentStudent.name}\n🔑 الكود: #${currentStudent.code}\n📚 أكاديمية مس نشوى - العلوم المتكاملة`;
    if (navigator.share) {
      navigator.share({ title: 'كارت الطالب', text: shareText, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 3000);
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
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2 text-right">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 text-right">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-brand-600 dark:text-cyan-400" />
                  <span>كود الطالب (رقم البطاقة):</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 101"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-black text-center text-lg focus:outline-none focus:border-brand-500 shadow-inner"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>رقم الهاتف المسجل أو آخر 4 أرقام (للخصوصية):</span>
                </label>
                <input
                  type="tel"
                  placeholder="مثال: 01012345678 أو 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-center text-sm focus:outline-none focus:border-brand-500 shadow-inner"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-700 to-emerald-600 hover:from-brand-600 hover:to-emerald-500 text-white font-black text-sm shadow-lg shadow-brand-700/20 transition active:scale-95 flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>عرض كارت الطالب والدرجات 🔓</span>
              </button>
            </form>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 text-center">
              <span>طالب جديد؟ </span>
              <a href="/register" className="font-bold text-brand-600 dark:text-cyan-400 hover:underline">
                سجل استمارة التقديم الآن 📝
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* 2. ACTIVE STUDENT DASHBOARD & APPLE WALLET PASS */
        <div className="space-y-6 animate-ios-spring">
          {/* Top Profile Header */}
          <div className="liquid-glass rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-200/80 dark:border-slate-800 no-print">
            <div className="flex items-center gap-3.5">
              {currentStudent.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentStudent.photoUrl}
                  alt={currentStudent.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500 shadow-md shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                  #{currentStudent.code}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
                    {currentStudent.name}
                  </h1>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      currentStudent.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-500/20'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-500/20'
                    }`}
                  >
                    {currentStudent.status === 'ACTIVE' ? 'معتمد ونشط ✅' : 'معلق ⏳'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-semibold">
                  {group ? group.name : 'العلوم المتكاملة • أولى ثانوي'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
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
                <span>تبديل الحساب</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs (Segmented Controls) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1.5 rounded-2xl liquid-glass border border-slate-200/80 dark:border-slate-800 no-print">
            {[
              { id: 'CARD', label: 'كارت الهوية', icon: QrCode },
              { id: 'ATTENDANCE', label: `الحضور (${attendance.length})`, icon: CalendarCheck },
              { id: 'EXAMS', label: `الدرجات (${examResults.length})`, icon: Award },
              { id: 'SUBSCRIPTION', label: 'الاشتراك', icon: CreditCard },
              { id: 'EDIT', label: 'تعديل البيانات ✏️', icon: Edit3 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
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
                      {currentStudent.birthDate && (
                        <p className="text-[11px] text-emerald-200 font-mono mt-0.5">📅 الميلاد: {currentStudent.birthDate}</p>
                      )}
                    </div>
                    {currentStudent.photoUrl && (
                      <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/40 shadow-lg shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={currentStudent.photoUrl} alt={currentStudent.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  {/* Clear Day-by-Day Schedule Boxes */}
                  <div className="space-y-1.5 pt-1 text-xs">
                    <span className="text-[10px] text-emerald-200/80 font-bold block">المجموعة ومواعيد الحصص الأسبوعية:</span>
                    <p className="font-bold text-white text-xs leading-tight">{group ? group.name : '—'}</p>
                  </div>
                </div>

                {/* Scannable Code Display */}
                <div className="bg-white rounded-3xl p-4 text-center shadow-inner text-slate-900 space-y-3 border border-white/20">
                  <div className="flex items-center justify-between px-2 text-[11px] font-bold text-slate-500 border-b border-slate-100 pb-2">
                    <span>امسح عند باب القاعة</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setCardDisplayType('QR')}
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          cardDisplayType === 'QR' ? 'bg-brand-600 text-white' : 'bg-slate-100'
                        }`}
                      >
                        QR
                      </button>
                      <button
                        onClick={() => setCardDisplayType('BARCODE')}
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          cardDisplayType === 'BARCODE' ? 'bg-brand-600 text-white' : 'bg-slate-100'
                        }`}
                      >
                        Barcode
                      </button>
                    </div>
                  </div>

                  {cardDisplayType === 'QR' ? (
                    <div className="flex justify-center p-1">
                      {qrDataUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={qrDataUrl} alt="Student QR" className="w-44 h-44 rounded-xl" />
                      )}
                    </div>
                  ) : (
                    <div className="flex justify-center overflow-hidden py-3">
                      <svg ref={barcodeSvgRef} className="max-w-full" />
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400 font-semibold">
                    رمز الحضور السريع الذكي للسنتر
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 no-print">
                <button
                  onClick={handleDownloadCardImage}
                  disabled={isDownloadingImage}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>{isDownloadingImage ? 'جاري إنشاء وتنزيل الصورة...' : 'حفظ الكارت كصورة في الاستوديو 📥'}</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleSavePdf}
                    className="py-3 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <Printer className="w-4 h-4 text-cyan-300" />
                    <span>طباعة الكارت PDF</span>
                  </button>

                  <button
                    onClick={handleShareCard}
                    className="py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>{copiedMsg ? 'تم نسخ الرابط! ✅' : 'مشاركة الكارت'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EDIT STUDENT PROFILE */}
          {activeTab === 'EDIT' && (
            <div className="liquid-glass rounded-3xl p-6 sm:p-8 shadow-md space-y-6 max-w-xl mx-auto animate-ios-spring">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-brand-600 dark:text-cyan-400" />
                    <span>تعديل بيانات الطالب #{currentStudent.code}</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    يمكنك تعديل رقم الهاتف، العنوان، الصورة، وتاريخ الميلاد في أي وقت
                  </p>
                </div>
                <span className="w-9 h-9 rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-cyan-300 font-mono font-black text-xs flex items-center justify-center">
                  #{currentStudent.code}
                </span>
              </div>

              {editSuccessMsg && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-ios-spring">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                  <span>{editSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveEditProfile} className="space-y-4 text-right">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-cyan-500" />
                    <span>اسم الطالب ثلاثياً</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                      editErrors.name ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300 dark:border-slate-700'
                    } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500`}
                  />
                  {editErrors.name && <p className="text-[11px] text-rose-500">{editErrors.name}</p>}
                </div>

                {/* Phones */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-500" />
                      <span>رقم هاتف الطالب (واتساب)</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      dir="ltr"
                      required
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                    />
                    {editErrors.phone && <p className="text-[11px] text-rose-500">{editErrors.phone}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-brand-500" />
                      <span>رقم هاتف ولي الأمر</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      dir="ltr"
                      required
                      value={editFormData.parentPhone}
                      onChange={(e) => setEditFormData({ ...editFormData, parentPhone: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                    />
                    {editErrors.parentPhone && <p className="text-[11px] text-rose-500">{editErrors.parentPhone}</p>}
                  </div>
                </div>

                {/* Parent Name & Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">اسم ولي الأمر</label>
                    <input
                      type="text"
                      value={editFormData.parentName}
                      onChange={(e) => setEditFormData({ ...editFormData, parentName: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span>العنوان / المنطقة</span>
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: المنصورة - حي الجامعة"
                      value={editFormData.address}
                      onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                {/* Date of Birth Wheel Picker */}
                <DateWheelPicker
                  value={editFormData.birthDate}
                  onChange={(val) => setEditFormData((prev) => ({ ...prev, birthDate: val }))}
                  label="تاريخ الميلاد"
                />

                {/* Photo Update Section with Gallery and Camera */}
                <div className="space-y-2.5 p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <label className="text-xs font-bold text-slate-800 dark:text-white flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-cyan-500" />
                      الصورة الشخصية (تظهر في الكارت الذكي)
                    </span>
                    {editFormData.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setEditFormData((prev) => ({ ...prev, photoUrl: '' }))}
                        className="text-[10px] text-rose-500 font-bold"
                      >
                        إزالة الصورة ❌
                      </button>
                    )}
                  </label>

                  {editFormData.photoUrl ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={editFormData.photoUrl}
                        alt="Preview"
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500 shadow-sm"
                      />
                      <div className="flex-1 space-y-1">
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">تم اختيار الصورة بنجاح ✅</p>
                        <p className="text-[10px] text-slate-400">يمكنك تغييرها باختيار صورة جديدة من الأزرار أدناه</p>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => editGalleryInputRef.current?.click()}
                      disabled={isProcessingPhoto}
                      className="py-2.5 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 hover:bg-brand-50 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                    >
                      <ImageIcon className="w-4 h-4 text-brand-600 dark:text-cyan-400" />
                      <span>اختيار من المعرض 🖼️</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => editCameraInputRef.current?.click()}
                      disabled={isProcessingPhoto}
                      className="py-2.5 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 hover:bg-emerald-50 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                    >
                      <Camera className="w-4 h-4 text-emerald-500" />
                      <span>سيلفي بالكاميرا 📸</span>
                    </button>
                  </div>

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

                {/* Group Selection */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-cyan-500" />
                    <span>المجموعة وموعد الحصة</span>
                  </label>
                  <select
                    value={editFormData.groupId}
                    onChange={(e) => setEditFormData({ ...editFormData, groupId: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                  >
                    {groups.map((grp) => (
                      <option key={grp.id} value={grp.id}>
                        {grp.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Submit & Cancel */}
                <div className="pt-3 flex gap-2">
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white font-black text-xs shadow-lg shadow-brand-600/20 transition active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSavingEdit ? 'جاري حفظ وإرسال التعديل...' : 'حفظ وتحديث البيانات فوراً 🚀'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('CARD')}
                    className="px-5 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: Attendance History */}
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

          {/* TAB 4: Exam Results */}
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

          {/* TAB 5: Subscriptions */}
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
