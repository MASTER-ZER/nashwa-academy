'use client';

import { useState, useEffect } from 'react';
import { db, getAcademicMonthsList, getCurrentMonthLabel } from '@/lib/storage';
import { generateSubscriptionReminderWhatsAppUrl } from '@/lib/whatsapp';
import { sound } from '@/lib/audio';
import { Student, Group, Subscription, SystemData } from '@/types';
import { 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Search, 
  Filter,
  Download,
  MessageSquare,
  Users,
  Send,
  Printer,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SubscriptionsDashboardPage() {
  const [data, setData] = useState<SystemData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthLabel());
  const [selectedGroupId, setSelectedGroupId] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [notifiedParentIds, setNotifiedParentIds] = useState<Set<string>>(new Set());

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

  const subPrice = data.settings?.subscriptionPrice || 250;
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
      amount: sub?.amount || subPrice,
    };
  });

  const filteredList = studentsWithSub.filter(({ student, isPaid }) => {
    if (selectedGroupId !== 'ALL' && student.groupId !== selectedGroupId) return false;
    if (statusFilter === 'PAID' && !isPaid) return false;
    if (statusFilter === 'UNPAID' && isPaid) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return (
        student.name.toLowerCase().includes(q) ||
        student.code.includes(q) ||
        student.phone.includes(q) ||
        student.parentPhone.includes(q)
      );
    }
    return true;
  });

  const groupFilteredStudents = selectedGroupId === 'ALL'
    ? studentsWithSub
    : studentsWithSub.filter((s) => s.student.groupId === selectedGroupId);

  const paidCount = groupFilteredStudents.filter((s) => s.isPaid).length;
  const unpaidCount = groupFilteredStudents.filter((s) => !s.isPaid).length;
  const totalCollected = paidCount * subPrice;

  const handleTogglePaid = (studentId: string) => {
    const isNowPaid = db.toggleSubscription(studentId, selectedMonth, 'مس نشوى');
    if (isNowPaid) {
      sound.playSuccessChime();
      try {
        confetti({ particleCount: 35, spread: 55 });
      } catch {}
    }
    loadData();
  };

  const handleSendReminder = (student: Student, amount: number) => {
    const url = generateSubscriptionReminderWhatsAppUrl({
      parentPhone: student.parentPhone,
      parentName: student.parentName,
      studentName: student.name,
      month: selectedMonth,
      amount: amount || subPrice,
    });
    setNotifiedParentIds((prev) => new Set(prev).add(student.id));
    window.open(url, '_blank');
  };

  // Export Subscriptions CSV with Arabic BOM
  const handleExportCSV = () => {
    let csvContent = '\uFEFF';
    csvContent += 'كود الطالب,اسم الطالب,رقم هاتف الطالب,اسم ولي الأمر,رقم ولي الأمر,المجموعة,الشهر,قيمة الاشتراك,حالة السداد,تاريخ السداد\n';

    filteredList.forEach(({ student, isPaid, paidAt, amount }) => {
      const grp = data.groups.find((g) => g.id === student.groupId);
      const paidDate = paidAt ? new Date(paidAt).toLocaleDateString('ar-EG') : '—';
      csvContent += `"${student.code}","${student.name}","${student.phone}","${student.parentName}","${student.parentPhone}","${grp?.name || '—'}","${selectedMonth}","${amount}","${isPaid ? 'مسدد' : 'غير مسدد'}","${paidDate}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `كشف_اشتراكات_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 py-2">
      {/* Header */}
      <div className="liquid-glass rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-brand-700 dark:text-emerald-400" />
            إدارة الاشتراكات الشهرية
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            متابعة تحصيل الاشتراكات وتسجيل سداد الكاش لشهر ({selectedMonth})
          </p>
        </div>

        {/* Dynamic Month Selector & Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none"
          >
            {getAcademicMonthsList().map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
            title="تصدير كملف Excel"
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">تصدير Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="liquid-glass rounded-2xl p-5">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block">إجمالي المحصل ({selectedMonth})</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">{totalCollected.toLocaleString()}</span>
            <span className="text-xs font-bold text-slate-400">جنيه مصري</span>
          </div>
        </div>

        <div className="liquid-glass rounded-2xl p-5 border-emerald-500/30">
          <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold block">الطلاب المسددين</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">{paidCount}</span>
            <span className="text-xs font-bold text-slate-400">طالب ({Math.round((paidCount / (groupFilteredStudents.length || 1)) * 100)}%)</span>
          </div>
        </div>

        <div className="liquid-glass rounded-2xl p-5 border-rose-500/30">
          <span className="text-xs text-rose-700 dark:text-rose-400 font-bold block">المتبقي عليهم اشتراك</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">{unpaidCount}</span>
            <span className="text-xs font-bold text-slate-400">طالب ({unpaidCount * subPrice} ج.م)</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="liquid-glass rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            placeholder="بحث باسم الطالب، الكود، أو رقم الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
          />
        </div>

        <select
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
          className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none sm:w-56"
        >
          <option value="ALL">جميع المجموعات ({activeStudents.length})</option>
          {data.groups.map((grp) => (
            <option key={grp.id} value={grp.id}>
              {grp.name} ({activeStudents.filter((s) => s.groupId === grp.id).length})
            </option>
          ))}
        </select>

        <div className="flex gap-1.5">
          {(['ALL', 'PAID', 'UNPAID'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition ${
                statusFilter === filter
                  ? 'bg-brand-700 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {filter === 'ALL' ? 'الكل' : filter === 'PAID' ? 'المسددين' : 'المتأخرين'}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block liquid-glass rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              <tr>
                <th className="p-4">الكود</th>
                <th className="p-4">اسم الطالب</th>
                <th className="p-4">المجموعة</th>
                <th className="p-4">قيمة الاشتراك</th>
                <th className="p-4">حالة السداد</th>
                <th className="p-4 text-center">إجراء السداد والكاش</th>
                <th className="p-4 text-center">تذكير الواتساب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredList.map(({ student, isPaid, paidAt, receivedBy, amount }) => {
                const grp = data.groups.find((g) => g.id === student.groupId);
                const isNotified = notifiedParentIds.has(student.id);
                return (
                  <tr key={student.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                    <td className="p-4 font-mono font-black text-brand-700 dark:text-emerald-400">#{student.code}</td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white">{student.name}</td>
                    <td className="p-4 text-slate-500 dark:text-slate-400">{grp ? grp.name : '—'}</td>
                    <td className="p-4 font-mono font-bold">{amount} ج.م</td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {isPaid ? 'مسدد ✅' : 'مستحق الدفع ⏳'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleTogglePaid(student.id)}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-xs transition active:scale-95 flex items-center gap-1 mx-auto ${
                          isPaid
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>{isPaid ? 'إلغاء السداد' : `استلام ${amount} ج.م كاش`}</span>
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      {!isPaid ? (
                        <button
                          onClick={() => handleSendReminder(student, amount)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1 mx-auto ${
                            isNotified
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          }`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{isNotified ? 'تم الإرسال ✓' : 'تذكير واتساب 📲'}</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Touch Cards View */}
      <div className="md:hidden space-y-3">
        {filteredList.map(({ student, isPaid, paidAt, receivedBy, amount }) => {
          const grp = data.groups.find((g) => g.id === student.groupId);
          const isNotified = notifiedParentIds.has(student.id);
          return (
            <div
              key={student.id}
              className="p-4 rounded-2xl liquid-glass space-y-3 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-emerald-400 font-mono font-black text-xs flex items-center justify-center">
                    #{student.code}
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs">{student.name}</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{grp ? grp.name : '—'}</p>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isPaid
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                >
                  {isPaid ? 'مسدد ✅' : `${amount} ج.م مستحق`}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <button
                  onClick={() => handleTogglePaid(student.id)}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs shadow-xs transition active:scale-95 flex items-center justify-center gap-1 ${
                    isPaid
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>{isPaid ? 'إلغاء السداد' : `استلام ${amount} ج.م`}</span>
                </button>

                {!isPaid && (
                  <button
                    onClick={() => handleSendReminder(student, amount)}
                    className="px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold transition flex items-center gap-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{isNotified ? 'تم' : 'واتساب'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
