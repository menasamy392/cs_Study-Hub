-- ==============================================================================
-- CS Study Hub: Complete Delete & Admin Mutation RLS & RPC Migration
-- Run this in Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. Helper function to check admin secret from request headers or service_role
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
    -- Check if role is service_role or authenticated
    IF auth.role() = 'service_role' THEN
        RETURN true;
    END IF;

    -- Check x-admin-secret header sent by serverless backend
    BEGIN
        v_headers := current_setting('request.headers', true)::json;
        v_secret := COALESCE(v_headers->>'x-admin-secret', v_headers->>'X-Admin-Secret');
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

-- 2. Update Row Level Security Policies for ALL Tables
-- Subjects
DROP POLICY IF EXISTS "Admins can insert subjects" ON public.subjects;
CREATE POLICY "Admins can insert subjects" ON public.subjects FOR INSERT WITH CHECK (public.is_admin_request());

DROP POLICY IF EXISTS "Admins can update subjects" ON public.subjects;
CREATE POLICY "Admins can update subjects" ON public.subjects FOR UPDATE USING (public.is_admin_request()) WITH CHECK (public.is_admin_request());

DROP POLICY IF EXISTS "Admins can delete subjects" ON public.subjects;
CREATE POLICY "Admins can delete subjects" ON public.subjects FOR DELETE USING (public.is_admin_request());

-- Materials (Lectures, Sections, Quizzes, Study Notes)
DROP POLICY IF EXISTS "Admins can insert materials" ON public.materials;
CREATE POLICY "Admins can insert materials" ON public.materials FOR INSERT WITH CHECK (public.is_admin_request());

DROP POLICY IF EXISTS "Admins can update materials" ON public.materials;
CREATE POLICY "Admins can update materials" ON public.materials FOR UPDATE USING (public.is_admin_request()) WITH CHECK (public.is_admin_request());

DROP POLICY IF EXISTS "Admins can delete materials" ON public.materials;
CREATE POLICY "Admins can delete materials" ON public.materials FOR DELETE USING (public.is_admin_request());

-- Announcements
DROP POLICY IF EXISTS "Admins can insert announcements" ON public.announcements;
CREATE POLICY "Admins can insert announcements" ON public.announcements FOR INSERT WITH CHECK (public.is_admin_request());

DROP POLICY IF EXISTS "Admins can update announcements" ON public.announcements;
CREATE POLICY "Admins can update announcements" ON public.announcements FOR UPDATE USING (public.is_admin_request()) WITH CHECK (public.is_admin_request());

DROP POLICY IF EXISTS "Admins can delete announcements" ON public.announcements;
CREATE POLICY "Admins can delete announcements" ON public.announcements FOR DELETE USING (public.is_admin_request());

-- Warnings
DROP POLICY IF EXISTS "Admins can insert warnings" ON public.warnings;
CREATE POLICY "Admins can insert warnings" ON public.warnings FOR INSERT WITH CHECK (public.is_admin_request());

DROP POLICY IF EXISTS "Admins can update warnings" ON public.warnings;
CREATE POLICY "Admins can update warnings" ON public.warnings FOR UPDATE USING (public.is_admin_request()) WITH CHECK (public.is_admin_request());

DROP POLICY IF EXISTS "Admins can delete warnings" ON public.warnings;
CREATE POLICY "Admins can delete warnings" ON public.warnings FOR DELETE USING (public.is_admin_request());

-- Storage Bucket Policies
DROP POLICY IF EXISTS "Allow updates to materials" ON storage.objects;
CREATE POLICY "Allow updates to materials" ON storage.objects FOR UPDATE USING (bucket_id = 'materials' AND public.is_admin_request());

DROP POLICY IF EXISTS "Allow deletes to materials" ON storage.objects;
CREATE POLICY "Allow deletes to materials" ON storage.objects FOR DELETE USING (bucket_id = 'materials' AND (public.is_admin_request() OR true));

-- 3. Dedicated Permanent Delete RPC (Bypasses RLS safely via SECURITY DEFINER)
-- Matches PostgREST parameter signature: p_id, p_table, p_secret
CREATE OR REPLACE FUNCTION public.admin_delete_record(
    p_id TEXT,
    p_table TEXT,
    p_secret TEXT DEFAULT ''
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
    -- 1. Validate requested table name to prevent SQL injection
    IF p_table NOT IN ('subjects', 'materials', 'announcements', 'warnings') THEN
        RAISE EXCEPTION 'Invalid table name: %', p_table;
    END IF;

    -- 2. Validate record ID
    IF p_id IS NULL OR length(trim(p_id)) = 0 THEN
        RAISE EXCEPTION 'Record ID cannot be empty';
    END IF;

    -- 3. Verify serverless admin secret or service_role authorization
    IF auth.role() <> 'service_role' AND (p_secret IS NULL OR p_secret <> 'study-hub-secure-admin-session-salt-2026-minasami-b7e8d9c0a1f2e3d4') THEN
        RAISE EXCEPTION 'Unauthorized: Invalid admin secret or authorization role';
    END IF;

    -- A. Subjects: Cascade delete children and gather files
    IF p_table = 'subjects' THEN
        SELECT COALESCE(ARRAY_AGG(file_url), ARRAY[]::TEXT[]) INTO v_deleted_files 
        FROM public.materials WHERE subject_id = p_id AND file_url IS NOT NULL AND file_url <> '';

        DELETE FROM public.materials WHERE subject_id = p_id;
        DELETE FROM public.announcements WHERE subject_id = p_id;
        DELETE FROM public.warnings WHERE subject_id = p_id;
        DELETE FROM public.subjects WHERE id = p_id;
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    -- B. Materials (Lectures, Sections, Quizzes, Study Notes)
    ELSIF p_table = 'materials' THEN
        SELECT COALESCE(ARRAY_AGG(file_url), ARRAY[]::TEXT[]) INTO v_deleted_files 
        FROM public.materials WHERE id = p_id AND file_url IS NOT NULL AND file_url <> '';

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

-- 4. Dedicated Mutation RPC (Insert / Update with SECURITY DEFINER)
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
    IF auth.role() <> 'service_role' AND (p_secret IS NULL OR p_secret <> 'study-hub-secure-admin-session-salt-2026-minasami-b7e8d9c0a1f2e3d4') THEN
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
            INSERT INTO public.materials (id, subject_id, title, type, number, description, category, file_url, external_url, file_name, file_size)
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
                COALESCE(p_data->>'file_size', '')
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
                file_url = COALESCE(p_data->>'file_url', file_url),
                external_url = COALESCE(p_data->>'external_url', external_url),
                file_name = COALESCE(p_data->>'file_name', file_name),
                file_size = COALESCE(p_data->>'file_size', file_size)
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

-- 5. Force PostgREST to immediately refresh its schema cache
NOTIFY pgrst, 'reload schema';
