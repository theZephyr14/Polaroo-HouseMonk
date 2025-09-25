const axios = require("axios");

const userToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI2ODkxZGZiZjA1MmQxZDdmMzM2ZDBkNjIiLCJ0eXBlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NTg1MzY0NDUsImV4cCI6MTc2NjMxMjQ0NX0.hWgqc5wV6_4DQc4oTtve6YkLdKITKR-blPWywqy7NpU";
const clientId = "1326bbe0-8ed1-11f0-b658-7dd414f87b53";
const projectId = "6846923ef48a1a068bc874ce";
const listingId = "68d150d6fa8e72033f391ac6";

(async () => {
  try {
    const { data } = await axios.get(`https://dashboard.thehousemonk.com/api/home?project=${projectId}&limit=200`, {
      headers: { authorization: userToken, 'x-api-key': clientId }
    });
    const rows = data.rows || [];
    const matches = rows.filter(h => h.listing === listingId || h.listing?._id === listingId);
    console.log('Total homes in project:', rows.length);
    console.log('Matches for listing:', matches.length);
    matches.slice(0,5).forEach((h,i)=>{
      console.log(`${i+1}) home=${h._id} listing=${h.listing?._id||h.listing} tenant=${h.tenant?._id||h.tenant||'none'} status=${h.status||'unknown'}`)
    });
    if(matches.length===0){
      console.log('\nFirst 15 homes (for manual check):');
      rows.slice(0,15).forEach((h,i)=>{
        console.log(`${i+1}) home=${h._id} listing=${h.listing?._id||h.listing||'none'} tenant=${h.tenant?._id||h.tenant||'none'}`)
      });
    }
  } catch (e) {
    console.log('Error:', e.response?.status, e.response?.data?.message || e.message);
  }
})();
