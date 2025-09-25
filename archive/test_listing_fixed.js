const axios = require("axios");

const userToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI2ODkxZGZiZjA1MmQxZDdmMzM2ZDBkNjIiLCJ0eXBlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NTg1MzY0NDUsImV4cCI6MTc2NjMxMjQ0NX0.hWgqc5wV6_4DQc4oTtve6YkLdKITKR-blPWywqy7NpU";
const clientId = "1326bbe0-8ed1-11f0-b658-7dd414f87b53";
const listingId = "687784571601723ef2fcd571";

(async () => {
  console.log(" Testing LISTING ID with proper data extraction:", listingId);
  
  try {
    // Get listing details
    const res = await axios.get(`https://dashboard.thehousemonk.com/api/listing/${listingId}`, {
      headers: { authorization: userToken, "x-api-key": clientId }
    });
    
    console.log(" LISTING API SUCCESS!");
    console.log(" Listing Details:");
    console.log(`   ID: ${res.data._id}`);
    console.log(`   Name: ${res.data.name || res.data.address || 'N/A'}`);
    console.log(`   Project: ${JSON.stringify(res.data.project)}`);
    console.log(`   Unit: ${res.data.unit || 'N/A'}`);
    console.log(`   Status: ${res.data.status}`);
    console.log(`   Unit Category: ${res.data.unitCategory || 'N/A'}`);
    console.log(`   Bedrooms: ${res.data.bedrooms || 'N/A'}`);
    console.log(`   Built-up Area: ${res.data.builtUpArea || 'N/A'}`);
    
    // Extract project ID properly
    let projectId = null;
    if (res.data.project) {
      if (typeof res.data.project === 'string') {
        projectId = res.data.project;
      } else if (res.data.project._id) {
        projectId = res.data.project._id;
      } else if (res.data.project.id) {
        projectId = res.data.project.id;
      }
    }
    
    console.log(`\n Extracted Project ID: ${projectId}`);
    
    if (projectId) {
      // Test products API with proper project ID
      console.log("\n Testing Products API...");
      try {
        const productsRes = await axios.get(`https://dashboard.thehousemonk.com/api/product-and-service?projects=${projectId}`, {
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
      
      // Test tax API with proper project ID
      console.log("\n Testing Tax API...");
      try {
        const taxRes = await axios.get(`https://dashboard.thehousemonk.com/api/tax?projects=${projectId}`, {
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
    } else {
      console.log(" Could not extract project ID from listing data");
    }
    
    console.log("\n LISTING ACCESS WORKING!");
    console.log(" Authentication: WORKING");
    console.log(" Listing access: WORKING");
    console.log(" Ready to create invoices!");
    
  } catch (e) {
    console.log(" Listing API failed:", e.response?.status, e.response?.data?.message || e.message);
  }
})();
