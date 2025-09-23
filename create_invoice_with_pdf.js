const axios = require("axios");
const fs = require("fs");
const path = require("path");

async function getPresigned({ token, clientId, fileName }) {
  const { data } = await axios.post(
    "https://dashboard.thehousemonk.com/api/document/presigned",
    { fileName },
    { headers: { authorization: token, "x-api-key": clientId, "content-type": "application/json" } }
  );
  return data; // contains url, objectKey, fileFormat, etc.
}

async function putToS3({ signedUrl, fileBuffer, contentType = "application/pdf" }) {
  await axios.put(signedUrl, fileBuffer, { headers: { "Content-Type": contentType } });
}

async function uploadPdfAndGetFileObject({ token, clientId, pdfPath }) {
  const fileName = path.basename(pdfPath);
  const presigned = await getPresigned({ token, clientId, fileName });
  const fileBuffer = fs.readFileSync(pdfPath);
  await putToS3({ signedUrl: presigned.url, fileBuffer, contentType: "application/pdf" });
  // Optionally update metadata
  presigned.status = presigned.status || "active";
  presigned.fileName = fileName;
  presigned.fileFormat = "application/pdf";
  return presigned;
}

async function createInvoiceWithPdf({ token, clientId, homeId, projectId, listingId, userId, productId, taxId, amount, description, pdfPaths, status = "due" }) {
  // Upload each PDF and collect file objects
  const files = [];
  for (const p of pdfPaths) {
    const f = await uploadPdfAndGetFileObject({ token, clientId, pdfPath: p });
    files.push(f);
  }

  const today = new Date().toISOString().split("T")[0];
  const due = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const payload = {
    users: [userId],
    type: "Invoice",
    transactionBelongsTo: "Home",
    home: homeId,
    project: projectId,
    listing: listingId,
    source: "api_external",
    status,
    dueDate: due,
    invoiceDate: today,
    taxable: true,
    totalAmount: amount,
    openingBalance: amount,
    itemDetails: [
      {
        amount,
        taxable: true,
        taxAmount: 0,
        netAmount: amount,
        description,
        quantity: 1,
        billedAt: "none",
        addConvenienceFee: false,
        convenienceFee: 0,
        convenienceFeeType: "fixed",
        product: productId,
        rate: amount,
        unit: "unit",
        taxCode: taxId
      }
    ],
    files
  };

  const { data } = await axios.post("https://dashboard.thehousemonk.com/api/transaction", payload, {
    headers: { authorization: token, "x-api-key": clientId, "content-type": "application/json" }
  });
  return data;
}

// CLI usage example (provide args or edit defaults below)
(async () => {
  const USER_TOKEN = process.env.THM_TOKEN || "";
  const CLIENT_ID = process.env.THM_CLIENT_ID || "";

  // For convenience, fall back to values from our last run if envs not passed
  const token = USER_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI2ODkxZGZiZjA1MmQxZDdmMzM2ZDBkNjIiLCJ0eXBlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NTg1MzY0NDUsImV4cCI6MTc2NjMxMjQ0NX0.hWgqc5wV6_4DQc4oTtve6YkLdKITKR-blPWywqy7NpU";
  const clientId = CLIENT_ID || "1326bbe0-8ed1-11f0-b658-7dd414f87b53";

  // Inputs
  const homeId = process.argv[2] || "68d1508efa8e72033f391805";
  const projectId = process.argv[3] || "6846923ef48a1a068bc874ce";
  const listingId = process.argv[4] || "68d1508efa8e72033f3917d0";
  const userId = process.argv[5] || "67ec1e4f1bb7267e46be0fb1";
  const productId = process.argv[6] || "68b15aa477372108e6f7fc32"; // Utilities
  const taxId = process.argv[7] || "67ee293b1e08ab0d6c5a42b7"; // R10
  const amount = Number(process.argv[8] || 6.81);
  const description = process.argv[9] || "Utilities Overuse - Test Upload";
  const pdfArg = process.argv[10] || ""; // provide a single pdf path or leave blank

  if (!pdfArg) {
    console.log("ℹ Provide a PDF path as the 11th argument to attach (e.g., ./sample.pdf). Running without files...");
  }

  try {
    const inv = await createInvoiceWithPdf({
      token,
      clientId,
      homeId,
      projectId,
      listingId,
      userId,
      productId,
      taxId,
      amount,
      description,
      pdfPaths: pdfArg ? [pdfArg] : [],
      status: "due"
    });
    console.log(" Created invoice with files (if supplied)", inv._id);
  } catch (e) {
    console.error(" Failed to create invoice with files:", e.response?.status, e.response?.data?.message || e.message);
    if (e.response?.data) console.error("Details:", JSON.stringify(e.response.data, null, 2));
  }
})();
