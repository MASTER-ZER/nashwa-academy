'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/storage';
import { notifyNewStudentRegistration } from '@/lib/telegram';
import { generateStudentWelcomeWhatsAppUrl } from '@/lib/whatsapp';
import { Group, Student } from '@/types';
import confetti from 'canvas-confetti';
import { UserCheck, Sparkles, AlertCircle, ArrowRight, Phone, User, MapPin, Clock, QrCode, CheckCircle2, Camera, Upload, Image as ImageIcon, X, Eye } from 'lucide-react';
import Link from 'next/link';
import DateWheelPicker from '@/components/DateWheelPicker';
import { compressStudentPhoto } from '@/lib/imageCompressor';

export default function RegisterPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [existingStudent, setExistingStudent] = useState<Student | null>(null);
  const [requirePhoto, setRequirePhoto] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    parentName: '',
    parentPhone: '',
    address: '',
    birthDate: '2009-05-15',
    photoUrl: '',
    groupId: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [registeredCode, setRegisteredCode] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [previewPhotoModal, setPreviewPhotoModal] = useState<string | null>(null);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    db.syncFromSupabase().then(() => {
      const data = db.getData();
      setGroups(data.groups);
      setRequirePhoto(Boolean(data.settings?.requireStudentPhoto));
    });

    const data = db.getData();
    setGroups(data.groups);
    setRequirePhoto(Boolean(data.settings?.requireStudentPhoto));
    if (data.groups.length > 0) {
      setFormData((prev) => ({ ...prev, groupId: data.groups[0].id }));
    }

    // Check if user already registered on this phone
    const savedCode = localStorage.getItem('logged_student_code');
    if (savedCode) {
      const std = data.students.find((s) => s.code === savedCode.trim());
      if (std) setExistingStudent(std);
    }
  }, []);

  const validatePhone = (phone: string): boolean => {
    const cleaned = phone.trim().replace(/\D/g, '');
    return /^(010|011|012|015)\d{8}$/.test(cleaned);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPhoto(true);
    try {
      const compressed = await compressStudentPhoto(file);
      setFormData((prev) => ({ ...prev, photoUrl: compressed }));
      setErrors((prev) => ({ ...prev, photo: '' }));
    } catch (err) {
      console.error('Photo compression error:', err);
      setErrors((prev) => ({ ...prev, photo: 'فشل معالجة الصورة، يرجى اختيار صورة أخرى' }));
    } finally {
      setIsProcessingPhoto(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, photoUrl: '' }));
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const newErrors: Record<string, string> = {};

    if (!formData.name.trim() || formData.name.trim().split(' ').length < 2) {
      newErrors.name = 'يرجى كتابة اسم الطالب ثنائياً أو ثلاثياً على الأقل';
    }

    if (!validatePhone(formData.phone)) {
      newErrors.phone = 'يرجى إدخال رقم تليفون صحيح (11 رقم يبدأ بـ 010 أو 011 أو 012 أو 015)';
    }

    if (!formData.parentName.trim()) {
      newErrors.parentName = 'يرجى كتابة اسم ولي الأمر';
    }

    if (!validatePhone(formData.parentPhone)) {
      newErrors.parentPhone = 'يرجى إدخال رقم ولي أمر صحيح (11 رقم مصري)';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'يرجى كتابة العنوان أو المنطقة';
    }

    if (requirePhoto && !formData.photoUrl) {
      newErrors.photo = 'الصورة الشخصية مطلوبة لإصدار الكارت، يرجى رفع أو التقاط صورتك 📸';
    }

    if (!formData.groupId) {
      newErrors.groupId = 'يرجى اختيار المجموعة المناسبة لك';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const lastReg = localStorage.getItem('last_reg_timestamp');
    if (lastReg && Date.now() - parseInt(lastReg, 10) < 5000) {
      setErrors({ form: 'يرجى الانتظار بضع ثوانٍ قبل محاولة التسجيل مجدداً' });
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    localStorage.setItem('last_reg_timestamp', String(Date.now()));

    try {
      // Save to DB
      const student = await db.registerStudent({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        parentName: formData.parentName.trim(),
        parentPhone: formData.parentPhone.trim(),
        address: formData.address.trim(),
        birthDate: formData.birthDate || '2009-05-15',
        photoUrl: formData.photoUrl || '',
        academicYear: 'FIRST_SEC',
        groupId: formData.groupId,
      });

      const selectedGroup = groups.find((g) => g.id === formData.groupId);
      notifyNewStudentRegistration(student, selectedGroup).catch(() => {});

      // Save student code to localStorage for permanent session
      localStorage.setItem('logged_student_code', student.code);

      setRegisteredCode(student.code);
      setIsSubmitted(true);

      try {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }
    } catch (err) {
      console.error('Registration submission error:', err);
      alert('حدث خطأ أثناء إرسال الاستمارة، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="max-w-md mx-auto my-8 liquid-glass rounded-3xl p-8 text-center space-y-6 shadow-2xl animate-ios-spring">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto scale-110 shadow-lg shadow-emerald-500/20">
          <UserCheck className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">تم إرسال طلب التسجيل بنجاح! 🎉</h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            أهلاً بك يا <strong>{formData.name}</strong> في أكاديمية مس نشوى لمادة العلوم المتكاملة.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-200 space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">كود الطالب الخاص بك:</p>
          <p className="text-4xl font-black text-brand-600 dark:text-cyan-400 tracking-wider font-mono">#{registeredCode}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            تم حفظ الكود على جهازك تلقائياً لتسجيل الدخول به ومتابعة الحضور والامتحانات.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          {formData.groupId && (
            <a
              href={generateStudentWelcomeWhatsAppUrl({
                teacherPhone: db.getSettings()?.assistantPhone || '01012345678',
                studentName: formData.name,
                studentCode: registeredCode,
                groupName: groups.find((g) => g.id === formData.groupId)?.name || 'المجموعة',
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-600/25 active:scale-95 transition"
            >
              <span>📲 إرسال رسالة تأكيد لمس نشوى على واتساب</span>
            </a>
          )}

          <Link
            href="/student"
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs shadow-md transition active:scale-95"
          >
            الانتقال المباشر لبوابة الطالب وكارت الـ QR
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/"
            className="w-full inline-flex items-center justify-center py-2 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-4 space-y-6">
      {/* Existing Student Banner */}
      {existingStudent && (
        <div className="p-4 rounded-2xl liquid-glass border border-brand-500/30 bg-brand-50/50 dark:bg-brand-950/40 flex items-center justify-between gap-3 shadow-md animate-ios-spring">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-mono font-bold text-xs">
              #{existingStudent.code}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">أنت مسجل بالفعل: {existingStudent.name}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">كود الطالب الخاص بك مفعل على هذا الموبايل</p>
            </div>
          </div>

          <Link
            href="/student"
            className="px-3.5 py-1.5 rounded-xl bg-brand-600 text-white text-xs font-bold shrink-0 hover:bg-brand-700 active:scale-95 transition flex items-center gap-1"
          >
            <QrCode className="w-3.5 h-3.5" />
            فتح الكارت
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>استمارة الالتحاق بدرس العلوم المتكاملة</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">تسجيل طالب جديد - أولى ثانوي</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          يرجى إدخال البيانات بدقة لإنشاء كارت الباركود الذكي الخاص بك واعتماد انضمامك للمجموعة
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="liquid-glass-card rounded-3xl p-6 sm:p-8 space-y-5">
        {/* Student Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-brand-600 dark:text-cyan-400" />
            اسم الطالب بالكامل (ثلاثي أو رباعي) <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="مثال: إياد محمد نجاح"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
              errors.name ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300 dark:border-slate-700'
            } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition`}
          />
          {errors.name && <p className="text-[11px] text-rose-600 font-semibold">{errors.name}</p>}
        </div>

        {/* Student Phone */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-brand-600 dark:text-cyan-400" />
            رقم هاتف الطالب (واتساب) <span className="text-rose-500">*</span>
          </label>
          <input
            type="tel"
            placeholder="مثال: 01012345678"
            dir="ltr"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className={`w-full px-3.5 py-2.5 text-sm text-right rounded-xl border ${
              errors.phone ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300 dark:border-slate-700'
            } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition`}
          />
          {errors.phone && <p className="text-[11px] text-rose-600 font-semibold">{errors.phone}</p>}
        </div>

        {/* Parent Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            اسم ولي الأمر (الوالد أو الوالدة) <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="مثال: محمد نجاح"
            value={formData.parentName}
            onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
            className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
              errors.parentName ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300 dark:border-slate-700'
            } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition`}
          />
          {errors.parentName && <p className="text-[11px] text-rose-600 font-semibold">{errors.parentName}</p>}
        </div>

        {/* Parent Phone */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            رقم هاتف ولي الأمر (واتساب لاستلام الدرجات) <span className="text-rose-500">*</span>
          </label>
          <input
            type="tel"
            placeholder="مثال: 01198765432"
            dir="ltr"
            value={formData.parentPhone}
            onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
            className={`w-full px-3.5 py-2.5 text-sm text-right rounded-xl border ${
              errors.parentPhone ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300 dark:border-slate-700'
            } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition`}
          />
          {errors.parentPhone && <p className="text-[11px] text-rose-600 font-semibold">{errors.parentPhone}</p>}
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            العنوان / المنطقة السكنية <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="مثال: المنصورة - شارع الجمهورية"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
              errors.address ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300 dark:border-slate-700'
            } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition`}
          />
          {errors.address && <p className="text-[11px] text-rose-600 font-semibold">{errors.address}</p>}
        </div>

        {/* Date of Birth Wheel Picker */}
        <DateWheelPicker
          value={formData.birthDate}
          onChange={(val) => setFormData((prev) => ({ ...prev, birthDate: val }))}
          label="تاريخ الميلاد (اختر بالبكرة السلسة)"
          required
        />

        {/* Photo Upload Section (Controlled by Admin Settings Toggle) */}
        {requirePhoto && (
          <div className="space-y-3 p-4 rounded-2xl bg-brand-50/40 dark:bg-brand-950/30 border border-brand-200/60 dark:border-brand-900/50 animate-ios-spring">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-brand-600 dark:text-cyan-400" />
                <span>الصورة الشخصية للطالب (مطلوبة لإصدار الكارت الذكي)</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-brand-700 dark:text-cyan-300 font-bold bg-brand-100 dark:bg-brand-900/60 px-2 py-0.5 rounded-full">
                إجباري 📸
              </span>
            </div>

            {formData.photoUrl ? (
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    onClick={() => setPreviewPhotoModal(formData.photoUrl)}
                    className="w-16 h-16 rounded-2xl overflow-hidden shadow-md border-2 border-emerald-500 shrink-0 cursor-pointer relative group"
                    title="اضغط للمعاينة المكبرة"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={formData.photoUrl} alt="Student Preview" className="w-full h-full object-cover group-hover:scale-105 transition" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>تم حفظ ومعالجة الصورة بنجاح!</span>
                    </p>
                    <p className="text-[10px] text-slate-400">اضغط على الصورة للمعاينة المكبرة أو غيّرها من الأزرار أدناه</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center gap-1.5 transition active:scale-95 text-[11px]"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-brand-600 dark:text-cyan-400" />
                    <span>تغيير من المعرض 🖼️</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center gap-1.5 transition active:scale-95 text-[11px]"
                  >
                    <Camera className="w-3.5 h-3.5 text-emerald-500" />
                    <span>سيلفي بالكاميرا 📸</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 hover:bg-rose-100 transition"
                    title="حذف الصورة"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Gallery Choice Button */}
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={isProcessingPhoto}
                    className={`p-4 rounded-2xl border-2 border-dashed ${
                      errors.photo ? 'border-rose-400 bg-rose-50/30' : 'border-brand-300 dark:border-brand-800 hover:border-brand-500'
                    } bg-white/70 dark:bg-slate-900/70 flex items-center gap-3 transition active:scale-[0.99] text-right`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">اختيار من المعرض 🖼️</p>
                      <p className="text-[10px] text-slate-400">اختر صورة من ألبوم الموبايل</p>
                    </div>
                  </button>

                  {/* Camera Choice Button */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isProcessingPhoto}
                    className={`p-4 rounded-2xl border-2 border-dashed ${
                      errors.photo ? 'border-rose-400 bg-rose-50/30' : 'border-emerald-300 dark:border-emerald-800 hover:border-emerald-500'
                    } bg-white/70 dark:bg-slate-900/70 flex items-center gap-3 transition active:scale-[0.99] text-right`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">التقاط سيلفي 📸</p>
                      <p className="text-[10px] text-slate-400">التقاط مباشر بالكاميرا الأمامية</p>
                    </div>
                  </button>
                </div>

                {isProcessingPhoto && (
                  <p className="text-center text-xs font-bold text-brand-600 dark:text-cyan-400 animate-pulse">
                    جاري معالجة وضغط صورتك بدقة عالية... ⏳
                  </p>
                )}
              </div>
            )}

            {/* Hidden Inputs for Gallery & Camera */}
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            {errors.photo && <p className="text-[11px] text-rose-600 font-semibold">{errors.photo}</p>}
          </div>
        )}

        {/* Group Selection */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            اختر موعد المجموعة المناسب لك <span className="text-rose-500">*</span>
          </label>
          <select
            value={formData.groupId}
            onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition"
          >
            {groups.map((grp) => (
              <option key={grp.id} value={grp.id}>
                {grp.name}
              </option>
            ))}
          </select>
          {errors.groupId && <p className="text-[11px] text-rose-600 font-semibold">{errors.groupId}</p>}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-black text-sm shadow-xl shadow-emerald-600/20 active:scale-[0.99] transition mt-4"
        >
          تأكيد وإرسال طلب التسجيل 🚀
        </button>

        <p className="text-[11px] text-slate-400 text-center">
          ملاحظة: سيصل إشعار فوري لمس نشوى للمراجعة والاعتماد وتفعيل الكارت.
        </p>
      </form>

      {/* Lightbox Preview Modal */}
      {previewPhotoModal && (
        <div
          onClick={() => setPreviewPhotoModal(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-ios-spring"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-sm w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/20 p-4 text-center space-y-3"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-white">معاينة الصورة الشخصية 📸</span>
              <button
                type="button"
                onClick={() => setPreviewPhotoModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-inner bg-black flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewPhotoModal} alt="Preview" className="w-full h-full object-cover" />
            </div>

            <button
              type="button"
              onClick={() => setPreviewPhotoModal(null)}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-black text-xs transition"
            >
              إغلاق المعاينة ✅
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
