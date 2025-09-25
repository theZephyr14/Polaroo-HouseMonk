const axios = require("axios");
const fs = require("fs");

// Working HouseMonk Integration with correct authentication
class WorkingHouseMonkIntegration {
  constructor() {
    this.userToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI2ODkxZGZiZjA1MmQxZDdmMzM2ZDBkNjIiLCJ0eXBlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NTg1MzUzNjEsImV4cCI6MTc2NjMxMTM2MX0.wGHFL1Gd3cOODn6uHVcV5IbJ2xMZBoCoMmvydet8fRY";
    this.clientId = "1326bbe0-8ed1-11f0-b658-7dd414f87b53";
  }

  async loadOveruseData() {
    try {
      const data = fs.readFileSync("overuse.json", "utf8");
      const overuse = JSON.parse(data);
      console.log(`📊 Loaded ${overuse.length} properties with overages`);
      return overuse;
    } catch (error) {
      console.log(`❌ Failed to load overuse.json: ${error.message}`);
      return [];
    }
  }

  async getAvailableUnits() {
    try {
      const response = await axios.get("https://dashboard.thehousemonk.com/api/home", {
        headers: {
          "authorization": this.userToken,
          "x-api-key": this.clientId
        }
      });
      return response.data.rows;
    } catch (error) {
      console.log(`❌ Failed to fetch units: ${error.message}`);
      return [];
    }
  }

  async getUnitDetails(unitId) {
    try {
      const response = await axios.get(`https://dashboard.thehousemonk.com/api/home/${unitId}`, {
        headers: {
          "authorization": this.userToken,
          "x-api-key": this.clientId
        }
      });
      return response.data;
    } catch (error) {
      console.log(`❌ Failed to get unit details: ${error.message}`);
      return null;
    }
  }

  async getProducts(projectId) {
    try {
      const response = await axios.get(`https://dashboard.thehousemonk.com/api/product-and-service?projects=${projectId}`, {
        headers: {
          "authorization": this.userToken,
          "x-api-key": this.clientId
        }
      });
      return response.data.rows;
    } catch (error) {
      console.log(`❌ Failed to get products: ${error.message}`);
      return [];
    }
  }

  async getTaxCodes(projectId) {
    try {
      const response = await axios.get(`https://dashboard.thehousemonk.com/api/tax?projects=${projectId}`, {
        headers: {
          "authorization": this.userToken,
          "x-api-key": this.clientId
        }
      });
      return response.data.rows;
    } catch (error) {
      console.log(`❌ Failed to get tax codes: ${error.message}`);
      return [];
    }
  }

  async createInvoice(propertyName, overage, period, unitId) {
    if (overage <= 0) {
      console.log(`⏭️ Skipping ${propertyName} - no overage`);
      return null;
    }

    try {
      // Get unit details
      const unit = await this.getUnitDetails(unitId);
      if (!unit) {
        console.log(`❌ Unit ${unitId} not found`);
        return null;
      }

      const today = new Date().toISOString().split("T")[0];
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const invoicePayload = {
        users: [unit.tenant?._id || unit.tenant],
        type: "Invoice",
        transactionBelongsTo: "Home",
        home: unit._id,
        project: unit.project,
        listing: unit.listing,
        source: "api_external",
        status: "draft",
        dueDate: dueDate,
        invoiceDate: today,
        taxable: true,
        totalAmount: overage,
        openingBalance: overage,
        itemDetails: [{
          amount: overage,
          taxable: true,
          taxAmount: 0,
          netAmount: overage,
          description: `Utilities Overuse - ${period}`,
          quantity: 1,
          billedAt: "none",
          addConvenienceFee: false,
          convenienceFee: 0,
          convenienceFeeType: "fixed",
          product: "654399ec01def870969156ad", // Update with real product ID
          rate: overage,
          unit: "unit",
          taxCode: "654bd2b6e84d136764a5c824" // Update with real tax ID
        }],
        notes: `Generated from Polaroo overuse analysis for ${period} - ${propertyName}`
      };

      const response = await axios.post("https://dashboard.thehousemonk.com/api/transaction", invoicePayload, {
        headers: {
          "authorization": this.userToken,
          "x-api-key": this.clientId,
          "content-type": "application/json"
        }
      });
      
      console.log(`✅ Created invoice for ${propertyName}: ${response.data._id}`);
      return response.data;
    } catch (error) {
      console.log(`❌ Failed to create invoice for ${propertyName}: ${error.response?.data?.message || error.message}`);
      return null;
    }
  }

  async run() {
    console.log("🚀 Starting Working HouseMonk Integration");
    console.log("=".repeat(50));
    
    try {
      // Load overuse data
      const overuseData = await this.loadOveruseData();
      if (overuseData.length === 0) {
        console.log("❌ No overuse data found");
        return;
      }
      
      // Get available units
      console.log("\n📋 Available Units:");
      const units = await this.getAvailableUnits();
      console.log(`Found ${units.length} units`);
      
      // Show first 5 units
      units.slice(0, 5).forEach((unit, index) => {
        console.log(`  ${index + 1}. ${unit.name || unit.address} (ID: ${unit._id})`);
      });
      
      // Use the first unit for testing (you can change this)
      const testUnitId = units[0]._id;
      console.log(`\n🏠 Using unit for testing: ${units[0].name || units[0].address} (ID: ${testUnitId})`);
      
      // Get unit details
      const unitDetails = await this.getUnitDetails(testUnitId);
      if (unitDetails) {
        console.log("📊 Unit Details:");
        console.log(`   Name: ${unitDetails.name || unitDetails.address}`);
        console.log(`   Project: ${unitDetails.project}`);
        console.log(`   Tenant: ${unitDetails.tenant?.firstName ? unitDetails.tenant.firstName + ' ' + unitDetails.tenant.lastName : 'No tenant'}`);
      }
      
      // Get products and tax codes
      const products = await this.getProducts(unitDetails.project);
      const taxCodes = await this.getTaxCodes(unitDetails.project);
      
      console.log(`\n📦 Products: ${products.length} found`);
      console.log(`💰 Tax Codes: ${taxCodes.length} found`);
      
      // Process each property (using test unit for now)
      const results = [];
      for (const property of overuseData) {
        console.log(`\n🏠 Processing: ${property.name}`);
        
        const invoice = await this.createInvoice(
          property.name,
          property.overage,
          property.period || "Unknown",
          testUnitId // Using test unit
        );
        
        if (invoice) {
          results.push({
            property: property.name,
            overage: property.overage,
            invoiceId: invoice._id,
            status: "success"
          });
        } else {
          results.push({
            property: property.name,
            overage: property.overage,
            status: "failed"
          });
        }
      }
      
      // Summary
      console.log("\n📊 FINAL RESULTS:");
      console.table(results);
      
      const successful = results.filter(r => r.status === "success").length;
      console.log(`✅ Successfully created: ${successful} invoices`);
      
      // Save results
      fs.writeFileSync("housemonk_results.json", JSON.stringify(results, null, 2));
      console.log("💾 Results saved to housemonk_results.json");
      
    } catch (error) {
      console.log(`❌ FATAL ERROR: ${error.message}`);
    }
  }
}

// Run the integration
const integration = new WorkingHouseMonkIntegration();
integration.run();
