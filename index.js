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
        console.log('⏳ Waiting 5 seconds before navigation...');
        await page.waitForTimeout(5000);
        
        await page.goto('https://app.polaroo.com/login', { 
            waitUntil: 'networkidle0', // Wait for all network activity to stop
            timeout: 30000 
        });
        console.log('✅ Login page loaded');
        console.log('⏳ Waiting 5 seconds after page load...');
        await page.waitForTimeout(5000);
        
        console.log('⏳ Waiting 5 more seconds for dynamic content...');
        await page.waitForTimeout(5000);

        console.log('🔍 Step 2: Looking for email field...');
        console.log('⏳ Waiting 5 seconds before looking for inputs...');
        await page.waitForTimeout(5000);
        
        console.log('⏳ Waiting 5 seconds before getting input fields...');
        await page.waitForTimeout(5000);
        
        // Get all input fields on the page for debugging
        const inputs = await page.$$eval('input', inputs => 
            inputs.map(input => ({
                type: input.type,
                name: input.name,
                id: input.id,
                placeholder: input.placeholder,
                className: input.className
            }))
        );
        console.log('📋 All input fields found:', JSON.stringify(inputs, null, 2));
        console.log('⏳ Waiting 5 seconds after getting input fields...');
        await page.waitForTimeout(5000);
        
        // Try multiple selectors for email field - based on actual login page
        let emailSelector = null;
        const emailSelectors = [
            'input[type="email"]',
            'input[type="text"]',
            'input[name="email"]',
            'input[id="email"]',
            'input[placeholder*="email" i]',
            'input[placeholder*="Email" i]',
            'input[placeholder*="username" i]',
            'input[placeholder*="Username" i]',
            'input[class*="email" i]',
            'input[class*="Email" i]',
            'input[class*="username" i]',
            'input[class*="Username" i]',
            'form input',
            'div input',
            'input'
        ];
        
        for (const selector of emailSelectors) {
            console.log(`🔍 Trying email selector: ${selector}`);
            console.log('⏳ Waiting 5 seconds before trying this selector...');
            await page.waitForTimeout(5000);
            
            try {
                await page.waitForSelector(selector, { timeout: 2000 });
                emailSelector = selector;
                console.log(`✅ SUCCESS! Found email field with selector: ${selector}`);
                console.log('⏳ Waiting 5 seconds after finding email field...');
                await page.waitForTimeout(5000);
        break;
      } catch (e) {
                console.log(`❌ FAILED! Selector ${selector} - ${e.message}`);
                console.log('⏳ Waiting 5 seconds before trying next selector...');
                await page.waitForTimeout(5000);
            }
        }
        
        if (!emailSelector) {
            throw new Error('Could not find email field with any selector');
        }
        
        console.log('⏳ Waiting 5 seconds so you can see the email field...');
        await page.waitForTimeout(5000); // 5 second pause

        console.log('📧 Step 3: Filling email field...');
        console.log('⏳ Waiting 5 seconds before typing email...');
        await page.waitForTimeout(5000);
        
        await page.type(emailSelector, 'francisco@node-living.com', { delay: 200 });
        console.log('✅ Email filled');
        console.log('⏳ Waiting 5 seconds so you can see the filled email...');
        await page.waitForTimeout(5000);

        console.log('🔍 Step 4: Looking for password field...');
        
        // Try multiple selectors for password field
        let passwordSelector = null;
        const passwordSelectors = [
            'input[placeholder="Password"]',
            'input[placeholder*="Password"]',
            'input[type="password"]',
            'input[name="password"]',
            'input[id="password"]',
            'form input[type="password"]'
        ];
        
        for (const selector of passwordSelectors) {
            console.log(`🔍 Trying password selector: ${selector}`);
            console.log('⏳ Waiting 5 seconds before trying this password selector...');
            await page.waitForTimeout(5000);
            
            try {
                await page.waitForSelector(selector, { timeout: 2000 });
                passwordSelector = selector;
                console.log(`✅ SUCCESS! Found password field with selector: ${selector}`);
                console.log('⏳ Waiting 5 seconds after finding password field...');
                await page.waitForTimeout(5000);
                break;
            } catch (e) {
                console.log(`❌ FAILED! Password selector ${selector} - ${e.message}`);
                console.log('⏳ Waiting 5 seconds before trying next password selector...');
                await page.waitForTimeout(5000);
            }
        }
        
        if (!passwordSelector) {
            throw new Error('Could not find password field with any selector');
        }
        
        console.log('⏳ Waiting 5 seconds so you can see the password field...');
        await page.waitForTimeout(5000); // 5 second pause

        console.log('🔒 Step 5: Filling password field...');
        console.log('⏳ Waiting 5 seconds before typing password...');
        await page.waitForTimeout(5000);
        
        await page.type(passwordSelector, 'Aribau126!', { delay: 200 });
        console.log('✅ Password filled');
        console.log('⏳ Waiting 5 seconds so you can see the filled password...');
        await page.waitForTimeout(5000);

        console.log('🖱️ Step 6: Clicking login button...');
        
        // Try multiple selectors for login button
        let loginButtonSelector = null;
        const loginButtonSelectors = [
            'button:contains("Sign in")',
            'button:contains("Sign In")',
            'button[type="submit"]',
            'input[type="submit"]',
            'button:contains("Login")',
            'button:contains("LOGIN")',
            'form button',
            'button[class*="submit"]',
            'button[class*="login"]'
        ];
        
        for (const selector of loginButtonSelectors) {
            console.log(`🔍 Trying login button selector: ${selector}`);
            console.log('⏳ Waiting 5 seconds before trying this login button selector...');
    await page.waitForTimeout(5000);

            try {
                await page.waitForSelector(selector, { timeout: 2000 });
                loginButtonSelector = selector;
                console.log(`✅ SUCCESS! Found login button with selector: ${selector}`);
                console.log('⏳ Waiting 5 seconds after finding login button...');
                await page.waitForTimeout(5000);
                break;
            } catch (e) {
                console.log(`❌ FAILED! Login button selector ${selector} - ${e.message}`);
                console.log('⏳ Waiting 5 seconds before trying next login button selector...');
                await page.waitForTimeout(5000);
            }
        }
        
        if (!loginButtonSelector) {
            throw new Error('Could not find login button with any selector');
        }
        
        console.log('⏳ Waiting 5 seconds before clicking login button...');
        await page.waitForTimeout(5000);
        
        await page.click(loginButtonSelector);
        console.log('✅ Login button clicked');
        console.log('⏳ Waiting 5 seconds so you can see the click...');
        await page.waitForTimeout(5000);

        console.log('⏳ Step 7: Waiting for login to complete...');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
        console.log('✅ Login successful');
        console.log('⏳ Waiting 5 seconds so you can see the successful login...');
        await page.waitForTimeout(5000); // 5 second pause

        console.log('🌐 Step 8: Going to accounting dashboard...');
        await page.goto('https://app.polaroo.com/dashboard/accounting', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        console.log('✅ Accounting dashboard loaded');
        console.log('⏳ Waiting 5 seconds so you can see the accounting dashboard...');
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
