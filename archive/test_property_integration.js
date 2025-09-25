const axios = require("axios");
const fs = require("fs");

// Use the specific property ID you provided
const PROPERTY_ID = "687784571601723ef2fcd571";
const MOCK_SERVER = "http://localhost:3001";

function log(message, level = "INFO") {
  const timestamp = new Date().toLocaleTimeString();
  const colors = {
    "INFO": "\x1b[36m", "SUCCESS": "\x1b[32m", "ERROR": "\x1b[31m", 
    "WARNING": "\x1b[33m", "PROCESS": "\x1b[35m"
  };
  console.log(`${colors[level]}[${timestamp}] ${message}\x1b[0m`);
}

// Load overuse data
async function loadOveruseData() {
  try {
    const data = fs.readFileSync("overuse.json", "utf8");
    const overuse = JSON.parse(data);
    log(` Loaded ${overuse.length} properties with overages`, "SUCCESS");
    return overuse;
  } catch (error) {
    log(` Failed to load overuse.json: ${error.message}`, "ERROR");
    return [];
  }
}

// Create invoice in HouseMonk (using mock server)
async function createInvoice({ propertyName, overage, period, propertyId }) {
  if (overage <= 0) {
    log(` Skipping ${propertyName} - no overage`, "INFO");
    return null;
  }

  const today = new Date().toISOString().split("T")[0];
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // 30 days

  const invoicePayload = {
    users: ["mock_tenant_123"],
    type: "Invoice",
    transactionBelongsTo: "Home",
    home: propertyId,
    project: "mock_project_456",
    listing: "mock_listing_789",
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
      product: "mock_utilities_product_123",
      rate: overage,
      unit: "unit",
      taxCode: "mock_r10_tax_456"
    }],
    notes: `Generated from Polaroo overuse analysis for ${period} - ${propertyName}`
  };

  try {
    const { data } = await axios.post(`${MOCK_SERVER}/api/transaction`, invoicePayload, {
      headers: { 
        "authorization": "Bearer mock_token_123",
        "content-type": "application/json"
      }
    });
    
    log(` Created invoice for ${propertyName}: ${data._id}`, "SUCCESS");
    return data;
  } catch (error) {
    log(` Failed to create invoice for ${propertyName}: ${error.response?.data?.message || error.message}`, "ERROR");
    return null;
  }
}

// Main workflow
async function main() {
  log(" Starting HouseMonk Invoice Creation Test", "PROCESS");
  log(` Target Property ID: ${PROPERTY_ID}`, "INFO");
  
  // Check if mock server is running
  try {
    await axios.get(`${MOCK_SERVER}/api/status`);
    log(" Mock server is running", "SUCCESS");
  } catch (error) {
    log(" Mock server is not running. Please start it with: node mock_housemonk_server.js", "ERROR");
    return;
  }
  
  // Load overuse data
  const overuseData = await loadOveruseData();
  if (overuseData.length === 0) {
    log(" No overuse data found. Exiting.", "ERROR");
    return;
  }
  
  // Process each property
  const results = [];
  for (const property of overuseData) {
    log(`\n Processing: ${property.name}`, "PROCESS");
    
    const invoice = await createInvoice({
      propertyName: property.name,
      overage: property.overage,
      period: property.period || "Unknown",
      propertyId: PROPERTY_ID
    });
    
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
  log("\n FINAL RESULTS:", "PROCESS");
  console.table(results);
  
  const successful = results.filter(r => r.status === "success").length;
  const failed = results.filter(r => r.status === "failed").length;
  
  log(` Successfully created: ${successful} invoices`, "SUCCESS");
  log(` Failed: ${failed} invoices`, failed > 0 ? "ERROR" : "INFO");
  
  // Show created invoices
  if (successful > 0) {
    log("\n Created Invoices:", "SUCCESS");
    try {
      const invoicesRes = await axios.get(`${MOCK_SERVER}/api/mock/invoices`);
      invoicesRes.data.forEach(invoice => {
        console.log(`  - ${invoice.propertyName}: ${invoice.totalAmount} (ID: ${invoice._id})`);
      });
    } catch (error) {
      log("Could not fetch invoice details", "WARNING");
    }
  }
}

main();
