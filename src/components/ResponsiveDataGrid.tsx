'use client';

import React from 'react';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  className?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

interface ResponsiveDataGridProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string;
  emptyStateText?: string;
  renderMobileCard?: (row: T, index: number) => React.ReactNode;
}

export default function ResponsiveDataGrid<T>({
  data,
  columns,
  keyExtractor,
  emptyStateText = 'لا توجد بيانات مسجلة حالياً',
  renderMobileCard,
}: ResponsiveDataGridProps<T>) {
  if (data.length === 0) {
    return (
      <div className="p-8 rounded-3xl liquid-glass text-center text-xs font-bold text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800">
        {emptyStateText}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Desktop / Tablet Table View (Sticky Header with High Contrast) */}
      <div className={`${renderMobileCard ? 'hidden md:block' : 'block'} rounded-3xl overflow-hidden liquid-glass border border-slate-200/80 dark:border-slate-800 shadow-sm`}>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 font-black border-b border-slate-200/80 dark:border-slate-700/80">
              <tr>
                {columns.map((col, i) => (
                  <th key={i} className={`p-3.5 ${col.className || ''}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-800 dark:text-slate-200">
              {data.map((row, index) => (
                <tr key={keyExtractor(row)} className="hover:bg-white/60 dark:hover:bg-slate-800/40 transition">
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className={`p-3.5 ${col.className || ''}`}>
                      {col.render ? col.render(row, index) : col.accessorKey ? String(row[col.accessorKey] ?? '') : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card Grid (Rendered automatically if renderMobileCard provided) */}
      {renderMobileCard && (
        <div className="grid grid-cols-1 gap-3 md:hidden">
          {data.map((row, index) => (
            <div
              key={keyExtractor(row)}
              className="p-4 rounded-2xl liquid-glass border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2"
            >
              {renderMobileCard(row, index)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
