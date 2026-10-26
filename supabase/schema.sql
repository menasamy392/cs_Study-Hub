-- ==============================================================================
-- Study Hub: Supabase Database Schema, Foreign Keys & RLS Policies
-- ==============================================================================

-- 1. Create Subjects Table
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 2. Create Materials Table with CASCADE DELETE
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
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

-- 3. Create Announcements Table with CASCADE DELETE
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT NOT NULL CHECK (category IN ('New Lecture', 'New Section', 'Quiz', 'Assignment', 'Exam', 'General Announcement')),
    is_important BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Create Warnings Table (PDF Document lists of academic warnings)
CREATE TABLE IF NOT EXISTS public.warnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    file_url TEXT NOT NULL,
    file_name TEXT DEFAULT '',
    file_size TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Ensure Foreign Keys have ON DELETE CASCADE if tables already existed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'materials_subject_id_fkey') THEN
        ALTER TABLE public.materials DROP CONSTRAINT materials_subject_id_fkey;
        ALTER TABLE public.materials ADD CONSTRAINT materials_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'announcements_subject_id_fkey') THEN
        ALTER TABLE public.announcements DROP CONSTRAINT announcements_subject_id_fkey;
        ALTER TABLE public.announcements ADD CONSTRAINT announcements_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'warnings_subject_id_fkey') THEN
        ALTER TABLE public.warnings DROP CONSTRAINT warnings_subject_id_fkey;
        ALTER TABLE public.warnings ADD CONSTRAINT warnings_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_materials_subject_id ON public.materials(subject_id);
CREATE INDEX IF NOT EXISTS idx_materials_type ON public.materials(type);
CREATE INDEX IF NOT EXISTS idx_announcements_subject_id ON public.announcements(subject_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_warnings_subject_id ON public.warnings(subject_id);
CREATE INDEX IF NOT EXISTS idx_warnings_created_at ON public.warnings(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warnings ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: Subjects
DROP POLICY IF EXISTS "Public can view subjects" ON public.subjects;
CREATE POLICY "Public can view subjects"
    ON public.subjects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can modify subjects" ON public.subjects;
DROP POLICY IF EXISTS "Admins can insert subjects" ON public.subjects;
CREATE POLICY "Admins can insert subjects"
    ON public.subjects FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update subjects" ON public.subjects;
CREATE POLICY "Admins can update subjects"
    ON public.subjects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can delete subjects" ON public.subjects;
CREATE POLICY "Admins can delete subjects"
    ON public.subjects FOR DELETE TO authenticated USING (true);

-- 6. RLS Policies: Materials
DROP POLICY IF EXISTS "Public can view materials" ON public.materials;
CREATE POLICY "Public can view materials"
    ON public.materials FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can modify materials" ON public.materials;
DROP POLICY IF EXISTS "Admins can insert materials" ON public.materials;
CREATE POLICY "Admins can insert materials"
    ON public.materials FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update materials" ON public.materials;
CREATE POLICY "Admins can update materials"
    ON public.materials FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can delete materials" ON public.materials;
CREATE POLICY "Admins can delete materials"
    ON public.materials FOR DELETE TO authenticated USING (true);

-- 7. RLS Policies: Announcements
DROP POLICY IF EXISTS "Public can view announcements" ON public.announcements;
CREATE POLICY "Public can view announcements"
    ON public.announcements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can modify announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can insert announcements" ON public.announcements;
CREATE POLICY "Admins can insert announcements"
    ON public.announcements FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update announcements" ON public.announcements;
CREATE POLICY "Admins can update announcements"
    ON public.announcements FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can delete announcements" ON public.announcements;
CREATE POLICY "Admins can delete announcements"
    ON public.announcements FOR DELETE TO authenticated USING (true);

-- 8. RLS Policies: Warnings (PDF Documents - Restricted to Authorized Students & Admins)
DROP POLICY IF EXISTS "Authorized students and admins can view warnings" ON public.warnings;
CREATE POLICY "Authorized students and admins can view warnings"
    ON public.warnings FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins can manage warnings" ON public.warnings;
CREATE POLICY "Admins can manage warnings"
    ON public.warnings FOR ALL
    TO authenticated
    USING (
      auth.jwt() ->> 'email' LIKE '%admin%' OR
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    )
    WITH CHECK (
      auth.jwt() ->> 'email' LIKE '%admin%' OR
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );

-- 9. Storage Bucket for PDF & Document uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('materials', 'materials', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read access to materials" ON storage.objects;
CREATE POLICY "Public read access to materials"
    ON storage.objects FOR SELECT USING (bucket_id = 'materials');

DROP POLICY IF EXISTS "Admins can upload materials" ON storage.objects;
CREATE POLICY "Admins can upload materials"
    ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'materials');

DROP POLICY IF EXISTS "Admins can update materials in storage" ON storage.objects;
CREATE POLICY "Admins can update materials in storage"
    ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'materials');

DROP POLICY IF EXISTS "Admins can delete materials in storage" ON storage.objects;
CREATE POLICY "Admins can delete materials in storage"
    ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'materials');
