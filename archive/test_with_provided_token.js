const axios = require("axios");

// Test using the access token you provided directly
async function testWithProvidedToken() {
  console.log("🧪 TESTING WITH PROVIDED ACCESS TOKEN");
  console.log("=".repeat(50));
  console.log("⚠️  NO INVOICES WILL BE CREATED");
  console.log("=".repeat(50));
  
  // Use the access token from your user data
  const accessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI2ODkxZGZiZjA1MmQxZDdmMzM2ZDBkNjIiLCJ0eXBlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NTg1MzM0MzIsImV4cCI6MTc2NjMwOTQzMn0.q-RuWEjjb90czwPqO7yecg6JEKOv6XqHLevHwJMh2m0";
  const clientId = "1326bbe0-8ed1-11f0-b658-7dd414f87b53";
  
  try {
    // Test 1: Fetch available units
    console.log("\n1️⃣ Testing Units API...");
    const unitsRes = await axios.get("https://dashboard.thehousemonk.com/api/home", {
      headers: {
        "authorization": `Bearer ${accessToken}`,
        "x-api-key": clientId
      }
    });
    console.log(`✅ Units API: Found ${unitsRes.data.count} units`);
    
    // Show first 5 units
    console.log("\n📋 Available Units:");
    unitsRes.data.rows.slice(0, 5).forEach((unit, index) => {
      console.log(`  ${index + 1}. ${unit.name || unit.address} (ID: ${unit._id})`);
      console.log(`     Project: ${unit.project}`);
      console.log(`     Tenant: ${unit.tenant?.firstName ? unit.tenant.firstName + ' ' + unit.tenant.lastName : 'No tenant'}`);
    });
    
    // Test 2: Get specific unit details
    console.log("\n2️⃣ Testing Unit Details API...");
    const unitId = "687784571601723ef2fcd571";
    const unitRes = await axios.get(`https://dashboard.thehousemonk.com/api/home/${unitId}`, {
      headers: {
        "authorization": `Bearer ${accessToken}`,
        "x-api-key": clientId
      }
    });
    
    const unit = unitRes.data;
    console.log("✅ Unit Details: SUCCESS");
    console.log("📊 Unit Information:");
    console.log(`   Unit ID: ${unit._id}`);
    console.log(`   Name: ${unit.name || unit.address}`);
    console.log(`   Project: ${unit.project}`);
    console.log(`   Listing: ${unit.listing}`);
    console.log(`   Tenant: ${unit.tenant?.firstName ? unit.tenant.firstName + ' ' + unit.tenant.lastName : 'No tenant'}`);
    console.log(`   Tenant ID: ${unit.tenant?._id || unit.tenant}`);
    
    // Test 3: Test products API
    console.log("\n3️⃣ Testing Products API...");
    const productsRes = await axios.get(`https://dashboard.thehousemonk.com/api/product-and-service?projects=${unit.project}`, {
      headers: {
        "authorization": `Bearer ${accessToken}`,
        "x-api-key": clientId
      }
    });
    console.log(`✅ Products API: Found ${productsRes.data.count} products`);
    
    // Show first 3 products
    console.log("\n📦 Available Products:");
    productsRes.data.rows.slice(0, 3).forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name} (ID: ${product._id})`);
      console.log(`     Type: ${product.type}`);
      console.log(`     Status: ${product.status}`);
    });
    
    // Test 4: Test tax API
    console.log("\n4️⃣ Testing Tax API...");
    const taxRes = await axios.get(`https://dashboard.thehousemonk.com/api/tax?projects=${unit.project}`, {
      headers: {
        "authorization": `Bearer ${accessToken}`,
        "x-api-key": clientId
      }
    });
    console.log(`✅ Tax API: Found ${taxRes.data.count} tax codes`);
    
    // Show first 3 tax codes
    console.log("\n💰 Available Tax Codes:");
    taxRes.data.rows.slice(0, 3).forEach((tax, index) => {
      console.log(`  ${index + 1}. ${tax.name} (ID: ${tax._id})`);
      console.log(`     Rate: ${tax.taxRate}%`);
      console.log(`     Active: ${tax.active}`);
    });
    
    console.log("\n🎉 ALL TESTS PASSED!");
    console.log("✅ Authentication: WORKING");
    console.log("✅ API Access: WORKING");
    console.log("✅ Data Fetching: WORKING");
    console.log("🚀 System is ready for invoice creation!");
    
    // Return the resolved data for invoice creation
    return {
      unitId: unit._id,
      homeId: unit._id,
      projectId: unit.project,
      listingId: unit.listing,
      tenantId: unit.tenant?._id || unit.tenant,
      propertyName: unit.name || unit.address,
      tenantName: unit.tenant?.firstName ? `${unit.tenant.firstName} ${unit.tenant.lastName}` : "Unknown",
      products: productsRes.data.rows,
      taxCodes: taxRes.data.rows
    };
    
  } catch (error) {
    console.log(`\n❌ Test failed: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Error: ${error.response.data?.message || 'Unknown error'}`);
    }
    return null;
  }
}

testWithProvidedToken();
