const axios = require("axios");

const userToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI2ODkxZGZiZjA1MmQxZDdmMzM2ZDBkNjIiLCJ0eXBlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NTg1MzY0NDUsImV4cCI6MTc2NjMxMjQ0NX0.hWgqc5wV6_4DQc4oTtve6YkLdKITKR-blPWywqy7NpU";
const clientId = "1326bbe0-8ed1-11f0-b658-7dd414f87b53";

async function scanContracts({ listingId, projectId }) {
  function headers(){ return { authorization: userToken, 'x-api-key': clientId }; }
  async function get(url){ const {data}=await axios.get(url,{headers:headers()}); return data; }

  console.log(" Scanning contracts (homes) for listing:", listingId);

  const urls = [
    `https://dashboard.thehousemonk.com/api/home?listing=${listingId}&limit=200`,
    `https://dashboard.thehousemonk.com/api/home?listings=${listingId}&limit=200`,
    projectId ? `https://dashboard.thehousemonk.com/api/home?project=${projectId}&limit=500` : null
  ].filter(Boolean);

  for (const url of urls) {
    try {
      const res = await get(url);
      const rows = res.rows || [];
      console.log(`\nEndpoint: ${url}`);
      console.log(`Total rows: ${rows.length}`);
      const matches = rows.filter(h => h.listing===listingId || h.listing?._id===listingId);
      console.log(`Matches for listing: ${matches.length}`);
      matches.slice(0,20).forEach((h,i)=>{
        console.log(`${i+1}) home=${h._id} status=${h.status||'unknown'} tenant=${h.tenant?._id||h.tenant||'none'} listing=${h.listing?._id||h.listing}`);
      });
      if (matches.length>0) return;
    } catch (e) {
      console.log(`Error on ${url}:`, e.response?.status, e.response?.data?.message || e.message);
    }
  }
  console.log("\n No homes/contracts linked to this listing found via API.");
}

const listingId = process.argv[2] || "68d1508efa8e72033f3917d0";
const projectId = process.argv[3] || "6846923ef48a1a068bc874ce";
scanContracts({ listingId, projectId });
