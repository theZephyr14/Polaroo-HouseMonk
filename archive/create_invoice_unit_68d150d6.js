const axios = require("axios");
const fs = require("fs");

async function run() {
  console.log(" CREATING TEST INVOICE FOR UNIT 68d150d6fa8e72033f391ac6");
  const userToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI2ODkxZGZiZjA1MmQxZDdmMzM2ZDBkNjIiLCJ0eXBlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NTg1MzY0NDUsImV4cCI6MTc2NjMxMjQ0NX0.hWgqc5wV6_4DQc4oTtve6YkLdKITKR-blPWywqy7NpU";
  const clientId = "1326bbe0-8ed1-11f0-b658-7dd414f87b53";
  const unitId = "68d150d6fa8e72033f391ac6";
  try {
    const overuse = JSON.parse(fs.readFileSync('overuse.json','utf8'));
    const aribau = overuse.find(p=>p.name==="Aribau 1º 1ª");
    if(!aribau){ console.log(' Aribau 1º 1ª not found'); return; }
    console.log(' Overuse ', aribau.overage);

    console.log(' Fetching unit details...');
    const unitRes = await axios.get(`https://dashboard.thehousemonk.com/api/home/${unitId}`, { headers: { authorization: userToken, 'x-api-key': clientId }});
    const unit = unitRes.data;
    console.log(' Unit OK', unit._id, unit.name||unit.address||'');

    console.log(' Fetching products/taxes...');
    const [prodRes, taxRes] = await Promise.all([
      axios.get(`https://dashboard.thehousemonk.com/api/product-and-service?projects=${unit.project}`, { headers: { authorization: userToken, 'x-api-key': clientId }}),
      axios.get(`https://dashboard.thehousemonk.com/api/tax?projects=${unit.project}`, { headers: { authorization: userToken, 'x-api-key': clientId }})
    ]);
    const product = prodRes.data.rows.find(p=>p.name?.toLowerCase().includes('utilities')||p.name?.toLowerCase().includes('accommodation')||p.name?.toLowerCase().includes('rent')) || prodRes.data.rows[0];
    const r10 = taxRes.data.rows.find(t=>t.name==='R10'||t.taxCode==='R10') || taxRes.data.rows[0];

    const today = new Date().toISOString().split('T')[0];
    const due = new Date(Date.now()+30*24*60*60*1000).toISOString().split('T')[0];

    const payload = {
      users: [unit.tenant?._id || unit.tenant || "6891dfbf052d1d7f336d0d62"],
      type: "Invoice",
      transactionBelongsTo: "Home",
      home: unit._id,
      project: unit.project,
      listing: unit.listing,
      source: "api_external",
      status: "draft",
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
        billedAt: "none",
        addConvenienceFee: false,
        convenienceFee: 0,
        convenienceFeeType: "fixed",
        product: product._id,
        rate: aribau.overage,
        unit: "unit",
        taxCode: r10._id
      }]
    };

    console.log(' Creating invoice...');
    const invRes = await axios.post('https://dashboard.thehousemonk.com/api/transaction', payload, { headers: { authorization: userToken, 'x-api-key': clientId, 'content-type':'application/json' }});
    console.log(' Created invoice:', invRes.data._id, 'amount ', invRes.data.totalAmount);
  } catch(err){
    console.log(' Failed:', err.response?.status, err.response?.data?.message || err.message);
    if(err.response?.data) console.log('Details:', JSON.stringify(err.response.data,null,2));
  }
}
run();
