# 📚 الدليل الشامل والمخطط الهندسي الكامل لمنصة أكاديمية مس نشوى للعلوم المتكاملة
## (Full Architecture, Specification & Rebuild Guide from Scratch)

> **تم إعداد هذا التوثيق لتمكين أي مطور أو وكيل ذكاء اصطناعي (AI Agent) من إعادة بناء هذه المنصة الميدانية المتطورة بالكامل من الصفر بدقة 100% وبدون أي نقص.**

---

## 1. 🌟 نظرة عامة على المشروع (Project Vision)

**منصة أكاديمية مس نشوى (Nashwa Science Academy)** هي نظام سحابي هجين (Cloud-Hybrid Web Application) مخصص لإدارة سناتر الدروس الخصوصية ومجموعات مادة **العلوم المتكاملة (الصف الأول الثانوي)** في جمهورية مصر العربية.

المنصة مصممة للعمل الواقعي في الميدان (Real-world Hall Operations) بمزيج يجمع بين:
1. **كشك الحضور والمسح الذكي (Smart Kiosk Scanner)** المثبت على ستاند موبايل أو لابتوب السكرتيرة.
2. **بوابة الطالب التفاعلية وكارت Apple Wallet Pass الرقمي** المزود بكود QR فائق الحساسية Level-H وميزة حفظ الكارت كصورة HD في المعرض أو PDF.
3. **المزامنة اللحظية (Real-time Sync)** بين موبايل الكشك ولابتوب السكرتيرة بدون الحاجة لعمل ريفريش.
4. **نظام مالي واشتراكات ديناميكي** مع إرسال تذكيرات سداد مخصصة عبر واتساب لأولياء الأمور بنقرة واحدة.
5. **لوحة الامتحانات ولوحة الشرف التنافسية** ومولد رسائل النتائج لأولياء الأمور.
6. **إشعارات تليجرام فورية** بمجرد تسجيل أي طالب جديد عبر استمارة التقديم.

---

## 2. 🛠️ الحزمة التقنية (Tech Stack)

| التقنية | الاستخدام |
| :--- | :--- |
| **Next.js 14 (App Router)** | إطار العمل الأساسي للواجهات والـ Serverless API Routes |
| **TypeScript** | أمان الأنواع وكتابة كود خالي من الأخطاء |
| **Tailwind CSS** | بناء تصميم عصري Apple-Grade (Liquid Glassmorphism & Micro-animations) |
| **Supabase (PostgreSQL & Realtime)** | السيرفر السحابي وقناة البث اللحظي (Broadcast Events) |
| **LocalStorage + Supabase Fallback** | معمارية تخزين هجينة تضمن عمل الكشك حتى لو انقطع الإنترنت |
| **HTML5 Canvas 2D API** | توليد كارت الطالب بدقة 800x1120px بصيغة PNG وبدون أي مشاكل خطوط عربية |
| **html5-qrcode** | قارئ الكاميرا الذكي مع دعم QR Code و Barcode 128 و ITF و EAN-13 |
| **Hardware Laser Gun Engine** | التقاط مدخلات قارئ الباركود اللاسلكي / USB تلقائياً عبر مراقبة ضربات المفاتيح السريعة |
| **Web Audio API** | مؤثرات صوتية تفاعلية (رنين القبول الأخضر، إنذار التأخر الأحمر، صوت الكاش) |
| **Screen WakeLock API** | منع شاشة هاتف الكشك من الإغلاق أثناء الحصص الدراسية |
| **Telegram Bot Webhook** | إرسال إشعارات التقديم الجديدة لحظياً لهاتف المعلمة |

---

## 3. 📂 هيكل المجلدات والملفات (Directory Structure)

```text
nashwa-academy/
├── public/
│   ├── logo.png                       # شعار الأكاديمية (مس نشوى)
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── telegram/route.ts      # مسار استقبال وإرسال إشعارات التليجرام
│   │   ├── dashboard/                 # لوحة تحكم الإدارة (رمز الدخول الافتراضي: 2026)
│   │   │   ├── page.tsx               # الشاشة الرئيسية والإحصائيات الحية
│   │   │   ├── scanner/page.tsx       # كشك الحضور، الكاميرا، قارئ الليزر، ووضع الستاند
│   │   │   ├── attendance/page.tsx    # كشف الحضور، منتقي التاريخ، وواتساب الغائبين
│   │   │   ├── subscriptions/page.tsx # الاشتراكات الشهرية، الفلترة، وتذكير الواتساب
│   │   │   ├── exams/page.tsx         # نتائج الامتحانات، لوحة الشرف، وتوليد الشهادات
│   │   │   ├── students/page.tsx      # إدارة الطلاب، التعديل، والحذف
│   │   │   ├── settings/page.tsx      # إعدادات المجموعات، المواعيد، وكلمة المرور
│   │   │   └── print-cards/page.tsx   # طباعة كروت الباركود A4 مجمعة
│   │   ├── register/page.tsx          # استمارة تسجيل الطالب الجديد وتأكيد الواتساب
│   │   ├── student/page.tsx           # بوابة الطالب، كارت Apple Wallet، تحميل الصور والـ PDF
│   │   ├── globals.css                # أنماط Liquid Glass وتنسيقات الطباعة HD Print
│   │   ├── layout.tsx                 # الهيكل العام ودعم اللغة العربية RTL
│   │   └── page.tsx                   # الصفحة الترحيبية للزوار والطلاب
│   ├── lib/
│   │   ├── audio.ts                   # محرك المؤثرات الصوتية Web Audio API
│   │   ├── generateCardImage.ts       # محرك Canvas 2D لتوليد صورة كارت الطالب HD
│   │   ├── storage.ts                 # قاعدة البيانات المحلية والمزامنة مع Supabase
│   │   ├── supabase.ts                # عميل الربط مع Supabase
│   │   └── whatsapp.ts                # مولد رسائل الواتساب الذكية للمصريين
│   └── types/
│       └── index.ts                   # تعريف جميع هياكل البيانات (TypeScript Interfaces)
├── .env.local                         # مفاتيح البيئة والربط
├── package.json
└── tailwind.config.ts
```

---

## 4. 🗄️ مخطط البيانات (Data Models & Schemas)

```typescript
// types/index.ts

export type AcademicYear = 'FIRST_SEC' | 'SECOND_SEC' | 'THIRD_SEC';
export type StudentStatus = 'PENDING' | 'ACTIVE' | 'ARCHIVED';

export interface Group {
  id: string;
  name: string; // e.g. "مجموعة (1) - السبت (4:00 مساءً) والثلاثاء (4:00 مساءً)"
  time: string; // e.g. "السبت: 4:00 مساءً | الثلاثاء: 4:00 مساءً"
  days: string[]; // ["السبت", "الثلاثاء"]
  academicYear: AcademicYear;
  maxStudents?: number;
}

export interface Student {
  id: string;
  code: string; // كود الطالب مثل "101"
  name: string; // اسم الطالب رباعي
  phone: string; // هاتف الطالب
  parentName: string; // اسم ولي الأمر
  parentPhone: string; // هاتف ولي الأمر
  address: string;
  academicYear: AcademicYear;
  groupId: string;
  status: StudentStatus;
  registeredAt: string;
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  groupId: string;
  scannedAt: string; // ISO String
  status: 'ATTENDED' | 'MAKEUP' | 'LATE';
  deviceId?: string;
  synced: boolean;
}

export interface Subscription {
  id: string;
  studentId: string;
  month: string; // e.g. "أكتوبر 2026"
  amount: number; // 250
  isPaid: boolean;
  paidAt?: string;
  receivedBy?: string;
}

export interface Exam {
  id: string;
  title: string;
  maxScore: number;
  date: string;
}

export interface ExamResult {
  id: string;
  examId: string;
  studentId: string;
  score: number;
  feedback?: string;
  parentNotified: boolean;
  studentNotified: boolean;
}

export interface SystemSettings {
  adminPasscode: string; // "2026"
  teacherName: string; // "مس نشوى"
  subjectName: string; // "العلوم المتكاملة"
  teacherPhone: string;
  subscriptionPrice: number; // 250
  kioskTheme: 'DARK' | 'LIGHT';
  telegramBotToken?: string;
  telegramChatId?: string;
}
```

---

## 5. 💡 المنطق البرمجي والميزات الأساسية بالتفصيل

### 1. دورة حياة الحضور المتعدد (Multi-Session Lifecycle):
- عند مسح الطالب في حصة اليوم، يتم إنشاء جلسة بتاريخ اليوم `sess-{groupId}-{YYYY-MM-DD}`.
- إذا قام الطالب بمسح الكارت مرة ثانية في نفس اليوم: يتعرف النظام عليه كـ `ALREADY_RECORDED` ويعرض إشعاراً أزرق مع توقيت حضوره الأصلي لمنع التكرار.
- في الحصة القادمة (أو اليوم التالي): يتم فتح جلسة جديدة تلقائياً، ويُسجل الطالب كـ `ATTENDED` مع الرنين الأخضر.
- إذا كان الطالب ينتمي لمجموعة أخرى وحضر اليوم كتعويض: يظهر إشعار برتقالي يتيح اعتماده كحضور تعويض `MAKEUP`.

### 2. محرك قارئ مسدس الليزر (Hardware Laser Gun Engine):
- يستمع الـ Window لحدث `keydown`.
- قارئ الباركود يرسل الحروف بفارق زمني أقل من `100ms` متبوعة بزر `Enter`.
- إذا ضغط المستخدم على الكيبورد ببطء (>140ms)، يتم تصفير الـ Buffer تلقائياً لتفادي التشويش.

### 3. محرك توليد كارت الطالب بدقة 3X (Canvas 2D Engine):
- لتجنب مشاكل تشابك الحروف العربية في مكتبات التقاط الشاشة CSS، يتم رسم الكارت بالكامل عبر `Canvas 2D API`.
- أبعاد الكارت: `800px × 1120px` مع تدرج لوني زمردي داكن، وشعار الأكاديمية، وبيانات الطالب والمجموعة، وصندوق QR Code عالي الحساسية بدقة Level-H، ومطابقة تامة للغة العربية RTL.

### 4. قوالب رسائل الواتساب الرسمية للمصريين:
- **رسالة الغياب لولي الأمر**: إشعار مهذب بغياب الطالب عن موعد الحصة لمتابعته.
- **رسالة تذكير السداد**: تذكير لطيف بقيمة الاشتراك والشهر المستحق.
- **رسالة نتيجة الامتحان**: تهنئة وتفصيل درجات الطالب وملاحظات المس.
- **رسالة تأكيد التسجيل**: رسالة ترحيبية جاهزة للطالب لإرسالها للمس مع كوده.

---

## 6. 🚀 خطوات التثبيت والتشغيل السحابي (Deployment Guide)

### 1. تجهيز بيئة العمل المحلية:
```bash
git clone https://github.com/MASTER-ZER/nashwa-academy.git
cd nashwa-academy
npm install
```

### 2. إعداد ملف المتغيرات البيئية (`.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_ADMIN_CHAT_ID=your-telegram-chat-id
```

### 3. بناء واختبار المشروع:
```bash
npm run build
npm run start
```

### 4. النشر على Vercel بنقرة واحدة:
```bash
npx vercel --prod
```

---

## 7. 👑 حسابات وبيانات الدخول الافتراضية
- **رمز دخول لوحة التحكم**: `2026`
- **حساب تجريبي للطالب**: الكود `#101`، رقم الهاتف: `01012345678`
- **المادة الدراسية**: العلوم المتكاملة - الصف الأول الثانوي
- **المعلمة**: مس نشوى
