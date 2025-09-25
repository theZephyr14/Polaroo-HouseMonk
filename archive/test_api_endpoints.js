const axios = require("axios");

// Test different API endpoints and authentication methods
async function testApiEndpoints() {
  console.log("🧪 TESTING DIFFERENT API ENDPOINTS");
  console.log("=".repeat(50));
  console.log("⚠️  NO INVOICES WILL BE CREATED");
  console.log("=".repeat(50));
  
  try {
    // Get fresh master token
    console.log("\n1️⃣ Getting Fresh Master Token...");
    const masterRes = await axios.post("https://dashboard.thehousemonk.com/api/client/refresh-token", {
      clientId: "1326bbe0-8ed1-11f0-b658-7dd414f87b53",
      clientSecret: "eaafb314-ff3b-4481-8f29-e235212e7a1d"
    });
    
    const masterToken = masterRes.data.token;
    const clientId = "1326bbe0-8ed1-11f0-b658-7dd414f87b53";
    console.log("✅ Master token obtained");
    
    // Test different endpoints
    const endpoints = [
      { name: "Status", url: "https://dashboard.thehousemonk.com/api/status" },
      { name: "Home", url: "https://dashboard.thehousemonk.com/api/home" },
      { name: "User", url: "https://dashboard.thehousemonk.com/api/user" },
      { name: "Project", url: "https://dashboard.thehousemonk.com/api/project" }
    ];
    
    const authMethods = [
      { name: "Bearer + x-api-key", headers: { "authorization": `Bearer ${masterToken}`, "x-api-key": clientId } },
      { name: "Bearer only", headers: { "authorization": `Bearer ${masterToken}` } },
      { name: "Token only", headers: { "authorization": masterToken } },
      { name: "API Key only", headers: { "x-api-key": clientId } }
    ];
    
    for (const endpoint of endpoints) {
      console.log(`\n🔍 Testing ${endpoint.name} endpoint...`);
      
      for (const method of authMethods) {
        try {
          console.log(`  🔄 Trying ${method.name}...`);
          const response = await axios.get(endpoint.url, {
            headers: method.headers
          });
          console.log(`  ✅ SUCCESS with ${method.name}!`);
          console.log(`     Status: ${response.status}`);
          console.log(`     Data keys: ${Object.keys(response.data).join(', ')}`);
          
          // If this works, we found the right method
          console.log(`\n🎉 FOUND WORKING AUTHENTICATION!`);
          console.log(`✅ Method: ${method.name}`);
          console.log(`✅ Endpoint: ${endpoint.name}`);
          console.log(`🚀 Ready for invoice creation!`);
          return;
          
        } catch (error) {
          console.log(`  ❌ Failed: ${error.response?.status} ${error.response?.data?.message || error.message}`);
        }
      }
    }
    
    console.log("\n❌ No working authentication method found");
    
  } catch (error) {
    console.log(`\n❌ Master token refresh failed: ${error.message}`);
  }
}

testApiEndpoints();
