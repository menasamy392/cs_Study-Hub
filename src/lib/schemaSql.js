export const SCHEMA_SQL = `-- ==============================================================================
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

-- 7. RLS Policies: Authenticated / Admin Modifications
DROP POLICY IF EXISTS "Admins can insert subjects" ON public.subjects;
CREATE POLICY "Admins can insert subjects" ON public.subjects FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can update subjects" ON public.subjects;
CREATE POLICY "Admins can update subjects" ON public.subjects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can delete subjects" ON public.subjects;
CREATE POLICY "Admins can delete subjects" ON public.subjects FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert materials" ON public.materials;
CREATE POLICY "Admins can insert materials" ON public.materials FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can update materials" ON public.materials;
CREATE POLICY "Admins can update materials" ON public.materials FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can delete materials" ON public.materials;
CREATE POLICY "Admins can delete materials" ON public.materials FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert announcements" ON public.announcements;
CREATE POLICY "Admins can insert announcements" ON public.announcements FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can update announcements" ON public.announcements;
CREATE POLICY "Admins can update announcements" ON public.announcements FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can delete announcements" ON public.announcements;
CREATE POLICY "Admins can delete announcements" ON public.announcements FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert warnings" ON public.warnings;
CREATE POLICY "Admins can insert warnings" ON public.warnings FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can update warnings" ON public.warnings;
CREATE POLICY "Admins can update warnings" ON public.warnings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can delete warnings" ON public.warnings;
CREATE POLICY "Admins can delete warnings" ON public.warnings FOR DELETE TO authenticated USING (true);

-- 8. Storage Bucket for PDF Documents & Lecture Slides
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
    ON storage.objects FOR UPDATE USING (bucket_id = 'materials');

DROP POLICY IF EXISTS "Allow deletes to materials" ON storage.objects;
CREATE POLICY "Allow deletes to materials"
    ON storage.objects FOR DELETE USING (bucket_id = 'materials');

-- 9. Enable Realtime Broadcasting for all tables
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

-- 10. Initial Seed Data
INSERT INTO public.subjects (id, name, code, instructor, semester, description, icon, color, order_index)
VALUES 
('sub-5', 'Compiler Design', 'CS321 / CS309', 'Dr. Lamiaa Hassaan (exams also Dr. Ahmed Ibrahim)', 'Level 3 • Semester 1 • Core course', 'Lexical analysis, syntax analysis (LL and LR parsing), semantic checking, intermediate code generation, and runtime memory management.', 'Cpu', 'blue', 1),
('sub-1', 'Database 2', 'CS312', 'Dr. Ahmed Mansour', 'Level 3 • Semester 2 • Core course', 'Advanced relational database management, query optimization, indexing, transaction processing, concurrency control, and NoSQL databases.', 'Database', 'emerald', 2),
('sub-2', 'DSS Modeling and Analysis', 'CS421', 'Dr. Hanaa Mostafa', 'Level 4 • Semester 1 • Major course', 'Decision Support Systems, multi-criteria decision making, predictive modeling, data warehousing concepts, and analytical hierarchy processes.', 'BarChart3', 'indigo', 3),
('sub-3', 'E-Commerce', 'CS335', 'Dr. Tarek El-Sayed', 'Level 3 • Semester 1 • Core course', 'Electronic commerce architectures, digital payment gateways, security protocols (SSL/TLS), online marketing systems, and cloud-hosted retail infrastructures.', 'ShoppingCart', 'amber', 4),
('sub-4', 'Data Protection', 'CS442', 'Dr. Khaled Fawzy', 'Level 4 • Semester 2 • Security track', 'Information security governance, cryptography foundations, access control models, GDPR/compliance, and defenses against privacy breaches.', 'ShieldCheck', 'rose', 5)
ON CONFLICT (id) DO NOTHING;

-- Seed Sample Announcements
INSERT INTO public.announcements (id, subject_id, title, description, category, is_important, created_at)
VALUES
('ann-1', 'sub-5', 'Compiler Design Midterm Exam Scheduled', 'Midterm exam will cover Lectures 1 to 4 and Sections 1 to 3. Bring scientific calculators.', 'Exam', true, NOW()),
('ann-2', 'sub-1', 'Database 2 Project Milestone 1 Due', 'Submit your ER diagram and relational mapping schema on the department portal by Thursday 11:59 PM.', 'Assignment', true, NOW()),
('ann-3', 'sub-5', 'Section 4 Practice Sheets Uploaded', 'LL(1) parsing table construction exercises and first & follow calculations have been uploaded.', 'New Section', false, NOW())
ON CONFLICT (id) DO NOTHING;
`;
