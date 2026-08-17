'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/storage';
import { notifyNewStudentRegistration } from '@/lib/telegram';
import { Group } from '@/types';
import confetti from 'canvas-confetti';
import { UserCheck, Sparkles, AlertCircle, ArrowRight, Phone, User, MapPin, Clock } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    parentName: '',
    parentPhone: '',
    address: '',
    groupId: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [registeredCode, setRegisteredCode] = useState<string>('');

  useEffect(() => {
    const data = db.getData();
    setGroups(data.groups);
    if (data.groups.length > 0) {
      setFormData((prev) => ({ ...prev, groupId: data.groups[0].id }));
    }
  }, []);

  const validatePhone = (phone: string): boolean => {
    const cleaned = phone.trim().replace(/\D/g, '');
    return /^(010|011|012|015)\d{8}$/.test(cleaned);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim() || formData.name.trim().split(' ').length < 2) {
      newErrors.name = 'يرجى كتابة الاسم ثنائي أو ثلاثي على الأقل';
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

    if (!formData.groupId) {
      newErrors.groupId = 'يرجى اختيار المجموعة المناسبة لك';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    // Save to DB
    const student = db.registerStudent({
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      parentName: formData.parentName.trim(),
      parentPhone: formData.parentPhone.trim(),
      address: formData.address.trim(),
      academicYear: 'FIRST_SEC',
      groupId: formData.groupId,
    });

    const selectedGroup = groups.find((g) => g.id === formData.groupId);
    notifyNewStudentRegistration(student, selectedGroup).catch(() => {});

    setRegisteredCode(student.code);
    setIsSubmitted(true);

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  };

  if (isSubmitted) {
    return (
      <div className="max-w-md mx-auto my-8 bg-white border border-emerald-200 rounded-3xl p-8 shadow-lg text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto scale-110">
          <UserCheck className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">تم إرسال طلب التسجيل بنجاح! 🎉</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            أهلاً بك يا <strong>{formData.name}</strong> في أكاديمية مس نشوى لمادة العلوم المتكاملة.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 space-y-2">
          <p className="text-xs text-slate-500 font-semibold">كود الطالب المؤقت الخاص بك:</p>
          <p className="text-3xl font-black text-brand-600 tracking-wider">#{registeredCode}</p>
          <p className="text-[11px] text-slate-500">
            احفظ هذا الكود لتسجيل الدخول به لاحقاً بعد مراجعة وقبول الطلب من قِبل المس.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Link
            href="/student"
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md transition"
          >
            الانتقال لبوابة الطالب
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/"
            className="w-full inline-flex items-center justify-center py-2.5 px-4 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>استمارة الالتحاق بدرس العلوم المتكاملة</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">تسجيل طالب جديد - الصف الأول الثانوي</h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          يرجى إدخال البيانات بدقة لإنشاء كارت الباركود الخاص بك واعتماد انضمامك للمجموعة
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
        {/* Student Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-brand-600" />
            اسم الطالب بالكامل (ثلاثي أو رباعي) <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="مثال: إياد محمد نجاح"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
              errors.name ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
            } focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition`}
          />
          {errors.name && <p className="text-[11px] text-rose-600 font-semibold">{errors.name}</p>}
        </div>

        {/* Student Phone */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-brand-600" />
            رقم هاتف الطالب (واتساب) <span className="text-rose-500">*</span>
          </label>
          <input
            type="tel"
            placeholder="مثال: 01012345678"
            dir="ltr"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className={`w-full px-3.5 py-2.5 text-sm text-right rounded-xl border ${
              errors.phone ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
            } focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition`}
          />
          {errors.phone && <p className="text-[11px] text-rose-600 font-semibold">{errors.phone}</p>}
        </div>

        {/* Parent Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-emerald-600" />
            اسم ولي الأمر (الوالد أو الوالدة) <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="مثال: محمد نجاح"
            value={formData.parentName}
            onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
            className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
              errors.parentName ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
            } focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition`}
          />
          {errors.parentName && <p className="text-[11px] text-rose-600 font-semibold">{errors.parentName}</p>}
        </div>

        {/* Parent Phone */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            رقم هاتف ولي الأمر (واتساب لاستلام الدرجات) <span className="text-rose-500">*</span>
          </label>
          <input
            type="tel"
            placeholder="مثال: 01198765432"
            dir="ltr"
            value={formData.parentPhone}
            onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
            className={`w-full px-3.5 py-2.5 text-sm text-right rounded-xl border ${
              errors.parentPhone ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
            } focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition`}
          />
          {errors.parentPhone && <p className="text-[11px] text-rose-600 font-semibold">{errors.parentPhone}</p>}
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-600" />
            العنوان / المنطقة السكنية <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="مثال: المنصورة - شارع الجمهورية"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
              errors.address ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
            } focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition`}
          />
          {errors.address && <p className="text-[11px] text-rose-600 font-semibold">{errors.address}</p>}
        </div>

        {/* Group Selection */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-600" />
            اختر موعد المجموعة المناسب لك <span className="text-rose-500">*</span>
          </label>
          <select
            value={formData.groupId}
            onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition"
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
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-black text-sm shadow-md shadow-emerald-600/20 active:scale-[0.99] transition mt-4"
        >
          تأكيد وإرسال طلب التسجيل 🚀
        </button>

        <p className="text-[11px] text-slate-400 text-center">
          ملاحظة: سيتم توليد وتفعيل كارت الباركود الخاص بك فور مراجعة المس للطلب.
        </p>
      </form>
    </div>
  );
}
