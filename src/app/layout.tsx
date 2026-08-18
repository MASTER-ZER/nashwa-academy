import type { Metadata, Viewport } from "next";
import "./globals.css";
import Link from "next/link";
import { Sparkles, GraduationCap, FileSpreadsheet, Lock } from "lucide-react";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import MobileBottomNav from "@/components/MobileBottomNav";
import AppHeader from "@/components/AppHeader";
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

          {/* Unified Dynamic App Header */}
          <AppHeader />

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
