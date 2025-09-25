const axios = require("axios");

// Test with the user token you provided directly
async function testUserTokenDirect() {
  console.log("🧪 TESTING USER TOKEN DIRECT API CALLS");
  console.log("=".repeat(50));
  console.log("⚠️  NO INVOICES WILL BE CREATED");
  console.log("=".repeat(50));
  
  const userToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI2ODkxZGZiZjA1MmQxZDdmMzM2ZDBkNjIiLCJ0eXBlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NTg1MzUzNjEsImV4cCI6MTc2NjMxMTM2MX0.wGHFL1Gd3cOODn6uHVcV5IbJ2xMZBoCoMmvydet8fRY";
  const clientId = "1326bbe0-8ed1-11f0-b658-7dd414f87b53";
  
  try {
    // Test different authentication methods with user token
    const authMethods = [
      { name: "User Token + x-api-key", headers: { "authorization": `Bearer ${userToken}`, "x-api-key": clientId } },
      { name: "User Token only", headers: { "authorization": `Bearer ${userToken}` } },
      { name: "User Token + Bearer", headers: { "authorization": userToken } },
      { name: "User Token + API Key", headers: { "authorization": userToken, "x-api-key": clientId } }
    ];
    
    for (const method of authMethods) {
      try {
        console.log(`\n🔄 Trying ${method.name}...`);
        const testRes = await axios.get("https://dashboard.thehousemonk.com/api/home", {
          headers: method.headers
        });
        console.log(`✅ SUCCESS with ${method.name}!`);
        console.log(`   Found ${testRes.data.count} units`);
        
        // If this works, show the units and test more endpoints
        if (testRes.data.rows && testRes.data.rows.length > 0) {
          console.log("\n📋 Available Units:");
          testRes.data.rows.slice(0, 3).forEach((unit, index) => {
            console.log(`  ${index + 1}. ${unit.name || unit.address} (ID: ${unit._id})`);
          });
        }
        
        // Test specific unit
        console.log("\n🏠 Testing Specific Unit...");
        const unitRes = await axios.get("https://dashboard.thehousemonk.com/api/home/687784571601723ef2fcd571", {
          headers: method.headers
        });
        console.log("✅ Unit details retrieved successfully!");
        console.log(`   Unit: ${unitRes.data.name || unitRes.data.address}`);
        console.log(`   Project: ${unitRes.data.project}`);
        
        // Test products
        console.log("\n📦 Testing Products API...");
        const productsRes = await axios.get(`https://dashboard.thehousemonk.com/api/product-and-service?projects=${unitRes.data.project}`, {
          headers: method.headers
        });
        console.log(`✅ Products API: Found ${productsRes.data.count} products`);
        
        // Test tax
        console.log("\n💰 Testing Tax API...");
        const taxRes = await axios.get(`https://dashboard.thehousemonk.com/api/tax?projects=${unitRes.data.project}`, {
          headers: method.headers
        });
        console.log(`✅ Tax API: Found ${taxRes.data.count} tax codes`);
        
        console.log("\n🎉 AUTHENTICATION WORKING!");
        console.log("✅ User token: WORKING");
        console.log("✅ API access: WORKING");
        console.log("✅ Data fetching: WORKING");
        console.log("🚀 Ready for invoice creation!");
        return;
        
      } catch (error) {
        console.log(`❌ Failed with ${method.name}: ${error.response?.status} ${error.response?.data?.message || error.message}`);
      }
    }
    
    console.log("\n❌ All authentication methods failed with user token");
    
  } catch (error) {
    console.log(`\n❌ Test failed: ${error.message}`);
  }
}

testUserTokenDirect();
