import type { Metadata, Viewport } from "next";
import "./globals.css";
import Link from "next/link";
import { Sparkles, GraduationCap, FileSpreadsheet, Lock } from "lucide-react";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import MobileBottomNav from "@/components/MobileBottomNav";
import ThemeToggle from "@/components/ThemeToggle";
import { ThemeProvider } from "@/context/ThemeContext";

export const metadata: Metadata = {
  title: "أكاديمية مس نشوى | العلوم المتكاملة - أولى ثانوي",
  description: "المنصة الرقمية الأولى المعتمدة لمادة العلوم المتكاملة للصف الأول الثانوي لمس نشوى",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#030712",
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
      <body className="min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased selection:bg-cyan-500 selection:text-white transition-colors duration-300 relative overflow-x-hidden">
        <ThemeProvider>
          {/* Ambient Background Aura Lights (Active in Dark Mode) */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 dark:block hidden">
            <div className="absolute -top-40 right-10 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse-slow" />
            <div className="absolute top-1/3 -left-40 w-[600px] h-[600px] bg-brand-600/10 rounded-full blur-[140px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
          </div>

          {/* Unified Liquid Glass Header */}
          <header className="sticky top-0 z-40 px-2 sm:px-6 py-2.5 sm:py-3 no-print">
            <div className="max-w-7xl mx-auto h-14 sm:h-16 rounded-2xl liquid-glass px-3 sm:px-6 flex items-center justify-between gap-2 border border-white/40 dark:border-cyan-500/20">
              {/* Logo & Brand (Responsive) */}
              <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group active:scale-95 transition-transform shrink-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl overflow-hidden shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform shrink-0 border border-white/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.png" alt="مس نشوى" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs sm:text-base font-black text-slate-900 dark:text-white leading-tight tracking-tight whitespace-nowrap">
                    أكاديمية مس نشوى
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-brand-600 dark:text-cyan-400 font-bold leading-none mt-0.5">
                    العلوم المتكاملة
                  </span>
                </div>
              </Link>

              {/* Navigation Actions */}
              <nav className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  href="/register"
                  className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-brand-600 dark:hover:text-cyan-400 hover:bg-white/60 dark:hover:bg-slate-800/60 rounded-xl transition"
                >
                  <FileSpreadsheet className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  استمارة التقديم
                </Link>

                <Link
                  href="/student"
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-black bg-gradient-to-r from-brand-600 to-cyan-500 hover:from-brand-500 hover:to-cyan-400 text-white rounded-xl shadow-md shadow-brand-600/25 active:scale-95 transition whitespace-nowrap"
                >
                  <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-100" />
                  <span>كارت الطالب</span>
                </Link>

                {/* Dark / Light Mode Toggle */}
                <ThemeToggle />
              </nav>
            </div>
          </header>

          {/* Main App Content */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 pb-24 md:pb-8">
            {children}
          </main>

          {/* PWA Install Notification */}
          <PWAInstallBanner />

          {/* Mobile Bottom Navigation Capsule */}
          <MobileBottomNav />

          {/* Discreet Admin Link in Footer */}
          <footer className="mt-auto border-t border-slate-200/60 dark:border-slate-800/60 py-5 text-center text-xs text-slate-500 dark:text-slate-400 no-print pb-24 md:pb-5">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-[11px]">جميع الحقوق محفوظة © {new Date().getFullYear()} • منصة مس نشوى للعلوم المتكاملة</p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-400 transition font-semibold"
              >
                <Lock className="w-3 h-3" />
                <span>دخول المعلمة والإدارة 🔒</span>
              </Link>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
