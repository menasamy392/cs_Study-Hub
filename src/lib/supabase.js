import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Detailed diagnostic validator for Supabase credentials
export function getSupabaseConfigStatus() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      isConfigured: false,
      reason: 'Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are missing in Vercel.',
    };
  }

  if (
    supabaseUrl.includes('abcdefghijkl') ||
    supabaseUrl.includes('your-project-id') ||
    !supabaseUrl.startsWith('https://')
  ) {
    return {
      isConfigured: false,
      reason: `VITE_SUPABASE_URL is currently set to placeholder value "${supabaseUrl}". Replace it with your actual Supabase Project URL in Vercel.`,
    };
  }

  if (supabaseAnonKey === 'anon public' || supabaseAnonKey.length < 30) {
    return {
      isConfigured: false,
      reason: `VITE_SUPABASE_ANON_KEY is set to placeholder text "${supabaseAnonKey}". Replace it with your actual Supabase anon public key (a long JWT token) in Vercel.`,
    };
  }

  return { isConfigured: true, reason: 'Valid configuration format' };
}

const status = getSupabaseConfigStatus();

export const isSupabaseConfigured = status.isConfigured;
export const supabaseConfigReason = status.reason;

// If configured, instantiate the client; otherwise null
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export const SUPABASE_STORAGE_BUCKET = 'materials';

// Helper to test if client can actually reach Supabase
export async function testSupabaseClientConnection() {
  if (!supabase || !isSupabaseConfigured) {
    return { connected: false, error: supabaseConfigReason };
  }

  try {
    const { count, error } = await supabase
      .from('subjects')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return { connected: false, error: error.message };
    }

    return { connected: true, count };
  } catch (err) {
    return { connected: false, error: err.message };
  }
}
