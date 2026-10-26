import { parseCookies, verifySessionToken, COOKIE_NAME, getRequestBody } from '../_auth.js';
import { supabaseAdmin, isServerSupabaseConfigured } from '../_supabase.js';

const ALLOWED_TABLES = ['subjects', 'materials', 'announcements', 'warnings'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // 1. Verify Admin Session Cookie
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies[COOKIE_NAME];
  const payload = verifySessionToken(token);

  if (!payload || payload.role !== 'admin') {
    return res.status(401).json({
      error: 'Unauthorized: You must be logged in as an Administrator to modify cloud database content.',
    });
  }

  // 2. Check Supabase Connectivity
  if (!isServerSupabaseConfigured || !supabaseAdmin) {
    return res.status(503).json({
      error:
        'Supabase cloud database is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) in Vercel Environment Variables.',
      isConfigured: false,
    });
  }

  try {
    const body = await getRequestBody(req);
    const { action, table, data, id } = body || {};

    // S. SEED INITIAL CURRICULUM
    if (action === 'seed') {
      const { subjects = [], materials = [], announcements = [] } = data || {};
      let insertedSubs = 0;
      let insertedMats = 0;
      let insertedAnn = 0;

      if (subjects.length > 0) {
        const { error: sErr } = await supabaseAdmin
          .from('subjects')
          .upsert(subjects, { onConflict: 'id', ignoreDuplicates: true });
        if (sErr) console.warn('Seed subjects warning:', sErr);
        else insertedSubs = subjects.length;
      }

      if (materials.length > 0) {
        const { error: mErr } = await supabaseAdmin
          .from('materials')
          .upsert(materials, { onConflict: 'id', ignoreDuplicates: true });
        if (mErr) console.warn('Seed materials warning:', mErr);
        else insertedMats = materials.length;
      }

      if (announcements.length > 0) {
        const { error: aErr } = await supabaseAdmin
          .from('announcements')
          .upsert(announcements, { onConflict: 'id', ignoreDuplicates: true });
        if (aErr) console.warn('Seed announcements warning:', aErr);
        else insertedAnn = announcements.length;
      }

      return res.status(200).json({
        success: true,
        message: `Successfully seeded ${insertedSubs} subjects, ${insertedMats} materials, and ${insertedAnn} announcements.`,
      });
    }

    if (!ALLOWED_TABLES.includes(table)) {
      return res.status(400).json({ error: `Invalid table: ${table}` });
    }

    // A. INSERT
    if (action === 'insert') {
      if (!data) return res.status(400).json({ error: 'Missing data payload for insert' });

      const { data: inserted, error } = await supabaseAdmin
        .from(table)
        .insert([data])
        .select()
        .single();

      if (error) {
        console.error(`Supabase insert error on ${table}:`, error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ success: true, data: inserted });
    }

    // B. UPDATE
    if (action === 'update') {
      if (!id) return res.status(400).json({ error: 'Missing ID for update' });
      if (!data) return res.status(400).json({ error: 'Missing data payload for update' });

      const { data: updated, error } = await supabaseAdmin
        .from(table)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Supabase update error on ${table}:`, error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ success: true, data: updated });
    }

    // C. DELETE
    if (action === 'delete') {
      if (!id) return res.status(400).json({ error: 'Missing ID for delete' });

      // If deleting a subject, cascade delete child items first to guarantee consistency
      if (table === 'subjects') {
        try {
          await supabaseAdmin.from('materials').delete().eq('subject_id', id);
          await supabaseAdmin.from('announcements').delete().eq('subject_id', id);
          await supabaseAdmin.from('warnings').delete().eq('subject_id', id);
        } catch (cascadeErr) {
          console.warn('Cascade delete notice:', cascadeErr);
        }
      }

      const { data: deleted, error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq('id', id)
        .select();

      if (error) {
        console.error(`Supabase delete error on ${table}:`, error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ success: true, deletedCount: deleted?.length || 1 });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err) {
    console.error('Mutation error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error during database operation' });
  }
}
