const { HouseMonkAuth, HouseMonkIDResolver } = require('./enhanced_housemonk_auth');
const fs = require('fs');

// Enhanced HouseMonk Integration with Auto-Refresh
class HouseMonkIntegration {
  constructor() {
    this.auth = new HouseMonkAuth("1326bbe0-8ed1-11f0-b658-7dd414f87b53", "eaafb314-ff3b-4481-8f29-e235212e7a1d");
    this.resolver = new HouseMonkIDResolver(this.auth);
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

  async createInvoice(propertyName, overage, period, unitId) {
    if (overage <= 0) {
      console.log(`⏭️ Skipping ${propertyName} - no overage`);
      return null;
    }

    try {
      // Resolve all IDs from unit ID
      const unitDetails = await this.resolver.resolveFromUnitId(unitId);
      
      const today = new Date().toISOString().split("T")[0];
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const invoicePayload = {
        users: [unitDetails.tenantId],
        type: "Invoice",
        transactionBelongsTo: "Home",
        home: unitDetails.homeId,
        project: unitDetails.projectId,
        listing: unitDetails.listingId,
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

      const response = await this.auth.makeAuthenticatedRequest("POST", "https://dashboard.thehousemonk.com/api/transaction", invoicePayload);
      
      console.log(`✅ Created invoice for ${propertyName}: ${response.data._id}`);
      return response.data;
    } catch (error) {
      console.log(`❌ Failed to create invoice for ${propertyName}: ${error.response?.data?.message || error.message}`);
      return null;
    }
  }

  async run() {
    console.log("🚀 Starting Enhanced HouseMonk Integration");
    
    try {
      // Initialize authentication
      await this.auth.refreshMasterToken();
      await this.auth.getUserAccessToken("6891dfbf052d1d7f336d0d62");
      
      // Load overuse data
      const overuseData = await this.loadOveruseData();
      if (overuseData.length === 0) {
        console.log("❌ No overuse data found");
        return;
      }
      
      // Show available units
      const units = await this.resolver.getAvailableUnits();
      console.log("\n📋 Available Units:");
      units.forEach((unit, index) => {
        console.log(`${index + 1}. ${unit.name} (ID: ${unit.id})`);
      });
      
      // Process each property
      const results = [];
      for (const property of overuseData) {
        console.log(`\n🏠 Processing: ${property.name}`);
        
        const invoice = await this.createInvoice(
          property.name,
          property.overage,
          property.period || "Unknown",
          "687784571601723ef2fcd571" // Your unit ID
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
const integration = new HouseMonkIntegration();
integration.run();
