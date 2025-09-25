const axios = require("axios");

// Find the correct unit ID for your property
async function findCorrectUnit() {
  console.log("🔍 FINDING CORRECT UNIT ID");
  console.log("=".repeat(50));
  console.log("⚠️  NO INVOICES WILL BE CREATED");
  console.log("=".repeat(50));
  
  const userToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI2ODkxZGZiZjA1MmQxZDdmMzM2ZDBkNjIiLCJ0eXBlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NTg1MzUzNjEsImV4cCI6MTc2NjMxMTM2MX0.wGHFL1Gd3cOODn6uHVcV5IbJ2xMZBoCoMmvydet8fRY";
  const clientId = "1326bbe0-8ed1-11f0-b658-7dd414f87b53";
  
  try {
    // Get all units
    console.log("\n1️⃣ Fetching All Units...");
    const unitsRes = await axios.get("https://dashboard.thehousemonk.com/api/home", {
      headers: {
        "authorization": userToken,
        "x-api-key": clientId
      }
    });
    
    console.log(`✅ Found ${unitsRes.data.count} units`);
    
    // Search for units that might be yours
    console.log("\n2️⃣ Searching for Your Units...");
    const searchTerms = ["Aribau", "687784571601723ef2fcd571", "Common", "Area"];
    
    const matchingUnits = unitsRes.data.rows.filter(unit => {
      const name = (unit.name || unit.address || "").toLowerCase();
      const id = unit._id;
      return searchTerms.some(term => 
        name.includes(term.toLowerCase()) || 
        id.includes(term.toLowerCase())
      );
    });
    
    if (matchingUnits.length > 0) {
      console.log(`\n🎯 Found ${matchingUnits.length} matching units:`);
      matchingUnits.forEach((unit, index) => {
        console.log(`\n${index + 1}. Unit Details:`);
        console.log(`   ID: ${unit._id}`);
        console.log(`   Name: ${unit.name || unit.address}`);
        console.log(`   Project: ${unit.project}`);
        console.log(`   Listing: ${unit.listing}`);
        console.log(`   Tenant: ${unit.tenant?.firstName ? unit.tenant.firstName + ' ' + unit.tenant.lastName : 'No tenant'}`);
        console.log(`   Tenant ID: ${unit.tenant?._id || unit.tenant}`);
      });
    } else {
      console.log("\n❌ No matching units found with search terms:", searchTerms);
      console.log("\n📋 First 10 units for reference:");
      unitsRes.data.rows.slice(0, 10).forEach((unit, index) => {
        console.log(`  ${index + 1}. ${unit.name || unit.address} (ID: ${unit._id})`);
      });
    }
    
    // Test the first matching unit if found
    if (matchingUnits.length > 0) {
      const testUnit = matchingUnits[0];
      console.log(`\n3️⃣ Testing Unit: ${testUnit.name || testUnit.address}`);
      
      try {
        const unitRes = await axios.get(`https://dashboard.thehousemonk.com/api/home/${testUnit._id}`, {
          headers: {
            "authorization": userToken,
            "x-api-key": clientId
          }
        });
        
        console.log("✅ Unit details retrieved successfully!");
        console.log("📊 Unit Information:");
        console.log(`   Unit ID: ${unitRes.data._id}`);
        console.log(`   Name: ${unitRes.data.name || unitRes.data.address}`);
        console.log(`   Project: ${unitRes.data.project}`);
        console.log(`   Listing: ${unitRes.data.listing}`);
        console.log(`   Tenant: ${unitRes.data.tenant?.firstName ? unitRes.data.tenant.firstName + ' ' + unitRes.data.tenant.lastName : 'No tenant'}`);
        console.log(`   Tenant ID: ${unitRes.data.tenant?._id || unitRes.data.tenant}`);
        
        // Test products and tax for this unit
        console.log("\n4️⃣ Testing Products and Tax APIs...");
        
        try {
          const productsRes = await axios.get(`https://dashboard.thehousemonk.com/api/product-and-service?projects=${unitRes.data.project}`, {
            headers: {
              "authorization": userToken,
              "x-api-key": clientId
            }
          });
          console.log(`✅ Products API: Found ${productsRes.data.count} products`);
        } catch (error) {
          console.log(`❌ Products API failed: ${error.response?.status} ${error.response?.data?.message || error.message}`);
        }
        
        try {
          const taxRes = await axios.get(`https://dashboard.thehousemonk.com/api/tax?projects=${unitRes.data.project}`, {
            headers: {
              "authorization": userToken,
              "x-api-key": clientId
            }
          });
          console.log(`✅ Tax API: Found ${taxRes.data.count} tax codes`);
        } catch (error) {
          console.log(`❌ Tax API failed: ${error.response?.status} ${error.response?.data?.message || error.message}`);
        }
        
        console.log("\n🎉 AUTHENTICATION WORKING!");
        console.log("✅ User token: WORKING");
        console.log("✅ API access: WORKING");
        console.log("✅ Unit found: WORKING");
        console.log("🚀 Ready for invoice creation!");
        
      } catch (error) {
        console.log(`❌ Unit details failed: ${error.response?.status} ${error.response?.data?.message || error.message}`);
      }
    }
    
  } catch (error) {
    console.log(`\n❌ Test failed: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Error: ${error.response.data?.message || 'Unknown error'}`);
    }
  }
}

findCorrectUnit();
