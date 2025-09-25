const { HouseMonkAuth, HouseMonkIDResolver } = require('./enhanced_housemonk_auth');

async function testUnitResolution() {
  console.log("🧪 Testing Unit ID Resolution");
  console.log("=".repeat(50));
  
  const auth = new HouseMonkAuth("1326bbe0-8ed1-11f0-b658-7dd414f87b53", "eaafb314-ff3b-4481-8f29-e235212e7a1d");
  const resolver = new HouseMonkIDResolver(auth);
  
  // Test with your two unit IDs
  const testUnits = [
    "68d1508efa8e72033f3917d0", // This should be a listing ID
    "68d150d6fa8e72033f391ac6"  // This should be a listing ID
  ];
  
  for (const unitId of testUnits) {
    try {
      console.log(`\n🔍 Testing unit: ${unitId}`);
      const resolved = await resolver.resolveFromUnitId(unitId);
      console.log("✅ Resolution successful:");
      console.log(JSON.stringify(resolved, null, 2));
    } catch (error) {
      console.log(`❌ Failed to resolve ${unitId}:`, error.message);
      
      // Try alternative approach - maybe it's a listing ID, not a home ID
      try {
        console.log("🔄 Trying as listing ID...");
        const listingResponse = await auth.makeAuthenticatedRequest("GET", `https://dashboard.thehousemonk.com/api/listing/${unitId}`);
        const listing = listingResponse.data;
        
        console.log("✅ Found as listing:");
        console.log(JSON.stringify({
          listingId: listing._id,
          projectId: typeof listing.project === 'object' ? listing.project._id : listing.project,
          name: listing.name || listing.address
        }, null, 2));
        
        // Now try to find the home for this listing
        const projectId = typeof listing.project === 'object' ? listing.project._id : listing.project;
        const homesResponse = await auth.makeAuthenticatedRequest("GET", `https://dashboard.thehousemonk.com/api/home?project=${projectId}&limit=200`);
        const homes = homesResponse.data.rows;
        const matchingHome = homes.find(h => h.listing === unitId || h.listing?._id === unitId);
        
        if (matchingHome) {
          console.log("✅ Found matching home:");
          console.log(JSON.stringify({
            homeId: matchingHome._id,
            projectId: matchingHome.project,
            listingId: matchingHome.listing,
            tenantId: matchingHome.tenant?._id || matchingHome.tenant,
            status: matchingHome.status
          }, null, 2));
        } else {
          console.log("❌ No home found for this listing");
        }
        
      } catch (listingError) {
        console.log("❌ Also failed as listing:", listingError.message);
      }
    }
  }
}

testUnitResolution().catch(console.error);
