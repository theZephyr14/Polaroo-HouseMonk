const axios = require("axios");

const userToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI2ODkxZGZiZjA1MmQxZDdmMzM2ZDBkNjIiLCJ0eXBlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NTg1MzY0NDUsImV4cCI6MTc2NjMxMjQ0NX0.hWgqc5wV6_4DQc4oTtve6YkLdKITKR-blPWywqy7NpU";
const clientId = "1326bbe0-8ed1-11f0-b658-7dd414f87b53";

(async () => {
  console.log(" Searching for accessible units...");
  
  try {
    // Get all accessible units
    const unitsRes = await axios.get("https://dashboard.thehousemonk.com/api/home", {
      headers: { authorization: userToken, "x-api-key": clientId }
    });
    
    console.log(` Found ${unitsRes.data.count} accessible units`);
    
    // Search for units that might be yours
    const searchTerms = ["Aribau", "Common", "Area", "687784571601723ef2fcd571"];
    const matchingUnits = unitsRes.data.rows.filter(unit => {
      const name = (unit.name || unit.address || "").toLowerCase();
      const id = unit._id;
      return searchTerms.some(term => 
        name.includes(term.toLowerCase()) || 
        id.includes(term.toLowerCase())
      );
    });
    
    if (matchingUnits.length > 0) {
      console.log(`\n Found ${matchingUnits.length} matching units:`);
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
      console.log("\n No matching units found with search terms:", searchTerms);
      console.log("\n First 10 accessible units for reference:");
      unitsRes.data.rows.slice(0, 10).forEach((unit, index) => {
        console.log(`  ${index + 1}. ${unit.name || unit.address} (ID: ${unit._id})`);
      });
    }
    
  } catch (error) {
    console.log(` Search failed: ${error.response?.status} ${error.response?.data?.message || error.message}`);
  }
})();
