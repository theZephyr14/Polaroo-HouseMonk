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

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Simple test endpoint (no Puppeteer)
app.post('/api/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Server is working!',
        timestamp: new Date().toISOString()
    });
});

// Bot API endpoint
app.post('/api/calculate', async (req, res) => {
    // Set response timeout
    res.setTimeout(120000); // 2 minutes max
    
    let browser = null;
    try {
        console.log('🤖 Starting Polaroo bot...');
        
        // Launch Chrome - Simplified for Render
        const launchOptions = {
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security',
                '--single-process'
            ]
        };

        // Use chromium on production, system chrome locally
        if (process.env.NODE_ENV === 'production') {
            launchOptions.executablePath = await chromium.executablePath();
        } else {
            launchOptions.headless = false;
        }

        browser = await puppeteer.launch(launchOptions);

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });

        console.log('🌐 Step 1: Going to Polaroo login page...');
        await page.goto('https://app.polaroo.com/login', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        console.log('✅ Login page loaded');
        
        // Check if already logged in
        const currentUrl = page.url();
        if (currentUrl.includes('dashboard')) {
            console.log('✅ Already logged in, redirected to dashboard');
        } else {
            console.log('📝 Filling login form...');
            await page.fill('input[name="email"]', 'francisco@node-living.com');
            await page.fill('input[name="password"]', 'Aribau126!');
            
            console.log('🖱️ Clicking submit button...');
            await page.click('button[type="submit"]');
            
            // Wait for redirect to dashboard (fast polling)
            console.log('⏳ Waiting for redirect to dashboard...');
            for (let i = 0; i < 60; i++) { // 30 seconds max
                await page.waitForTimeout(500);
                const url = page.url();
                if (url.includes('dashboard')) {
                    console.log('✅ Successfully logged in');
                    break;
                }
            }
        }

        console.log('🌐 Step 2: Going to accounting dashboard...');
        await page.goto('https://app.polaroo.com/dashboard/accounting', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        console.log('✅ Accounting dashboard loaded');

        console.log('🎉 Bot completed successfully!');
        
        // Close browser immediately on server
        await browser.close();
        console.log('🔒 Browser closed');

        res.json({ 
            success: true, 
            message: 'Bot completed successfully!' 
        });

  } catch (error) {
        console.error('❌ Bot error:', error);
    if (browser) {
            try {
      await browser.close();
            } catch (e) {
                console.error('Error closing browser:', e);
            }
        }
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Calculator app running on port ${PORT}`);
});
