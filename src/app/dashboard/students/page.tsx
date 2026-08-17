'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/storage';
import { Student, Group, SystemData } from '@/types';
import { Users, Search, Phone, MapPin, Edit3, Trash2, CheckCircle2, QrCode, Clock } from 'lucide-react';
import Link from 'next/link';

export default function StudentsDirectoryPage() {
  const [data, setData] = useState<SystemData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('ALL');

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const loadData = () => {
    setData(db.getData());
  };

  useEffect(() => {
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

  const handleDelete = (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف الطالب (${name}) نهائياً؟`)) {
      db.rejectStudent(id);
      loadData();
    }
  };

  return (
    <div className="space-y-6 py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-600" />
            دليل وإدارة الطلاب ({data.students.length})
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            عرض وتعديل بيانات طلاب الصف الأول الثانوي ونقل المجموعات
          </p>
        </div>

        <Link
          href="/dashboard/print-cards"
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-2"
        >
          <QrCode className="w-4 h-4 text-cyan-300" />
          طباعة كروت الباركود PDF
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            placeholder="بحث باسم الطالب، الكود، أو رقم الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <select
          value={selectedGroupFilter}
          onChange={(e) => setSelectedGroupFilter(e.target.value)}
          className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 focus:border-brand-500 focus:outline-none sm:w-64"
        >
          <option value="ALL">جميع المجموعات ({data.students.length})</option>
          {data.groups.map((grp) => (
            <option key={grp.id} value={grp.id}>
              {grp.name} ({data.students.filter((s) => s.groupId === grp.id).length})
            </option>
          ))}
        </select>
      </div>

      {/* Students Table / Grid */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
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
            <tbody className="divide-y divide-slate-100 text-slate-700">
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
                    <tr key={std.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4 font-mono font-black text-brand-700">#{std.code}</td>
                      <td className="p-4 font-bold text-slate-900">{std.name}</td>
                      <td className="p-4 font-mono" dir="ltr">{std.phone}</td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-800">{std.parentName}</div>
                        <div className="text-[11px] text-slate-500 font-mono" dir="ltr">{std.parentPhone}</div>
                      </td>
                      <td className="p-4 font-semibold text-brand-800">
                        {grp ? grp.name : 'غير محدد'}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            std.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {std.status === 'ACTIVE' ? 'معتمد ✅' : 'معلق ⏳'}
                        </span>
                      </td>
                      <td className="p-4 text-center space-x-1 space-x-reverse">
                        <button
                          onClick={() => setEditingStudent(std)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-brand-50 text-slate-600 hover:text-brand-600 transition"
                          title="تعديل بيانات الطالب"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(std.id, std.name)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition"
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

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900">تعديل بيانات الطالب #{editingStudent.code}</h2>

            <form onSubmit={handleUpdateStudent} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">اسم الطالب</label>
                <input
                  type="text"
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">هاتف الطالب</label>
                <input
                  type="tel"
                  dir="ltr"
                  value={editingStudent.phone}
                  onChange={(e) => setEditingStudent({ ...editingStudent, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-brand-500 text-right"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">اسم ولي الأمر</label>
                <input
                  type="text"
                  value={editingStudent.parentName}
                  onChange={(e) => setEditingStudent({ ...editingStudent, parentName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">هاتف ولي الأمر</label>
                <input
                  type="tel"
                  dir="ltr"
                  value={editingStudent.parentPhone}
                  onChange={(e) => setEditingStudent({ ...editingStudent, parentPhone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-brand-500 text-right"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">المجموعة</label>
                <select
                  value={editingStudent.groupId}
                  onChange={(e) => setEditingStudent({ ...editingStudent, groupId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-brand-500 bg-white"
                >
                  {data.groups.map((grp) => (
                    <option key={grp.id} value={grp.id}>
                      {grp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold transition"
                >
                  حفظ التعديلات ✅
                </button>
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
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
