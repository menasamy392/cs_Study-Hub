-- ==============================================================================
-- CS Study Hub: Section Sheet & Solution PDFs Migration
-- Run this in Supabase Dashboard -> SQL Editor -> Run
-- Adds independent Sheet PDF and Solution PDF support to practical sections
-- ==============================================================================

-- 1. Add Sheet & Solution columns to public.materials (Safe and Idempotent)
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS sheet_pdf_url TEXT DEFAULT '';
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS sheet_file_name TEXT DEFAULT '';
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS sheet_file_size TEXT DEFAULT '';
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS solution_pdf_url TEXT DEFAULT '';
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS solution_file_name TEXT DEFAULT '';
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS solution_file_size TEXT DEFAULT '';

-- 2. Migrate existing section file_url to sheet_pdf_url if empty (Preserves all existing uploads!)
UPDATE public.materials
SET
    sheet_pdf_url = COALESCE(NULLIF(sheet_pdf_url, ''), file_url),
    sheet_file_name = COALESCE(NULLIF(sheet_file_name, ''), file_name),
    sheet_file_size = COALESCE(NULLIF(sheet_file_size, ''), file_size)
WHERE type = 'section' AND (sheet_pdf_url IS NULL OR sheet_pdf_url = '') AND file_url IS NOT NULL AND file_url <> '';

-- 3. Dedicated Permanent Delete RPC (Bypasses RLS safely via SECURITY DEFINER)
-- Cleans up sheet and solution files from storage when section or subject is deleted
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

-- 5. Force PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
