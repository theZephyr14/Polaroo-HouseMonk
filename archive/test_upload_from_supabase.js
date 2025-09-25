// Usage:
// node test_upload_from_supabase.js "<PropertyFolder>" "<ContractId>" "<ExactFileName.pdf>"

const axios = require('axios');
const { refreshClientToken, getUserAccessToken } = require('./housemonk_auth');

const CONFIG = {
  supabaseUrl: 'https://dfryezdsbwwfwkdfzhao.supabase.co',
  supabaseBucket: 'polaroo_pdfs',

  clientId: '1326bbe0-8ed1-11f0-b658-7dd414f87b53',
  clientSecret: 'eaafb314-ff3b-4481-8f29-e235212e7a1d',
  integrationUserId: '6891dfbf052d1d7f336d0d62',

  // TODO: replace with exact HouseMonk attachment endpoint if different
  attachmentUrl: (contractId) => `https://dashboard.thehousemonk.com/api/contracts/${contractId}/attachments`
};

function supabasePublicUrl(folder, file) {
  const key = `invoices/${folder}/${file}`;
  return `${CONFIG.supabaseUrl}/storage/v1/object/public/${CONFIG.supabaseBucket}/${encodeURI(key)}`;
}

async function fetchPdfBuffer(publicUrl) {
  const res = await axios.get(publicUrl, {
    responseType: 'arraybuffer',
    headers: {
      'Accept': 'application/pdf,application/octet-stream,*/*',
      'User-Agent': 'Node-UploadTest'
    },
    timeout: 30000
  });
  const buf = Buffer.from(res.data);
  if (buf.slice(0, 4).toString() !== '%PDF') {
    throw new Error('Downloaded file is not a valid PDF');
  }
  return buf;
}

async function uploadAttachment({ hmUserToken, contractId, fileName, pdfBuffer }) {
  const url = CONFIG.attachmentUrl(contractId);
  const FormData = require('form-data');
  const form = new FormData();
  form.append('file', pdfBuffer, { filename: fileName, contentType: 'application/pdf' });

  const { data } = await axios.post(url, form, {
    headers: { ...form.getHeaders(), authorization: `Bearer ${hmUserToken}` },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 60000
  });
  return data;
}

async function main() {
  const [,, propertyFolder, contractId, specificFileName] = process.argv;
  if (!propertyFolder || !contractId || !specificFileName) {
    console.error('Usage: node test_upload_from_supabase.js "<PropertyFolder>" "<ContractId>" "<ExactFileName.pdf>"');
    process.exit(1);
  }

  const master = await refreshClientToken({ clientId: CONFIG.clientId, clientSecret: CONFIG.clientSecret });
  const hmUserToken = await getUserAccessToken({ clientId: CONFIG.clientId, masterToken: master, userId: CONFIG.integrationUserId });

  const publicUrl = supabasePublicUrl(propertyFolder, specificFileName);
  console.log('Downloading from:', publicUrl);
  const pdfBuffer = await fetchPdfBuffer(publicUrl);

  const result = await uploadAttachment({ hmUserToken, contractId, fileName: specificFileName, pdfBuffer });
  console.log('Attachment upload result:', result);
}

main().catch(err => {
  console.error('ERROR:', err?.response?.data || err.message);
  process.exit(1);
});


