-- ==============================================================================
-- CS Study Hub: Complete Supabase Cloud Database Setup
-- Run this entire script in Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. Create Subjects Table
CREATE TABLE IF NOT EXISTS public.subjects (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    code TEXT DEFAULT '',
    instructor TEXT DEFAULT '',
    semester TEXT DEFAULT 'Level 3 • Semester 1 • Core course',
    description TEXT DEFAULT '',
    icon TEXT DEFAULT 'BookOpen',
    color TEXT DEFAULT 'blue',
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Create Materials Table (Lectures, Sections, Quizzes, Study Notes)
CREATE TABLE IF NOT EXISTS public.materials (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('lecture', 'section', 'quiz', 'study_material')),
    number INT DEFAULT 1,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'summary',
    file_url TEXT DEFAULT '',
    external_url TEXT DEFAULT '',
    file_name TEXT DEFAULT '',
    file_size TEXT DEFAULT '',
    sheet_pdf_url TEXT DEFAULT '',
    sheet_file_name TEXT DEFAULT '',
    sheet_file_size TEXT DEFAULT '',
    solution_pdf_url TEXT DEFAULT '',
    solution_file_name TEXT DEFAULT '',
    solution_file_size TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Create Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT NOT NULL CHECK (category IN ('New Lecture', 'New Section', 'Quiz', 'Assignment', 'Exam', 'General Announcement')),
    is_important BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Create Warnings Table (Official Academic Warning PDFs)
CREATE TABLE IF NOT EXISTS public.warnings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    file_url TEXT NOT NULL,
    file_name TEXT DEFAULT '',
    file_size TEXT DEFAULT '',
    sheet_pdf_url TEXT DEFAULT '',
    sheet_file_name TEXT DEFAULT '',
    sheet_file_size TEXT DEFAULT '',
    solution_pdf_url TEXT DEFAULT '',
    solution_file_name TEXT DEFAULT '',
    solution_file_size TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for lightning-fast queries
CREATE INDEX IF NOT EXISTS idx_subjects_order ON public.subjects(order_index, name);
CREATE INDEX IF NOT EXISTS idx_materials_subject_id ON public.materials(subject_id);
CREATE INDEX IF NOT EXISTS idx_materials_type ON public.materials(type);
CREATE INDEX IF NOT EXISTS idx_announcements_subject_id ON public.announcements(subject_id);
CREATE INDEX IF NOT EXISTS idx_warnings_subject_id ON public.warnings(subject_id);

-- 5. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warnings ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies: Public Read Access (Students & Visitors)
DROP POLICY IF EXISTS "Public can view subjects" ON public.subjects;
CREATE POLICY "Public can view subjects" ON public.subjects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view materials" ON public.materials;
CREATE POLICY "Public can view materials" ON public.materials FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view announcements" ON public.announcements;
CREATE POLICY "Public can view announcements" ON public.announcements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view warnings" ON public.warnings;
CREATE POLICY "Public can view warnings" ON public.warnings FOR SELECT USING (true);

-- 7. Helper function to verify admin requests
CREATE OR REPLACE FUNCTION public.is_admin_request()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_headers JSON;
    v_secret TEXT;
BEGIN
    IF auth.role() = 'service_role' THEN
        RETURN true;
    END IF;

    BEGIN
        v_headers := current_setting('request.headers', true)::json;
        v_secret := v_headers->>'x-admin-secret';
        IF v_secret = 'study-hub-secure-admin-session-salt-2026-minasami-b7e8d9c0a1f2e3d4' THEN
            RETURN true;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_request() TO anon, authenticated, service_role;

-- 8. Admin Write Policies for RLS
DROP POLICY IF EXISTS "Admins can insert subjects" ON public.subjects;
CREATE POLICY "Admins can insert subjects" ON public.subjects FOR INSERT WITH CHECK (public.is_admin_request());

DROP POLICY IF EXISTS "Admins can update subjects" ON public.subjects;
CREATE POLICY "Admins can update subjects" ON public.subjects FOR UPDATE USING (public.is_admin_request()) WITH CHECK (public.is_admin_request());

DROP POLICY IF EXISTS "Admins can delete subjects" ON public.subjects;
CREATE POLICY "Admins can delete subjects" ON public.subjects FOR DELETE USING (public.is_admin_request());

DROP POLICY IF EXISTS "Admins can insert materials" ON public.materials;
CREATE POLICY "Admins can insert materials" ON public.materials FOR INSERT WITH CHECK (public.is_admin_request());

DROP POLICY IF EXISTS "Admins can update materials" ON public.materials;
CREATE POLICY "Admins can update materials" ON public.materials FOR UPDATE USING (public.is_admin_request()) WITH CHECK (public.is_admin_request());

DROP POLICY IF EXISTS "Admins can delete materials" ON public.materials;
CREATE POLICY "Admins can delete materials" ON public.materials FOR DELETE USING (public.is_admin_request());

DROP POLICY IF EXISTS "Admins can insert announcements" ON public.announcements;
CREATE POLICY "Admins can insert announcements" ON public.announcements FOR INSERT WITH CHECK (public.is_admin_request());

DROP POLICY IF EXISTS "Admins can update announcements" ON public.announcements;
CREATE POLICY "Admins can update announcements" ON public.announcements FOR UPDATE USING (public.is_admin_request()) WITH CHECK (public.is_admin_request());

DROP POLICY IF EXISTS "Admins can delete announcements" ON public.announcements;
CREATE POLICY "Admins can delete announcements" ON public.announcements FOR DELETE USING (public.is_admin_request());

DROP POLICY IF EXISTS "Admins can insert warnings" ON public.warnings;
CREATE POLICY "Admins can insert warnings" ON public.warnings FOR INSERT WITH CHECK (public.is_admin_request());

DROP POLICY IF EXISTS "Admins can update warnings" ON public.warnings;
CREATE POLICY "Admins can update warnings" ON public.warnings FOR UPDATE USING (public.is_admin_request()) WITH CHECK (public.is_admin_request());

DROP POLICY IF EXISTS "Admins can delete warnings" ON public.warnings;
CREATE POLICY "Admins can delete warnings" ON public.warnings FOR DELETE USING (public.is_admin_request());

-- 9. Storage Bucket for PDF Documents & Lecture Slides
INSERT INTO storage.buckets (id, name, public)
VALUES ('materials', 'materials', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read access to materials" ON storage.objects;
CREATE POLICY "Public read access to materials"
    ON storage.objects FOR SELECT USING (bucket_id = 'materials');

DROP POLICY IF EXISTS "Allow uploads to materials" ON storage.objects;
CREATE POLICY "Allow uploads to materials"
    ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'materials');

DROP POLICY IF EXISTS "Allow updates to materials" ON storage.objects;
CREATE POLICY "Allow updates to materials"
    ON storage.objects FOR UPDATE USING (bucket_id = 'materials' AND public.is_admin_request());

DROP POLICY IF EXISTS "Allow deletes to materials" ON storage.objects;
CREATE POLICY "Allow deletes to materials"
    ON storage.objects FOR DELETE USING (bucket_id = 'materials');

-- 10. RPC Stored Procedure: Admin Permanent Delete (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.admin_delete_record(
    p_secret TEXT,
    p_table TEXT,
    p_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted_count INT := 0;
    v_deleted_files TEXT[] := ARRAY[]::TEXT[];
BEGIN
    IF p_secret IS NULL OR p_secret <> 'study-hub-secure-admin-session-salt-2026-minasami-b7e8d9c0a1f2e3d4' THEN
        RAISE EXCEPTION 'Unauthorized: Invalid admin secret token';
    END IF;

    -- A. Subjects: Cascade delete children and gather files
    IF p_table = 'subjects' THEN
        SELECT COALESCE(ARRAY_AGG(f), ARRAY[]::TEXT[]) INTO v_deleted_files 
        FROM (
            SELECT file_url AS f FROM public.materials WHERE subject_id = p_id AND file_url IS NOT NULL AND file_url <> ''
            UNION ALL
            SELECT sheet_pdf_url AS f FROM public.materials WHERE subject_id = p_id AND sheet_pdf_url IS NOT NULL AND sheet_pdf_url <> ''
            UNION ALL
            SELECT solution_pdf_url AS f FROM public.materials WHERE subject_id = p_id AND solution_pdf_url IS NOT NULL AND solution_pdf_url <> ''
            UNION ALL
            SELECT file_url AS f FROM public.warnings WHERE subject_id = p_id AND file_url IS NOT NULL AND file_url <> ''
        ) all_files;

        DELETE FROM public.materials WHERE subject_id = p_id;
        DELETE FROM public.announcements WHERE subject_id = p_id;
        DELETE FROM public.warnings WHERE subject_id = p_id;
        DELETE FROM public.subjects WHERE id = p_id;
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    -- B. Materials (Lectures, Sections, Quizzes, Study Notes)
    ELSIF p_table = 'materials' THEN
        SELECT COALESCE(ARRAY_AGG(f), ARRAY[]::TEXT[]) INTO v_deleted_files 
        FROM (
            SELECT file_url AS f FROM public.materials WHERE id = p_id AND file_url IS NOT NULL AND file_url <> ''
            UNION ALL
            SELECT sheet_pdf_url AS f FROM public.materials WHERE id = p_id AND sheet_pdf_url IS NOT NULL AND sheet_pdf_url <> ''
            UNION ALL
            SELECT solution_pdf_url AS f FROM public.materials WHERE id = p_id AND solution_pdf_url IS NOT NULL AND solution_pdf_url <> ''
        ) mat_files;

        DELETE FROM public.materials WHERE id = p_id;
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    -- C. Announcements
    ELSIF p_table = 'announcements' THEN
        DELETE FROM public.announcements WHERE id = p_id;
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    -- D. Warnings (Student Academic Warning PDFs)
    ELSIF p_table = 'warnings' THEN
        SELECT COALESCE(ARRAY_AGG(file_url), ARRAY[]::TEXT[]) INTO v_deleted_files 
        FROM public.warnings WHERE id = p_id AND file_url IS NOT NULL AND file_url <> '';

        DELETE FROM public.warnings WHERE id = p_id;
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    END IF;

    RETURN jsonb_build_object(
        'success', (v_deleted_count > 0),
        'deleted_count', v_deleted_count,
        'deleted_files', v_deleted_files,
        'table', p_table,
        'id', p_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_record(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- 11. RPC Stored Procedure: Admin Mutate (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.admin_mutate_record(
    p_secret TEXT,
    p_action TEXT,
    p_table TEXT,
    p_data JSONB,
    p_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB;
BEGIN
    IF p_secret IS NULL OR p_secret <> 'study-hub-secure-admin-session-salt-2026-minasami-b7e8d9c0a1f2e3d4' THEN
        RAISE EXCEPTION 'Unauthorized: Invalid admin secret token';
    END IF;

    IF p_action = 'insert' THEN
        IF p_table = 'subjects' THEN
            INSERT INTO public.subjects (id, name, code, instructor, semester, description, icon, color, order_index)
            VALUES (
                COALESCE(p_data->>'id', gen_random_uuid()::text),
                p_data->>'name',
                COALESCE(p_data->>'code', ''),
                COALESCE(p_data->>'instructor', ''),
                COALESCE(p_data->>'semester', 'Level 3 • Semester 1 • Core course'),
                COALESCE(p_data->>'description', ''),
                COALESCE(p_data->>'icon', 'BookOpen'),
                COALESCE(p_data->>'color', 'blue'),
                COALESCE((p_data->>'order_index')::int, 0)
            )
            RETURNING to_jsonb(public.subjects.*) INTO v_result;

        ELSIF p_table = 'materials' THEN
            INSERT INTO public.materials (
                id, subject_id, title, type, number, description, category,
                file_url, external_url, file_name, file_size,
                sheet_pdf_url, sheet_file_name, sheet_file_size,
                solution_pdf_url, solution_file_name, solution_file_size
            )
            VALUES (
                COALESCE(p_data->>'id', gen_random_uuid()::text),
                p_data->>'subject_id',
                p_data->>'title',
                p_data->>'type',
                COALESCE((p_data->>'number')::int, 1),
                COALESCE(p_data->>'description', ''),
                COALESCE(p_data->>'category', 'summary'),
                COALESCE(p_data->>'file_url', ''),
                COALESCE(p_data->>'external_url', ''),
                COALESCE(p_data->>'file_name', ''),
                COALESCE(p_data->>'file_size', ''),
                COALESCE(p_data->>'sheet_pdf_url', ''),
                COALESCE(p_data->>'sheet_file_name', ''),
                COALESCE(p_data->>'sheet_file_size', ''),
                COALESCE(p_data->>'solution_pdf_url', ''),
                COALESCE(p_data->>'solution_file_name', ''),
                COALESCE(p_data->>'solution_file_size', '')
            )
            RETURNING to_jsonb(public.materials.*) INTO v_result;

        ELSIF p_table = 'announcements' THEN
            INSERT INTO public.announcements (id, subject_id, title, description, category, is_important, expires_at)
            VALUES (
                COALESCE(p_data->>'id', gen_random_uuid()::text),
                p_data->>'subject_id',
                p_data->>'title',
                COALESCE(p_data->>'description', ''),
                p_data->>'category',
                COALESCE((p_data->>'is_important')::boolean, false),
                (p_data->>'expires_at')::timestamptz
            )
            RETURNING to_jsonb(public.announcements.*) INTO v_result;

        ELSIF p_table = 'warnings' THEN
            INSERT INTO public.warnings (id, subject_id, title, description, file_url, file_name, file_size)
            VALUES (
                COALESCE(p_data->>'id', gen_random_uuid()::text),
                p_data->>'subject_id',
                p_data->>'title',
                COALESCE(p_data->>'description', ''),
                p_data->>'file_url',
                COALESCE(p_data->>'file_name', ''),
                COALESCE(p_data->>'file_size', '')
            )
            RETURNING to_jsonb(public.warnings.*) INTO v_result;
        END IF;

    ELSIF p_action = 'update' THEN
        IF p_table = 'subjects' THEN
            UPDATE public.subjects SET
                name = COALESCE(p_data->>'name', name),
                code = COALESCE(p_data->>'code', code),
                instructor = COALESCE(p_data->>'instructor', instructor),
                semester = COALESCE(p_data->>'semester', semester),
                description = COALESCE(p_data->>'description', description),
                icon = COALESCE(p_data->>'icon', icon),
                color = COALESCE(p_data->>'color', color),
                order_index = COALESCE((p_data->>'order_index')::int, order_index)
            WHERE id = p_id
            RETURNING to_jsonb(public.subjects.*) INTO v_result;

        ELSIF p_table = 'materials' THEN
            UPDATE public.materials SET
                subject_id = COALESCE(p_data->>'subject_id', subject_id),
                title = COALESCE(p_data->>'title', title),
                type = COALESCE(p_data->>'type', type),
                number = COALESCE((p_data->>'number')::int, number),
                description = COALESCE(p_data->>'description', description),
                category = COALESCE(p_data->>'category', category),
                file_url = CASE WHEN p_data ? 'file_url' THEN p_data->>'file_url' ELSE file_url END,
                external_url = CASE WHEN p_data ? 'external_url' THEN p_data->>'external_url' ELSE external_url END,
                file_name = CASE WHEN p_data ? 'file_name' THEN p_data->>'file_name' ELSE file_name END,
                file_size = CASE WHEN p_data ? 'file_size' THEN p_data->>'file_size' ELSE file_size END,
                sheet_pdf_url = CASE WHEN p_data ? 'sheet_pdf_url' THEN p_data->>'sheet_pdf_url' ELSE sheet_pdf_url END,
                sheet_file_name = CASE WHEN p_data ? 'sheet_file_name' THEN p_data->>'sheet_file_name' ELSE sheet_file_name END,
                sheet_file_size = CASE WHEN p_data ? 'sheet_file_size' THEN p_data->>'sheet_file_size' ELSE sheet_file_size END,
                solution_pdf_url = CASE WHEN p_data ? 'solution_pdf_url' THEN p_data->>'solution_pdf_url' ELSE solution_pdf_url END,
                solution_file_name = CASE WHEN p_data ? 'solution_file_name' THEN p_data->>'solution_file_name' ELSE solution_file_name END,
                solution_file_size = CASE WHEN p_data ? 'solution_file_size' THEN p_data->>'solution_file_size' ELSE solution_file_size END
            WHERE id = p_id
            RETURNING to_jsonb(public.materials.*) INTO v_result;

        ELSIF p_table = 'announcements' THEN
            UPDATE public.announcements SET
                subject_id = COALESCE(p_data->>'subject_id', subject_id),
                title = COALESCE(p_data->>'title', title),
                description = COALESCE(p_data->>'description', description),
                category = COALESCE(p_data->>'category', category),
                is_important = COALESCE((p_data->>'is_important')::boolean, is_important),
                expires_at = (p_data->>'expires_at')::timestamptz
            WHERE id = p_id
            RETURNING to_jsonb(public.announcements.*) INTO v_result;

        ELSIF p_table = 'warnings' THEN
            UPDATE public.warnings SET
                subject_id = COALESCE(p_data->>'subject_id', subject_id),
                title = COALESCE(p_data->>'title', title),
                description = COALESCE(p_data->>'description', description),
                file_url = COALESCE(p_data->>'file_url', file_url),
                file_name = COALESCE(p_data->>'file_name', file_name),
                file_size = COALESCE(p_data->>'file_size', file_size)
            WHERE id = p_id
            RETURNING to_jsonb(public.warnings.*) INTO v_result;
        END IF;
    END IF;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_mutate_record(TEXT, TEXT, TEXT, JSONB, TEXT) TO anon, authenticated, service_role;

-- 12. Enable Realtime Broadcasting
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.subjects;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.materials;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.warnings;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- 13. Seed Core Data (Idempotent: only inserts if missing)
INSERT INTO public.subjects (id, name, code, instructor, semester, description, icon, color, order_index)
VALUES 
('sub-5', 'Compiler Design', 'CS321 / CS309', 'Dr. Lamiaa Hassaan (exams also Dr. Ahmed Ibrahim)', 'Level 3 • Semester 1 • Core course', 'Lexical analysis, syntax analysis (LL and LR parsing), semantic checking, intermediate code generation, and runtime memory management.', 'Cpu', 'blue', 1),
('sub-1', 'Database 2', 'CS312', 'Dr. Ahmed Mansour', 'Level 3 • Semester 2 • Core course', 'Advanced relational database management, query optimization, indexing, transaction processing, concurrency control, and NoSQL databases.', 'Database', 'emerald', 2),
('sub-2', 'DSS Modeling and Analysis', 'CS421', 'Dr. Hanaa Mostafa', 'Level 4 • Semester 1 • Major course', 'Decision Support Systems, multi-criteria decision making, predictive modeling, data warehousing concepts, and analytical hierarchy processes.', 'BarChart3', 'indigo', 3),
('sub-3', 'E-Commerce', 'CS335', 'Dr. Tarek El-Sayed', 'Level 3 • Semester 1 • Core course', 'Electronic commerce architectures, digital payment gateways, security protocols (SSL/TLS), online marketing systems, and cloud-hosted retail infrastructures.', 'ShoppingCart', 'amber', 4),
('sub-4', 'Data Protection', 'CS442', 'Dr. Khaled Fawzy', 'Level 4 • Semester 2 • Security track', 'Information security governance, cryptography foundations, access control models, GDPR/compliance, and defenses against privacy breaches.', 'ShieldCheck', 'rose', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.announcements (id, subject_id, title, description, category, is_important, created_at)
VALUES
('ann-1', 'sub-5', 'Compiler Design Midterm Exam Scheduled', 'Midterm exam will cover Lectures 1 to 4 and Sections 1 to 3. Bring scientific calculators.', 'Exam', true, NOW()),
('ann-2', 'sub-1', 'Database 2 Project Milestone 1 Due', 'Submit your ER diagram and relational mapping schema on the department portal by Thursday 11:59 PM.', 'Assignment', true, NOW()),
('ann-3', 'sub-5', 'Section 4 Practice Sheets Uploaded', 'LL(1) parsing table construction exercises and first & follow calculations have been uploaded.', 'New Section', false, NOW())
ON CONFLICT (id) DO NOTHING;


-- ==============================================================================
-- CS Study Hub: Website Analytics Database Migration
-- Tracks Live Visitors, Total Unique Visitors, Visits (Sessions), and Daily Stats
-- Execute in Supabase SQL Editor -> Run
-- ==============================================================================

-- 1. Analytics Visitors Table (Unique Browsers/Devices)
CREATE TABLE IF NOT EXISTS public.analytics_visitors (
    visitor_id TEXT PRIMARY KEY,
    first_seen_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    last_seen_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    total_visits INT DEFAULT 1 NOT NULL,
    user_agent TEXT DEFAULT '',
    device_type TEXT DEFAULT 'desktop',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_visitors_last_seen ON public.analytics_visitors(last_seen_at);

-- 2. Analytics Sessions Table (Visit Sessions with 30-min window & 5-min heartbeat)
CREATE TABLE IF NOT EXISTS public.analytics_sessions (
    session_id TEXT PRIMARY KEY,
    visitor_id TEXT NOT NULL REFERENCES public.analytics_visitors(visitor_id) ON DELETE CASCADE,
    cairo_date DATE NOT NULL,
    started_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    last_heartbeat_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    page_views INT DEFAULT 1 NOT NULL,
    last_page TEXT DEFAULT '/',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_cairo_date ON public.analytics_sessions(cairo_date);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_heartbeat ON public.analytics_sessions(last_heartbeat_at);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_visitor ON public.analytics_sessions(visitor_id);

-- 3. Analytics Daily Stats Table (Cairo Date Aggregation)
CREATE TABLE IF NOT EXISTS public.analytics_daily_stats (
    cairo_date DATE PRIMARY KEY,
    total_visits INT DEFAULT 0 NOT NULL,
    unique_visitors INT DEFAULT 0 NOT NULL,
    page_views INT DEFAULT 0 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Enable Row Level Security
ALTER TABLE public.analytics_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily_stats ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (Admins only for direct reads/writes; RPC handles student ping)
DROP POLICY IF EXISTS "Admins can view analytics_visitors" ON public.analytics_visitors;
CREATE POLICY "Admins can view analytics_visitors" ON public.analytics_visitors FOR SELECT USING (public.is_admin_request());

DROP POLICY IF EXISTS "Admins can view analytics_sessions" ON public.analytics_sessions;
CREATE POLICY "Admins can view analytics_sessions" ON public.analytics_sessions FOR SELECT USING (public.is_admin_request());

DROP POLICY IF EXISTS "Admins can view analytics_daily_stats" ON public.analytics_daily_stats;
CREATE POLICY "Admins can view analytics_daily_stats" ON public.analytics_daily_stats FOR SELECT USING (public.is_admin_request());

-- 6. Atomic Ingestion RPC Function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.record_analytics_ping(
    p_visitor_id TEXT,
    p_session_id TEXT,
    p_cairo_date DATE,
    p_path TEXT DEFAULT '/',
    p_user_agent TEXT DEFAULT '',
    p_device_type TEXT DEFAULT 'desktop',
    p_is_new_session BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_new_today BOOLEAN := false;
BEGIN
    -- Validate visitor_id & session_id
    IF p_visitor_id IS NULL OR length(trim(p_visitor_id)) < 8 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid visitor_id');
    END IF;
    IF p_session_id IS NULL OR length(trim(p_session_id)) < 8 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid session_id');
    END IF;

    -- Upsert Visitor record
    INSERT INTO public.analytics_visitors (visitor_id, first_seen_at, last_seen_at, total_visits, user_agent, device_type)
    VALUES (
        p_visitor_id,
        NOW(),
        NOW(),
        1,
        COALESCE(p_user_agent, ''),
        COALESCE(p_device_type, 'desktop')
    )
    ON CONFLICT (visitor_id) DO UPDATE SET
        last_seen_at = NOW(),
        total_visits = CASE 
            WHEN p_is_new_session THEN public.analytics_visitors.total_visits + 1 
            ELSE public.analytics_visitors.total_visits 
        END,
        user_agent = COALESCE(NULLIF(p_user_agent, ''), public.analytics_visitors.user_agent),
        device_type = COALESCE(NULLIF(p_device_type, ''), public.analytics_visitors.device_type);

    -- Check if visitor already had a session today
    IF p_is_new_session THEN
        PERFORM 1 FROM public.analytics_sessions 
        WHERE visitor_id = p_visitor_id AND cairo_date = p_cairo_date LIMIT 1;
        IF NOT FOUND THEN
            v_is_new_today := true;
        END IF;
    END IF;

    -- Upsert Session record
    INSERT INTO public.analytics_sessions (session_id, visitor_id, cairo_date, started_at, last_heartbeat_at, page_views, last_page)
    VALUES (
        p_session_id,
        p_visitor_id,
        p_cairo_date,
        NOW(),
        NOW(),
        1,
        COALESCE(p_path, '/')
    )
    ON CONFLICT (session_id) DO UPDATE SET
        last_heartbeat_at = NOW(),
        page_views = public.analytics_sessions.page_views + 1,
        last_page = COALESCE(p_path, public.analytics_sessions.last_page);

    -- Update Daily Stats Aggregation
    INSERT INTO public.analytics_daily_stats (cairo_date, total_visits, unique_visitors, page_views, updated_at)
    VALUES (
        p_cairo_date,
        1,
        1,
        1,
        NOW()
    )
    ON CONFLICT (cairo_date) DO UPDATE SET
        total_visits = CASE 
            WHEN p_is_new_session THEN public.analytics_daily_stats.total_visits + 1 
            ELSE public.analytics_daily_stats.total_visits 
        END,
        unique_visitors = CASE 
            WHEN v_is_new_today THEN public.analytics_daily_stats.unique_visitors + 1 
            ELSE public.analytics_daily_stats.unique_visitors 
        END,
        page_views = public.analytics_daily_stats.page_views + 1,
        updated_at = NOW();

    RETURN jsonb_build_object(
        'success', true,
        'visitor_id', p_visitor_id,
        'session_id', p_session_id,
        'cairo_date', p_cairo_date
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_analytics_ping(TEXT, TEXT, DATE, TEXT, TEXT, TEXT, BOOLEAN) TO anon, authenticated, service_role;

-- 7. Analytics Metrics RPC Function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_analytics_summary(p_cairo_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_live_visitors INT := 0;
    v_total_unique_visitors INT := 0;
    v_total_visits INT := 0;
    v_today_visitors INT := 0;
    v_today_visits INT := 0;
    v_chart_7d JSONB;
    v_chart_30d JSONB;
    v_top_pages JSONB;
    v_device_breakdown JSONB;
BEGIN
    -- 1. Live visitors: interacted within last 5 minutes (300 seconds)
    SELECT COUNT(DISTINCT visitor_id) INTO v_live_visitors
    FROM public.analytics_sessions
    WHERE last_heartbeat_at >= (NOW() - INTERVAL '5 minutes');

    -- 2. Total unique visitors all time
    SELECT COUNT(*) INTO v_total_unique_visitors
    FROM public.analytics_visitors;

    -- 3. Total visits all time
    SELECT COUNT(*) INTO v_total_visits
    FROM public.analytics_sessions;

    -- 4. Today's unique visitors (Africa/Cairo date)
    SELECT COUNT(DISTINCT visitor_id) INTO v_today_visitors
    FROM public.analytics_sessions
    WHERE cairo_date = p_cairo_date;

    -- Today's total sessions
    SELECT COUNT(*) INTO v_today_visits
    FROM public.analytics_sessions
    WHERE cairo_date = p_cairo_date;

    -- 5. 7-Day Traffic Series
    SELECT jsonb_agg(
        jsonb_build_object(
            'date', d.day::text,
            'visits', COALESCE(s.total_visits, 0),
            'uniqueVisitors', COALESCE(s.unique_visitors, 0),
            'pageViews', COALESCE(s.page_views, 0)
        ) ORDER BY d.day ASC
    ) INTO v_chart_7d
    FROM generate_series(p_cairo_date - 6, p_cairo_date, '1 day'::interval) AS d(day)
    LEFT JOIN (
        SELECT 
            cairo_date,
            COUNT(session_id) AS total_visits,
            COUNT(DISTINCT visitor_id) AS unique_visitors,
            SUM(page_views) AS page_views
        FROM public.analytics_sessions
        WHERE cairo_date >= p_cairo_date - 6
        GROUP BY cairo_date
    ) s ON s.cairo_date = d.day::date;

    -- 6. 30-Day Traffic Series
    SELECT jsonb_agg(
        jsonb_build_object(
            'date', d.day::text,
            'visits', COALESCE(s.total_visits, 0),
            'uniqueVisitors', COALESCE(s.unique_visitors, 0),
            'pageViews', COALESCE(s.page_views, 0)
        ) ORDER BY d.day ASC
    ) INTO v_chart_30d
    FROM generate_series(p_cairo_date - 29, p_cairo_date, '1 day'::interval) AS d(day)
    LEFT JOIN (
        SELECT 
            cairo_date,
            COUNT(session_id) AS total_visits,
            COUNT(DISTINCT visitor_id) AS unique_visitors,
            SUM(page_views) AS page_views
        FROM public.analytics_sessions
        WHERE cairo_date >= p_cairo_date - 29
        GROUP BY cairo_date
    ) s ON s.cairo_date = d.day::date;

    -- 7. Top Visited Pages
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object('path', sub.last_page, 'count', sub.cnt)
    ), '[]'::jsonb) INTO v_top_pages
    FROM (
        SELECT last_page, COUNT(*) as cnt
        FROM public.analytics_sessions
        GROUP BY last_page
        ORDER BY cnt DESC
        LIMIT 6
    ) sub;

    -- 8. Device Breakdown
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object('device', sub.device_type, 'count', sub.cnt)
    ), '[]'::jsonb) INTO v_device_breakdown
    FROM (
        SELECT COALESCE(device_type, 'desktop') as device_type, COUNT(*) as cnt
        FROM public.analytics_visitors
        GROUP BY device_type
        ORDER BY cnt DESC
    ) sub;

    RETURN jsonb_build_object(
        'success', true,
        'liveVisitors', COALESCE(v_live_visitors, 0),
        'totalUniqueVisitors', COALESCE(v_total_unique_visitors, 0),
        'totalVisits', COALESCE(v_total_visits, 0),
        'todayVisitors', COALESCE(v_today_visitors, 0),
        'todayVisits', COALESCE(v_today_visits, 0),
        'cairoDate', p_cairo_date,
        'chart7d', COALESCE(v_chart_7d, '[]'::jsonb),
        'chart30d', COALESCE(v_chart_30d, '[]'::jsonb),
        'topPages', v_top_pages,
        'deviceBreakdown', v_device_breakdown
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_analytics_summary(DATE) TO anon, authenticated, service_role;

-- 8. Notify PostgREST schema reload
NOTIFY pgrst, 'reload schema';
