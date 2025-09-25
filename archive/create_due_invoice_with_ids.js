const axios = require("axios");

(async () => {
  const USER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI2ODkxZGZiZjA1MmQxZDdmMzM2ZDBkNjIiLCJ0eXBlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NTg1MzY0NDUsImV4cCI6MTc2NjMxMjQ0NX0.hWgqc5wV6_4DQc4oTtve6YkLdKITKR-blPWywqy7NpU";
  const CLIENT_ID = "1326bbe0-8ed1-11f0-b658-7dd414f87b53";

  const homeId = "68d1508efa8e72033f391805";              // contract
  const projectId = "6846923ef48a1a068bc874ce";            // building
  const listingId = "68d1508efa8e72033f3917d0";            // unit
  const productId = "68b15aa477372108e6f7fc32";            // Utilities (provided)
  const taxId = "67ee293b1e08ab0d6c5a42b7";                // R10
  const userId = "67ec1e4f1bb7267e46be0fb1";               // safe user

  const headers = { authorization: USER_TOKEN, 'x-api-key': CLIENT_ID, 'content-type': 'application/json' };

  // small amount for test: use overuse.json Aribau 1º 1ª if available
  let amount = 6.81; let descPeriod = 'Unknown Period';
  try { const over = require('./overuse.json'); const a = over.find(p=>p.name==='Aribau 1º 1ª'); if(a){ amount=a.overage; descPeriod=a.period||descPeriod; } } catch {}

  const today = new Date().toISOString().split('T')[0];
  const due = new Date(Date.now()+30*24*60*60*1000).toISOString().split('T')[0];

  const payload = {
    users: [userId],
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
    itemDetails: [{
      amount,
      taxable: true,
      taxAmount: 0,
      netAmount: amount,
      description: `Utilities Overuse - ${descPeriod} (Aribau 1º 1ª)`,
      quantity: 1,
      billedAt: 'none',
      addConvenienceFee: false,
      convenienceFee: 0,
      convenienceFeeType: 'fixed',
      product: productId,
      rate: amount,
      unit: 'unit',
      taxCode: taxId
    }]
  };

  try {
    const { data } = await axios.post('https://dashboard.thehousemonk.com/api/transaction', payload, { headers });
    console.log(' Created DUE invoice', data._id, '', data.totalAmount, 'product=Utilities');
  } catch (e) {
    console.log(' Failed', e.response?.status, e.response?.data?.message || e.message);
    if(e.response?.data) console.log('Details:', JSON.stringify(e.response.data,null,2));
  }
})();
