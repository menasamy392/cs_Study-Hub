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

// Safely check if a storage file is referenced elsewhere before deleting
async function isFileReferencedElsewhere(fileUrl, excludeTable = null, excludeId = null) {
  if (!fileUrl) return false;
  const targetPath = extractStoragePath(fileUrl);
  if (!targetPath) return false;

  try {
    const { data: mats } = await supabaseAdmin
      .from('materials')
      .select('id, file_url, external_url')
      .limit(300);

    if (mats) {
      for (const m of mats) {
        if (excludeTable === 'materials' && String(m.id) === String(excludeId)) continue;
        if (m.file_url && extractStoragePath(m.file_url) === targetPath) return true;
        if (m.external_url && m.external_url.includes(targetPath)) return true;
      }
    }

    const { data: warns } = await supabaseAdmin
      .from('warnings')
      .select('id, file_url')
      .limit(300);

    if (warns) {
      for (const w of warns) {
        if (excludeTable === 'warnings' && String(w.id) === String(excludeId)) continue;
        if (w.file_url && extractStoragePath(w.file_url) === targetPath) return true;
      }
    }
  } catch (err) {
    console.warn('Reference check notice:', err);
    return true; // Conservative fallback: if error, do not delete
  }
  return false;
}

// Only remove storage file if not referenced by another educational item
async function safelyDeleteOldFile(fileUrl, excludeTable = null, excludeId = null) {
  if (!fileUrl) return false;
  const isReferenced = await isFileReferencedElsewhere(fileUrl, excludeTable, excludeId);
  if (!isReferenced) {
    await removeStorageFile(fileUrl);
    return true;
  }
  return false;
}

// Unpack encoded metadata from external_url if columns were stored as fallback
function unpackMaterialMeta(record) {
  if (!record || typeof record !== 'object') return record;
  if (record.external_url && record.external_url.startsWith('__studyhub_meta__:')) {
    try {
      const meta = JSON.parse(record.external_url.replace('__studyhub_meta__:', ''));
      return {
        ...record,
        sheet_pdf_url: record.sheet_pdf_url || meta.sheet_pdf_url || (record.type === 'section' ? record.file_url : ''),
        sheet_file_name: record.sheet_file_name || meta.sheet_file_name || (record.type === 'section' ? record.file_name : ''),
        sheet_file_size: record.sheet_file_size || meta.sheet_file_size || (record.type === 'section' ? record.file_size : ''),
        solution_pdf_url: record.solution_pdf_url || meta.solution_pdf_url || '',
        solution_file_name: record.solution_file_name || meta.solution_file_name || '',
        solution_file_size: record.solution_file_size || meta.solution_file_size || '',
        external_url: meta.real_external_url || '',
      };
    } catch {}
  }
  return record;
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

      // If column sheet_pdf_url/solution_pdf_url missing in Supabase schema, fallback safely
      if (insertError && table === 'materials') {
        const isMissingCol =
          insertError.code === 'PGRST204' ||
          insertError.message?.includes('sheet_pdf_url') ||
          insertError.message?.includes('solution_pdf_url');

        if (isMissingCol) {
          const fallbackMeta = {
            sheet_pdf_url: data.sheet_pdf_url || '',
            sheet_file_name: data.sheet_file_name || '',
            sheet_file_size: data.sheet_file_size || '',
            solution_pdf_url: data.solution_pdf_url || '',
            solution_file_name: data.solution_file_name || '',
            solution_file_size: data.solution_file_size || '',
            real_external_url: data.external_url || '',
          };

          const stripped = { ...data };
          delete stripped.sheet_pdf_url;
          delete stripped.sheet_file_name;
          delete stripped.sheet_file_size;
          delete stripped.solution_pdf_url;
          delete stripped.solution_file_name;
          delete stripped.solution_file_size;

          if (fallbackMeta.sheet_pdf_url) {
            stripped.file_url = fallbackMeta.sheet_pdf_url;
            stripped.file_name = fallbackMeta.sheet_file_name;
            stripped.file_size = fallbackMeta.sheet_file_size;
          }
          stripped.external_url = `__studyhub_meta__:${JSON.stringify(fallbackMeta)}`;

          const resFallback = await supabaseAdmin
            .from(table)
            .insert([stripped])
            .select()
            .single();

          if (!resFallback.error && resFallback.data) {
            inserted = unpackMaterialMeta(resFallback.data);
            insertError = null;
          }
        }
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

      return res.status(200).json({ success: true, data: unpackMaterialMeta(inserted) });
    }

    // B. UPDATE
    if (action === 'update') {
      if (!id) return res.status(400).json({ error: 'Missing ID for update' });
      if (!data) return res.status(400).json({ error: 'Missing data payload for update' });

      // Separate any cleanup instructions passed in data
      const {
        old_file_url,
        old_sheet_url,
        old_solution_url,
        ...updatePayload
      } = data;

      let updated = null;
      let updateError = null;

      try {
        const resDirect = await supabaseAdmin
          .from(table)
          .update(updatePayload)
          .eq('id', id)
          .select()
          .single();
        updated = resDirect.data;
        updateError = resDirect.error;
      } catch (err) {
        updateError = err;
      }

      // If column sheet_pdf_url/solution_pdf_url missing in Supabase schema, fallback safely
      if (updateError && table === 'materials') {
        const isMissingCol =
          updateError.code === 'PGRST204' ||
          updateError.message?.includes('sheet_pdf_url') ||
          updateError.message?.includes('solution_pdf_url');

        if (isMissingCol) {
          const fallbackMeta = {
            sheet_pdf_url: updatePayload.sheet_pdf_url || '',
            sheet_file_name: updatePayload.sheet_file_name || '',
            sheet_file_size: updatePayload.sheet_file_size || '',
            solution_pdf_url: updatePayload.solution_pdf_url || '',
            solution_file_name: updatePayload.solution_file_name || '',
            solution_file_size: updatePayload.solution_file_size || '',
            real_external_url: updatePayload.external_url || '',
          };

          const stripped = { ...updatePayload };
          delete stripped.sheet_pdf_url;
          delete stripped.sheet_file_name;
          delete stripped.sheet_file_size;
          delete stripped.solution_pdf_url;
          delete stripped.solution_file_name;
          delete stripped.solution_file_size;

          if (fallbackMeta.sheet_pdf_url) {
            stripped.file_url = fallbackMeta.sheet_pdf_url;
            stripped.file_name = fallbackMeta.sheet_file_name;
            stripped.file_size = fallbackMeta.sheet_file_size;
          }
          stripped.external_url = `__studyhub_meta__:${JSON.stringify(fallbackMeta)}`;

          const resFallback = await supabaseAdmin
            .from(table)
            .update(stripped)
            .eq('id', id)
            .select()
            .single();

          if (!resFallback.error && resFallback.data) {
            updated = unpackMaterialMeta(resFallback.data);
            updateError = null;
          }
        }
      }

      // Fallback to SECURITY DEFINER RPC if direct update fails or is blocked by RLS
      if (updateError || !updated) {
        console.log(`Direct update failed on ${table}, attempting admin_mutate_record RPC...`, updateError?.message);
        const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc('admin_mutate_record', {
          p_secret: SESSION_SECRET,
          p_action: 'update',
          p_table: table,
          p_data: updatePayload,
          p_id: id,
        });

        if (rpcErr || !rpcData) {
          return res.status(500).json({
            error: `Supabase update error on ${table}: ${updateError?.message || rpcErr?.message}. Please run the latest SQL migration in Supabase SQL Editor.`,
          });
        }

        updated = rpcData;
      }

      // Safe old file cleanup: only clean up if update succeeded and file is unreferenced
      if (updated) {
        if (old_file_url && old_file_url !== updatePayload.file_url) {
          await safelyDeleteOldFile(old_file_url, table, id);
        }
        if (old_sheet_url && old_sheet_url !== updatePayload.sheet_pdf_url) {
          await safelyDeleteOldFile(old_sheet_url, table, id);
        }
        if (old_solution_url && old_solution_url !== updatePayload.solution_pdf_url) {
          await safelyDeleteOldFile(old_solution_url, table, id);
        }
      }

      return res.status(200).json({ success: true, data: unpackMaterialMeta(updated) });
    }

    // C. ATOMIC SAFE REPLACE FILE
    if (action === 'safe_replace_file') {
      const { field, newUrl, newName, newSize, oldUrl } = data || {};
      if (!id) return res.status(400).json({ error: 'Missing ID for replace' });
      if (!newUrl) return res.status(400).json({ error: 'Missing newUrl for replace' });

      // 1. Fetch current material
      const { data: currentItem, error: fetchErr } = await supabaseAdmin
        .from('materials')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchErr || !currentItem) {
        return res.status(404).json({ error: `Material with id "${id}" not found: ${fetchErr?.message}` });
      }

      const unpackedCurrent = unpackMaterialMeta(currentItem);

      // 2. Prepare atomic update
      const updatePayload = {};
      if (field === 'sheet') {
        updatePayload.sheet_pdf_url = newUrl;
        updatePayload.sheet_file_name = newName || '';
        updatePayload.sheet_file_size = newSize || '';
        updatePayload.file_url = newUrl;
        updatePayload.file_name = newName || '';
        updatePayload.file_size = newSize || '';
      } else if (field === 'solution') {
        updatePayload.solution_pdf_url = newUrl;
        updatePayload.solution_file_name = newName || '';
        updatePayload.solution_file_size = newSize || '';
      } else {
        updatePayload.file_url = newUrl;
        updatePayload.file_name = newName || '';
        updatePayload.file_size = newSize || '';
      }

      let updated = null;
      let updateError = null;

      try {
        const resDirect = await supabaseAdmin
          .from('materials')
          .update(updatePayload)
          .eq('id', id)
          .select()
          .single();
        updated = resDirect.data;
        updateError = resDirect.error;
      } catch (err) {
        updateError = err;
      }

      // Schema fallback if columns do not exist yet
      if (updateError || !updated) {
        const fallbackMeta = {
          sheet_pdf_url: field === 'sheet' ? newUrl : (unpackedCurrent.sheet_pdf_url || unpackedCurrent.file_url || ''),
          sheet_file_name: field === 'sheet' ? newName : (unpackedCurrent.sheet_file_name || unpackedCurrent.file_name || ''),
          sheet_file_size: field === 'sheet' ? newSize : (unpackedCurrent.sheet_file_size || unpackedCurrent.file_size || ''),
          solution_pdf_url: field === 'solution' ? newUrl : (unpackedCurrent.solution_pdf_url || ''),
          solution_file_name: field === 'solution' ? newName : (unpackedCurrent.solution_file_name || ''),
          solution_file_size: field === 'solution' ? newSize : (unpackedCurrent.solution_file_size || ''),
          real_external_url: unpackedCurrent.external_url || '',
        };

        const strippedPayload = {};
        if (field === 'sheet') {
          strippedPayload.file_url = newUrl;
          strippedPayload.file_name = newName || '';
          strippedPayload.file_size = newSize || '';
        }
        strippedPayload.external_url = `__studyhub_meta__:${JSON.stringify(fallbackMeta)}`;

        const resFallback = await supabaseAdmin
          .from('materials')
          .update(strippedPayload)
          .eq('id', id)
          .select()
          .single();

        if (resFallback.error || !resFallback.data) {
          return res.status(500).json({
            error: `Database update failed: ${resFallback.error?.message || updateError?.message}`,
          });
        }

        updated = {
          ...resFallback.data,
          sheet_pdf_url: fallbackMeta.sheet_pdf_url,
          sheet_file_name: fallbackMeta.sheet_file_name,
          sheet_file_size: fallbackMeta.sheet_file_size,
          solution_pdf_url: fallbackMeta.solution_pdf_url,
          solution_file_name: fallbackMeta.solution_file_name,
          solution_file_size: fallbackMeta.solution_file_size,
          external_url: fallbackMeta.real_external_url,
        };
      }

      // 3. Deletion of previous file ONLY after replacement is confirmed
      const targetOldUrl = oldUrl || (field === 'sheet' ? unpackedCurrent.sheet_pdf_url || unpackedCurrent.file_url : unpackedCurrent.solution_pdf_url);
      if (targetOldUrl && targetOldUrl !== newUrl) {
        await safelyDeleteOldFile(targetOldUrl, 'materials', id);
      }

      return res.status(200).json({
        success: true,
        data: unpackMaterialMeta(updated),
        message: `${field === 'sheet' ? 'Sheet' : field === 'solution' ? 'Solution' : 'Material'} PDF replaced successfully.`,
      });
    }

    // D. ATOMIC SAFE DELETE PDF
    if (action === 'safe_delete_pdf') {
      const { field } = data || {};
      if (!id) return res.status(400).json({ error: 'Missing ID' });

      const { data: currentItem, error: fetchErr } = await supabaseAdmin
        .from('materials')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchErr || !currentItem) {
        return res.status(404).json({ error: `Material with id "${id}" not found: ${fetchErr?.message}` });
      }

      const unpackedCurrent = unpackMaterialMeta(currentItem);
      let oldFileToDelete = null;
      const updatePayload = {};

      if (field === 'sheet') {
        oldFileToDelete = unpackedCurrent.sheet_pdf_url || unpackedCurrent.file_url;
        updatePayload.sheet_pdf_url = '';
        updatePayload.sheet_file_name = '';
        updatePayload.sheet_file_size = '';
        updatePayload.file_url = '';
        updatePayload.file_name = '';
        updatePayload.file_size = '';
      } else if (field === 'solution') {
        oldFileToDelete = unpackedCurrent.solution_pdf_url;
        updatePayload.solution_pdf_url = '';
        updatePayload.solution_file_name = '';
        updatePayload.solution_file_size = '';
      }

      let updated = null;
      let updateError = null;

      try {
        const resDirect = await supabaseAdmin
          .from('materials')
          .update(updatePayload)
          .eq('id', id)
          .select()
          .single();
        updated = resDirect.data;
        updateError = resDirect.error;
      } catch (err) {
        updateError = err;
      }

      if (updateError || !updated) {
        const fallbackMeta = {
          sheet_pdf_url: field === 'sheet' ? '' : (unpackedCurrent.sheet_pdf_url || unpackedCurrent.file_url || ''),
          sheet_file_name: field === 'sheet' ? '' : (unpackedCurrent.sheet_file_name || unpackedCurrent.file_name || ''),
          sheet_file_size: field === 'sheet' ? '' : (unpackedCurrent.sheet_file_size || unpackedCurrent.file_size || ''),
          solution_pdf_url: field === 'solution' ? '' : (unpackedCurrent.solution_pdf_url || ''),
          solution_file_name: field === 'solution' ? '' : (unpackedCurrent.solution_file_name || ''),
          solution_file_size: field === 'solution' ? '' : (unpackedCurrent.solution_file_size || ''),
          real_external_url: unpackedCurrent.external_url || '',
        };

        const strippedPayload = {};
        if (field === 'sheet') {
          strippedPayload.file_url = '';
          strippedPayload.file_name = '';
          strippedPayload.file_size = '';
        }
        strippedPayload.external_url = `__studyhub_meta__:${JSON.stringify(fallbackMeta)}`;

        const resFallback = await supabaseAdmin
          .from('materials')
          .update(strippedPayload)
          .eq('id', id)
          .select()
          .single();

        if (resFallback.error || !resFallback.data) {
          return res.status(500).json({
            error: `Database update failed: ${resFallback.error?.message || updateError?.message}`,
          });
        }

        updated = {
          ...resFallback.data,
          sheet_pdf_url: fallbackMeta.sheet_pdf_url,
          sheet_file_name: fallbackMeta.sheet_file_name,
          sheet_file_size: fallbackMeta.sheet_file_size,
          solution_pdf_url: fallbackMeta.solution_pdf_url,
          solution_file_name: fallbackMeta.solution_file_name,
          solution_file_size: fallbackMeta.solution_file_size,
          external_url: fallbackMeta.real_external_url,
        };
      }

      if (oldFileToDelete) {
        await safelyDeleteOldFile(oldFileToDelete, 'materials', id);
      }

      return res.status(200).json({
        success: true,
        data: unpackMaterialMeta(updated),
        message: `${field === 'sheet' ? 'Sheet' : 'Solution'} PDF removed successfully.`,
      });
    }

    // C. DELETE (PERMANENT DELETION WITH STORAGE CLEANUP)
    if (action === 'delete') {
      if (!id) return res.status(400).json({ error: 'Missing ID for delete' });

      // 1. Collect files to delete from Supabase Storage
      const filesToDelete = [];
      try {
        if (table === 'materials') {
          const { data: item } = await supabaseAdmin
            .from(table)
            .select('file_url, sheet_pdf_url, solution_pdf_url')
            .eq('id', id)
            .maybeSingle();
          if (item?.file_url) filesToDelete.push(item.file_url);
          if (item?.sheet_pdf_url) filesToDelete.push(item.sheet_pdf_url);
          if (item?.solution_pdf_url) filesToDelete.push(item.solution_pdf_url);
        } else if (table === 'warnings') {
          const { data: item } = await supabaseAdmin
            .from(table)
            .select('file_url')
            .eq('id', id)
            .maybeSingle();
          if (item?.file_url) filesToDelete.push(item.file_url);
        } else if (table === 'subjects') {
          const { data: mats } = await supabaseAdmin
            .from('materials')
            .select('file_url, sheet_pdf_url, solution_pdf_url')
            .eq('subject_id', id);
          const { data: warns } = await supabaseAdmin
            .from('warnings')
            .select('file_url')
            .eq('subject_id', id);
          if (mats) {
            mats.forEach((m) => {
              if (m.file_url) filesToDelete.push(m.file_url);
              if (m.sheet_pdf_url) filesToDelete.push(m.sheet_pdf_url);
              if (m.solution_pdf_url) filesToDelete.push(m.solution_pdf_url);
            });
          }
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
