import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import MobileBottomNav from "@/components/MobileBottomNav";
import AppHeader from "@/components/AppHeader";
import { ThemeProvider } from "@/context/ThemeContext";

export const metadata: Metadata = {
  title: "أكاديمية مس نشوى | العلوم المتكاملة - أولى ثانوي",
  description: "المنصة الرقمية الأولى المعتمدة لمادة العلوم المتكاملة للصف الأول الثانوي لمس نشوى",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/logo.png", sizes: "any" },
      { url: "/icon.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/logo.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "أكاديمية مس نشوى",
  },
};

export const viewport: Viewport = {
  themeColor: "#030712",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="shortcut icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/logo.png" />
        <meta name="apple-mobile-web-app-title" content="أكاديمية مس نشوى" />
        <meta name="application-name" content="أكاديمية مس نشوى" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased selection:bg-cyan-500 selection:text-white transition-colors duration-300 relative overflow-x-hidden">
        <ThemeProvider>
          {/* Ambient Background Aura Lights (Active in Dark Mode) */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 dark:block hidden">
            <div className="absolute -top-40 right-10 w-[450px] h-[450px] bg-cyan-500/10 rounded-full blur-[100px] animate-pulse-slow" />
            <div className="absolute top-1/3 -left-40 w-[550px] h-[550px] bg-brand-600/10 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
          </div>

          {/* Unified Dynamic App Header */}
          <AppHeader />

          {/* Main App Content Container */}
          <main className="flex-1 max-w-[1280px] w-full mx-auto px-3.5 sm:px-6 py-4 pb-20 md:pb-8">
            {children}
          </main>

          {/* PWA Install Notification */}
          <PWAInstallBanner />

          {/* Mobile Bottom Navigation Capsule */}
          <MobileBottomNav />

          {/* Public Footer */}
          <footer className="mt-auto border-t border-slate-200/60 dark:border-slate-800/60 py-4 text-center text-xs text-slate-500 dark:text-slate-400 no-print pb-20 md:pb-4">
            <div className="max-w-[1280px] mx-auto px-4 flex items-center justify-center text-center">
              <p className="font-semibold">
                جميع الحقوق محفوظة © {new Date().getFullYear()} لأكاديمية مس نشوى - العلوم المتكاملة
              </p>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
