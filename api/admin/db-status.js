import { parseCookies, verifySessionToken, COOKIE_NAME } from '../_auth.js';
import { supabaseAdmin, supabaseUrl, supabaseKey, STORAGE_BUCKET } from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // Verify Admin Session Cookie
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies[COOKIE_NAME];
  const payload = verifySessionToken(token);

  if (!payload || payload.role !== 'admin') {
    return res.status(401).json({
      error: 'Unauthorized: Admin session required.',
    });
  }

  try {
    // 1. Check if public.subjects table exists using GET with limit 1
    const { data: subData, error: subError } = await supabaseAdmin
      .from('subjects')
      .select('id')
      .limit(1);

    if (subError) {
      const isMissingTable =
        subError.code === 'PGRST205' ||
        subError.code === '42P01' ||
        subError.message?.includes('Could not find the table') ||
        subError.message?.includes('relation "public.subjects" does not exist') ||
        subError.message?.includes('schema cache');

      return res.status(200).json({
        connected: true,
        configured: true,
        tablesReady: !isMissingTable,
        projectRef: 'qksklthfpbcwseiqpajq',
        url: supabaseUrl,
        keyPrefix: supabaseKey ? supabaseKey.substring(0, 15) + '...' : 'none',
        subError: subError,
        message: isMissingTable
          ? 'Connected to Supabase Cloud Project (qksklthfpbcwseiqpajq)! Database tables are not created yet. Please execute the SQL schema in Supabase SQL Editor.'
          : `Supabase query error: ${subError.message}`,
      });
    }

    // 2. Fetch actual counts
    const { count: subjectCount } = await supabaseAdmin
      .from('subjects')
      .select('*', { count: 'exact' });

    const { count: matCount } = await supabaseAdmin
      .from('materials')
      .select('*', { count: 'exact' });

    const { count: annCount } = await supabaseAdmin
      .from('announcements')
      .select('*', { count: 'exact' });

    const { count: warnCount } = await supabaseAdmin
      .from('warnings')
      .select('*', { count: 'exact' });

    // 3. Check Storage Bucket
    let storageReady = false;
    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      if (buckets) {
        storageReady = buckets.some((b) => b.id === STORAGE_BUCKET || b.name === STORAGE_BUCKET);
      }
    } catch {
      storageReady = false;
    }

    return res.status(200).json({
      connected: true,
      configured: true,
      tablesReady: true,
      projectRef: 'qksklthfpbcwseiqpajq',
      url: supabaseUrl,
      keyPrefix: supabaseKey ? supabaseKey.substring(0, 15) + '...' : 'none',
      counts: {
        subjects: subjectCount || 0,
        materials: matCount || 0,
        announcements: annCount || 0,
        warnings: warnCount || 0,
      },
      storageBucket: {
        name: STORAGE_BUCKET,
        ready: storageReady,
      },
      message: 'Supabase Cloud Database & Storage are fully connected and verified.',
    });
  } catch (err) {
    console.error('Database connection test error:', err);
    return res.status(200).json({
      connected: false,
      configured: true,
      error: `Connection attempt failed: ${err.message}`,
    });
  }
}
