const axios = require("axios");

const userToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI2ODkxZGZiZjA1MmQxZDdmMzM2ZDBkNjIiLCJ0eXBlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NTg1MzY0NDUsImV4cCI6MTc2NjMxMjQ0NX0.hWgqc5wV6_4DQc4oTtve6YkLdKITKR-blPWywqy7NpU";
const clientId = "1326bbe0-8ed1-11f0-b658-7dd414f87b53";

(async () => {
  console.log(" Finding accessible properties for testing...");
  
  try {
    // Get first few accessible properties
    const propertiesRes = await axios.get("https://dashboard.thehousemonk.com/api/home?limit=5", {
      headers: { authorization: userToken, "x-api-key": clientId }
    });
    
    console.log(` Found ${propertiesRes.data.count} accessible properties`);
    
    if (propertiesRes.data.rows && propertiesRes.data.rows.length > 0) {
      console.log("\n Available Properties for Testing:");
      propertiesRes.data.rows.forEach((property, index) => {
        console.log(`\n${index + 1}. Property Details:`);
        console.log(`   ID: ${property._id}`);
        console.log(`   Name: ${property.name || property.address}`);
        console.log(`   Project: ${property.project}`);
        console.log(`   Tenant: ${property.tenant?.firstName ? property.tenant.firstName + ' ' + property.tenant.lastName : 'No tenant'}`);
        console.log(`   Tenant ID: ${property.tenant?._id || property.tenant}`);
        console.log(`   Status: ${property.status || 'Unknown'}`);
      });
      
      // Use the first property for testing
      const testProperty = propertiesRes.data.rows[0];
      console.log(`\n Using property for testing: ${testProperty.name || testProperty.address} (ID: ${testProperty._id})`);
      
      // Test if we can get detailed info
      try {
        const detailRes = await axios.get(`https://dashboard.thehousemonk.com/api/home/${testProperty._id}`, {
          headers: { authorization: userToken, "x-api-key": clientId }
        });
        console.log(" Property details accessible - ready for invoice creation!");
        console.log(`   Detailed name: ${detailRes.data.name || detailRes.data.address}`);
        console.log(`   Project: ${detailRes.data.project}`);
        console.log(`   Listing: ${detailRes.data.listing}`);
      } catch (e) {
        console.log(` Property details failed: ${e.response?.status} ${e.response?.data?.message || e.message}`);
      }
    }
    
  } catch (error) {
    console.log(` Failed to get properties: ${error.response?.status} ${error.response?.data?.message || error.message}`);
  }
})();
