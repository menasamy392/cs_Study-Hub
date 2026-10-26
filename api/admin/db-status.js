import { parseCookies, verifySessionToken, COOKIE_NAME } from '../_auth.js';
import { supabaseAdmin, isServerSupabaseConfigured, STORAGE_BUCKET, getServerSupabaseStatus } from '../_supabase.js';

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

  const configStatus = getServerSupabaseStatus();
  if (!configStatus.configured || !supabaseAdmin) {
    return res.status(200).json({
      connected: false,
      configured: false,
      error: configStatus.reason,
    });
  }

  try {
    // 1. Ping Subjects table
    const { count: subjectCount, error: subError } = await supabaseAdmin
      .from('subjects')
      .select('*', { count: 'exact', head: true });

    if (subError) {
      return res.status(200).json({
        connected: false,
        configured: true,
        error: `Supabase database error: ${subError.message}. Make sure you have executed supabase/schema.sql in your Supabase SQL Editor.`,
      });
    }

    // 2. Ping Materials table
    const { count: matCount, error: matError } = await supabaseAdmin
      .from('materials')
      .select('*', { count: 'exact', head: true });

    // 3. Ping Announcements table
    const { count: annCount, error: annError } = await supabaseAdmin
      .from('announcements')
      .select('*', { count: 'exact', head: true });

    // 4. Ping Warnings table
    const { count: warnCount, error: warnError } = await supabaseAdmin
      .from('warnings')
      .select('*', { count: 'exact', head: true });

    // 5. Check Storage Bucket
    let storageReady = false;
    try {
      const { data: buckets, error: bError } = await supabaseAdmin.storage.listBuckets();
      if (!bError && buckets) {
        storageReady = buckets.some((b) => b.id === STORAGE_BUCKET || b.name === STORAGE_BUCKET);
      }
    } catch {
      storageReady = false;
    }

    return res.status(200).json({
      connected: true,
      configured: true,
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
