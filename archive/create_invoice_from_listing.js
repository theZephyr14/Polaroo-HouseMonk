const axios = require("axios");
const fs = require("fs");

const USER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI2ODkxZGZiZjA1MmQxZDdmMzM2ZDBkNjIiLCJ0eXBlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NTg1MzY0NDUsImV4cCI6MTc2NjMxMjQ0NX0.hWgqc5wV6_4DQc4oTtve6YkLdKITKR-blPWywqy7NpU";
const CLIENT_ID = "1326bbe0-8ed1-11f0-b658-7dd414f87b53";
const FALLBACK_USER_ID = "67ec1e4f1bb7267e46be0fb1"; // provided user

async function get(url){
  const { data } = await axios.get(url, { headers: { authorization: USER_TOKEN, 'x-api-key': CLIENT_ID }});
  return data;
}

async function findHomeForListing(listingId, projectId){
  const urls = [
    `https://dashboard.thehousemonk.com/api/home?listing=${listingId}&limit=20`,
    `https://dashboard.thehousemonk.com/api/home?listings=${listingId}&limit=20`,
    `https://dashboard.thehousemonk.com/api/home?project=${projectId}&limit=200`
  ];
  for(const url of urls){
    try{
      const data = await get(url);
      if(Array.isArray(data.rows)){
        const exact = data.rows.find(h => h.listing===listingId || h.listing?._id===listingId);
        if(exact) return exact;
        if(url.includes('project=') && data.rows.length){
          // fallback: first one that has a listing at all
          const alt = data.rows.find(h => h.listing);
          if(alt) return alt;
        }
      }
    }catch(e){ /* ignore and continue */ }
  }
  return null;
}

async function createInvoiceForListing(listingId){
  console.log(' Resolving listing  home  invoice for', listingId);

  // Load overuse and pick Aribau 1º 1ª
  const overuse = JSON.parse(fs.readFileSync('overuse.json','utf8'));
  const aribau = overuse.find(p => p.name === 'Aribau 1º 1ª');
  if(!aribau){
    console.log(' Aribau 1º 1ª not found in overuse.json');
    return;
  }
  console.log(' Overuse amount ', aribau.overage);

  // Listing
  const listing = await get(`https://dashboard.thehousemonk.com/api/listing/${listingId}`);
  const projectId = typeof listing.project === 'object' ? (listing.project._id || listing.project.id) : listing.project;
  console.log(' Listing OK', listing._id, 'project', projectId);

  // Home (contract)
  const home = await findHomeForListing(listingId, projectId);
  if(!home){
    console.log(' No Home/Contract found for this listing. Create a contract first, then rerun.');
    return;
  }
  console.log(' Home resolved', home._id, 'tenant', home.tenant?._id || home.tenant || 'none');

  // Products and taxes
  const [products, taxes] = await Promise.all([
    get(`https://dashboard.thehousemonk.com/api/product-and-service?projects=${projectId}`),
    get(`https://dashboard.thehousemonk.com/api/tax?projects=${projectId}`)
  ]).then(([p,t]) => [p.rows || [], t.rows || []]);

  const product = products.find(p => p.name?.toLowerCase().includes('utilities') || p.name?.toLowerCase().includes('accommodation') || p.name?.toLowerCase().includes('rent')) || products[0];
  const r10 = taxes.find(t => t.name==='R10' || t.taxCode==='R10') || taxes[0];

  const today = new Date().toISOString().split('T')[0];
  const due = new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0];

  const payload = {
    users: [home.tenant?._id || home.tenant || FALLBACK_USER_ID],
    type: 'Invoice',
    transactionBelongsTo: 'Home',
    home: home._id,
    project: projectId,
    listing: listingId,
    source: 'api_external',
    status: 'draft',
    dueDate: due,
    invoiceDate: today,
    taxable: true,
    totalAmount: aribau.overage,
    openingBalance: aribau.overage,
    itemDetails: [{
      amount: aribau.overage,
      taxable: true,
      taxAmount: 0,
      netAmount: aribau.overage,
      description: `Utilities Overuse - ${aribau.period || 'Unknown Period'} (Aribau 1º 1ª)`,
      quantity: 1,
      billedAt: 'none',
      addConvenienceFee: false,
      convenienceFee: 0,
      convenienceFeeType: 'fixed',
      product: product?._id,
      rate: aribau.overage,
      unit: 'unit',
      taxCode: r10?._id
    }]
  };

  const { data: inv } = await axios.post('https://dashboard.thehousemonk.com/api/transaction', payload, { headers: { authorization: USER_TOKEN, 'x-api-key': CLIENT_ID, 'content-type':'application/json' }});
  console.log(' Invoice created', inv._id, '', inv.totalAmount);
}

const listingId = process.argv[2] || '68d150d6fa8e72033f391ac6';
createInvoiceForListing(listingId).catch(err => {
  console.log(' Failed', err.response?.status, err.response?.data?.message || err.message);
  if(err.response?.data) console.log('Details:', JSON.stringify(err.response.data, null, 2));
});
