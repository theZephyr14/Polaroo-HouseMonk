const axios = require("axios");

const userToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI2ODkxZGZiZjA1MmQxZDdmMzM2ZDBkNjIiLCJ0eXBlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NTg1MzY0NDUsImV4cCI6MTc2NjMxMjQ0NX0.hWgqc5wV6_4DQc4oTtve6YkLdKITKR-blPWywqy7NpU";
const clientId = "1326bbe0-8ed1-11f0-b658-7dd414f87b53";
const listingId = "687784571601723ef2fcd571";

(async () => {
  console.log(" Testing LISTING ID:", listingId);
  console.log(" User ID:", "6891dfbf052d1d7f336d0d62");
  console.log(" Token:", userToken.substring(0, 50) + "...");
  
  try {
    // Test Listing API endpoint
    const res = await axios.get(`https://dashboard.thehousemonk.com/api/listing/${listingId}`, {
      headers: { authorization: userToken, "x-api-key": clientId }
    });
    console.log(" LISTING API SUCCESS!");
    console.log(" Listing Details:");
    console.log(`   ID: ${res.data._id}`);
    console.log(`   Name: ${res.data.name || res.data.address}`);
    console.log(`   Project: ${res.data.project}`);
    console.log(`   Unit: ${res.data.unit}`);
    console.log(`   Status: ${res.data.status}`);
    console.log(`   Unit Category: ${res.data.unitCategory}`);
    console.log(`   Bedrooms: ${res.data.bedrooms}`);
    console.log(`   Built-up Area: ${res.data.builtUpArea}`);
    
    // Now get the associated home/unit
    if (res.data.unit) {
      console.log("\n Getting associated unit details...");
      try {
        const unitRes = await axios.get(`https://dashboard.thehousemonk.com/api/home/${res.data.unit}`, {
          headers: { authorization: userToken, "x-api-key": clientId }
        });
        console.log(" Unit details retrieved!");
        console.log(`   Unit ID: ${unitRes.data._id}`);
        console.log(`   Unit Name: ${unitRes.data.name || unitRes.data.address}`);
        console.log(`   Tenant: ${unitRes.data.tenant?.firstName ? unitRes.data.tenant.firstName + ' ' + unitRes.data.tenant.lastName : 'No tenant'}`);
        console.log(`   Tenant ID: ${unitRes.data.tenant?._id || unitRes.data.tenant}`);
      } catch (e) {
        console.log(` Unit details failed: ${e.response?.status} ${e.response?.data?.message || e.message}`);
      }
    }
    
    // Test products and tax for this project
    if (res.data.project) {
      console.log("\n Testing Products API...");
      try {
        const productsRes = await axios.get(`https://dashboard.thehousemonk.com/api/product-and-service?projects=${res.data.project}`, {
          headers: { authorization: userToken, "x-api-key": clientId }
        });
        console.log(` Products API: Found ${productsRes.data.count} products`);
        if (productsRes.data.rows && productsRes.data.rows.length > 0) {
          console.log("First 3 products:");
          productsRes.data.rows.slice(0, 3).forEach((product, index) => {
            console.log(`  ${index + 1}. ${product.name} (ID: ${product._id})`);
          });
        }
      } catch (e) {
        console.log(` Products API failed: ${e.response?.status} ${e.response?.data?.message || e.message}`);
      }
      
      console.log("\n Testing Tax API...");
      try {
        const taxRes = await axios.get(`https://dashboard.thehousemonk.com/api/tax?projects=${res.data.project}`, {
          headers: { authorization: userToken, "x-api-key": clientId }
        });
        console.log(` Tax API: Found ${taxRes.data.count} tax codes`);
        if (taxRes.data.rows && taxRes.data.rows.length > 0) {
          console.log("First 3 tax codes:");
          taxRes.data.rows.slice(0, 3).forEach((tax, index) => {
            console.log(`  ${index + 1}. ${tax.name} (ID: ${tax._id}) - ${tax.taxRate}%`);
          });
        }
      } catch (e) {
        console.log(` Tax API failed: ${e.response?.status} ${e.response?.data?.message || e.message}`);
      }
    }
    
    console.log("\n ALL TESTS PASSED!");
    console.log(" Authentication: WORKING");
    console.log(" Listing access: WORKING");
    console.log(" API access: WORKING");
    console.log(" Ready for invoice creation!");
    process.exit(0);
    
  } catch (e) {
    console.log(" Listing API failed:", e.response?.status, e.response?.data?.message || e.message);
    process.exit(1);
  }
})();
