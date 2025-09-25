const { HouseMonkAuth, HouseMonkIDResolver } = require('./enhanced_housemonk_auth');

// Test the enhanced system
async function testEnhancedSystem() {
  console.log("🧪 Testing Enhanced HouseMonk System");
  console.log("=".repeat(50));
  
  const auth = new HouseMonkAuth("1326bbe0-8ed1-11f0-b658-7dd414f87b53", "eaafb314-ff3b-4481-8f29-e235212e7a1d");
  const resolver = new HouseMonkIDResolver(auth);

  try {
    // Test 1: Refresh master token
    console.log("\n1️⃣ Testing Master Token Refresh...");
    await auth.refreshMasterToken();
    
    // Test 2: Get user access token
    console.log("\n2️⃣ Testing User Access Token...");
    await auth.getUserAccessToken("6891dfbf052d1d7f336d0d62");
    
    // Test 3: Get all available units
    console.log("\n3️⃣ Testing Unit Discovery...");
    const units = await resolver.getAvailableUnits();
    console.log(`Found ${units.length} units:`);
    units.slice(0, 5).forEach((unit, index) => {
      console.log(`  ${index + 1}. ${unit.name} (ID: ${unit.id})`);
    });
    
    // Test 4: Resolve IDs from specific unit
    console.log("\n4️⃣ Testing ID Resolution...");
    const unitDetails = await resolver.resolveFromUnitId("687784571601723ef2fcd571");
    console.log("Resolved details:", unitDetails);
    
    console.log("\n✅ All tests passed! System is ready.");
    
  } catch (error) {
    console.log(`\n❌ Test failed: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Error: ${error.response.data?.message || 'Unknown error'}`);
    }
  }
}

testEnhancedSystem();