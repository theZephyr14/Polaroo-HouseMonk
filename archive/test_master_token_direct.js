const axios = require("axios");

// Test using master token directly for API calls
async function testMasterTokenDirect() {
  console.log("🧪 TESTING MASTER TOKEN DIRECT API CALLS");
  console.log("=".repeat(50));
  console.log("⚠️  NO INVOICES WILL BE CREATED");
  console.log("=".repeat(50));
  
  try {
    // First, get a fresh master token
    console.log("\n1️⃣ Getting Fresh Master Token...");
    const masterRes = await axios.post("https://dashboard.thehousemonk.com/api/client/refresh-token", {
      clientId: "1326bbe0-8ed1-11f0-b658-7dd414f87b53",
      clientSecret: "eaafb314-ff3b-4481-8f29-e235212e7a1d"
    });
    
    const masterToken = masterRes.data.token;
    const clientId = "1326bbe0-8ed1-11f0-b658-7dd414f87b53";
    console.log("✅ Master token obtained");
    
    // Test 1: Try different authentication methods
    console.log("\n2️⃣ Testing Different Auth Methods...");
    
    const authMethods = [
      { name: "Master Token + x-api-key", headers: { "authorization": `Bearer ${masterToken}`, "x-api-key": clientId } },
      { name: "Master Token only", headers: { "authorization": `Bearer ${masterToken}` } },
      { name: "Master Token + Bearer", headers: { "authorization": masterToken, "x-api-key": clientId } },
      { name: "Master Token + API Key", headers: { "authorization": masterToken, "x-api-key": clientId } }
    ];
    
    for (const method of authMethods) {
      try {
        console.log(`\n🔄 Trying: ${method.name}`);
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
        
        // Test the specific unit
        console.log("\n🏠 Testing Specific Unit...");
        const unitRes = await axios.get("https://dashboard.thehousemonk.com/api/home/687784571601723ef2fcd571", {
          headers: method.headers
        });
        console.log("✅ Unit details retrieved successfully!");
        console.log(`   Unit: ${unitRes.data.name || unitRes.data.address}`);
        console.log(`   Project: ${unitRes.data.project}`);
        
        console.log("\n🎉 AUTHENTICATION WORKING!");
        console.log("✅ Master token can access APIs directly");
        console.log("🚀 Ready for invoice creation!");
        return;
        
      } catch (error) {
        console.log(`❌ Failed with ${method.name}: ${error.response?.status} ${error.response?.data?.message || error.message}`);
      }
    }
    
    console.log("\n❌ All authentication methods failed");
    
  } catch (error) {
    console.log(`\n❌ Master token refresh failed: ${error.message}`);
  }
}

testMasterTokenDirect();
