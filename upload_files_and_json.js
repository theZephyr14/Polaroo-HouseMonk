const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Env: THM_TOKEN, THM_CLIENT_ID required
const THM_TOKEN = process.env.THM_TOKEN || "";
const THM_CLIENT_ID = process.env.THM_CLIENT_ID || "";

function thmHeaders() {
  return { authorization: THM_TOKEN, "x-api-key": THM_CLIENT_ID, "content-type": "application/json" };
}

async function getPresigned(fileName) {
  const { data } = await axios.post(
    "https://dashboard.thehousemonk.com/api/document/presigned",
    { fileName },
    { headers: thmHeaders() }
  );
  return data; // { url, objectKey, fileName, fileFormat, ... }
}

async function putToS3(url, buffer, contentType) {
  await axios.put(url, buffer, { headers: { "Content-Type": contentType } });
}

async function uploadBufferAsFile({ buffer, fileName, contentType }) {
  const pre = await getPresigned(fileName);
  await putToS3(pre.url, buffer, contentType);
  // normalize minimal fields used later
  return {
    ...pre,
    status: pre.status || "active",
    fileName,
    fileFormat: contentType,
  };
}

function safeLoadOveruse() {
  try {
    const raw = fs.readFileSync(path.resolve("overuse.json"), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function buildJsonBlobsForProperty(propertyName, overuse) {
  // Create up to 3 JSON payloads per property: summary.json, selected_bills.json, monthly_overuse.json
  const entry = Array.isArray(overuse)
    ? overuse.find(p => (p.name || "").toLowerCase() === (propertyName || "").toLowerCase())
    : null;

  const nowIso = new Date().toISOString();
  const files = [];

  const summary = {
    type: "overuse_summary",
    property: propertyName,
    generatedAt: nowIso,
    overage: entry?.overage ?? null,
    rooms: entry?.rooms ?? null,
  };
  files.push({ name: `${sanitize(propertyName)}_summary.json`, content: JSON.stringify(summary, null, 2) });

  if (entry?.selected_bills) {
    files.push({ name: `${sanitize(propertyName)}_selected_bills.json`, content: JSON.stringify(entry.selected_bills, null, 2) });
  }

  if (entry?.monthly_overuse) {
    files.push({ name: `${sanitize(propertyName)}_monthly_overuse.json`, content: JSON.stringify(entry.monthly_overuse, null, 2) });
  }

  return files.slice(0, 3); // send up to 3 JSONs
}

function sanitize(name) {
  return String(name || "").replace(/[^A-Za-z0-9_\-]+/g, "_");
}

async function main() {
  if (!THM_TOKEN || !THM_CLIENT_ID) {
    console.error("Missing THM_TOKEN or THM_CLIENT_ID env vars.");
    process.exit(1);
  }

  // Determine PDFs: use CLI args if provided, else auto-discover by name pattern
  let pdfs = process.argv.slice(2).filter(p => p.toLowerCase().endsWith('.pdf'));
  if (pdfs.length === 0) {
    const all = fs.readdirSync(process.cwd()).filter(f => /\.pdf$/i.test(f));
    // Match names like Aribau_1__1__invoice_*.pdf or similar invoice pdfs
    pdfs = all.filter(f => /aribau.*invoice.*\.pdf/i.test(f)).slice(0,3);
  }

  // Derive property name from filename prefix
  const overuse = safeLoadOveruse();

  const results = [];
  for (const pdf of pdfs) {
    const pdfPath = path.resolve(pdf);
    if (!fs.existsSync(pdfPath)) {
      console.warn(`Skipping missing file: ${pdf}`);
      continue;
    }

    const base = path.basename(pdf, ".pdf");
    // property name guess: up to first "_invoice"
    const propName = base.includes("_invoice") ? base.split("_invoice")[0].replace(/_/g, " ") : base.replace(/_/g, " ");

    try {
      // 1) Upload the PDF
      const pdfBuffer = fs.readFileSync(pdfPath);
      const pdfObj = await uploadBufferAsFile({ buffer: pdfBuffer, fileName: path.basename(pdfPath), contentType: "application/pdf" });

      // 2) Build and upload up to 3 JSONs for this property
      const jsonFiles = buildJsonBlobsForProperty(propName, overuse);
      const jsonUploads = [];
      for (const jf of jsonFiles) {
        const buf = Buffer.from(jf.content, "utf8");
        const uploaded = await uploadBufferAsFile({ buffer: buf, fileName: jf.name, contentType: "application/json" });
        jsonUploads.push(uploaded);
      }

      results.push({
        pdf: { name: path.basename(pdfPath), objectKey: pdfObj.objectKey },
        jsons: jsonUploads.map(x => ({ name: x.fileName, objectKey: x.objectKey })),
      });

      console.log(`✅ Uploaded: ${path.basename(pdfPath)}`);
      console.log(`   PDF objectKey: ${pdfObj.objectKey}`);
      jsonUploads.forEach(j => console.log(`   JSON objectKey: ${j.objectKey} (${j.fileName})`));
    } catch (e) {
      console.error(`❌ Failed uploading for ${pdf}:`, e.response?.status, e.response?.data?.message || e.message);
      if (e.response?.data) console.error("Details:", JSON.stringify(e.response.data));
    }
  }

  console.log("\n📊 SUMMARY");
  console.log(JSON.stringify(results, null, 2));
  try {
    fs.writeFileSync(path.resolve('aws_upload_results.json'), JSON.stringify(results, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed writing aws_upload_results.json:', e.message);
  }
}

main().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(1);
});


