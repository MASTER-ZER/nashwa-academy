import type { Metadata, Viewport } from "next";
import "./globals.css";
import Link from "next/link";
import { Sparkles, QrCode, UserCheck, ShieldCheck, GraduationCap, FileSpreadsheet } from "lucide-react";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import MobileBottomNav from "@/components/MobileBottomNav";

export const metadata: Metadata = {
  title: "منصة مس نشوى | العلوم المتكاملة",
  description: "المنصة الرسمية لإدارة دروس مادة العلوم المتكاملة - الصف الأول الثانوي لمس نشوى",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-brand-500 selection:text-white">
        {/* Navigation Header */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm no-print">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Logo & Brand */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 text-white flex items-center justify-center shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">منصة مس نشوى</h1>
                <p className="text-xs text-brand-600 font-semibold">علوم متكاملة • أولى ثانوي</p>
              </div>
            </Link>

            {/* Quick Links */}
            <nav className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/register"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                استمارة التقديم
              </Link>
              <Link
                href="/student"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition"
              >
                <GraduationCap className="w-4 h-4 text-brand-600" />
                بوابة الطالب
              </Link>
              <Link
                href="/dashboard/scanner"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
              >
                <QrCode className="w-4 h-4" />
                <span className="hidden sm:inline">كشك</span> السكانر
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-brand-600 text-white hover:bg-brand-700 shadow-sm rounded-lg transition"
              >
                <ShieldCheck className="w-4 h-4" />
                لوحة التحكم
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 pb-24 md:pb-8">
          {children}
        </main>

        {/* PWA Install Notification */}
        <PWAInstallBanner />

        {/* Mobile App Bottom Bar */}
        <MobileBottomNav />

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 no-print pb-24 md:pb-6">
          <p>جميع الحقوق محفوظة © {new Date().getFullYear()} لمنصة مس نشوى لمادة العلوم المتكاملة</p>
        </footer>
      </body>
    </html>
  );
}
