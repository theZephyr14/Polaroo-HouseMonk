const axios = require("axios");
const fs = require("fs");

(async () => {
  const USER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI2ODkxZGZiZjA1MmQxZDdmMzM2ZDBkNjIiLCJ0eXBlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NTg1MzY0NDUsImV4cCI6MTc2NjMxMjQ0NX0.hWgqc5wV6_4DQc4oTtve6YkLdKITKR-blPWywqy7NpU";
  const CLIENT_ID = "1326bbe0-8ed1-11f0-b658-7dd414f87b53";

  const homeId = "68d1508efa8e72033f391805";              // contract
  const projectId = "6846923ef48a1a068bc874ce";            // building
  const listingId = "68d1508efa8e72033f3917d0";            // unit
  const fallbackUser = "67ec1e4f1bb7267e46be0fb1";          // safe user

  const headers = { authorization: USER_TOKEN, 'x-api-key': CLIENT_ID };
  function get(url){ return axios.get(url,{headers}); }

  try {
    const overuse = JSON.parse(fs.readFileSync('overuse.json','utf8'));
    const aribau = overuse.find(p=>p.name === 'Aribau 1º 1ª');
    if(!aribau){ console.log(' Aribau 1º 1ª not found'); return; }

    // Resolve Utilities product and R10 tax strictly
    const [prodRes, taxRes] = await Promise.all([
      get(`https://dashboard.thehousemonk.com/api/product-and-service?projects=${projectId}`),
      get(`https://dashboard.thehousemonk.com/api/tax?projects=${projectId}`)
    ]);
    const products = (prodRes.data.rows||[]);
    const taxes = (taxRes.data.rows||[]);
    const utilities = products.find(p => String(p.name||'').trim().toLowerCase() === 'utilities');
    const r10 = taxes.find(t => t.name==='R10' || t.taxCode==='R10');
    if(!utilities){ console.log(' Utilities product not found in project'); return; }
    if(!r10){ console.log(' R10 tax not found'); return; }

    const today = new Date().toISOString().split('T')[0];
    const due = new Date(Date.now()+30*24*60*60*1000).toISOString().split('T')[0];

    const payload = {
      users: [fallbackUser],                 // leave tenant linkage; ensure API accepts
      type: 'Invoice',
      transactionBelongsTo: 'Home',
      home: homeId,
      project: projectId,
      listing: listingId,
      source: 'api_external',
      status: 'due',                         // <-- as requested
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
        product: utilities._id,
        rate: aribau.overage,
        unit: 'unit',
        taxCode: r10._id
      }]
    };

    const { data: inv } = await axios.post('https://dashboard.thehousemonk.com/api/transaction', payload, { headers: { ...headers, 'content-type':'application/json' }});
    console.log(' Created DUE invoice', inv._id, '', inv.totalAmount, 'product=Utilities');
  } catch (e) {
    console.log(' Failed', e.response?.status, e.response?.data?.message || e.message);
    if(e.response?.data) console.log('Details:', JSON.stringify(e.response.data,null,2));
  }
})();
