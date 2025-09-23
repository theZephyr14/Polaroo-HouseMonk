const axios = require("axios");
const fs = require("fs");
const path = require("path");

function headers(token, clientId) {
  return { authorization: token, "x-api-key": clientId, "content-type": "application/json" };
}

async function get(url, token, clientId) {
  const { data } = await axios.get(url, { headers: headers(token, clientId) });
  return data;
}

async function post(url, payload, token, clientId) {
  const { data } = await axios.post(url, payload, { headers: headers(token, clientId) });
  return data;
}

async function getPresigned(fileName, token, clientId) {
  const { data } = await axios.post(
    "https://dashboard.thehousemonk.com/api/document/presigned",
    { fileName },
    { headers: headers(token, clientId) }
  );
  return data; // contains url, objectKey, etc.
}

async function putToS3(signedUrl, fileBuffer, contentType = "application/pdf") {
  await axios.put(signedUrl, fileBuffer, { headers: { "Content-Type": contentType } });
}

async function uploadPdfAndReturnFileObject(pdfPath, token, clientId) {
  const fileName = path.basename(pdfPath);
  const presigned = await getPresigned(fileName, token, clientId);
  const fileBuffer = fs.readFileSync(pdfPath);
  await putToS3(presigned.url, fileBuffer, "application/pdf");
  presigned.status = presigned.status || "active";
  presigned.fileName = fileName;
  presigned.fileFormat = "application/pdf";
  return presigned;
}

async function resolveHomeAndTenantFromListing({ listingId, token, clientId }) {
  // 1) Get listing → project
  const listing = await get(`https://dashboard.thehousemonk.com/api/listing/${listingId}`, token, clientId);
  const projectId = typeof listing.project === "object" ? (listing.project._id || listing.project.id) : listing.project;

  // 2) Try direct home listing filters
  const homeEndpoints = [
    `https://dashboard.thehousemonk.com/api/home?listing=${listingId}&limit=50`,
    `https://dashboard.thehousemonk.com/api/home?listings=${listingId}&limit=50`,
    `https://dashboard.thehousemonk.com/api/home?project=${projectId}&limit=500`,
  ];

  let candidateHomes = [];
  for (const url of homeEndpoints) {
    try {
      const res = await get(url, token, clientId);
      const rows = res.rows || [];
      if (url.includes("project=")) {
        candidateHomes = rows.filter(h => h.listing === listingId || h.listing?._id === listingId);
      } else {
        candidateHomes = rows;
      }
      if (candidateHomes.length) break;
    } catch (_) { /* continue */ }
  }

  if (!candidateHomes.length) {
    throw new Error("No Home/Contract found for this listing via API");
  }

  // Prefer active with tenant, else with tenant, else any
  const withTenantActive = candidateHomes.find(h => (h.status === "active") && (h.tenant?._id || h.tenant));
  const withTenant = candidateHomes.find(h => (h.tenant?._id || h.tenant));
  const chosen = withTenantActive || withTenant || candidateHomes[0];

  const tenantId = chosen.tenant?._id || chosen.tenant || process.env.FALLBACK_TENANT_ID || "67ec1e4f1bb7267e46be0fb1";

  return {
    homeId: chosen._id,
    projectId,
    listingId,
    tenantId,
    homeName: chosen.name || chosen.address || listing.name || "Unnamed",
  };
}

async function createInvoiceWithOptionalFiles({
  token,
  clientId,
  homeId,
  projectId,
  listingId,
  tenantId,
  productId,
  taxId,
  amount,
  description,
  pdfPath,
}) {
  const today = new Date().toISOString().split("T")[0];
  const due = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const files = [];
  if (pdfPath) {
    const f = await uploadPdfAndReturnFileObject(pdfPath, token, clientId);
    files.push(f);
  }

  const payload = {
    users: [tenantId],
    type: "Invoice",
    transactionBelongsTo: "Home",
    home: homeId,
    project: projectId,
    listing: listingId,
    source: "api_external",
    status: "due",
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
        taxCode: taxId,
      },
    ],
    files,
  };

  const data = await post("https://dashboard.thehousemonk.com/api/transaction", payload, token, clientId);
  return data;
}

(async () => {
  const token = process.env.THM_TOKEN || "";
  const clientId = process.env.THM_CLIENT_ID || "";
  const productId = process.env.UTILITIES_PRODUCT_ID || "68b15aa477372108e6f7fc32"; // Utilities
  const taxId = process.env.R10_TAX_ID || "67ee293b1e08ab0d6c5a42b7"; // R10

  const listingId = process.argv[2];
  const amount = Number(process.argv[3] || 0);
  const description = process.argv[4] || "Utilities Overuse";
  const pdfPath = process.argv[5];

  if (!token || !clientId) {
    console.error("Missing THM_TOKEN/THM_CLIENT_ID envs");
    process.exit(1);
  }
  if (!listingId) {
    console.error("Usage: node create_invoice_from_unit.js <listingId> <amount> <description> [pdfPath]");
    process.exit(1);
  }
  if (amount <= 0) {
    console.log("Amount is 0; skipping invoice as requested.");
    process.exit(0);
  }

  try {
    const resolved = await resolveHomeAndTenantFromListing({ listingId, token, clientId });
    console.log("Resolved:", JSON.stringify(resolved));
    const inv = await createInvoiceWithOptionalFiles({
      token,
      clientId,
      homeId: resolved.homeId,
      projectId: resolved.projectId,
      listingId: resolved.listingId,
      tenantId: resolved.tenantId,
      productId,
      taxId,
      amount,
      description,
      pdfPath,
    });
    console.log("Created invoice:", inv._id);
  } catch (e) {
    console.error("Failed:", e.response?.status, e.response?.data?.message || e.message);
    if (e.response?.data) console.error("Details:", JSON.stringify(e.response.data));
    process.exit(1);
  }
})();


