# 🌸 منصة أكاديمية مس نشوى - مادة العلوم المتكاملة (الصف الأول الثانوي)

منصة سحابية متكاملة لإدارة حضور الطلاب عبر مسح الباركود و QR، متابعة الاشتراكات الشهرية، رصد درجات الامتحانات، إرسال تقارير واتساب وتليجرام التلقائية، وطباعة كروت الهوية الرقمية.

---

## 🚀 المواصفات التقنية
- **إطار العمل**: Next.js 14 (App Router) + TypeScript + Tailwind CSS (Apple-Grade Liquid Glass).
- **قاعدة البيانات**: Supabase PostgreSQL السحابية مع مزامنة لحظية و IndexedDB Offline Queue.
- **قارئ الباركود**: `html5-qrcode` مع دعم الفلاش والكاميرا الأمامية/الخلفية وقارئ الليزر USB.
- **التنبيهات الصوتية**: Web Audio API لتوليد مؤثرات صوتية لحظية دون ملفات وسائط ثقيلة.
- **تطبيق تقدمي (PWA)**: يدعم التثبيت المباشر على شاشة الهاتف الرئيسية والعمل في وضع عدم الاتصال (`public/sw.js`).
- **حماية رمز المرور**: `PIN 2026` المتزامن من جدول `system_settings`.

---

## 🔐 متغيرات البيئة (`.env.local`)
قم بإنشاء ملف `.env.local` في مسار المشروع وضع المتغيرات التالية:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
DATABASE_URL=postgresql://postgres.your-project:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_ADMIN_CHAT_ID=your-telegram-chat-id
TELEGRAM_WEBHOOK_SECRET=your-telegram-webhook-secret-token
```

---

## 📦 خطوات التشغيل والتثبيت

### 1. تثبيت الحزم
```bash
npm install
```

### 2. إعداد قاعدة بيانات Supabase
قم بتشغيل محتوى الملف `supabase/schema.sql` في محرر SQL في لوحة تحكم Supabase لتجهيز الجداول وسياسات الأمان والتسلسلات الذرية:
- جدول `students` (أكواد ذرية متتالية تبدأ من 101).
- جدول `groups` (المجموعات والمواعيد المستقلة لكل يوم).
- جدول `system_settings` (اسم المعلمة، السعر 250 جنيه، رمز المرور).
- جدول `attendance` و `sessions` و `subscriptions` و `exams` و `exam_results`.

### 3. تشغيل وضع التطوير
```bash
npm run dev
```

### 4. بناء نسخة الإنتاج
```bash
npm run build
npm start
```

---

## 📱 روابط المنصة الأساسية
- **بوابة المعلمة ولوحة التحكم**: `/dashboard` (رمز المرور الافتراضي: `2026`).
- **كشك مسح الحضور بالكاميرا**: `/dashboard/scanner` (محسن للشاشات والموبايل).
- **طباعة كروت الطلاب**: `/dashboard/print-cards` (مقاس A4 مع فواصل صفحات ذكية).
- **بوابة الطالب وكارت الـ 3D**: `/student` (تسجيل الدخول بالاسم والكود).
- **استمارة تسجيل الطلاب الجدد**: `/register`.

---

## 🛡️ بوابات الجودة والأمان المحققة
- ✅ **صفر توكنات هاردكود**: تم فحص المشروع والتأكد من خلوه تماماً من أي أسرار مكشوفة.
- ✅ **سياسات RLS مشددة**: إغلاق كل ثغرات `USING (true)` وحصر الصلاحيات حسب الدور.
- ✅ **تسلسل ذري (Atomic Sequence)**: استحالة تكرار أو تصادم كود الطالب عند التسجيل المتزامن.
- ✅ **التحقق من صحة النسخ الاحتياطي عبر Zod**: استيراد وتصدير JSON آمن ومفحوص.
- ✅ **تصميم Apple-Grade**: متجاوب بالكامل مع كافة الشاشات والموبايل ابتداءً من 320px.

---

🔗 **الرابط المباشر للإنتاج**: [https://nashwa-academy.vercel.app](https://nashwa-academy.vercel.app)
