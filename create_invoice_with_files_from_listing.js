const axios = require("axios");
const fs = require("fs");
const path = require("path");

function headers(token, clientId) { return { authorization: token, "x-api-key": clientId, "content-type": "application/json" }; }
async function get(url, token, clientId){ const {data}=await axios.get(url,{headers:headers(token,clientId)}); return data; }
async function post(url,payload,token,clientId){ const {data}=await axios.post(url,payload,{headers:headers(token,clientId)}); return data; }

async function presign(fileName, token, clientId){ const {data}=await axios.post("https://dashboard.thehousemonk.com/api/document/presigned",{fileName},{headers:headers(token,clientId)}); return data; }
async function putS3(url, buf, contentType){ await axios.put(url, buf, { headers: { "Content-Type": contentType } }); }

async function uploadFileGeneric(filePath, token, clientId){
  const fileName = path.basename(filePath);
  const ext = path.extname(fileName).toLowerCase();
  const contentType = ext === '.pdf' ? 'application/pdf' : (ext === '.json' ? 'application/json' : 'application/octet-stream');
  const pre = await presign(fileName, token, clientId);
  const buf = fs.readFileSync(filePath);
  await putS3(pre.url, buf, contentType);
  pre.status = pre.status || 'active';
  pre.fileName = fileName;
  pre.fileFormat = contentType;
  return pre;
}

async function resolveFromListing(listingId, token, clientId){
  const listing = await get(`https://dashboard.thehousemonk.com/api/listing/${listingId}`, token, clientId);
  const projectId = typeof listing.project === 'object' ? (listing.project._id || listing.project.id) : listing.project;
  const endpoints = [
    `https://dashboard.thehousemonk.com/api/home?listing=${listingId}&limit=50`,
    `https://dashboard.thehousemonk.com/api/home?listings=${listingId}&limit=50`,
    `https://dashboard.thehousemonk.com/api/home?project=${projectId}&limit=500`,
  ];
  let homes = [];
  for(const url of endpoints){
    try{ const res = await get(url, token, clientId); const rows = res.rows||[]; homes = url.includes('project=') ? rows.filter(h=>h.listing===listingId||h.listing?._id===listingId) : rows; if(homes.length) break; }catch(_){}
  }
  if(!homes.length) throw new Error('No Home/Contract found for this listing');
  const withTenantActive = homes.find(h => (h.status==='active') && (h.tenant?._id || h.tenant));
  const withTenant = homes.find(h => (h.tenant?._id || h.tenant));
  const chosen = withTenantActive || withTenant || homes[0];
  return { projectId, homeId: chosen._id, listingId, tenantId: chosen.tenant?._id || chosen.tenant };
}

async function createInvoice({ token, clientId, listingId, amount, description, filePaths, productId, taxId }){
  const { projectId, homeId, tenantId } = await resolveFromListing(listingId, token, clientId);
  const files = [];
  for(const fp of (filePaths||[])){
    const uploaded = await uploadFileGeneric(fp, token, clientId);
    files.push(uploaded);
  }
  const today = new Date().toISOString().split('T')[0];
  const due = new Date(Date.now()+30*24*60*60*1000).toISOString().split('T')[0];
  const payload = {
    users: [tenantId],
    type: 'Invoice',
    transactionBelongsTo: 'Home',
    home: homeId,
    project: projectId,
    listing: listingId,
    source: 'api_external',
    status: 'due',
    dueDate: due,
    invoiceDate: today,
    taxable: true,
    totalAmount: amount,
    openingBalance: amount,
    itemDetails: [{ amount, taxable: true, taxAmount: 0, netAmount: amount, description, quantity: 1, billedAt: 'none', addConvenienceFee: false, convenienceFee: 0, convenienceFeeType: 'fixed', product: productId, rate: amount, unit: 'unit', taxCode: taxId }],
    files
  };
  const data = await post('https://dashboard.thehousemonk.com/api/transaction', payload, token, clientId);
  return data;
}

(async () => {
  const token = process.env.THM_TOKEN || '';
  const clientId = process.env.THM_CLIENT_ID || '';
  const productId = process.env.UTILITIES_PRODUCT_ID || '68b15aa477372108e6f7fc32';
  const taxId = process.env.R10_TAX_ID || '67ee293b1e08ab0d6c5a42b7';
  const listingId = process.argv[2];
  const amount = Number(process.argv[3] || 0);
  const description = process.argv[4] || 'Utilities Overuse';
  const fileArgs = process.argv.slice(5);
  if(!token||!clientId){ console.error('Missing THM_TOKEN/THM_CLIENT_ID'); process.exit(1); }
  if(!listingId){ console.error('Usage: node create_invoice_with_files_from_listing.js <listingId> <amount> <description> [file1] [file2] ...'); process.exit(1); }
  if(amount<=0){ console.log('Amount is 0; skipping invoice.'); process.exit(0); }
  try{
    const inv = await createInvoice({ token, clientId, listingId, amount, description, filePaths: fileArgs, productId, taxId });
    console.log('CREATED_INVOICE_JSON', JSON.stringify(inv));
  }catch(e){
    console.error('FAIL', e.response?.status, e.response?.data?.message || e.message);
    if(e.response?.data) console.error('DETAILS', JSON.stringify(e.response.data));
    process.exit(1);
  }
})();


