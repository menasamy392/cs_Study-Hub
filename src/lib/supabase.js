import { createClient } from '@supabase/supabase-js';

const rawUrl = (
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''
).trim();

const rawKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''
).trim();

const isPlaceholderUrl =
  !rawUrl ||
  rawUrl.includes('abcdefghijkl') ||
  rawUrl.includes('your-project-id') ||
  !rawUrl.startsWith('https://');

const isPlaceholderKey =
  !rawKey ||
  rawKey === 'anon public' ||
  rawKey.length < 20;

// Connect to verified Supabase Project
export const supabaseUrl = isPlaceholderUrl
  ? 'https://qksklthfpbcwseiqpajq.supabase.co'
  : rawUrl;

export const supabaseAnonKey = isPlaceholderKey
  ? (typeof atob === 'function' ? atob('c2JfcHVibGlzaGFibGVfZ3lQQ1lET3RMTnRnUWNqdDFqYUt6UV9kZmY0QV83TQ==') : '')
  : rawKey;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://')
);

export const supabaseConfigReason = isSupabaseConfigured
  ? 'Connected to Supabase Project: qksklthfpbcwseiqpajq'
  : 'Missing Supabase credentials';

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export const SUPABASE_STORAGE_BUCKET = 'materials';

export async function testSupabaseClientConnection() {
  if (!supabase || !isSupabaseConfigured) {
    return { connected: false, error: 'Supabase client not initialized' };
  }

  try {
    const { data, error } = await supabase.from('subjects').select('id').limit(1);
    if (error) {
      if (
        error.message?.includes('Could not find the table') ||
        error.message?.includes('relation "public.subjects" does not exist') ||
        error.code === 'PGRST205' ||
        error.code === '42P01'
      ) {
        return {
          connected: true,
          tablesReady: false,
          error: 'Connected to Supabase Cloud, but database tables are not yet created in SQL Editor.',
        };
      }
      return { connected: false, tablesReady: false, error: error.message };
    }
    return { connected: true, tablesReady: true, count: data?.length ?? 0 };
  } catch (err) {
    return { connected: false, tablesReady: false, error: err.message || 'Connection failed' };
  }
}
