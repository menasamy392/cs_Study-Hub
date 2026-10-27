import { parseCookies, verifySessionToken, COOKIE_NAME, getRequestBody, SESSION_SECRET } from '../_auth.js';
import { supabaseAdmin, isServerSupabaseConfigured, STORAGE_BUCKET, extractStoragePath } from '../_supabase.js';

const ALLOWED_TABLES = ['subjects', 'materials', 'announcements', 'warnings'];

// Clean up Supabase Storage file
async function removeStorageFile(fileUrl) {
  const storagePath = extractStoragePath(fileUrl);
  if (!storagePath) return;

  try {
    const { error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([storagePath]);
    if (error) {
      console.warn('Notice deleting storage file:', storagePath, error.message);
    }
  } catch (err) {
    console.warn('Error during storage file deletion:', err);
  }
}

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

      let inserted = null;
      let insertError = null;

      try {
        const resDirect = await supabaseAdmin
          .from(table)
          .insert([data])
          .select()
          .single();
        inserted = resDirect.data;
        insertError = resDirect.error;
      } catch (err) {
        insertError = err;
      }

      // Fallback to SECURITY DEFINER RPC if direct insert fails or is blocked by RLS
      if (insertError || !inserted) {
        console.log(`Direct insert failed on ${table}, attempting admin_mutate_record RPC...`, insertError?.message);
        const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc('admin_mutate_record', {
          p_secret: SESSION_SECRET,
          p_action: 'insert',
          p_table: table,
          p_data: data,
        });

        if (rpcErr || !rpcData) {
          return res.status(500).json({
            error: `Supabase insert error on ${table}: ${insertError?.message || rpcErr?.message}. Please run the latest SQL migration in Supabase SQL Editor.`,
          });
        }

        inserted = rpcData;
      }

      return res.status(200).json({ success: true, data: inserted });
    }

    // B. UPDATE
    if (action === 'update') {
      if (!id) return res.status(400).json({ error: 'Missing ID for update' });
      if (!data) return res.status(400).json({ error: 'Missing data payload for update' });

      let updated = null;
      let updateError = null;

      try {
        const resDirect = await supabaseAdmin
          .from(table)
          .update(data)
          .eq('id', id)
          .select()
          .single();
        updated = resDirect.data;
        updateError = resDirect.error;
      } catch (err) {
        updateError = err;
      }

      // Fallback to SECURITY DEFINER RPC if direct update fails or is blocked by RLS
      if (updateError || !updated) {
        console.log(`Direct update failed on ${table}, attempting admin_mutate_record RPC...`, updateError?.message);
        const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc('admin_mutate_record', {
          p_secret: SESSION_SECRET,
          p_action: 'update',
          p_table: table,
          p_data: data,
          p_id: id,
        });

        if (rpcErr || !rpcData) {
          return res.status(500).json({
            error: `Supabase update error on ${table}: ${updateError?.message || rpcErr?.message}. Please run the latest SQL migration in Supabase SQL Editor.`,
          });
        }

        updated = rpcData;
      }

      return res.status(200).json({ success: true, data: updated });
    }

    // C. DELETE (PERMANENT DELETION WITH STORAGE CLEANUP)
    if (action === 'delete') {
      if (!id) return res.status(400).json({ error: 'Missing ID for delete' });

      // 1. Collect files to delete from Supabase Storage
      const filesToDelete = [];
      try {
        if (table === 'materials' || table === 'warnings') {
          const { data: item } = await supabaseAdmin
            .from(table)
            .select('file_url')
            .eq('id', id)
            .maybeSingle();
          if (item?.file_url) filesToDelete.push(item.file_url);
        } else if (table === 'subjects') {
          const { data: mats } = await supabaseAdmin
            .from('materials')
            .select('file_url')
            .eq('subject_id', id);
          const { data: warns } = await supabaseAdmin
            .from('warnings')
            .select('file_url')
            .eq('subject_id', id);
          if (mats) filesToDelete.push(...mats.map((m) => m.file_url).filter(Boolean));
          if (warns) filesToDelete.push(...warns.map((w) => w.file_url).filter(Boolean));
        }
      } catch (fileErr) {
        console.warn('File gathering warning:', fileErr);
      }

      // 2. Cascade delete child items if deleting a subject
      if (table === 'subjects') {
        try {
          await supabaseAdmin.from('materials').delete().eq('subject_id', id);
          await supabaseAdmin.from('announcements').delete().eq('subject_id', id);
          await supabaseAdmin.from('warnings').delete().eq('subject_id', id);
        } catch (cascadeErr) {
          console.warn('Cascade delete notice:', cascadeErr);
        }
      }

      // 3. Attempt direct deletion
      let deleted = null;
      let deleteError = null;

      try {
        const resDirect = await supabaseAdmin
          .from(table)
          .delete()
          .eq('id', id)
          .select();
        deleted = resDirect.data;
        deleteError = resDirect.error;
      } catch (err) {
        deleteError = err;
      }

      // 4. If direct delete was blocked by RLS or returned 0 rows, use the RPC function!
      let confirmedDeleted = Boolean(deleted && deleted.length > 0);

      if (!confirmedDeleted) {
        console.log(`Direct delete returned 0 rows or error for ${table} (${id}), trying admin_delete_record RPC...`);
        const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc('admin_delete_record', {
          p_id: id,
          p_table: table,
          p_secret: SESSION_SECRET,
        });

        if (rpcErr) {
          console.error(`RPC admin_delete_record failed for ${table}:`, rpcErr);
          const isMissing =
            rpcErr.code === 'PGRST202' ||
            rpcErr.message?.includes('schema cache') ||
            rpcErr.message?.includes('admin_delete_record');

          return res.status(500).json({
            error: isMissing
              ? 'Supabase SQL Migration Required: The database delete procedure is not active in your Supabase project yet. Please open Supabase SQL Editor and execute the migration script (or add SUPABASE_SERVICE_ROLE_KEY in Vercel).'
              : `Database deletion failed: ${deleteError?.message || rpcErr.message}.`,
            requiresMigration: true,
          });
        }

        if (rpcRes?.success) {
          confirmedDeleted = true;
          if (rpcRes.deleted_files?.length) {
            filesToDelete.push(...rpcRes.deleted_files);
          }
        } else {
          return res.status(404).json({
            error: `Record with id "${id}" was not found in table "${table}".`,
          });
        }
      }

      // 5. Clean up associated files from Supabase Storage
      for (const fileUrl of filesToDelete) {
        await removeStorageFile(fileUrl);
      }

      return res.status(200).json({
        success: true,
        deletedId: id,
        table,
        message: `Permanently deleted record ${id} from ${table}.`,
      });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err) {
    console.error('Mutation error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error during database operation' });
  }
}
