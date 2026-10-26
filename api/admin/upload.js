import { parseCookies, verifySessionToken, COOKIE_NAME, getRequestBody } from '../_auth.js';
import { supabaseAdmin, isServerSupabaseConfigured, STORAGE_BUCKET } from '../_supabase.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

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
      error: 'Unauthorized: Administrator access required to upload files.',
    });
  }

  // 2. Check Supabase Connectivity
  if (!isServerSupabaseConfigured || !supabaseAdmin) {
    return res.status(503).json({
      error:
        'Supabase Storage is not configured. Please add VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.',
      isConfigured: false,
    });
  }

  try {
    const body = await getRequestBody(req);
    const { fileName, fileType, fileBase64, folder = 'documents' } = body || {};

    if (!fileName || !fileBase64) {
      return res.status(400).json({ error: 'Missing fileName or fileBase64 data' });
    }

    // Convert base64 data URL to Buffer
    const base64Data = fileBase64.includes(';base64,')
      ? fileBase64.split(';base64,')[1]
      : fileBase64;
    const fileBuffer = Buffer.from(base64Data, 'base64');

    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${folder}/${Date.now()}_${cleanFileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, fileBuffer, {
        contentType: fileType || 'application/pdf',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return res.status(500).json({ error: `Supabase Storage error: ${uploadError.message}` });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    // Format human-readable size
    const bytes = fileBuffer.length;
    let formattedSize = `${bytes} B`;
    if (bytes >= 1024 * 1024) {
      formattedSize = `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else if (bytes >= 1024) {
      formattedSize = `${(bytes / 1024).toFixed(1)} KB`;
    }

    return res.status(200).json({
      success: true,
      file_url: urlData.publicUrl,
      file_name: fileName,
      file_size: formattedSize,
    });
  } catch (err) {
    console.error('Upload handler error:', err);
    return res.status(500).json({ error: err.message || 'File upload failed' });
  }
}
