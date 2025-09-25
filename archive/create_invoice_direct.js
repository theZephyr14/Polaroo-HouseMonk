const axios = require("axios");
const fs = require("fs");

(async () => {
  const USER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI2ODkxZGZiZjA1MmQxZDdmMzM2ZDBkNjIiLCJ0eXBlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NTg1MzY0NDUsImV4cCI6MTc2NjMxMjQ0NX0.hWgqc5wV6_4DQc4oTtve6YkLdKITKR-blPWywqy7NpU";
  const CLIENT_ID = "1326bbe0-8ed1-11f0-b658-7dd414f87b53";

  const contractHomeId = "68d150d6fa8e72033f391ad8"; // Home/Contract
  const projectId = "6846923ef48a1a068bc874ce";     // Building
  const listingId = "68d150d6fa8e72033f391ac6";      // Unit
  const tenantUserId = "67ec1e4f1bb7267e46be0fb1";   // Tenant user

  function authHeaders(){
    return { authorization: USER_TOKEN, 'x-api-key': CLIENT_ID };
  }
  async function get(url){ const {data}=await axios.get(url,{headers:authHeaders()}); return data; }

  try {
    const overuse = JSON.parse(fs.readFileSync('overuse.json','utf8'));
    const aribau = overuse.find(p=>p.name === 'Aribau 1º 1ª');
    if(!aribau){ console.log(' Aribau 1º 1ª not in overuse.json'); return; }

    // Verify entities exist
    const [home, project, listing] = await Promise.all([
      get(`https://dashboard.thehousemonk.com/api/home/${contractHomeId}`),
      get(`https://dashboard.thehousemonk.com/api/project/${projectId}`),
      get(`https://dashboard.thehousemonk.com/api/listing/${listingId}`)
    ]);
    console.log(' Verified Home, Project, Listing');

    // Fetch products/taxes for project
    const [prodRes, taxRes] = await Promise.all([
      get(`https://dashboard.thehousemonk.com/api/product-and-service?projects=${projectId}`),
      get(`https://dashboard.thehousemonk.com/api/tax?projects=${projectId}`)
    ]);
    const products = prodRes.rows||[]; const taxes = taxRes.rows||[];
    const product = products.find(p=>p.name?.toLowerCase().includes('utilities')||p.name?.toLowerCase().includes('accommodation')||p.name?.toLowerCase().includes('rent')) || products[0];
    const r10 = taxes.find(t=>t.name==='R10'||t.taxCode==='R10') || taxes[0];

    const today = new Date().toISOString().split('T')[0];
    const due = new Date(Date.now()+30*24*60*60*1000).toISOString().split('T')[0];

    const payload = {
      users: [tenantUserId],
      type: 'Invoice',
      transactionBelongsTo: 'Home',
      home: contractHomeId,
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

    const {data: inv} = await axios.post('https://dashboard.thehousemonk.com/api/transaction', payload, { headers: { ...authHeaders(), 'content-type':'application/json' }});
    console.log(' Invoice created:', inv._id, '', inv.totalAmount);
  } catch (err) {
    console.log(' Failed:', err.response?.status, err.response?.data?.message || err.message);
    if(err.response?.data) console.log('Details:', JSON.stringify(err.response.data,null,2));
  }
})();
