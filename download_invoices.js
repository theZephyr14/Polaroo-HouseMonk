const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = 'https://dfryezdsbwwfwkdfzhao.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmcnllemRzYnd3ZndrZGZ6aGFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjIwMTA3MSwiZXhwIjoyMDcxNzc3MDcxfQ.oHTMFHbqYYU6nCGFvh764H6LFhzWYJRcECREa_sUx7U';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuration
const POLAROO_EMAIL = "francisco@node-living.com";
const POLAROO_PASSWORD = "Aribau126!";
const WAIT_MS = 3000;

// Enhanced logging
function log(message, level = 'INFO') {
    const timestamp = new Date().toLocaleTimeString();
    const colors = {
        'INFO': '\x1b[36m',
        'SUCCESS': '\x1b[32m',
        'ERROR': '\x1b[31m',
        'WARNING': '\x1b[33m',
        'PROCESS': '\x1b[35m'
    };
    const reset = '\x1b[0m';
    console.log(`${colors[level]}[${timestamp}] ${message}${reset}`);
}

// Login to Polaroo
async function ensureLoggedIn(page) {
    try {
        log("🚀 Starting login to Polaroo...", 'PROCESS');
        
        await page.goto("https://app.polaroo.com/login");
        await page.waitForTimeout(WAIT_MS);
        
        const currentUrl = page.url();
        if (currentUrl.includes("dashboard")) {
            log("✅ Already logged in", 'SUCCESS');
            return true;
        }
        
        log("📝 Filling login credentials...", 'INFO');
        await page.fill('input[name="email"]', POLAROO_EMAIL);
        await page.fill('input[name="password"]', POLAROO_PASSWORD);
        
        log("🖱️ Clicking Sign in button...", 'INFO');
        try {
            await page.click('button[type="submit"]');
        } catch (e) {
            const signInButton = page.locator('button:has-text("Sign in")').first();
            if (await signInButton.count() > 0) {
                await signInButton.click();
            }
        }
        
        log("⏳ Waiting for dashboard redirect...", 'INFO');
        for (let i = 0; i < 20; i++) {
            const url = page.url();
            if (url.includes("dashboard")) {
                log("✅ Successfully logged into Polaroo!", 'SUCCESS');
                return true;
            }
            await page.waitForTimeout(500);
        }
        
        return false;
        
    } catch (error) {
        log(`❌ Login error: ${error.message}`, 'ERROR');
        return false;
    }
}

function parsePeriodToRange(periodLabel) {
    // periodLabel like "Jul-Aug"
    const [m1, m2] = periodLabel.split('-');
    const monthMap = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
    };
    const now = new Date();
    const year = now.getFullYear();
    const start = new Date(year, monthMap[m1], 1);
    const end = new Date(year, monthMap[m2] + 1, 0); // end of month
    return { start, end };
}

function datesOverlap(aStart, aEnd, bStart, bEnd) {
    return aStart <= bEnd && bStart <= aEnd;
}

// Search for property and download invoices (filtered by specific selected bills)
async function downloadInvoicesForProperty(page, propertyName, selectedBills = null, periodLabel = null) {
    try {
        log(`🔍 Searching for property: ${propertyName}`, 'PROCESS');
        
        await page.goto("https://app.polaroo.com/dashboard/accounting");
        await page.waitForTimeout(WAIT_MS);
        
        // Search for the property
        const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="Search"]').first();
        if (await searchInput.count() > 0) {
            await searchInput.fill(propertyName);
            await page.keyboard.press("Enter");
            await page.waitForTimeout(WAIT_MS);
            log(`✅ Search completed for: ${propertyName}`, 'SUCCESS');
        }
        
        // Find download buttons (# column)
        log(`📥 Looking for download buttons...`, 'INFO');
        
        // Look for all clickable elements in rows - try different approaches
        await page.waitForSelector('table tr', { timeout: 10000 });
        
        // Get all table rows with data
        const tableRows = page.locator('table tbody tr, table tr:not(:first-child)');
        const rowCount = await tableRows.count();
        
        log(`📋 Found ${rowCount} table rows`, 'INFO');
        
        // Use the working approach from the test
        const downloadButtons = page.locator('table tr td:first-child button');
        const elementCount = await downloadButtons.count();
        
        log(`📋 Found ${elementCount} "#" column elements to click`, 'INFO');

        // If we have specific selected bills, match them exactly
        let candidateIndexes = [...Array(elementCount).keys()];
        
        if (selectedBills && selectedBills.length > 0) {
            log(`🎯 Matching ${selectedBills.length} specific selected bills...`, 'INFO');
            
            // Get all table rows with their data
            const tableRows = await page.evaluate(() => {
                const headerCells = Array.from(document.querySelectorAll('table thead th'));
                const headerTexts = headerCells.map(th => th.innerText.trim().toLowerCase());
                let serviceIdx = headerTexts.indexOf('service');
                let initialIdx = headerTexts.indexOf('initial date');
                let finalIdx = headerTexts.indexOf('final date');
                let totalIdx = headerTexts.indexOf('total');
                if (serviceIdx === -1 || initialIdx === -1 || finalIdx === -1 || totalIdx === -1) {
                    const ths = Array.from(document.querySelectorAll('table tr')).find(r => r.querySelectorAll('th').length)?.querySelectorAll('th');
                    if (ths) {
                        const texts = Array.from(ths).map(th => th.innerText.trim().toLowerCase());
                        serviceIdx = texts.indexOf('service');
                        initialIdx = texts.indexOf('initial date');
                        finalIdx = texts.indexOf('final date');
                        totalIdx = texts.indexOf('total');
                    }
                }
                return Array.from(document.querySelectorAll('table tbody tr')).map((tr, idx) => {
                    const tds = Array.from(tr.querySelectorAll('td'));
                    const service = serviceIdx >= 0 ? (tds[serviceIdx]?.innerText.trim() || '') : '';
                    const initial = initialIdx >= 0 ? (tds[initialIdx]?.innerText.trim() || '') : '';
                    const final = finalIdx >= 0 ? (tds[finalIdx]?.innerText.trim() || '') : '';
                    const total = totalIdx >= 0 ? (tds[totalIdx]?.innerText.trim() || '') : '';
                    return { idx, cells: [service, initial, final, total], service, initial, final, total };
                });
            });
            
            // Find matching rows for each selected bill
            const matchingIndexes = [];
            for (const selectedBill of selectedBills) {
                const service = selectedBill.Service || '';
                const initialDate = selectedBill['Initial date'] || '';
                const finalDate = selectedBill['Final date'] || '';
                const total = selectedBill.Total || '';
                
                log(`🔍 Looking for: ${service} (${initialDate} to ${finalDate}) - ${total}`, 'INFO');
                
                // Find matching row
                for (const row of tableRows) {
                    // Check if this row matches the selected bill exactly by header columns
                    const rowService = row.service || '';
                    const rowInitial = row.initial || '';
                    const rowFinal = row.final || '';
                    const rowTotal = row.total || '';
                    
                    if (rowService && rowInitial && rowFinal && rowTotal &&
                        rowService.toLowerCase().includes(service.toLowerCase().split(' ')[0]) &&
                        rowInitial.includes(initialDate) &&
                        rowFinal.includes(finalDate) ) {
                        matchingIndexes.push(row.idx);
                        log(`✅ MATCHED: Row ${row.idx + 1} - ${service}`, 'SUCCESS');
                        break;
                    }
                }
            }
            
            if (matchingIndexes.length > 0) {
                candidateIndexes = matchingIndexes;
                log(`🎯 Found ${matchingIndexes.length} matching rows: [${matchingIndexes.map(i => i + 1).join(', ')}]`, 'SUCCESS');
            } else {
                log(`⚠️ No exact matches found, will download first few rows`, 'WARNING');
                candidateIndexes = [...Array(Math.min(elementCount, 3)).keys()];
            }
        } else {
            log(`⚠️ No selected bills provided, downloading first 3 rows`, 'WARNING');
            candidateIndexes = [...Array(Math.min(elementCount, 3)).keys()];
        }
        
        // Debug: Show what's in the first column and look for nested clickable elements
        for (let j = 0; j < Math.min(3, elementCount); j++) {
            const elementText = await downloadButtons.nth(j).textContent();
            const isClickable = await downloadButtons.nth(j).isEnabled();
            const innerHTML = await downloadButtons.nth(j).innerHTML();
            
            log(`🔍 Element ${j + 1}: "${elementText}" (clickable: ${isClickable})`, 'INFO');
            log(`🔍 HTML: ${innerHTML.substring(0, 100)}...`, 'INFO');
        }
        
        const downloadedFiles = [];
        
        // Iterate only over selected candidate indexes
        for (let idx = 0; idx < candidateIndexes.length; idx++) {
            const i = candidateIndexes[idx];
            try {
                log(`📥 Downloading invoice row ${i + 1}...`, 'INFO');
                
                // Set up new page handling (invoice opens in new tab)
                const newPagePromise = page.context().waitForEvent('page', { timeout: 10000 });
                
                // Get the element and show more debug info
                const element = downloadButtons.nth(i);
                const elementHtml = await element.innerHTML();
                log(`🔍 Clicking element HTML: ${elementHtml}`, 'INFO');
                
                // Try different click approaches
                try {
                    // First try: regular click
                    await element.click();
                    log(`✅ Regular click successful`, 'SUCCESS');
                } catch (clickError) {
                    log(`⚠️ Regular click failed, trying force click`, 'WARNING');
                    // Second try: force click
                    await element.click({ force: true });
                }
                
                // Wait for new tab to open (Adobe Acrobat viewer)
                const newPage = await newPagePromise;
                await newPage.waitForLoadState();
                
                const pdfUrl = newPage.url();
                log(`📄 PDF tab opened: ${pdfUrl}`, 'INFO');
                
                // Wait for Adobe viewer to load
                log(`⏳ Waiting for Adobe viewer to load...`, 'INFO');
                await newPage.waitForTimeout(5000);
                
                // Download PDF using direct S3 URL with proper headers
                const fileName = `${propertyName.replace(/[^a-zA-Z0-9]/g, '_')}_invoice_${Date.now()}.pdf`;
                const tempPath = path.join(__dirname, 'temp', fileName);
                
                try {
                    log(`📥 Downloading PDF from S3...`, 'INFO');
                    
                    // Use axios to download with proper headers
                    const axios = require('axios');
                    const response = await axios.get(pdfUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                            'Accept': 'application/pdf,application/octet-stream,*/*',
                            'Accept-Language': 'en-US,en;q=0.9',
                            'Accept-Encoding': 'gzip, deflate, br',
                            'Connection': 'keep-alive',
                            'Upgrade-Insecure-Requests': '1'
                        },
                        responseType: 'arraybuffer',
                        timeout: 30000
                    });
                    
                    const pdfBuffer = Buffer.from(response.data);
                    
                    // Validate PDF content
                    const pdfHeader = pdfBuffer.slice(0, 4).toString();
                    if (pdfHeader !== '%PDF') {
                        log(`❌ Invalid PDF file (${pdfBuffer.length} bytes, header: ${pdfHeader})`, 'ERROR');
                        log(`🔍 Content preview: ${pdfBuffer.slice(0, 100).toString()}`, 'WARNING');
                        continue; // Skip this invoice
                    } else {
                        log(`✅ Valid PDF file (${pdfBuffer.length} bytes)`, 'SUCCESS');
                        fs.writeFileSync(tempPath, pdfBuffer);
                    }
                    
                } catch (downloadError) {
                    log(`❌ Download failed: ${downloadError.message}`, 'ERROR');
                    await newPage.close();
                    continue; // Skip this invoice
                }
                
                // Upload to Supabase
                const uploaded = await uploadToSupabase(tempPath, propertyName, fileName);
                if (uploaded) {
                    downloadedFiles.push(fileName);
                    log(`☁️ Uploaded to Supabase: ${fileName}`, 'SUCCESS');
                }
                
                // Clean up temp file
                if (fs.existsSync(tempPath)) {
                    fs.unlinkSync(tempPath);
                }
                
                // Close the new tab
                await newPage.close();
                
                // Wait between downloads
                await page.waitForTimeout(2000);
                
            } catch (error) {
                log(`❌ Error downloading invoice ${i + 1}: ${error.message}`, 'ERROR');
            }
        }
        
        log(`✅ Downloaded ${downloadedFiles.length} invoices for ${propertyName}`, 'SUCCESS');
        return downloadedFiles;
        
    } catch (error) {
        log(`❌ Error processing ${propertyName}: ${error.message}`, 'ERROR');
        return [];
    }
}

// Upload file to Supabase storage
async function uploadToSupabase(filePath, propertyName, fileName) {
    try {
        // Create folder structure: invoices/property_name/
        const folderName = propertyName.replace(/[^a-zA-Z0-9]/g, '_'); // Clean property name for folder
        const supabasePath = `invoices/${folderName}/${fileName}`;
        
        log(`☁️ Uploading to Supabase: ${supabasePath}`, 'INFO');
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            log(`❌ File not found: ${filePath}`, 'ERROR');
            return false;
        }
        
        // Read file
        const fileBuffer = fs.readFileSync(filePath);
        log(`📄 File size: ${fileBuffer.length} bytes`, 'INFO');
        
        // First, try to create the bucket if it doesn't exist
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        if (!listError) {
            const bucketExists = buckets.some(bucket => bucket.name === 'polaroo_pdfs');
            if (!bucketExists) {
                log(`🪣 Creating bucket 'polaroo_pdfs'...`, 'INFO');
                const { data: newBucket, error: createError } = await supabase.storage.createBucket('polaroo_pdfs', {
                    public: true,
                    allowedMimeTypes: ['application/pdf'],
                    fileSizeLimit: 10485760 // 10MB
                });
                if (createError) {
                    log(`❌ Failed to create bucket: ${createError.message}`, 'ERROR');
                } else {
                    log(`✅ Created bucket 'polaroo_pdfs'`, 'SUCCESS');
                }
            }
        }
        
        // Upload to Supabase storage
        const { data, error } = await supabase.storage
            .from('polaroo_pdfs')
            .upload(supabasePath, fileBuffer, {
                contentType: 'application/pdf',
                upsert: true // Overwrite if exists
            });
        
        if (error) {
            log(`❌ Supabase upload error: ${error.message}`, 'ERROR');
            log(`🔍 Error details: ${JSON.stringify(error)}`, 'ERROR');
            return false;
        }
        
        log(`✅ Successfully uploaded to: ${supabasePath}`, 'SUCCESS');
        log(`🔗 Supabase data: ${JSON.stringify(data)}`, 'INFO');
        return true;
        
    } catch (error) {
        log(`❌ Upload error: ${error.message}`, 'ERROR');
        log(`🔍 Error stack: ${error.stack}`, 'ERROR');
        return false;
    }
}

// Main function to download invoices for properties with overages
async function downloadInvoicesForOverageProperties(overageProperties) {
    log(`🚀 STARTING INVOICE DOWNLOAD FOR ${overageProperties.length} PROPERTIES`, 'PROCESS');
    
    // Create temp directory
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }
    
    // Launch browser
    const browser = await chromium.launch({ 
        headless: false,  // VISIBLE WINDOW
        slowMo: 1000      // Slow down so you can see actions
    });
    const context = await browser.newContext({
        acceptDownloads: true // Enable downloads
    });
    const page = await context.newPage();
    
    try {
        // Login once
        if (!await ensureLoggedIn(page)) {
            throw new Error("Failed to login to Polaroo");
        }
        
        const results = [];
        
        // Process each property with overage
        for (let i = 0; i < overageProperties.length; i++) {
            const property = overageProperties[i];
            
            log(`\n[${'='.repeat(50)}]`, 'PROCESS');
            log(`📥 DOWNLOADING INVOICES ${i+1}/${overageProperties.length}: ${property.name}`, 'PROCESS');
            log(`💰 Overage: ${property.overage.toFixed(2)} €`, 'WARNING');
            log(`[${'='.repeat(50)}]`, 'PROCESS');
            
            const downloadedFiles = await downloadInvoicesForProperty(page, property.name, property.selected_bills || null, property.period || null);
            
            results.push({
                property: property.name,
                overage: property.overage,
                downloadedFiles: downloadedFiles,
                downloadCount: downloadedFiles.length
            });
        }
        
        // Show final summary
        log(`\n${'='.repeat(60)}`, 'PROCESS');
        log(`🎉 INVOICE DOWNLOAD COMPLETE`, 'PROCESS');
        log(`${'='.repeat(60)}`, 'PROCESS');
        
        console.log('\n📥 DOWNLOAD SUMMARY:');
        console.log('┌─────┬─────────────────────────┬─────────────┬───────────────┐');
        console.log('│ #   │ Property                │ Overage     │ Files Downloaded │');
        console.log('├─────┼─────────────────────────┼─────────────┼───────────────┤');
        
        let totalFiles = 0;
        results.forEach((result, index) => {
            const propertyName = result.property.length > 23 ? result.property.substring(0, 20) + '...' : result.property;
            totalFiles += result.downloadCount;
            
            console.log(`│ ${(index + 1).toString().padStart(3)} │ ${propertyName.padEnd(23)} │ ${result.overage.toFixed(2).padStart(9)} € │ ${result.downloadCount.toString().padStart(13)} │`);
        });
        
        console.log('├─────┼─────────────────────────┼─────────────┼───────────────┤');
        console.log(`│     │ TOTAL                   │             │ ${totalFiles.toString().padStart(13)} │`);
        console.log('└─────┴─────────────────────────┴─────────────┴───────────────┘');
        
        log(`\n📁 All files organized in Supabase under 'polaroo_pdfs' bucket`, 'SUCCESS');
        log(`👁️ Browser will stay open for 30 seconds for inspection...`, 'INFO');
        await page.waitForTimeout(30000);
        
        return results;
        
    } finally {
        await browser.close();
        
        // Clean up temp directory
        if (fs.existsSync(tempDir)) {
            const files = fs.readdirSync(tempDir);
            files.forEach(file => {
                fs.unlinkSync(path.join(tempDir, file));
            });
            fs.rmdirSync(tempDir);
        }
    }
}

// Export functions
module.exports = {
    downloadInvoicesForOverageProperties,
    uploadToSupabase
};
