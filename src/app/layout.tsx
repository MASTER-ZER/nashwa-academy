import type { Metadata, Viewport } from "next";
import "./globals.css";
import Link from "next/link";
import { Sparkles, QrCode, ShieldCheck, GraduationCap, FileSpreadsheet } from "lucide-react";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import MobileBottomNav from "@/components/MobileBottomNav";
import ThemeToggle from "@/components/ThemeToggle";
import { ThemeProvider } from "@/context/ThemeContext";

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
      <body className="min-h-screen bg-slate-50 dark:bg-[#070D1B] text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased selection:bg-brand-500 selection:text-white transition-colors duration-200">
        <ThemeProvider>
          {/* Navigation Header */}
          <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800/80 shadow-xs no-print">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              {/* Logo & Brand */}
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 text-white flex items-center justify-center shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">منصة مس نشوى</h1>
                  <p className="text-xs text-brand-600 dark:text-cyan-400 font-semibold">علوم متكاملة • أولى ثانوي</p>
                </div>
              </Link>

              {/* Quick Links & Theme Toggle */}
              <nav className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  href="/register"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-brand-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  استمارة التقديم
                </Link>
                <Link
                  href="/student"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-brand-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  <GraduationCap className="w-4 h-4 text-brand-600 dark:text-cyan-400" />
                  بوابة الطالب
                </Link>
                <Link
                  href="/dashboard/scanner"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/60 rounded-lg transition"
                >
                  <QrCode className="w-4 h-4" />
                  <span className="hidden sm:inline">كشك</span> السكانر
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-sm rounded-lg transition"
                >
                  <ShieldCheck className="w-4 h-4" />
                  لوحة التحكم
                </Link>

                {/* Dark / Light Mode Toggle */}
                <ThemeToggle />
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
          <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400 no-print pb-24 md:pb-6">
            <p>جميع الحقوق محفوظة © {new Date().getFullYear()} لمنصة مس نشوى لمادة العلوم المتكاملة</p>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
