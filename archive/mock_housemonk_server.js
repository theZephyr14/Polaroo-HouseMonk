const express = require("express");
const multer = require("multer");
const cors = require("cors");

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(multer().any());

// Mock data storage
const mockData = {
  invoices: [],
  attachments: new Map(),
  nextInvoiceId: 1
};

// Mock authentication endpoints
app.post("/api/client/refresh-token", (req, res) => {
  console.log(" Mock: Client token refresh");
  res.json({
    token: "mock_master_token_12345",
    clientId: req.body.clientId,
    clientSecret: req.body.clientSecret
  });
});

app.post("/integration/glynk/access-token", (req, res) => {
  console.log(" Mock: User access token");
  res.json({
    _id: req.body.user,
    accessToken: "mock_user_token_67890",
    fullName: "Kevin (Integration User)",
    email: "kevin@nodeliving.es"
  });
});

// Mock invoice creation
app.post("/api/transaction", (req, res) => {
  const invoice = {
    _id: `mock_invoice_${mockData.nextInvoiceId++}`,
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    referenceNumber: `INV-${String(mockData.nextInvoiceId - 1).padStart(6, "0")}`
  };
  
  mockData.invoices.push(invoice);
  console.log(` Mock: Created invoice ${invoice._id} for ${req.body.itemDetails?.[0]?.description || "Unknown"}`);
  console.log(` Amount: ${req.body.totalAmount} EUR`);
  
  res.json(invoice);
});

// Mock attachment upload
app.post("/api/contracts/:contractId/attachments", (req, res) => {
  const { contractId } = req.params;
  const files = req.files || [];
  
  if (!mockData.attachments.has(contractId)) {
    mockData.attachments.set(contractId, []);
  }
  
  files.forEach(file => {
    mockData.attachments.get(contractId).push({
      name: file.originalname,
      size: file.size,
      uploadedAt: new Date().toISOString()
    });
  });
  
  console.log(` Mock: Uploaded ${files.length} files to contract ${contractId}`);
  files.forEach(f => console.log(`   - ${f.originalname} (${f.size} bytes)`));
  
  res.json({
    success: true,
    uploaded: files.length,
    contractId,
    files: files.map(f => ({ name: f.originalname, size: f.size }))
  });
});

// Status endpoint
app.get("/api/status", (req, res) => {
  res.json({
    status: "Mock HouseMonk Server Running",
    invoices: mockData.invoices.length,
    attachments: Array.from(mockData.attachments.entries()).length,
    uptime: process.uptime()
  });
});

// List all created invoices
app.get("/api/mock/invoices", (req, res) => {
  res.json({
    count: mockData.invoices.length,
    invoices: mockData.invoices
  });
});

// List attachments for a contract
app.get("/api/mock/attachments/:contractId", (req, res) => {
  const { contractId } = req.params;
  const files = mockData.attachments.get(contractId) || [];
  res.json({ contractId, files });
});

app.listen(PORT, () => {
  console.log(` Mock HouseMonk Server running on http://localhost:${PORT}`);
  console.log(` Status: http://localhost:${PORT}/api/status`);
  console.log(` Invoices: http://localhost:${PORT}/api/mock/invoices`);
  console.log(`\n Keep this running and test with: node test_bridge_with_mock.js`);
});
