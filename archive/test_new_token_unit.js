const axios = require("axios");

const userToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI2ODkxZGZiZjA1MmQxZDdmMzM2ZDBkNjIiLCJ0eXBlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NTg1MzY0NDUsImV4cCI6MTc2NjMxMjQ0NX0.hWgqc5wV6_4DQc4oTtve6YkLdKITKR-blPWywqy7NpU";
const clientId = "1326bbe0-8ed1-11f0-b658-7dd414f87b53";
const unitId = "68b6f296bda9657eb1ca2b6e";

(async () => {
  console.log(" Testing unit by ID:", unitId);
  console.log(" User ID:", "6891dfbf052d1d7f336d0d62");
  console.log(" Token:", userToken.substring(0, 50) + "...");
  
  try {
    // Method 1: authorization = raw token + x-api-key
    const res1 = await axios.get(`https://dashboard.thehousemonk.com/api/home/${unitId}`, {
      headers: { authorization: userToken, "x-api-key": clientId }
    });
    console.log(" Method 1 success!");
    console.log(" Unit Details:");
    console.log(`   ID: ${res1.data._id}`);
    console.log(`   Name: ${res1.data.name || res1.data.address}`);
    console.log(`   Project: ${res1.data.project}`);
    console.log(`   Listing: ${res1.data.listing}`);
    console.log(`   Tenant: ${res1.data.tenant?.firstName ? res1.data.tenant.firstName + ' ' + res1.data.tenant.lastName : 'No tenant'}`);
    console.log(`   Tenant ID: ${res1.data.tenant?._id || res1.data.tenant}`);
    process.exit(0);
  } catch (e1) {
    console.log(" Method 1 failed:", e1.response?.status, e1.response?.data?.message || e1.message);
  }
  
  try {
    // Method 2: Bearer token + x-api-key
    const res2 = await axios.get(`https://dashboard.thehousemonk.com/api/home/${unitId}`, {
      headers: { authorization: `Bearer ${userToken}`, "x-api-key": clientId }
    });
    console.log(" Method 2 success!");
    console.log(" Unit Details:");
    console.log(`   ID: ${res2.data._id}`);
    console.log(`   Name: ${res2.data.name || res2.data.address}`);
    console.log(`   Project: ${res2.data.project}`);
    console.log(`   Listing: ${res2.data.listing}`);
    console.log(`   Tenant: ${res2.data.tenant?.firstName ? res2.data.tenant.firstName + ' ' + res2.data.tenant.lastName : 'No tenant'}`);
    console.log(`   Tenant ID: ${res2.data.tenant?._id || res2.data.tenant}`);
    process.exit(0);
  } catch (e2) {
    console.log(" Method 2 failed:", e2.response?.status, e2.response?.data?.message || e2.message);
  }
  
  console.log(" Both methods failed - unit not accessible");
  process.exit(1);
})();
