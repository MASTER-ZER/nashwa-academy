import type { Metadata, Viewport } from "next";
import "./globals.css";
import Link from "next/link";
import { Sparkles, GraduationCap, FileSpreadsheet, Lock } from "lucide-react";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import MobileBottomNav from "@/components/MobileBottomNav";
import ThemeToggle from "@/components/ThemeToggle";
import { ThemeProvider } from "@/context/ThemeContext";

export const metadata: Metadata = {
  title: "منصة مس نشوى | العلوم المتكاملة - أولى ثانوي",
  description: "المنصة الرسمية المعتمدة لمادة العلوم المتكاملة للصف الأول الثانوي لمس نشوى",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#007aff",
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
      <body className="min-h-screen bg-slate-50 dark:bg-[#060b17] text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased selection:bg-brand-500 selection:text-white transition-colors duration-200">
        <ThemeProvider>
          {/* Public iOS Liquid Glass Header */}
          <header className="sticky top-0 z-40 px-3 sm:px-6 py-3 no-print">
            <div className="max-w-7xl mx-auto h-16 rounded-2xl liquid-glass px-4 sm:px-6 flex items-center justify-between">
              {/* Logo & Brand */}
              <Link href="/" className="flex items-center gap-3 group active:scale-95 transition-transform">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-cyan-400 text-white flex items-center justify-center shadow-lg shadow-brand-500/25 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                    أكاديمية مس نشوى
                  </h1>
                  <p className="text-[11px] text-brand-600 dark:text-cyan-400 font-bold">علوم متكاملة • أولى ثانوي</p>
                </div>
              </Link>

              {/* Public Quick Links & Theme Toggle */}
              <nav className="flex items-center gap-2">
                <Link
                  href="/register"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-brand-600 dark:hover:text-cyan-400 hover:bg-white/60 dark:hover:bg-slate-800/60 rounded-xl transition"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  استمارة التقديم
                </Link>
                <Link
                  href="/student"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md shadow-brand-600/20 active:scale-95 transition"
                >
                  <GraduationCap className="w-4 h-4 text-cyan-200" />
                  بوابة الطالب
                </Link>

                {/* Dark / Light Mode Toggle */}
                <ThemeToggle />
              </nav>
            </div>
          </header>

          {/* Main App Content */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 pb-28 md:pb-10">
            {children}
          </main>

          {/* PWA 1-Click Install Notification */}
          <PWAInstallBanner />

          {/* Mobile Liquid Bottom Bar */}
          <MobileBottomNav />

          {/* Public Footer with Discreet Teacher Lock Link */}
          <footer className="mt-auto border-t border-slate-200/60 dark:border-slate-800/60 py-6 text-center text-xs text-slate-500 dark:text-slate-400 no-print pb-28 md:pb-6">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p>جميع الحقوق محفوظة © {new Date().getFullYear()} لمنصة مس نشوى لمادة العلوم المتكاملة</p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-brand-600 dark:hover:text-cyan-400 transition font-semibold"
              >
                <Lock className="w-3 h-3" />
                <span>دخول المعلمة والإدارة</span>
              </Link>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
