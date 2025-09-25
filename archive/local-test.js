const puppeteer = require('puppeteer'); // Use regular puppeteer for local testing
const XLSX = require('xlsx');
require('dotenv').config();

// Read Book1.xlsx locally
function getFirstPropertyFromBook1() {
    try {
        const workbook = XLSX.readFile('Book1.xlsx');
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        const firstRow = data[0];
        const propertyName = firstRow.name;
        
        return {
            propertyName: propertyName.toString().trim(),
            totalProperties: data.length
        };
    } catch (error) {
        console.error('❌ Book1.xlsx error:', error.message);
        return {
            propertyName: "Aribau 1º 1ª",
            totalProperties: 1
        };
    }
}

// Get date range for period
function getPeriodDateRange(period) {
    const currentYear = new Date().getFullYear();
    const ranges = {
        'Jan-Feb': { start: `01/01/${currentYear}`, end: `28/02/${currentYear}` },
        'Mar-Apr': { start: `01/03/${currentYear}`, end: `30/04/${currentYear}` },
        'May-Jun': { start: `01/05/${currentYear}`, end: `30/06/${currentYear}` },
        'Jul-Aug': { start: `01/07/${currentYear}`, end: `31/08/${currentYear}` },
        'Sep-Oct': { start: `01/09/${currentYear}`, end: `31/10/${currentYear}` },
        'Nov-Dec': { start: `01/11/${currentYear}`, end: `31/12/${currentYear}` }
    };
    return ranges[period] || ranges['Jul-Aug'];
}

async function testPolarooBot() {
    let browser = null;
    
    try {
        console.log('🤖 Starting LOCAL Polaroo bot test...');
        console.log('👁️ Chrome window will open - you can watch the AI work!');
        
        // Step 1: Read Book1.xlsx
        console.log('📖 Step 1: Reading Book1.xlsx...');
        const { propertyName, totalProperties } = getFirstPropertyFromBook1();
        console.log(`✅ Property: ${propertyName} (${totalProperties} total properties)`);
        
        // Step 2: Launch Chrome VISIBLY
        console.log('🌐 Step 2: Launching Chrome browser (VISIBLE)...');
        browser = await puppeteer.launch({
            headless: false, // VISIBLE CHROME WINDOW
            devtools: true,  // Open DevTools so you can see everything
            slowMo: 1000,    // Slow down actions so you can see them
            args: [
                '--start-maximized',
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        
        console.log('👁️ WATCH THE CHROME WINDOW - AI is starting to work...');
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second pause
        
        // Step 3: Go to Polaroo login page
        console.log('🌐 Step 3: Going to Polaroo login page...');
        await page.goto('https://app.polaroo.com/login', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        console.log('✅ Login page loaded - LOOK AT THE CHROME WINDOW');
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second pause
        
        // Step 4: Fill email (COPY-PASTE style)
        console.log('📧 Step 4: Copy-pasting email field...');
        await page.waitForSelector('input[name="email"]', { timeout: 10000 });
        await page.evaluate((email) => {
            const emailField = document.querySelector('input[name="email"]');
            if (emailField) {
                emailField.value = email;
                emailField.dispatchEvent(new Event('input', { bubbles: true }));
                emailField.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, 'francisco@node-living.com');
        console.log('✅ Email copy-pasted instantly!');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 5: Fill password (COPY-PASTE style)
        console.log('🔒 Step 5: Copy-pasting password field...');
        await page.waitForSelector('input[name="password"]', { timeout: 10000 });
        await page.evaluate((password) => {
            const passwordField = document.querySelector('input[name="password"]');
            if (passwordField) {
                passwordField.value = password;
                passwordField.dispatchEvent(new Event('input', { bubbles: true }));
                passwordField.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, 'Aribau126!');
        console.log('✅ Password copy-pasted instantly!');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 6: Click the damn blue "Sign in" button
        console.log('🖱️ Step 6: Clicking the blue Sign in button...');
        
        // Just click it directly - we can see it's there!
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const signInButton = buttons.find(btn => btn.textContent.trim() === 'Sign in');
            if (signInButton) {
                signInButton.click();
                return true;
            }
            throw new Error('Sign in button not found');
        });
        
        console.log('✅ Sign in button clicked - WATCH FOR REDIRECT');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Step 7: Check if login worked (don't wait for navigation)
        console.log('⏳ Step 7: Checking if login worked...');
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
        
        const currentUrl = page.url();
        console.log(`📍 Current URL after login attempt: ${currentUrl}`);
        
        // Check if we're still on login page or got redirected
        if (currentUrl.includes('dashboard')) {
            console.log('✅ SUCCESS: Logged into dashboard!');
        } else if (currentUrl.includes('login')) {
            console.log('❌ STILL ON LOGIN PAGE - checking for errors...');
            
            // Check for error messages
            const errorMessages = await page.evaluate(() => {
                const errors = Array.from(document.querySelectorAll('.error, .alert, [class*="error"], [class*="alert"]'));
                return errors.map(el => el.textContent.trim()).filter(text => text.length > 0);
            });
            
            if (errorMessages.length > 0) {
                console.log('❌ Login errors found:', errorMessages);
            } else {
                console.log('⚠️ No error messages found - might be loading...');
                // Wait a bit more and check again
                await new Promise(resolve => setTimeout(resolve, 5000));
                const newUrl = page.url();
                console.log(`📍 URL after extra wait: ${newUrl}`);
                
                if (newUrl.includes('dashboard')) {
                    console.log('✅ SUCCESS: Finally redirected to dashboard!');
                } else {
                    console.log('❌ FAILED: Still not on dashboard');
                }
            }
        } else {
            console.log(`⚠️ UNEXPECTED: Redirected to: ${currentUrl}`);
        }
        
        // Step 8: Go to accounting page
        console.log('🌐 Step 8: Going to accounting dashboard...');
        await page.goto('https://app.polaroo.com/dashboard/accounting', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        console.log('✅ Accounting page loaded - LOOK AT THE DATA');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Step 9: Search for property
        console.log(`🔍 Step 9: Looking for search field to search "${propertyName}"...`);
        
        // Try to find search input
        const searchSelector = 'input[placeholder*="search" i], input[type="search"], input[name*="search" i]';
        try {
            await page.waitForSelector(searchSelector, { timeout: 5000 });
            console.log('✅ Found search field - TYPING PROPERTY NAME');
            await page.type(searchSelector, propertyName, { delay: 100 });
            await page.keyboard.press('Enter');
            console.log(`✅ Searched for "${propertyName}" - WATCH THE RESULTS`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (searchError) {
            console.log('⚠️ No search field found - will extract all visible data');
        }
        
        // Step 10: Extract table data
        console.log('📊 Step 10: Extracting table data...');
        const tableData = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('tr'));
            return rows.map((row, index) => {
                const cells = Array.from(row.querySelectorAll('td'));
                return {
                    rowIndex: index,
                    cellCount: cells.length,
                    cellTexts: cells.map(cell => cell.textContent.trim())
                };
            }).filter(row => row.cellCount > 0);
        });
        
        console.log(`📋 Found ${tableData.length} table rows`);
        tableData.slice(0, 3).forEach((row, i) => {
            console.log(`Row ${i + 1}: ${row.cellTexts.join(' | ')}`);
        });
        
        console.log('🎉 TEST COMPLETE!');
        console.log('👁️ Chrome window will stay open for 30 seconds so you can inspect...');
        await new Promise(resolve => setTimeout(resolve, 30000));
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('📍 Error details:', error);
    } finally {
        if (browser) {
            console.log('🔒 Closing browser...');
            await browser.close();
        }
    }
}

// Run the test
console.log('🚀 Starting LOCAL test - Chrome window will open!');
console.log('👁️ You will be able to watch the AI work step by step');
testPolarooBot();
