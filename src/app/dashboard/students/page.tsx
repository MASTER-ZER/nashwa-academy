'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/storage';
import { Student, Group, SystemData } from '@/types';
import { Users, Search, Phone, MapPin, Edit3, Trash2, CheckCircle2, QrCode, Clock, UserPlus, X, Check } from 'lucide-react';
import Link from 'next/link';

export default function StudentsDirectoryPage() {
  const [data, setData] = useState<SystemData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('ALL');

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStudentData, setNewStudentData] = useState({
    name: '',
    phone: '',
    parentName: '',
    parentPhone: '',
    address: '',
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

  const handleUpdateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudent) {
      db.updateStudent(editingStudent.id, editingStudent);
      setEditingStudent(null);
      loadData();
    }
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentData.name.trim() || !newStudentData.phone.trim()) {
      alert('يرجى كتابة اسم الطالب ورقم الهاتف على الأقل');
      return;
    }

    const std = db.registerStudent({
      name: newStudentData.name.trim(),
      phone: newStudentData.phone.trim(),
      parentName: newStudentData.parentName.trim() || 'ولي الأمر',
      parentPhone: newStudentData.parentPhone.trim() || newStudentData.phone.trim(),
      address: newStudentData.address.trim() || 'المنصورة',
      academicYear: 'FIRST_SEC',
      groupId: newStudentData.groupId || (data.groups[0]?.id || 'grp-1'),
    });

    // Auto approve
    db.approveStudent(std.id);

    setIsAddModalOpen(false);
    setNewStudentData({ name: '', phone: '', parentName: '', parentPhone: '', address: '', groupId: '' });
    loadData();
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف الطالب (${name}) نهائياً؟`)) {
      db.rejectStudent(id);
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
            عرض وتعديل بيانات طلاب الصف الأول الثانوي ونقل المجموعات
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
        </div>
      </div>

      {/* Filters & Search */}
      <div className="liquid-glass rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            placeholder="بحث باسم الطالب، الكود، أو رقم الهاتف..."
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

      {/* Desktop Table View (Hidden on mobile) */}
      <div className="hidden md:block liquid-glass rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              <tr>
                <th className="p-4">الكود</th>
                <th className="p-4">اسم الطالب</th>
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
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">
                    لا يوجد طلاب مطابقين للبحث
                  </td>
                </tr>
              ) : (
                filteredStudents.map((std) => {
                  const grp = data.groups.find((g) => g.id === std.groupId);
                  return (
                    <tr key={std.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      <td className="p-4 font-mono font-black text-brand-700 dark:text-cyan-400">#{std.code}</td>
                      <td className="p-4 font-bold text-slate-900 dark:text-white">{std.name}</td>
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

      {/* Mobile Student Cards View (Shown only on phones) */}
      <div className="md:hidden space-y-3">
        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-slate-400 liquid-glass rounded-2xl">لا يوجد طلاب مطابقين للبحث</div>
        ) : (
          filteredStudents.map((std) => {
            const grp = data.groups.find((g) => g.id === std.groupId);
            return (
              <div
                key={std.id}
                className="p-4 rounded-2xl liquid-glass space-y-2.5 shadow-xs"
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

                <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5 border-t border-slate-100 dark:border-slate-800 pt-2">
                  <div className="flex justify-between">
                    <span>هاتف الطالب:</span>
                    <span className="font-mono text-slate-900 dark:text-white" dir="ltr">{std.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ولي الأمر ({std.parentName}):</span>
                    <span className="font-mono text-slate-900 dark:text-white" dir="ltr">{std.parentPhone}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setEditingStudent(std)}
                    className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    تعديل
                  </button>
                  <button
                    onClick={() => handleDelete(std.id, std.name)}
                    className="px-3 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    حذف
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                إضافة طالب جديد واعتماده فورياً
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">اسم الطالب بالكامل *</label>
                <input
                  type="text"
                  placeholder="مثال: محمد أحمد علي"
                  value={newStudentData.name}
                  onChange={(e) => setNewStudentData({ ...newStudentData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">هاتف الطالب *</label>
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
                  placeholder="مثال: أحمد علي"
                  value={newStudentData.parentName}
                  onChange={(e) => setNewStudentData({ ...newStudentData, parentName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">تعديل بيانات الطالب #{editingStudent.code}</h2>

            <form onSubmit={handleUpdateStudent} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">اسم الطالب</label>
                <input
                  type="text"
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>

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
                <label className="font-bold text-slate-700 dark:text-slate-300">اسم ولي الأمر</label>
                <input
                  type="text"
                  value={editingStudent.parentName}
                  onChange={(e) => setEditingStudent({ ...editingStudent, parentName: e.target.value })}
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
