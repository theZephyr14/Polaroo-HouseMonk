const axios = require("axios");

// Use the working token from your previous tests
const userToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI2ODkxZGZiZjA1MmQxZDdmMzM2ZDBkNjIiLCJ0eXBlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NTg1MzY0NDUsImV4cCI6MTc2NjMxMjQ0NX0.hWgqc5wV6_4DQc4oTtve6YkLdKITKR-blPWywqy7NpU";
const clientId = "1326bbe0-8ed1-11f0-b658-7dd414f87b53";

async function testUnitResolution() {
  console.log("🧪 Testing Unit ID Resolution with Working Token");
  console.log("=".repeat(60));
  
  const testUnits = [
    "68d1508efa8e72033f3917d0", // This should be a listing ID
    "68d150d6fa8e72033f391ac6"  // This should be a listing ID
  ];
  
  for (const unitId of testUnits) {
    console.log(`\n🔍 Testing unit: ${unitId}`);
    
    // Try as listing ID first (since you said these are listing IDs)
    try {
      console.log("📋 Trying as listing ID...");
      const listingResponse = await axios.get(`https://dashboard.thehousemonk.com/api/listing/${unitId}`, {
        headers: { authorization: userToken, 'x-api-key': clientId }
      });
      
      const listing = listingResponse.data;
      console.log("✅ Found as listing:");
      console.log(JSON.stringify({
        listingId: listing._id,
        projectId: typeof listing.project === 'object' ? listing.project._id : listing.project,
        name: listing.name || listing.address
      }, null, 2));
      
      // Now try to find the home for this listing
      const projectId = typeof listing.project === 'object' ? listing.project._id : listing.project;
      console.log(`\n🏠 Looking for homes in project: ${projectId}`);
      
      const homesResponse = await axios.get(`https://dashboard.thehousemonk.com/api/home?project=${projectId}&limit=200`, {
        headers: { authorization: userToken, 'x-api-key': clientId }
      });
      
      const homes = homesResponse.data.rows;
      console.log(`Found ${homes.length} homes in project`);
      
      const matchingHome = homes.find(h => h.listing === unitId || h.listing?._id === unitId);
      
      if (matchingHome) {
        console.log("✅ Found matching home:");
        console.log(JSON.stringify({
          homeId: matchingHome._id,
          projectId: matchingHome.project,
          listingId: matchingHome.listing,
          tenantId: matchingHome.tenant?._id || matchingHome.tenant,
          status: matchingHome.status,
          name: matchingHome.name || matchingHome.address
        }, null, 2));
      } else {
        console.log("❌ No home found for this listing");
        console.log("First 5 homes in project:");
        homes.slice(0, 5).forEach((h, i) => {
          console.log(`${i+1}) home=${h._id} listing=${h.listing?._id || h.listing || 'none'} tenant=${h.tenant?._id || h.tenant || 'none'}`);
        });
      }
      
    } catch (listingError) {
      console.log("❌ Failed as listing:", listingError.response?.status, listingError.response?.data?.message || listingError.message);
      
      // Try as home ID
      try {
        console.log("🏠 Trying as home ID...");
        const homeResponse = await axios.get(`https://dashboard.thehousemonk.com/api/home/${unitId}`, {
          headers: { authorization: userToken, 'x-api-key': clientId }
        });
        
        const home = homeResponse.data;
        console.log("✅ Found as home:");
        console.log(JSON.stringify({
          homeId: home._id,
          projectId: home.project,
          listingId: home.listing,
          tenantId: home.tenant?._id || home.tenant,
          status: home.status,
          name: home.name || home.address
        }, null, 2));
        
      } catch (homeError) {
        console.log("❌ Also failed as home:", homeError.response?.status, homeError.response?.data?.message || homeError.message);
      }
    }
  }
}

testUnitResolution().catch(console.error);
