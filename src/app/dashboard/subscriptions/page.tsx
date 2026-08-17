'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/storage';
import { sound } from '@/lib/audio';
import { Student, Group, Subscription, SystemData } from '@/types';
import { CreditCard, CheckCircle2, AlertCircle, DollarSign, Search, Filter } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SubscriptionsDashboardPage() {
  const [data, setData] = useState<SystemData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('أكتوبر 2026');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = () => {
    setData(db.getData());
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(loadData);
    return unsub;
  }, []);

  if (!data) return null;

  const activeStudents = data.students.filter((s) => s.status === 'ACTIVE');

  // Subscriptions for active month
  const subscriptionsMap = new Map<string, Subscription>();
  data.subscriptions
    .filter((s) => s.month === selectedMonth)
    .forEach((s) => subscriptionsMap.set(s.studentId, s));

  const studentsWithSub = activeStudents.map((std) => {
    const sub = subscriptionsMap.get(std.id);
    return {
      student: std,
      isPaid: sub ? sub.isPaid : false,
      paidAt: sub?.paidAt,
      receivedBy: sub?.receivedBy,
      amount: sub?.amount || 150,
    };
  });

  const paidCount = studentsWithSub.filter((s) => s.isPaid).length;
  const unpaidCount = studentsWithSub.filter((s) => !s.isPaid).length;
  const totalCollected = paidCount * 150;

  const filteredList = studentsWithSub.filter(({ student, isPaid }) => {
    if (statusFilter === 'PAID' && !isPaid) return false;
    if (statusFilter === 'UNPAID' && isPaid) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return (
        student.name.toLowerCase().includes(q) ||
        student.code.includes(q) ||
        student.phone.includes(q)
      );
    }
    return true;
  });

  const handleTogglePaid = (studentId: string) => {
    const isNowPaid = db.toggleSubscription(studentId, selectedMonth, 'مس نشوى');
    if (isNowPaid) {
      sound.playSuccessChime();
      try {
        confetti({ particleCount: 30, spread: 50 });
      } catch {}
    }
    loadData();
  };

  return (
    <div className="space-y-6 py-2">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-brand-600" />
            إدارة الاشتراكات الشهرية
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            متابعة تحصيل الاشتراكات وتسجيل سداد الكاش لشهر ({selectedMonth})
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-bold text-slate-600">الشهر:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 focus:border-brand-500 focus:outline-none"
          >
            <option value="أغسطس 2026">أغسطس 2026</option>
            <option value="سبتمبر 2026">سبتمبر 2026</option>
            <option value="أكتوبر 2026">أكتوبر 2026</option>
            <option value="نوفمبر 2026">نوفمبر 2026</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-500">إجمالي المبلغ المحصل</span>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600">{totalCollected} ج.م</p>
          <p className="text-[11px] text-slate-400">سعر الاشتراك: 150 ج.م / طالب</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-emerald-800">الطلاب المسددين</span>
          <p className="text-2xl sm:text-3xl font-black text-emerald-700">{paidCount}</p>
          <p className="text-[11px] text-emerald-600">من إجمالي {activeStudents.length} طالب</p>
        </div>

        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-rose-800">الطلاب المتبقي عليهم السداد</span>
          <p className="text-2xl sm:text-3xl font-black text-rose-700">{unpaidCount}</p>
          <p className="text-[11px] text-rose-600">مستحق التحصيل</p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-bold w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition ${
              statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            الكل ({activeStudents.length})
          </button>
          <button
            onClick={() => setStatusFilter('PAID')}
            className={`px-3 py-1.5 rounded-lg transition ${
              statusFilter === 'PAID' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            المسددين ({paidCount})
          </button>
          <button
            onClick={() => setStatusFilter('UNPAID')}
            className={`px-3 py-1.5 rounded-lg transition ${
              statusFilter === 'UNPAID' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            غير المسددين ({unpaidCount})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="بحث باسم الطالب أو الكود..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="p-4">الكود</th>
                <th className="p-4">اسم الطالب</th>
                <th className="p-4">المجموعة</th>
                <th className="p-4">المبلغ</th>
                <th className="p-4">حالة السداد</th>
                <th className="p-4">المستلم / التاريخ</th>
                <th className="p-4 text-center">إجراء السداد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">
                    لا توجد بيانات مطابقة
                  </td>
                </tr>
              ) : (
                filteredList.map(({ student, isPaid, paidAt, receivedBy, amount }) => {
                  const grp = data.groups.find((g) => g.id === student.groupId);
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4 font-mono font-black text-brand-700">#{student.code}</td>
                      <td className="p-4 font-bold text-slate-900">{student.name}</td>
                      <td className="p-4 text-slate-600">{grp ? grp.name : '—'}</td>
                      <td className="p-4 font-bold">{amount} ج.م</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isPaid ? 'تم السداد ✅' : 'مستحق السداد ⚠️'}
                        </span>
                      </td>
                      <td className="p-4 text-[11px] text-slate-500">
                        {isPaid && paidAt ? (
                          <>
                            <span>{new Date(paidAt).toLocaleDateString('ar-EG')}</span>
                            {receivedBy && <span className="block text-[10px] text-slate-400">استلمها: {receivedBy}</span>}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleTogglePaid(student.id)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition ${
                            isPaid
                              ? 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                          }`}
                        >
                          {isPaid ? 'إلغاء السداد ❌' : 'استلام كاش 💵'}
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
    </div>
  );
}
