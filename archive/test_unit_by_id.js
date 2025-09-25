const axios = require("axios");

const userToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI2ODkxZGZiZjA1MmQxZDdmMzM2ZDBkNjIiLCJ0eXBlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NTg1MzUzNjEsImV4cCI6MTc2NjMxMTM2MX0.wGHFL1Gd3cOODn6uHVcV5IbJ2xMZBoCoMmvydet8fRY";
const clientId = "1326bbe0-8ed1-11f0-b658-7dd414f87b53";
const unitId = "68b6f296bda9657eb1ca2b6e";

(async () => {
  console.log(" Testing unit by ID:", unitId);
  try {
    // Method 1: authorization = raw token + x-api-key
    const res1 = await axios.get(`https://dashboard.thehousemonk.com/api/home/${unitId}`, {
      headers: { authorization: userToken, "x-api-key": clientId }
    });
    console.log(" Method 1 success. Name:", res1.data.name || res1.data.address, "Project:", res1.data.project);
    process.exit(0);
  } catch (e1) {
    console.log(" Method 1 failed:", e1.response?.status, e1.response?.data?.message || e1.message);
  }
  try {
    // Method 2: Bearer token + x-api-key
    const res2 = await axios.get(`https://dashboard.thehousemonk.com/api/home/${unitId}`, {
      headers: { authorization: `Bearer ${userToken}` , "x-api-key": clientId }
    });
    console.log(" Method 2 success. Name:", res2.data.name || res2.data.address, "Project:", res2.data.project);
    process.exit(0);
  } catch (e2) {
    console.log(" Method 2 failed:", e2.response?.status, e2.response?.data?.message || e2.message);
  }
  process.exit(1);
})();
