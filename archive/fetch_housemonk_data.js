const axios = require("axios");
const { refreshClientToken, getUserAccessToken } = require("./housemonk_auth");

async function fetchHouseMonkData() {
  try {
    // Authenticate
    const clientId = "1326bbe0-8ed1-11f0-b658-7dd414f87b53";
    const clientSecret = "eaafb314-ff3b-4481-8f29-e235212e7a1d";
    const integrationUserId = "6891dfbf052d1d7f336d0d62";
    
    const master = await refreshClientToken({ clientId, clientSecret });
    const userToken = await getUserAccessToken({ clientId, masterToken: master, userId: integrationUserId });
    
    console.log(" Authentication successful");
    
    // Fetch homes
    console.log("\n Fetching homes...");
    const homesResponse = await axios.get("https://dashboard.thehousemonk.com/api/home", {
      headers: { authorization: `Bearer ${userToken}` }
    });
    console.log(`Found ${homesResponse.data.count} homes`);
    
    // Look for the specific home ID
    const targetHome = homesResponse.data.rows.find(h => h._id === "687784571601723ef2fcd571");
    if (targetHome) {
      console.log(" Found target home:");
      console.log(`   Home ID: ${targetHome._id}`);
      console.log(`   Project: ${targetHome.project}`);
      console.log(`   Listing: ${targetHome.listing}`);
      console.log(`   Tenants: ${JSON.stringify(targetHome.tenants)}`);
    } else {
      console.log(" Target home not found");
    }
    
    // Fetch products
    console.log("\n Fetching products...");
    const productsResponse = await axios.get("https://dashboard.thehousemonk.com/api/product-and-service?projects=654399ed01def87096915750", {
      headers: { authorization: `Bearer ${userToken}` }
    });
    console.log(`Found ${productsResponse.data.count} products`);
    productsResponse.data.rows.forEach(p => console.log(`  - ${p.name} (ID: ${p._id})`));
    
    // Look for Utilities
    const utilitiesProduct = productsResponse.data.rows.find(p => p.name.toLowerCase().includes("utilities"));
    if (utilitiesProduct) {
      console.log(` Found Utilities product: ${utilitiesProduct._id}`);
    }
    
    // Fetch tax codes
    console.log("\n Fetching tax codes...");
    const taxResponse = await axios.get("https://dashboard.thehousemonk.com/api/tax?projects=655f41de004adb014ac00953", {
      headers: { authorization: `Bearer ${userToken}` }
    });
    console.log(`Found ${taxResponse.data.count} tax codes`);
    taxResponse.data.rows.forEach(t => console.log(`  - ${t.name} (${t.taxCode}) - ID: ${t._id}`));
    
    // Look for R10
    const r10Tax = taxResponse.data.rows.find(t => t.taxCode === "R10");
    if (r10Tax) {
      console.log(` Found R10 tax code: ${r10Tax._id}`);
    }
    
    // Fetch tenants
    console.log("\n Fetching tenants...");
    const tenantsResponse = await axios.get("https://dashboard.thehousemonk.com/api/user?projects=655f41de004adb014ac00953", {
      headers: { authorization: `Bearer ${userToken}` }
    });
    console.log(`Found ${tenantsResponse.data.count} tenants`);
    tenantsResponse.data.rows.slice(0, 3).forEach(t => console.log(`  - ${t.firstName} ${t.lastName} (ID: ${t._id})`));
    
  } catch (error) {
    console.error(" Error:", error.response?.data || error.message);
  }
}

fetchHouseMonkData();
