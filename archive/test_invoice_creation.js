const axios = require("axios");
const fs = require("fs");

// Test invoice creation for Aribau 1-1
async function testInvoiceCreation() {
  console.log("🧪 TESTING INVOICE CREATION");
  console.log("=".repeat(50));
  console.log("⚠️  CREATING REAL INVOICE - WILL APPEAR IN HOUSEMONK");
  console.log("=".repeat(50));
  
  const userToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI2ODkxZGZiZjA1MmQxZDdmMzM2ZDBkNjIiLCJ0eXBlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NTg1MzY0NDUsImV4cCI6MTc2NjMxMjQ0NX0.hWgqc5wV6_4DQc4oTtve6YkLdKITKR-blPWywqy7NpU";
  const clientId = "1326bbe0-8ed1-11f0-b658-7dd414f87b53";
  
  // Test property and unit IDs
  const testPropertyId = "6846923ef48a1a068bc874ce";
  const testUnitId = "6846923ef48a1a068bc874ce"; // Same as property for now
  
  try {
    // Step 1: Load overuse data
    console.log("\n1️⃣ Loading overuse data...");
    const overuseData = JSON.parse(fs.readFileSync("overuse.json", "utf8"));
    console.log(`✅ Loaded ${overuseData.length} properties with overages`);
    
    // Find Aribau 1-1 data
    const aribauData = overuseData.find(property => property.name === "Aribau 1º 1ª");
    if (!aribauData) {
      console.log("❌ Aribau 1º 1ª not found in overuse data");
      return;
    }
    
    console.log(`📊 Aribau 1º 1ª overage: €${aribauData.overage}`);
    
    // Step 2: Get test property details
    console.log("\n2️⃣ Getting test property details...");
    const propertyRes = await axios.get(`https://dashboard.thehousemonk.com/api/home/${testPropertyId}`, {
      headers: { authorization: userToken, "x-api-key": clientId }
    });
    
    const property = propertyRes.data;
    console.log("✅ Property details retrieved:");
    console.log(`   Property ID: ${property._id}`);
    console.log(`   Name: ${property.name || property.address}`);
    console.log(`   Project: ${property.project}`);
    console.log(`   Tenant: ${property.tenant?.firstName ? property.tenant.firstName + ' ' + property.tenant.lastName : 'No tenant'}`);
    console.log(`   Tenant ID: ${property.tenant?._id || property.tenant}`);
    
    // Step 3: Get products and tax codes
    console.log("\n3️⃣ Getting products and tax codes...");
    const productsRes = await axios.get(`https://dashboard.thehousemonk.com/api/product-and-service?projects=${property.project}`, {
      headers: { authorization: userToken, "x-api-key": clientId }
    });
    
    const taxRes = await axios.get(`https://dashboard.thehousemonk.com/api/tax?projects=${property.project}`, {
      headers: { authorization: userToken, "x-api-key": clientId }
    });
    
    console.log(`✅ Found ${productsRes.data.count} products and ${taxRes.data.count} tax codes`);
    
    // Find utilities product and R10 tax
    const utilitiesProduct = productsRes.data.rows.find(p => 
      p.name.toLowerCase().includes('utilities') || 
      p.name.toLowerCase().includes('accommodation') ||
      p.name.toLowerCase().includes('rent')
    );
    
    const r10Tax = taxRes.data.rows.find(t => 
      t.name === 'R10' || 
      t.taxCode === 'R10'
    );
    
    console.log(`📦 Using product: ${utilitiesProduct?.name || 'Default'} (ID: ${utilitiesProduct?._id || 'N/A'})`);
    console.log(`💰 Using tax: ${r10Tax?.name || 'Default'} (ID: ${r10Tax?._id || 'N/A'})`);
    
    // Step 4: Create invoice
    console.log("\n4️⃣ Creating invoice...");
    const today = new Date().toISOString().split("T")[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    
    const invoicePayload = {
      users: [property.tenant?._id || property.tenant],
      type: "Invoice",
      transactionBelongsTo: "Home",
      home: property._id,
      project: property.project,
      listing: property.listing,
      source: "api_external",
      status: "draft",
      dueDate: dueDate,
      invoiceDate: today,
      taxable: true,
      totalAmount: aribauData.overage,
      openingBalance: aribauData.overage,
      itemDetails: [{
        amount: aribauData.overage,
        taxable: true,
        taxAmount: 0, // No tax for now
        netAmount: aribauData.overage,
        description: `Utilities Overuse - ${aribauData.period || 'Unknown Period'}`,
        quantity: 1,
        billedAt: "none",
        addConvenienceFee: false,
        convenienceFee: 0,
        convenienceFeeType: "fixed",
        product: utilitiesProduct?._id || productsRes.data.rows[0]._id,
        rate: aribauData.overage,
        unit: "unit",
        taxCode: r10Tax?._id || taxRes.data.rows[0]._id
      }],
      notes: `Generated from Polaroo overuse analysis for ${aribauData.period || 'Unknown Period'} - ${aribauData.name}`
    };
    
    console.log("📋 Invoice payload prepared:");
    console.log(`   Property: ${property.name || property.address}`);
    console.log(`   Amount: €${aribauData.overage}`);
    console.log(`   Description: Utilities Overuse - ${aribauData.period || 'Unknown Period'}`);
    console.log(`   Due Date: ${dueDate}`);
    
    const invoiceRes = await axios.post("https://dashboard.thehousemonk.com/api/transaction", invoicePayload, {
      headers: {
        "authorization": userToken,
        "x-api-key": clientId,
        "content-type": "application/json"
      }
    });
    
    console.log("\n🎉 INVOICE CREATED SUCCESSFULLY!");
    console.log("✅ Invoice Details:");
    console.log(`   Invoice ID: ${invoiceRes.data._id}`);
    console.log(`   Property: ${property.name || property.address}`);
    console.log(`   Amount: €${invoiceRes.data.totalAmount}`);
    console.log(`   Status: ${invoiceRes.data.status}`);
    console.log(`   Due Date: ${invoiceRes.data.dueDate}`);
    console.log(`   Description: ${invoiceRes.data.itemDetails[0].description}`);
    
    console.log("\n🔍 WHERE TO FIND THE INVOICE IN HOUSEMONK:");
    console.log("1. Go to: https://dashboard.thehousemonk.com");
    console.log("2. Navigate to: Transactions → Invoices");
    console.log("3. Look for:");
    console.log(`   - Invoice ID: ${invoiceRes.data._id}`);
    console.log(`   - Property: ${property.name || property.address}`);
    console.log(`   - Amount: €${invoiceRes.data.totalAmount}`);
    console.log(`   - Source: api_external`);
    console.log(`   - Status: draft`);
    
    // Save results
    const results = {
      invoiceId: invoiceRes.data._id,
      property: property.name || property.address,
      amount: invoiceRes.data.totalAmount,
      status: invoiceRes.data.status,
      dueDate: invoiceRes.data.dueDate,
      description: invoiceRes.data.itemDetails[0].description,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync("test_invoice_result.json", JSON.stringify(results, null, 2));
    console.log("\n💾 Results saved to test_invoice_result.json");
    
  } catch (error) {
    console.log(`\n❌ Test failed: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Error: ${error.response.data?.message || 'Unknown error'}`);
      if (error.response.data) {
        console.log("Full error:", JSON.stringify(error.response.data, null, 2));
      }
    }
  }
}

testInvoiceCreation();
