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
