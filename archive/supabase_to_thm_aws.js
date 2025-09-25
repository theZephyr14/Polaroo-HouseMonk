const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const path = require('path');

// Config via env or inline defaults
const CONFIG = {
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || '',
  bucket: process.env.SUPABASE_BUCKET || 'polaroo_pdfs',
  folders: (process.env.SUPABASE_FOLDERS || 'Aribau 1-1,Aribau 1-2').split(','),
  hmToken: process.env.THM_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI2ODkxZGZiZjA1MmQxZDdmMzM2ZDBkNjIiLCJ0eXBlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NTg1MzY0NDUsImV4cCI6MTc2NjMxMjQ0NX0.hWgqc5wV6_4DQc4oTtve6YkLdKITKR-blPWywqy7NpU',
  hmClientId: process.env.THM_CLIENT_ID || '1326bbe0-8ed1-11f0-b658-7dd414f87b53'
};

function log(msg) { console.log(`[${new Date().toLocaleTimeString()}] ${msg}`); }

async function getPresigned(fileName) {
  const { data } = await axios.post(
    'https://dashboard.thehousemonk.com/api/document/presigned',
    { fileName },
    { headers: { authorization: CONFIG.hmToken, 'x-api-key': CONFIG.hmClientId, 'content-type': 'application/json' } }
  );
  return data; // includes url and objectKey etc.
}

async function putToS3(url, arrayBuffer) {
  await axios.put(url, Buffer.from(arrayBuffer), { headers: { 'Content-Type': 'application/pdf' } });
}

async function uploadSupabaseObjectToHM(supabase, fullPath) {
  // download
  const { data, error } = await supabase.storage.from(CONFIG.bucket).download(fullPath);
  if (error) throw error;
  const fileName = path.basename(fullPath);
  // presign
  const presigned = await getPresigned(fileName);
  // upload
  await putToS3(presigned.url, await data.arrayBuffer());
  return { fileName, presigned };
}

async function listPdfsInFolder(supabase, folder) {
  const { data, error } = await supabase.storage.from(CONFIG.bucket).list(folder, { limit: 1000 });
  if (error) throw error;
  return (data || []).filter(o => !o.name.endsWith('/') && o.name.toLowerCase().endsWith('.pdf')).map(o => `${folder}/${o.name}`);
}

async function main() {
  if (!CONFIG.supabaseUrl || !CONFIG.supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars.');
    process.exit(1);
  }
  const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseServiceKey);
  log(`Starting copy from Supabase bucket '${CONFIG.bucket}' to THM AWS for folders: ${CONFIG.folders.join(', ')}`);

  const results = [];
  for (const folder of CONFIG.folders) {
    log(`Listing PDFs in '${folder}'...`);
    try {
      const pdfPaths = await listPdfsInFolder(supabase, folder);
      log(`Found ${pdfPaths.length} PDFs in '${folder}'.`);
      for (const p of pdfPaths) {
        try {
          log(`Uploading '${p}'...`);
          const { fileName, presigned } = await uploadSupabaseObjectToHM(supabase, p);
          results.push({ folder, fileName, objectKey: presigned.objectKey });
          log(` Uploaded '${fileName}' to '${presigned.objectKey}'.`);
        } catch (e) {
          log(` Failed '${p}': ${e.message}`);
        }
      }
    } catch (e) {
      log(` Folder '${folder}' failed: ${e.message}`);
    }
  }

  log('Done. Summary:');
  console.table(results);
}

if (require.main === module) {
  main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
}
