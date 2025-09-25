const { chromium } = require('playwright');
const XLSX = require('xlsx');

// Configuration
const POLAROO_EMAIL = "francisco@node-living.com";
const POLAROO_PASSWORD = "Aribau126!";
const WAIT_MS = 3000; // Reduced wait time

// Enhanced logging
function log(message, level = 'INFO') {
    const timestamp = new Date().toLocaleTimeString();
    const colors = {
        'INFO': '\x1b[36m',    // Cyan
        'SUCCESS': '\x1b[32m', // Green
        'ERROR': '\x1b[31m',   // Red
        'WARNING': '\x1b[33m', // Yellow
        'PROCESS': '\x1b[35m'  // Magenta
    };
    const reset = '\x1b[0m';
    console.log(`${colors[level]}[${timestamp}] ${message}${reset}`);
}

// Get first 10 properties from Book1.xlsx
function getFirst5Properties() {
    try {
        log('📖 Reading Book1.xlsx...', 'INFO');
        const workbook = XLSX.readFile('Book1.xlsx');
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        const first5 = data.slice(0, 5).map((row, index) => ({
            index: index + 1,
            name: row.name?.toString().trim(),
            rooms: row.rooms || 1,
            mail1: row.mail1 || '',
            mail2: row.mail2 || ''
        }));
        
        log(`✅ Found ${data.length} total properties, processing first 5`, 'SUCCESS');
        
        // Show the 5 properties we'll process
        console.log('\n📋 PROPERTIES TO PROCESS:');
        first5.forEach(prop => {
            log(`  ${prop.index}. ${prop.name} (${prop.rooms} rooms)`, 'INFO');
        });
        console.log('');
        
        return first5;
    } catch (error) {
        log(`❌ Error reading Book1.xlsx: ${error.message}`, 'ERROR');
        return [{ index: 1, name: "Aribau 1º 1ª", rooms: 1, mail1: "", mail2: "" }];
    }
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
        
        log("❌ Login failed - no redirect to dashboard", 'ERROR');
        return false;
        
    } catch (error) {
        log(`❌ Login error: ${error.message}`, 'ERROR');
        return false;
    }
}

// Search for property
async function searchForProperty(page, propertyName) {
    try {
        log(`🔍 Searching for property: ${propertyName}`, 'PROCESS');
        
        await page.goto("https://app.polaroo.com/dashboard/accounting");
        await page.waitForTimeout(WAIT_MS);
        
        const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="Search"]').first();
        const searchCount = await searchInput.count();
        
        if (searchCount > 0) {
            log(`📝 Entering "${propertyName}" in search box...`, 'INFO');
            await searchInput.fill(propertyName);
            await page.keyboard.press("Enter");
            await page.waitForTimeout(WAIT_MS);
            log(`✅ Search completed for: ${propertyName}`, 'SUCCESS');
        } else {
            log("⚠️ No search input found", 'WARNING');
        }
        
        return true;
        
    } catch (error) {
        log(`❌ Search error: ${error.message}`, 'ERROR');
        return false;
    }
}

// Extract and filter bills
async function extractAndFilterBills(page, propertyName, period) {
    try {
        log(`📊 Extracting bills for ${propertyName}...`, 'PROCESS');
        
        await page.waitForSelector('table, .table, [role="table"]', { timeout: 10000 });
        
        const tableData = await page.evaluate(() => {
            const tables = document.querySelectorAll('table, .table, [role="table"]');
            const data = [];
            
            for (const table of tables) {
                const rows = table.querySelectorAll('tr');
                const headers = [];
                
                if (rows.length > 0) {
                    const headerRow = rows[0];
                    const headerCells = headerRow.querySelectorAll('th, td');
                    for (const cell of headerCells) {
                        headers.push(cell.textContent.trim());
                    }
                }
                
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    const cells = row.querySelectorAll('td, th');
                    const rowData = {};
                    
                    for (let j = 0; j < cells.length && j < headers.length; j++) {
                        const cellText = cells[j].textContent.trim();
                        rowData[headers[j]] = cellText;
                    }
                    
                    if (Object.keys(rowData).length > 0) {
                        data.push(rowData);
                    }
                }
            }
            
            return data;
        });
        
        log(`📋 Found ${tableData.length} total bills`, 'INFO');
        
        // IMPROVED FILTERING LOGIC
        const currentYear = new Date().getFullYear();
        const periodMonths = {
            'Jan-Feb': [1, 2], 'Mar-Apr': [3, 4], 'May-Jun': [5, 6],
            'Jul-Aug': [7, 8], 'Sep-Oct': [9, 10], 'Nov-Dec': [11, 12]
        };
        const targetMonths = periodMonths[period] || [7, 8];
        
        let allBills = [];
        let gasExcluded = 0;
        
        // First pass: categorize all bills and exclude gas
        for (const bill of tableData) {
            const service = (bill.Service || '').toLowerCase();
            
            // Exclude gas bills completely
            if (service.includes('gas')) {
                gasExcluded++;
                log(`❌ EXCLUDED GAS: ${bill.Service} - ${bill.Total}`, 'WARNING');
                continue;
            }
            
            // Parse dates
            const initialDate = bill['Initial date'] || '';
            const finalDate = bill['Final date'] || '';
            
            if (initialDate.includes('/') && finalDate.includes('/')) {
                const [iDay, iMonth, iYear] = initialDate.split('/');
                const [fDay, fMonth, fYear] = finalDate.split('/');
                
                const startDate = new Date(parseInt(iYear), parseInt(iMonth) - 1, parseInt(iDay));
                const endDate = new Date(parseInt(fYear), parseInt(fMonth) - 1, parseInt(fDay));
                
                // EXCLUDE same-day bills (your requirement)
                if (initialDate === finalDate) {
                    log(`❌ EXCLUDED SAME-DAY: ${bill.Service} - ${bill.Total} (${initialDate})`, 'WARNING');
                    continue;
                }
                
                // Check if bill period overlaps with target months
                const billStartMonth = parseInt(iMonth);
                const billEndMonth = parseInt(fMonth);
                const billYear = parseInt(iYear);
                
                if (billYear === currentYear) {
                    // BULLETPROOF FILTERING: 
                    // For Jul-Aug: 2 elec bills (one ending July, one ending August)
                    // 1 water bill (can start June, must end August)
                    const billEndsInTargetPeriod = targetMonths.includes(billEndMonth);
                    const billStartsInTargetPeriod = targetMonths.includes(billStartMonth);
                    const billStartsBeforeTarget = billStartMonth < Math.min(...targetMonths);
                    const billExtendsBeyondTarget = billEndMonth > Math.max(...targetMonths);
                    
                    // EXCLUDE if extends beyond target period
                    if (billExtendsBeyondTarget) {
                        log(`❌ EXCLUDED: ${bill.Service} - ${bill.Total} (${initialDate} to ${finalDate}) - extends beyond target period`, 'WARNING');
                        continue;
                    }
                    
                    // INCLUDE if ends in target period (allows past bills)
                    const shouldInclude = billEndsInTargetPeriod;
                    
                    if (shouldInclude) {
                        log(`✅ INCLUDED: ${bill.Service} - ${bill.Total} (${initialDate} to ${finalDate}) - ends in target period`, 'SUCCESS');
                    } else {
                        log(`❌ EXCLUDED: ${bill.Service} - ${bill.Total} (${initialDate} to ${finalDate}) - does not end in target period`, 'WARNING');
                    }
                    
                    if (shouldInclude) {
                        allBills.push({
                            ...bill,
                            serviceType: service.includes('electric') ? 'electricity' : 
                                       service.includes('water') ? 'water' : 'other',
                            startMonth: billStartMonth,
                            endMonth: billEndMonth,
                            duration: Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24) // days
                        });
                        
                        log(`📋 SELECTED: ${bill.Service} - ${bill.Total} (${initialDate} to ${finalDate}) - ends in target period`, 'INFO');
                    }
                }
            }
        }
        
        log(`\n🔍 BULLETPROOF ANALYSIS: Found ${allBills.length} bills ending in ${period} (allows past bills, excludes gas, same-day, and bills extending beyond target)`, 'INFO');
        
        // Second pass: Use intelligent selection
        const electricityBills = allBills.filter(b => b.serviceType === 'electricity');
        const waterBills = allBills.filter(b => b.serviceType === 'water');
        
        log(`⚡ ${electricityBills.length} electricity bills available`, 'INFO');
        log(`💧 ${waterBills.length} water bills available`, 'INFO');
        
        // BULLETPROOF SELECTION: 
        // For Jul-Aug: 2 elec bills (one ending July, one ending August)
        // 1 water bill (can start June, must end August)
        electricityBills.sort((a, b) => b.duration - a.duration); // Longer duration first
        waterBills.sort((a, b) => b.duration - a.duration);
        
        const selectedElectricity = electricityBills.slice(0, 2);
        const selectedWater = waterBills.slice(0, 1);
        const selectedBills = [...selectedElectricity, ...selectedWater];
        
        log(`🎯 TARGET: 2 electricity + 1 water bills for ${period}`, 'INFO');
        
        // Log selections
        selectedElectricity.forEach(bill => {
            log(`✅ SELECTED ELECTRICITY: ${bill.Service} - ${bill.Total} (${bill['Initial date']} to ${bill['Final date']})`, 'SUCCESS');
        });
        selectedWater.forEach(bill => {
            log(`✅ SELECTED WATER: ${bill.Service} - ${bill.Total} (${bill['Initial date']} to ${bill['Final date']})`, 'SUCCESS');
        });
        
        // Calculate total
        let totalCost = 0;
        for (const bill of selectedBills) {
            const amount = parseFloat((bill.Total || '0').replace('€', '').replace(',', '.').trim());
            totalCost += amount;
        }
        
        log(`🎯 FILTERED: ${selectedElectricity.length} electricity + ${selectedWater.length} water bills = ${totalCost.toFixed(2)} €`, 'SUCCESS');
        log(`🚫 EXCLUDED: ${gasExcluded} gas bills`, 'WARNING');
        
        return {
            electricity_count: selectedElectricity.length,
            water_count: selectedWater.length,
            total_cost: totalCost,
            bills: selectedBills
        };
        
    } catch (error) {
        log(`❌ Extraction error: ${error.message}`, 'ERROR');
        return {
            electricity_count: 0,
            water_count: 0,
            total_cost: 0,
            bills: []
        };
    }
}

// Main processing function
async function processFirst10Properties(period) {
    log(`🚀 STARTING BATCH PROCESSING FOR ${period}`, 'PROCESS');
    log(`👁️ Chrome window will open - watch the bot work!`, 'INFO');
    
    const properties = getFirst5Properties();
    const results = [];
    
    // Launch browser
    log("🌐 Launching Chrome (headless) ...", 'INFO');
    const browser = await chromium.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--single-process',
            '--no-zygote'
        ]
    });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        // Login once for all properties
        log("🔑 Logging into Polaroo (once for all properties)...", 'PROCESS');
        if (!await ensureLoggedIn(page)) {
            throw new Error("Failed to login to Polaroo");
        }
        
        log(`\n🏠 PROCESSING ${properties.length} PROPERTIES:\n`, 'PROCESS');
        
        // Process each property
        for (let i = 0; i < properties.length; i++) {
            const property = properties[i];
            
            log(`\n[${'='.repeat(50)}]`, 'PROCESS');
            log(`🏠 PROPERTY ${i+1}/10: ${property.name}`, 'PROCESS');
            log(`📊 Rooms: ${property.rooms}`, 'INFO');
            log(`[${'='.repeat(50)}]`, 'PROCESS');
            
            try {
                // Search for this property
                if (!await searchForProperty(page, property.name)) {
                    log(`❌ Failed to search for ${property.name}`, 'ERROR');
                    results.push({
                        property: property.name,
                        rooms: property.rooms,
                        status: 'Search failed',
                        electricity_bills: 0,
                        water_bills: 0,
                        total_cost: '0.00 €'
                    });
                    continue;
                }
                
                // Extract and filter bills
                const billData = await extractAndFilterBills(page, property.name, period);
                
                const resultEntry = {
                    property: property.name,
                    rooms: property.rooms,
                    status: 'Success',
                    electricity_bills: billData.electricity_count,
                    water_bills: billData.water_count,
                    total_cost: `${billData.total_cost.toFixed(2)} €`,
                    selected_bills: billData.bills // Include the actual selected bills
                };
                results.push(resultEntry);
                // Emit machine-readable line for Streamlit to capture full data
                console.log('RESULT_JSON:' + JSON.stringify(resultEntry));
                
                log(`✅ COMPLETED: ${property.name} - ${billData.electricity_count} elec + ${billData.water_count} water = ${billData.total_cost.toFixed(2)} €`, 'SUCCESS');
                
            } catch (error) {
                log(`❌ ERROR processing ${property.name}: ${error.message}`, 'ERROR');
                results.push({
                    property: property.name,
                    rooms: property.rooms,
                    status: 'Error',
                    electricity_bills: 0,
                    water_bills: 0,
                    total_cost: '0.00 €'
                });
            }
        }
        
        // Show final summary
        log(`\n${'='.repeat(60)}`, 'PROCESS');
        log(`🎉 BATCH PROCESSING COMPLETE FOR ${period}`, 'PROCESS');
        log(`${'='.repeat(60)}`, 'PROCESS');
        
        console.log('\n📊 FINAL RESULTS:');
        console.log('┌─────┬─────────────────────────┬───────┬─────────┬────────┬──────────┬─────────────┐');
        console.log('│ #   │ Property                │ Rooms │ Status  │ ⚡ Elec │ 💧 Water │ 💰 Total    │');
        console.log('├─────┼─────────────────────────┼───────┼─────────┼────────┼──────────┼─────────────┤');
        
        let grandTotal = 0;
        results.forEach((result, index) => {
            const cost = parseFloat(result.total_cost.replace('€', '').trim()) || 0;
            grandTotal += cost;
            
            const propertyName = result.property.length > 23 ? result.property.substring(0, 20) + '...' : result.property;
            const status = result.status === 'Success' ? '✅ OK' : '❌ ERR';
            
            console.log(`│ ${(index + 1).toString().padStart(3)} │ ${propertyName.padEnd(23)} │ ${result.rooms.toString().padStart(5)} │ ${status.padEnd(7)} │ ${result.electricity_bills.toString().padStart(6)} │ ${result.water_bills.toString().padStart(8)} │ ${result.total_cost.padStart(11)} │`);
        });
        
        console.log('├─────┼─────────────────────────┼───────┼─────────┼────────┼──────────┼─────────────┤');
        console.log(`│     │ GRAND TOTAL             │       │         │        │          │ ${grandTotal.toFixed(2).padStart(9)} € │`);
        console.log('└─────┴─────────────────────────┴───────┴─────────┴────────┴──────────┴─────────────┘');
        
        log(`\n💰 GRAND TOTAL: ${grandTotal.toFixed(2)} € for ${period}`, 'SUCCESS');
        log(`👁️ Browser will stay open for 30 seconds for inspection...`, 'INFO');
        await page.waitForTimeout(30000);
        
        return results;
        
    } finally {
        log("🔒 Closing browser...", 'INFO');
        await browser.close();
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const period = args[0] || 'Jul-Aug';
    
    log(`🚀 POLAROO BATCH PROCESSOR STARTING`, 'PROCESS');
    log(`📅 Period: ${period}`, 'INFO');
    log(`👁️ Chrome window will open - watch the bot work!`, 'INFO');
    
    try {
        await processFirst10Properties(period);
        log(`🎉 ALL DONE!`, 'SUCCESS');
    } catch (error) {
        log(`❌ FATAL ERROR: ${error.message}`, 'ERROR');
    }
}

// Run with command line argument
// Usage: node process-10-properties.js Jul-Aug
main().catch(error => {
    log(`❌ CRASH: ${error.message}`, 'ERROR');
    process.exit(1);
});
