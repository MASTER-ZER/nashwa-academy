-- ==============================================================================
-- 🌸 قاعدة بيانات أكاديمية مس نشوى - مادة العلوم المتكاملة (Supabase / PostgreSQL)
-- ==============================================================================

-- 1. جدول إعدادات المنصة المركزية (System Settings)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id TEXT PRIMARY KEY DEFAULT 'main_settings',
    teacher_name TEXT NOT NULL DEFAULT 'مس نشوى',
    subject_name TEXT NOT NULL DEFAULT 'العلوم المتكاملة',
    academic_year_label TEXT NOT NULL DEFAULT 'الصف الأول الثانوي',
    subscription_price NUMERIC(10, 2) NOT NULL DEFAULT 250.00,
    admin_passcode TEXT NOT NULL DEFAULT '2026',
    assistant_phone TEXT NOT NULL DEFAULT '01012345678',
    center_location TEXT NOT NULL DEFAULT 'سنتر الأوائل - قاعة 1',
    require_student_photo BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. جدول المجموعات والمواعيد (Groups)
CREATE TABLE IF NOT EXISTS public.groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    time TEXT NOT NULL,
    days TEXT[] NOT NULL DEFAULT '{}',
    academic_year TEXT NOT NULL DEFAULT 'FIRST_SEC',
    max_students INT NOT NULL DEFAULT 35,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. جدول الطلاب (Students)
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY DEFAULT ('std-' || floor(extract(epoch from now()) * 1000)::text),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    parent_name TEXT NOT NULL,
    parent_phone TEXT NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    birth_date TEXT DEFAULT '',
    photo_url TEXT DEFAULT '',
    academic_year TEXT NOT NULL DEFAULT 'FIRST_SEC',
    group_id TEXT REFERENCES public.groups(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED')),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    notes TEXT DEFAULT ''
);

-- إنشاء تسلسل (Sequence) لتوليد كود الطالب التلقائي بدءاً من 101
CREATE SEQUENCE IF NOT EXISTS student_code_seq START WITH 101;

-- دالة لتوليد كود الطالب القادم بشكل ذري (Atomic Function)
CREATE OR REPLACE FUNCTION get_next_student_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    next_val INT;
BEGIN
    SELECT nextval('student_code_seq') INTO next_val;
    RETURN next_val::TEXT;
END;
$$;

-- 4. جدول الحصص اليومية (Sessions)
CREATE TABLE IF NOT EXISTS public.sessions (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_group_date ON public.sessions (group_id, date);

-- 5. جدول الحضور اليومي (Attendance)
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

CREATE INDEX IF NOT EXISTS idx_attendance_scanned_at ON public.attendance (scanned_at);
CREATE INDEX IF NOT EXISTS idx_attendance_student_session ON public.attendance (student_id, session_id);

-- 6. جدول الاشتراكات الشهرية (Subscriptions)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id TEXT PRIMARY KEY DEFAULT ('sub-' || floor(extract(epoch from now()) * 1000)::text),
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 250.00,
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    paid_at TIMESTAMPTZ,
    received_by TEXT,
    CONSTRAINT unique_student_month UNIQUE (student_id, month)
);

-- 7. جدول الامتحانات (Exams)
CREATE TABLE IF NOT EXISTS public.exams (
    id TEXT PRIMARY KEY DEFAULT ('ex-' || floor(extract(epoch from now()) * 1000)::text),
    title TEXT NOT NULL,
    total_score NUMERIC(10, 2) NOT NULL DEFAULT 20.00,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    academic_year TEXT NOT NULL DEFAULT 'FIRST_SEC',
    group_id TEXT REFERENCES public.groups(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. جدول درجات الامتحانات (Exam Results)
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
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

-- السماح بالقراءة والتسجيل المنضبط عبر Anon Key بسياسات أمان مقيدة
CREATE POLICY "Anon can view groups" ON public.groups FOR SELECT USING (id IS NOT NULL);
CREATE POLICY "Anon can view system_settings" ON public.system_settings FOR SELECT USING (id = 'main_settings');
CREATE POLICY "Anon can insert pending student" ON public.students FOR INSERT WITH CHECK (status = 'PENDING');
CREATE POLICY "Anon can view active students" ON public.students FOR SELECT USING (status = 'ACTIVE');
CREATE POLICY "Anon can insert attendance" ON public.attendance FOR INSERT WITH CHECK (status IN ('ATTENDED', 'MAKEUP'));
CREATE POLICY "Anon can view attendance" ON public.attendance FOR SELECT USING (id IS NOT NULL);
CREATE POLICY "Anon can insert sessions" ON public.sessions FOR INSERT WITH CHECK (id IS NOT NULL);
CREATE POLICY "Anon can view sessions" ON public.sessions FOR SELECT USING (id IS NOT NULL);
CREATE POLICY "Anon can view subscriptions" ON public.subscriptions FOR SELECT USING (id IS NOT NULL);
CREATE POLICY "Anon can view exams" ON public.exams FOR SELECT USING (id IS NOT NULL);
CREATE POLICY "Anon can view exam_results" ON public.exam_results FOR SELECT USING (id IS NOT NULL);

-- ==============================================================================
-- 📦 البيانات الأساسية للبدء النظيف (Clean Initial Baseline)
-- ==============================================================================

INSERT INTO public.system_settings (id, teacher_name, subject_name, subscription_price, admin_passcode)
VALUES ('main_settings', 'مس نشوى', 'العلوم المتكاملة', 250.00, '2026')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.groups (id, name, time, days, academic_year, max_students) VALUES
('grp-1', 'مجموعة (1) - السبت (4:00 مساءً) والثلاثاء (4:00 مساءً)', 'السبت: 4:00 مساءً | الثلاثاء: 4:00 مساءً', ARRAY['السبت', 'الثلاثاء'], 'FIRST_SEC', 35),
('grp-2', 'مجموعة (2) - الأحد (5:00 مساءً) والأربعاء (5:00 مساءً)', 'الأحد: 5:00 مساءً | الأربعاء: 5:00 مساءً', ARRAY['الأحد', 'الأربعاء'], 'FIRST_SEC', 35),
('grp-3', 'مجموعة (3) - الإثنين (3:00 مساءً) والخميس (3:00 مساءً)', 'الإثنين: 3:00 مساءً | الخميس: 3:00 مساءً', ARRAY['الإثنين', 'الخميس'], 'FIRST_SEC', 35)
ON CONFLICT (id) DO NOTHING;
