const axios = require("axios");

const userToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI2ODkxZGZiZjA1MmQxZDdmMzM2ZDBkNjIiLCJ0eXBlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NTg1MzY0NDUsImV4cCI6MTc2NjMxMjQ0NX0.hWgqc5wV6_4DQc4oTtve6YkLdKITKR-blPWywqy7NpU";
const clientId = "1326bbe0-8ed1-11f0-b658-7dd414f87b53";

async function findHomesForListings() {
  console.log("🔍 Finding Homes for Your Listings");
  console.log("=".repeat(50));
  
  const listingIds = [
    "68d1508efa8e72033f3917d0",
    "68d150d6fa8e72033f391ac6"
  ];
  
  for (const listingId of listingIds) {
    console.log(`\n📋 Checking listing: ${listingId}`);
    
    // Get all homes and search for this listing
    try {
      const homesResponse = await axios.get(`https://dashboard.thehousemonk.com/api/home?limit=1000`, {
        headers: { authorization: userToken, 'x-api-key': clientId }
      });
      
      const allHomes = homesResponse.data.rows;
      console.log(`Total homes in system: ${allHomes.length}`);
      
      // Search for homes linked to this listing
      const matchingHomes = allHomes.filter(h => 
        h.listing === listingId || 
        h.listing?._id === listingId ||
        (typeof h.listing === 'object' && h.listing._id === listingId)
      );
      
      console.log(`Homes linked to listing ${listingId}: ${matchingHomes.length}`);
      
      if (matchingHomes.length > 0) {
        matchingHomes.forEach((home, i) => {
          console.log(`\n${i+1}) Home found:`);
          console.log(JSON.stringify({
            homeId: home._id,
            projectId: home.project,
            listingId: home.listing?._id || home.listing,
            tenantId: home.tenant?._id || home.tenant,
            status: home.status,
            name: home.name || home.address
          }, null, 2));
        });
      } else {
        console.log("❌ No homes found for this listing");
        
        // Let's also check if there are any homes with similar IDs
        const similarHomes = allHomes.filter(h => 
          h._id.includes(listingId.substring(0, 10)) ||
          (h.listing && h.listing.includes && h.listing.includes(listingId.substring(0, 10)))
        );
        
        if (similarHomes.length > 0) {
          console.log(`\n🔍 Found ${similarHomes.length} homes with similar IDs:`);
          similarHomes.slice(0, 5).forEach((home, i) => {
            console.log(`${i+1}) home=${home._id} listing=${home.listing?._id || home.listing || 'none'}`);
          });
        }
      }
      
    } catch (error) {
      console.log("❌ Error searching homes:", error.response?.status, error.response?.data?.message || error.message);
    }
  }
  
  // Also check what homes exist in the project
  console.log("\n🏢 Checking all homes in project 6846923ef48a1a068bc874ce:");
  try {
    const projectHomesResponse = await axios.get(`https://dashboard.thehousemonk.com/api/home?project=6846923ef48a1a068bc874ce&limit=50`, {
      headers: { authorization: userToken, 'x-api-key': clientId }
    });
    
    const projectHomes = projectHomesResponse.data.rows;
    console.log(`Found ${projectHomes.length} homes in project`);
    
    // Show first 10 homes with their listing info
    projectHomes.slice(0, 10).forEach((home, i) => {
      console.log(`${i+1}) home=${home._id} listing=${home.listing?._id || home.listing || 'none'} tenant=${home.tenant?._id || home.tenant || 'none'} status=${home.status || 'unknown'}`);
    });
    
  } catch (error) {
    console.log("❌ Error checking project homes:", error.response?.status, error.response?.data?.message || error.message);
  }
}

findHomesForListings().catch(console.error);
