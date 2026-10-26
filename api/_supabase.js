import { createClient } from '@supabase/supabase-js';

// Server-side Supabase configuration
const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  '';

// Prefer service role key for administrative serverless writes (bypasses RLS safely),
// fallback to anon key if service role is not yet supplied.
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

export function getServerSupabaseStatus() {
  if (!supabaseUrl || !supabaseKey) {
    return {
      configured: false,
      reason: 'Missing SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY).',
    };
  }

  if (
    supabaseUrl.includes('abcdefghijkl') ||
    supabaseUrl.includes('your-project-id') ||
    !supabaseUrl.startsWith('https://')
  ) {
    return {
      configured: false,
      reason: `Placeholder Supabase URL detected: "${supabaseUrl}". Please replace it with your real Supabase project URL (https://xyz.supabase.co) in Vercel settings.`,
    };
  }

  if (supabaseKey === 'anon public' || supabaseKey.length < 30) {
    return {
      configured: false,
      reason: `Placeholder Supabase key detected: "${supabaseKey}". Please replace it with your actual Supabase anon key or service_role key in Vercel settings.`,
    };
  }

  return { configured: true, reason: 'Ready' };
}

export const isServerSupabaseConfigured = getServerSupabaseStatus().configured;

export const supabaseAdmin = isServerSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

export const STORAGE_BUCKET = 'materials';
