-- ==============================================================================
-- 🌸 قاعدة بيانات أكاديمية مس نشوى - مادة العلوم المتكاملة (Supabase / PostgreSQL)
-- ==============================================================================

-- 1. جدول المجموعات والمواعيد (Groups)
CREATE TABLE IF NOT EXISTS public.groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    time TEXT NOT NULL,
    days TEXT[] NOT NULL DEFAULT '{}',
    academic_year TEXT NOT NULL DEFAULT 'FIRST_SEC',
    max_students INT NOT NULL DEFAULT 35,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. جدول الطلاب (Students)
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY DEFAULT ('std-' || floor(extract(epoch from now()) * 1000)::text),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    parent_name TEXT NOT NULL,
    parent_phone TEXT NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    academic_year TEXT NOT NULL DEFAULT 'FIRST_SEC',
    group_id TEXT REFERENCES public.groups(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED')),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ
);

-- إنشاء تسلسل (Sequence) لتوليد كود الطالب التلقائي بدءاً من 101
CREATE SEQUENCE IF NOT EXISTS student_code_seq START WITH 101;

-- 3. جدول الحصص اليومية (Sessions)
CREATE TABLE IF NOT EXISTS public.sessions (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. جدول الحضور اليومي (Attendance)
CREATE TABLE IF NOT EXISTS public.attendance (
    id TEXT PRIMARY KEY DEFAULT ('att-' || floor(extract(epoch from now()) * 1000)::text),
    session_id TEXT NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    group_id TEXT REFERENCES public.groups(id) ON DELETE SET NULL,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'ATTENDED' CHECK (status IN ('ATTENDED', 'MAKEUP', 'ABSENT')),
    device_id TEXT NOT NULL DEFAULT 'main-kiosk',
    synced BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT unique_session_student UNIQUE (session_id, student_id)
);

-- 5. جدول الاشتراكات الشهرية (Subscriptions)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id TEXT PRIMARY KEY DEFAULT ('sub-' || floor(extract(epoch from now()) * 1000)::text),
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 150.00,
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    paid_at TIMESTAMPTZ,
    received_by TEXT,
    CONSTRAINT unique_student_month UNIQUE (student_id, month)
);

-- 6. جدول الامتحانات الورقية (Exams)
CREATE TABLE IF NOT EXISTS public.exams (
    id TEXT PRIMARY KEY DEFAULT ('ex-' || floor(extract(epoch from now()) * 1000)::text),
    title TEXT NOT NULL,
    total_score NUMERIC(10, 2) NOT NULL DEFAULT 20.00,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    academic_year TEXT NOT NULL DEFAULT 'FIRST_SEC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. جدول درجات الامتحانات (Exam Results)
CREATE TABLE IF NOT EXISTS public.exam_results (
    id TEXT PRIMARY KEY DEFAULT ('res-' || floor(extract(epoch from now()) * 1000)::text),
    exam_id TEXT NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    score NUMERIC(10, 2) NOT NULL,
    feedback TEXT DEFAULT '',
    parent_notified BOOLEAN NOT NULL DEFAULT FALSE,
    student_notified BOOLEAN NOT NULL DEFAULT FALSE,
    graded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_exam_student UNIQUE (exam_id, student_id)
);

-- ==============================================================================
-- 🔒 إعدادات الأمان وسياسات الوصول (Row Level Security - RLS)
-- ==============================================================================
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول المفتوحة للاستخدام التعليمي المباشر عبر Anon Key
CREATE POLICY "Public full access to groups" ON public.groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to students" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to sessions" ON public.sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to attendance" ON public.attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to subscriptions" ON public.subscriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to exams" ON public.exams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to exam_results" ON public.exam_results FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 📦 البيانات الأولية التجريبية (Initial Seed Data)
-- ==============================================================================

-- إضافة المجموعات
INSERT INTO public.groups (id, name, time, days, academic_year, max_students) VALUES
('grp-1', 'مجموعة (1) - الأحد والثلاثاء | 1:00 ظهرًا', '01:00 PM', ARRAY['الأحد', 'الثلاثاء'], 'FIRST_SEC', 35),
('grp-2', 'مجموعة (2) - الأحد والثلاثاء | 3:00 عصرًا', '03:00 PM', ARRAY['الأحد', 'الثلاثاء'], 'FIRST_SEC', 35),
('grp-3', 'مجموعة (3) - السبت والأربعاء | 2:00 ظهرًا', '02:00 PM', ARRAY['السبت', 'الأربعاء'], 'FIRST_SEC', 35)
ON CONFLICT (id) DO NOTHING;

-- إضافة طلاب تجريبيين
INSERT INTO public.students (id, code, name, phone, parent_name, parent_phone, address, academic_year, group_id, status) VALUES
('std-101', '101', 'إياد محمد نجاح', '01012345678', 'محمد نجاح', '01198765432', 'شارع الجمهورية - المنصورة', 'FIRST_SEC', 'grp-1', 'ACTIVE'),
('std-102', '102', 'أحمد محمود عبد الفتاح', '01223344556', 'محمود عبد الفتاح', '01099887766', 'شارع البحر - طلخا', 'FIRST_SEC', 'grp-1', 'ACTIVE'),
('std-103', '103', 'سارة طارق إبراهيم', '01555443322', 'طارق إبراهيم', '01233445566', 'شارع الجيش - المنصورة', 'FIRST_SEC', 'grp-2', 'ACTIVE'),
('std-104', '104', 'عمر خالد الدسوقي', '01066778899', 'خالد الدسوقي', '01122334455', 'سندوب - المنصورة', 'FIRST_SEC', 'grp-1', 'PENDING')
ON CONFLICT (code) DO NOTHING;

-- إضافة اشتراكات شهر أكتوبر
INSERT INTO public.subscriptions (id, student_id, month, amount, is_paid, paid_at, received_by) VALUES
('sub-101-oct', 'std-101', 'أكتوبر 2026', 150.00, true, NOW(), 'مس نشوى'),
('sub-102-oct', 'std-102', 'أكتوبر 2026', 150.00, false, NULL, NULL),
('sub-103-oct', 'std-103', 'أكتوبر 2026', 150.00, true, NOW(), 'السكرتير')
ON CONFLICT (id) DO NOTHING;

-- إضافة امتحان تجريبي
INSERT INTO public.exams (id, title, total_score, date, academic_year) VALUES
('ex-1', 'اختبار الباب الأول: الكيمياء ومركز العلوم', 20.00, CURRENT_DATE, 'FIRST_SEC')
ON CONFLICT (id) DO NOTHING;

-- إضافة نتائج الامتحان
INSERT INTO public.exam_results (id, exam_id, student_id, score, feedback) VALUES
('res-1', 'ex-1', 'std-101', 19.00, 'ممتاز جداً وإجابات نموذجية 🌟'),
('res-2', 'ex-1', 'std-102', 14.00, 'جيد، برجاء مراجعة مسائل التحويلات')
ON CONFLICT (id) DO NOTHING;
