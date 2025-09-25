const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

// Mock server config
const MOCK_SERVER = "http://localhost:3001";

const CONFIG = {
  supabaseUrl: "https://dfryezdsbwwfwkdfzhao.supabase.co",
  supabaseBucket: "polaroo_pdfs",
  supabaseServiceKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmcnllemRzYnd3ZndrZGZ6aGFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjIwMTA3MSwiZXhwIjoyMDcxNzc3MDcxfQ.oHTMFHbqYYU6nCGFvh764H6LFhzWYJRcECREa_sUx7U",

  // Mock HouseMonk endpoints
  baseUrl: MOCK_SERVER + "/api",
  
  // Mock property mapping
  propertyMapping: {
    "Aribau 1º 1ª": {
      projectId: "mock_project_123",
      homeId: "687784571601723ef2fcd571",
      listingId: "mock_listing_456",
      tenantUserId: "mock_tenant_789"
    }
  },
  
  // Mock IDs
  utilitiesProductId: "mock_utilities_product_123",
  r10TaxCodeId: "mock_r10_tax_456",
  attachmentEndpoint: (contractId) => `${MOCK_SERVER}/api/contracts/${contractId}/attachments`
};

const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseServiceKey);

function log(message, level = "INFO") {
  const timestamp = new Date().toLocaleTimeString();
  const colors = {
    "INFO": "\x1b[36m", "SUCCESS": "\x1b[32m", "ERROR": "\x1b[31m", 
    "WARNING": "\x1b[33m", "PROCESS": "\x1b[35m"
  };
  console.log(`${colors[level]}[${timestamp}] ${message}\x1b[0m`);
}

// Mock authentication
async function authenticate() {
  log(" Authenticating with Mock HouseMonk...", "PROCESS");
  
  const { data: clientData } = await axios.post(`${MOCK_SERVER}/api/client/refresh-token`, {
    clientId: "test_client",
    clientSecret: "test_secret"
  });
  
  const { data: userData } = await axios.post(`${MOCK_SERVER}/integration/glynk/access-token`, {
    user: "test_user"
  }, {
    headers: {
      "x-api-key": "test_client",
      "authorization": `Bearer ${clientData.token}`,
      "content-type": "application/json"
    }
  });
  
  log(" Mock authentication successful", "SUCCESS");
  return { master: clientData.token, userToken: userData.accessToken };
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
    log(" Run Streamlit app, calculate overages, and click \"Export Overuse JSON\" first", "WARNING");
    
    // Create mock data for testing
    const mockOveruse = [{
      name: "Aribau 1º 1ª",
      overage: 45.50,
      rooms: 2,
      period: "Jul-Aug 2025"
    }];
    
    log(" Using mock overuse data for testing", "WARNING");
    return mockOveruse;
  }
}

// Fetch PDFs from Supabase
async function getSupabasePdfs(propertyFolder) {
  try {
    const prefix = `invoices/${propertyFolder}`;
    const { data, error } = await supabase.storage
      .from(CONFIG.supabaseBucket)
      .list(prefix, { limit: 1000 });
    
    if (error) throw error;
    
    const pdfs = (data || [])
      .filter(f => f.name.toLowerCase().endsWith(".pdf"))
      .map(f => ({
        name: f.name,
        publicUrl: `${CONFIG.supabaseUrl}/storage/v1/object/public/${CONFIG.supabaseBucket}/${prefix}/${f.name}`
      }));
    
    log(` Found ${pdfs.length} PDFs for ${propertyFolder}`, "INFO");
    return pdfs;
  } catch (error) {
    log(` Failed to fetch PDFs for ${propertyFolder}: ${error.message}`, "ERROR");
    return [];
  }
}

// Create invoice
async function createInvoice({ userToken, propertyName, overage, period, mapping }) {
  if (overage <= 0) {
    log(` Skipping ${propertyName} - no overage`, "INFO");
    return null;
  }

  const today = new Date().toISOString().split("T")[0];
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const invoicePayload = {
    users: [mapping.tenantUserId],
    type: "Invoice",
    transactionBelongsTo: "Home",
    home: mapping.homeId,
    project: mapping.projectId,
    listing: mapping.listingId,
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
      description: `Utilities overage ${period} (${propertyName})`,
      quantity: 1,
      billedAt: "none",
      addConvenienceFee: false,
      convenienceFee: 0,
      convenienceFeeType: "fixed",
      product: CONFIG.utilitiesProductId,
      rate: overage,
      unit: "unit",
      taxCode: CONFIG.r10TaxCodeId
    }],
    notes: `Generated from Polaroo overuse analysis for ${period}`
  };

  try {
    const { data } = await axios.post(`${CONFIG.baseUrl}/transaction`, invoicePayload, {
      headers: { authorization: `Bearer ${userToken}` }
    });
    
    log(` Created invoice for ${propertyName}: ${data._id}`, "SUCCESS");
    return data;
  } catch (error) {
    log(` Failed to create invoice for ${propertyName}: ${error.response?.data?.message || error.message}`, "ERROR");
    return null;
  }
}

// Attach PDFs
async function attachPdfs({ userToken, contractId, pdfs }) {
  if (pdfs.length === 0) {
    log(` No PDFs to attach for contract ${contractId}`, "WARNING");
    return [];
  }

  const results = [];
  for (const pdf of pdfs) {
    try {
      log(` Downloading ${pdf.name} from Supabase...`, "INFO");
      const response = await axios.get(pdf.publicUrl, { responseType: "arraybuffer" });
      const pdfBuffer = Buffer.from(response.data);
      
      const FormData = require("form-data");
      const form = new FormData();
      form.append("file", pdfBuffer, { filename: pdf.name, contentType: "application/pdf" });
      
      const { data } = await axios.post(CONFIG.attachmentEndpoint(contractId), form, {
        headers: { ...form.getHeaders(), authorization: `Bearer ${userToken}` }
      });
      
      log(` Attached: ${pdf.name}`, "SUCCESS");
      results.push({ name: pdf.name, status: "success" });
    } catch (error) {
      log(` Failed to attach ${pdf.name}: ${error.message}`, "ERROR");
      results.push({ name: pdf.name, status: "failed" });
    }
  }
  return results;
}

// Main workflow
async function main() {
  log(" Starting Mock HouseMonk Bridge Test", "PROCESS");
  
  try {
    await axios.get(`${MOCK_SERVER}/api/status`);
    log(" Mock server is running", "SUCCESS");
  } catch (error) {
    log(" Mock server not running. Start it with: node mock_housemonk_server.js", "ERROR");
    return;
  }
  
  const { userToken } = await authenticate();
  const overuseData = await loadOveruseData();
  
  if (overuseData.length === 0) {
    log(" No overuse data found. Exiting.", "ERROR");
    return;
  }
  
  const results = [];
  for (const property of overuseData) {
    log(`\n Processing: ${property.name}`, "PROCESS");
    
    const mapping = CONFIG.propertyMapping[property.name] || {
      projectId: "mock_project_123",
      homeId: "687784571601723ef2fcd571",
      listingId: "mock_listing_456",
      tenantUserId: "mock_tenant_789"
    };
    
    const propertyFolder = property.name.replace(/[^a-zA-Z0-9]/g, "_");
    const pdfs = await getSupabasePdfs(propertyFolder);
    
    const invoice = await createInvoice({
      userToken,
      propertyName: property.name,
      overage: property.overage,
      period: property.period || "Unknown",
      mapping
    });
    
    if (invoice) {
      const attachments = await attachPdfs({ 
        userToken, 
        contractId: mapping.homeId, 
        pdfs 
      });
      
      results.push({
        property: property.name,
        overage: property.overage,
        invoiceId: invoice._id,
        pdfsAttached: attachments.filter(a => a.status === "success").length,
        status: "success"
      });
    } else {
      results.push({
        property: property.name,
        overage: property.overage,
        status: "skipped"
      });
    }
  }
  
  log("\n FINAL RESULTS:", "PROCESS");
  console.table(results);
  
  const successful = results.filter(r => r.status === "success").length;
  const skipped = results.filter(r => r.status === "skipped").length;
  
  log(` Successfully processed: ${successful}`, "SUCCESS");
  log(` Skipped: ${skipped}`, "WARNING");
  
  try {
    const { data: serverData } = await axios.get(`${MOCK_SERVER}/api/status`);
    log(`\n Mock Server Status:`, "INFO");
    log(`   Invoices created: ${serverData.invoices}`, "INFO");
    log(`   Contracts with attachments: ${serverData.attachments}`, "INFO");
  } catch (error) {
    log(` Could not fetch server status: ${error.message}`, "WARNING");
  }
}

main().catch(error => {
  log(` FATAL ERROR: ${error.message}`, "ERROR");
  process.exit(1);
});
