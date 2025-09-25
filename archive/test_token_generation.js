const axios = require("axios");

// Test the correct flow: Master token -> User token
async function testTokenGeneration() {
  console.log("🧪 TESTING TOKEN GENERATION FLOW");
  console.log("=".repeat(50));
  console.log("⚠️  NO INVOICES WILL BE CREATED");
  console.log("=".repeat(50));
  
  const masterToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4YzI1ZjhhYmQyYWE1NzgzMTE3NWU3MSIsIm5hbWUiOiJOb2RlIExpdmluZyBnbHluayBwcm9kIiwidXVpZCI6IjEzMjZiYmUwLThlZDEtMTFmMC1iNjU4LTdkZDQxNGY4N2I1MyIsIm9yZ2FuaXphdGlvbiI6IjY3MTVmOTc0MmIyMmEzN2UyYTRhMmJjYSIsInVpZCI6IjY3MTVmZWYzMTliYTFmN2U2YTM4ZTc2MiIsImlhdCI6MTc1NzU2ODk0OCwiZXhwIjoxNzY1MzQ0OTQ4fQ.rRrUvyKQxJIvdQQAN5HYD_hZuzFO6ji1yT7dpyRiWj4";
  const clientId = "1326bbe0-8ed1-11f0-b658-7dd414f87b53";
  const userId = "6891dfbf052d1d7f336d0d62";
  
  try {
    // Step 1: Test master token refresh (should work)
    console.log("\n1️⃣ Testing Master Token Refresh...");
    const refreshRes = await axios.post("https://dashboard.thehousemonk.com/api/client/refresh-token", {
      clientId: clientId,
      clientSecret: "eaafb314-ff3b-4481-8f29-e235212e7a1d"
    });
    console.log("✅ Master token refresh: SUCCESS");
    const freshMasterToken = refreshRes.data.token;
    
    // Step 2: Use master token to generate user token
    console.log("\n2️⃣ Generating User Token with Master Token...");
    const userTokenRes = await axios.post("https://dashboard.thehousemonk.com/integration/glynk/access-token", {
      user: userId
    }, {
      headers: {
        "x-api-key": clientId,
        "authorization": `Bearer ${freshMasterToken}`,
        "content-type": "application/json"
      }
    });
    
    console.log("✅ User token generation: SUCCESS");
    const userToken = userTokenRes.data.accessToken;
    console.log(`User token: ${userToken.substring(0, 50)}...`);
    
    // Step 3: Test user token with API calls
    console.log("\n3️⃣ Testing User Token with API Calls...");
    
    // Try different authentication methods with user token
    const authMethods = [
      { name: "User Token + x-api-key", headers: { "authorization": `Bearer ${userToken}`, "x-api-key": clientId } },
      { name: "User Token only", headers: { "authorization": `Bearer ${userToken}` } },
      { name: "User Token + Bearer", headers: { "authorization": userToken } }
    ];
    
    for (const method of authMethods) {
      try {
        console.log(`\n🔄 Trying ${method.name}...`);
        const testRes = await axios.get("https://dashboard.thehousemonk.com/api/home", {
          headers: method.headers
        });
        console.log(`✅ SUCCESS with ${method.name}!`);
        console.log(`   Found ${testRes.data.count} units`);
        
        // If this works, show the units
        if (testRes.data.rows && testRes.data.rows.length > 0) {
          console.log("\n📋 Available Units:");
          testRes.data.rows.slice(0, 3).forEach((unit, index) => {
            console.log(`  ${index + 1}. ${unit.name || unit.address} (ID: ${unit._id})`);
          });
        }
        
        console.log("\n🎉 AUTHENTICATION WORKING!");
        console.log("✅ Master token -> User token flow: SUCCESS");
        console.log("✅ API access: WORKING");
        console.log("🚀 Ready for invoice creation!");
        return;
        
      } catch (error) {
        console.log(`❌ Failed with ${method.name}: ${error.response?.status} ${error.response?.data?.message || error.message}`);
      }
    }
    
    console.log("\n❌ User token also rejected by API endpoints");
    
  } catch (error) {
    console.log(`\n❌ Token generation failed: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Error: ${error.response.data?.message || 'Unknown error'}`);
    }
  }
}

testTokenGeneration();
