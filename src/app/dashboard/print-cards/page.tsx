'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/storage';
import { Student, Group, SystemData } from '@/types';
import { Printer, Sparkles, Filter, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

function BarcodeItem({ student, groupName }: { student: Student; groupName: string }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    QRCode.toDataURL(student.code, {
      width: 140,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    }).then((url) => setQrUrl(url)).catch(() => {});

    if (svgRef.current) {
      try {
        JsBarcode(svgRef.current, student.code, {
          format: 'CODE128',
          lineColor: '#0f172a',
          width: 1.8,
          height: 40,
          displayValue: false,
        });
      } catch (err) {
        console.error('Barcode error', err);
      }
    }
  }, [student.code]);

  return (
    <div className="border-2 border-dashed border-slate-300 rounded-2xl p-3.5 bg-white text-slate-900 flex flex-col justify-between h-72 shadow-xs relative overflow-hidden">
      {/* Card Header */}
      <div className="flex items-start justify-between border-b border-slate-200 pb-1.5">
        <div>
          <h3 className="text-xs font-black text-brand-700">أكاديمية مس نشوى</h3>
          <p className="text-[9px] text-slate-500 font-bold">علوم متكاملة • أولى ثانوي</p>
        </div>
        <span className="text-xs font-black text-brand-600 font-mono bg-brand-50 px-2 py-0.5 rounded">
          #{student.code}
        </span>
      </div>

      {/* Student Details */}
      <div className="space-y-0.5 my-1 text-right">
        <p className="text-xs font-black text-slate-900 leading-tight">{student.name}</p>
        <p className="text-[9px] text-slate-600 font-semibold">{groupName}</p>
        <p className="text-[8px] text-slate-400 font-mono">ولي الأمر: {student.parentPhone}</p>
      </div>

      {/* Barcode & QR Code Graphic */}
      <div className="bg-slate-50 rounded-xl p-2 flex items-center justify-between border border-slate-100 gap-2">
        {qrUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrUrl} alt="QR" className="w-16 h-16 rounded shadow-xs" />
        )}
        <div className="flex-1 text-center">
          <svg ref={svgRef} className="max-w-full mx-auto" />
          <span className="text-[10px] font-mono font-bold text-slate-700 block">#{student.code}</span>
        </div>
      </div>

      {/* Footer stamp line */}
      <div className="text-[8px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
        <span>كارت حضور رسمي</span>
        <span>سنة {new Date().getFullYear()}</span>
      </div>
    </div>
  );
}

export default function PrintCardsPage() {
  const [data, setData] = useState<SystemData | null>(null);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('ALL');

  useEffect(() => {
    setData(db.getData());
  }, []);

  if (!data) return null;

  const activeStudents = data.students.filter((s) => s.status === 'ACTIVE');
  const filteredStudents = activeStudents.filter((s) => {
    if (selectedGroupFilter === 'ALL') return true;
    return s.groupId === selectedGroupFilter;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 py-2">
      {/* Header (Hidden on Print) */}
      <div className="no-print bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Printer className="w-6 h-6 text-brand-600" />
            توليد وطباعة كروت الطلاب (PDF)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            تصدير شيت كروت باركود جاهزة للطباعة على ورق A4 والقص للطلاب الذين ليس معهم هواتف
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedGroupFilter}
            onChange={(e) => setSelectedGroupFilter(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 focus:border-brand-500 focus:outline-none"
          >
            <option value="ALL">جميع المجموعات ({activeStudents.length} كارت)</option>
            {data.groups.map((grp) => (
              <option key={grp.id} value={grp.id}>
                {grp.name} ({activeStudents.filter((s) => s.groupId === grp.id).length})
              </option>
            ))}
          </select>

          <button
            onClick={handlePrint}
            className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 shrink-0"
          >
            <Printer className="w-4 h-4" />
            طباعة الكروت الآن 🖨️
          </button>
        </div>
      </div>

      {/* Cards Grid (Optimized for A4 Print: 2 columns, 4 rows = 8 cards per page) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-2 print:gap-3">
        {filteredStudents.map((std) => {
          const grp = data.groups.find((g) => g.id === std.groupId);
          return (
            <BarcodeItem
              key={std.id}
              student={std}
              groupName={grp ? grp.name : 'العلوم المتكاملة'}
            />
          );
        })}
      </div>
    </div>
  );
}
