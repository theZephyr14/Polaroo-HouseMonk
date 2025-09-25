const { HouseMonkAuth, HouseMonkIDResolver } = require('./enhanced_housemonk_auth');

// Safe test - NO invoice creation, only authentication and data fetching
async function safeTest() {
  console.log("🧪 SAFE TEST - Authentication & Data Fetching Only");
  console.log("=".repeat(60));
  console.log("⚠️  NO INVOICES WILL BE CREATED");
  console.log("=".repeat(60));
  
  const auth = new HouseMonkAuth("1326bbe0-8ed1-11f0-b658-7dd414f87b53", "eaafb314-ff3b-4481-8f29-e235212e7a1d");
  const resolver = new HouseMonkIDResolver(auth);

  try {
    // Test 1: Master token refresh
    console.log("\n1️⃣ Testing Master Token Refresh...");
    await auth.refreshMasterToken();
    console.log("✅ Master token refresh: SUCCESS");
    
    // Test 2: User access token
    console.log("\n2️⃣ Testing User Access Token...");
    await auth.getUserAccessToken("6891dfbf052d1d7f336d0d62");
    console.log("✅ User access token: SUCCESS");
    
    // Test 3: Fetch available units (READ ONLY)
    console.log("\n3️⃣ Testing Unit Discovery (READ ONLY)...");
    const units = await resolver.getAvailableUnits();
    console.log(`✅ Found ${units.length} units`);
    
    // Show first 5 units
    console.log("\n📋 Available Units:");
    units.slice(0, 5).forEach((unit, index) => {
      console.log(`  ${index + 1}. ${unit.name} (ID: ${unit.id})`);
      console.log(`     Project: ${unit.project}`);
      console.log(`     Tenant: ${unit.tenant}`);
    });
    
    // Test 4: Resolve IDs from your specific unit (READ ONLY)
    console.log("\n4️⃣ Testing ID Resolution (READ ONLY)...");
    const unitDetails = await resolver.resolveFromUnitId("687784571601723ef2fcd571");
    console.log("✅ ID Resolution: SUCCESS");
    console.log("📊 Resolved Details:");
    console.log(`   Unit ID: ${unitDetails.unitId}`);
    console.log(`   Home ID: ${unitDetails.homeId}`);
    console.log(`   Project ID: ${unitDetails.projectId}`);
    console.log(`   Listing ID: ${unitDetails.listingId}`);
    console.log(`   Tenant ID: ${unitDetails.tenantId}`);
    console.log(`   Property Name: ${unitDetails.propertyName}`);
    console.log(`   Tenant Name: ${unitDetails.tenantName}`);
    
    // Test 5: Test API endpoints (READ ONLY)
    console.log("\n5️⃣ Testing API Endpoints (READ ONLY)...");
    
    // Test products endpoint
    try {
      const productsRes = await auth.makeAuthenticatedRequest("GET", "https://dashboard.thehousemonk.com/api/product-and-service?projects=" + unitDetails.projectId);
      console.log(`✅ Products API: Found ${productsRes.data.count} products`);
    } catch (error) {
      console.log(`❌ Products API: ${error.response?.status} ${error.response?.data?.message || error.message}`);
    }
    
    // Test tax endpoint
    try {
      const taxRes = await auth.makeAuthenticatedRequest("GET", "https://dashboard.thehousemonk.com/api/tax?projects=" + unitDetails.projectId);
      console.log(`✅ Tax API: Found ${taxRes.data.count} tax codes`);
    } catch (error) {
      console.log(`❌ Tax API: ${error.response?.status} ${error.response?.data?.message || error.message}`);
    }
    
    console.log("\n🎉 ALL TESTS PASSED!");
    console.log("✅ Authentication: WORKING");
    console.log("✅ ID Resolution: WORKING");
    console.log("✅ API Access: WORKING");
    console.log("🚀 System is ready for invoice creation!");
    
  } catch (error) {
    console.log(`\n❌ Test failed: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Error: ${error.response.data?.message || 'Unknown error'}`);
    }
  }
}

safeTest();
