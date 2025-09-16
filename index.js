const express = require('express');
const path = require('path');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const XLSX = require('xlsx');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static('.'));

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Bot API endpoint
app.post('/api/calculate', async (req, res) => {
    try {
        console.log('🤖 Starting Polaroo bot...');
        
        // Launch Chrome - ALWAYS VISIBLE (even on Render)
        const browser = await puppeteer.launch({
            headless: false, // ALWAYS VISIBLE - you want to see what's happening
            executablePath: process.env.NODE_ENV === 'production' 
                ? await chromium.executablePath() 
                : undefined,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--window-size=1280,720',
                '--start-maximized',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });

        console.log('🌐 Step 1: Going to Polaroo login page...');
        await page.goto('https://app.polaroo.com/login', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        console.log('✅ Login page loaded');
        await page.waitForTimeout(5000); // 5 second pause

        console.log('🔍 Step 2: Looking for email field...');
        
        // Try multiple selectors for email field
        let emailSelector = null;
        const emailSelectors = [
            'input[type="email"]',
            'input[name="email"]', 
            'input[id="email"]',
            'input[placeholder*="email" i]',
            'input[placeholder*="Email" i]',
            'input[placeholder*="username" i]',
            'input[placeholder*="Username" i]',
            'input[type="text"]'
        ];
        
        for (const selector of emailSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 3000 });
                emailSelector = selector;
                console.log(`✅ Found email field with selector: ${selector}`);
                break;
            } catch (e) {
                console.log(`❌ Selector failed: ${selector}`);
            }
        }
        
        if (!emailSelector) {
            // Take screenshot for debugging
            await page.screenshot({ path: 'debug-login-page.png' });
            throw new Error('Could not find email field with any selector. Check debug-login-page.png');
        }
        
        await page.waitForTimeout(5000); // 5 second pause

        console.log('📧 Step 3: Filling email field...');
        await page.type(emailSelector, 'francisco@node-living.com', { delay: 200 });
        console.log('✅ Email filled');
        await page.waitForTimeout(5000); // 5 second pause

        console.log('🔍 Step 4: Looking for password field...');
        await page.waitForSelector('input[type="password"], input[name="password"]', { timeout: 15000 });
        console.log('✅ Found password field');
        await page.waitForTimeout(5000); // 5 second pause

        console.log('🔒 Step 5: Filling password field...');
        await page.type('input[type="password"], input[name="password"]', 'Aribau126!', { delay: 200 });
        console.log('✅ Password filled');
        await page.waitForTimeout(5000); // 5 second pause

        console.log('🖱️ Step 6: Clicking login button...');
        await page.click('button[type="submit"], input[type="submit"], button:contains("Sign in")');
        console.log('✅ Login button clicked');
        await page.waitForTimeout(5000); // 5 second pause

        console.log('⏳ Step 7: Waiting for login to complete...');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
        console.log('✅ Login successful');
        await page.waitForTimeout(5000); // 5 second pause

        console.log('🌐 Step 8: Going to accounting dashboard...');
        await page.goto('https://app.polaroo.com/dashboard/accounting', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        console.log('✅ Accounting dashboard loaded');
        await page.waitForTimeout(5000); // 5 second pause

        console.log('🎉 Bot completed successfully!');
        
        // Keep browser open for 30 seconds so you can see the result
        console.log('⏳ Keeping browser open for 30 seconds so you can see the result...');
        await page.waitForTimeout(30000);
        await browser.close();
        console.log('🔒 Browser closed');

        res.json({ 
            success: true, 
            message: 'Bot completed successfully! Check the Chrome window.' 
        });

    } catch (error) {
        console.error('❌ Bot error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Calculator app running on port ${PORT}`);
});
