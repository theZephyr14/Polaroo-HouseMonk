const axios = require("axios");
const fs = require("fs");

// Create test invoice for a specific unit ID
async function createTestInvoiceForUnit() {
  console.log(" CREATING TEST INVOICE FOR SPECIFIC UNIT");
  console.log("=".repeat(50));
  console.log("  CREATING REAL INVOICE - WILL APPEAR IN HOUSEMONK");
  console.log("=".repeat(50));
  
  const userToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI2ODkxZGZiZjA1MmQxZDdmMzM2ZDBkNjIiLCJ0eXBlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NTg1MzY0NDUsImV4cCI6MTc2NjMxMjQ0NX0.hWgqc5wV6_4DQc4oTtve6YkLdKITKR-blPWywqy7NpU";
  const clientId = "1326bbe0-8ed1-11f0-b658-7dd414f87b53";
  
  // Unit ID provided by user
  const unitId = "68d1508efa8e72033f3917d0";
  
  try {
    // Step 1: Load overuse data
    console.log("\n1 Loading overuse data...");
    const overuseData = JSON.parse(fs.readFileSync("overuse.json", "utf8"));
    const aribauData = overuseData.find(p => p.name === "Aribau 1º 1ª");
    if (!aribauData) {
      console.log(" Aribau 1º 1ª not found in overuse data");
      return;
    }
    console.log(` Loaded. Aribau 1º 1ª overage: ${aribauData.overage}`);

    // Step 2: Get unit details
    console.log("\n2 Getting unit details...");
    const unitRes = await axios.get(`https://dashboard.thehousemonk.com/api/home/${unitId}`, {
      headers: { authorization: userToken, "x-api-key": clientId }
    });
    const unit = unitRes.data;
    console.log(" Unit details retrieved:");
    console.log(`   Unit ID: ${unit._id}`);
    console.log(`   Name: ${unit.name || unit.address || 'Unnamed'}`);
    console.log(`   Project: ${unit.project}`);
    console.log(`   Listing: ${unit.listing}`);
    console.log(`   Tenant: ${unit.tenant?.firstName ? unit.tenant.firstName + ' ' + unit.tenant.lastName : 'No tenant'}`);

    // Step 3: Get products and tax codes for the unit's project
    console.log("\n3 Getting products and tax codes...");
    const productsRes = await axios.get(`https://dashboard.thehousemonk.com/api/product-and-service?projects=${unit.project}`, {
      headers: { authorization: userToken, "x-api-key": clientId }
    });
    const taxRes = await axios.get(`https://dashboard.thehousemonk.com/api/tax?projects=${unit.project}`, {
      headers: { authorization: userToken, "x-api-key": clientId }
    });
    console.log(` Products: ${productsRes.data.count}, Taxes: ${taxRes.data.count}`);

    // Pick product and tax
    const utilitiesProduct = productsRes.data.rows.find(p =>
      p.name?.toLowerCase().includes('utilities') || p.name?.toLowerCase().includes('accommodation') || p.name?.toLowerCase().includes('rent')
    ) || productsRes.data.rows[0];
    const r10Tax = taxRes.data.rows.find(t => t.name === 'R10' || t.taxCode === 'R10') || taxRes.data.rows[0];

    // Step 4: Create invoice
    console.log("\n4 Creating invoice...");
    const today = new Date().toISOString().split("T")[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const invoicePayload = {
      users: [unit.tenant?._id || unit.tenant || "6891dfbf052d1d7f336d0d62"],
      type: "Invoice",
      transactionBelongsTo: "Home",
      home: unit._id,
      project: unit.project,
      listing: unit.listing,
      source: "api_external",
      status: "draft",
      dueDate,
      invoiceDate: today,
      taxable: true,
      totalAmount: aribauData.overage,
      openingBalance: aribauData.overage,
      itemDetails: [{
        amount: aribauData.overage,
        taxable: true,
        taxAmount: 0,
        netAmount: aribauData.overage,
        description: `Utilities Overuse - ${aribauData.period || 'Unknown Period'} (Aribau 1º 1ª)`,
        quantity: 1,
        billedAt: "none",
        addConvenienceFee: false,
        convenienceFee: 0,
        convenienceFeeType: "fixed",
        product: utilitiesProduct._id,
        rate: aribauData.overage,
        unit: "unit",
        taxCode: r10Tax._id
      }],
      notes: `Generated from Polaroo overuse analysis for ${aribauData.period || 'Unknown Period'} - ${aribauData.name} (Test Invoice)`
    };

    const invoiceRes = await axios.post("https://dashboard.thehousemonk.com/api/transaction", invoicePayload, {
      headers: { authorization: userToken, "x-api-key": clientId, "content-type": "application/json" }
    });

    console.log("\n INVOICE CREATED SUCCESSFULLY!");
    console.log(`   Invoice ID: ${invoiceRes.data._id}`);
    console.log(`   Unit: ${unit.name || unit.address || 'Unnamed'}`);
    console.log(`   Amount: ${invoiceRes.data.totalAmount}`);
    console.log(`   Status: ${invoiceRes.data.status}`);
    console.log(`   Due Date: ${invoiceRes.data.dueDate}`);

    fs.writeFileSync("test_invoice_result.json", JSON.stringify({
      invoiceId: invoiceRes.data._id,
      unit: unit.name || unit.address || 'Unnamed',
      amount: invoiceRes.data.totalAmount,
      status: invoiceRes.data.status,
      dueDate: invoiceRes.data.dueDate,
      createdAt: new Date().toISOString()
    }, null, 2));
    console.log("\n Results saved to test_invoice_result.json");

  } catch (error) {
    console.log(`\n Test failed: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Error: ${error.response.data?.message || 'Unknown error'}`);
      if (error.response.data) console.log("Full error:", JSON.stringify(error.response.data, null, 2));
    }
  }
}

createTestInvoiceForUnit();
